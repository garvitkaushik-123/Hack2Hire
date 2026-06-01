# TakeOff — AI-Powered Mock Interview Platform

## Overview

TakeOff is an AI-powered mock interview platform that simulates real-world tech interviews. Users upload a resume (PDF) and paste a job description, then an AI interviewer asks 10 adaptive questions — evaluating answers on accuracy, clarity, depth, relevance, and completeness. The system dynamically adjusts difficulty based on performance and terminates early if scores drop too low. At the end, a comprehensive readiness report is generated.

**Tech Stack:** FastAPI (backend), React + JavaScript (frontend), Gemini 2.0 Flash (AI), in-memory session store.

**Brand:** TakeOff theme — dark navy (#1a1a2e), orange (#ff6b35), white (#ffffff), clean modern UI with rocket motif.

---

## Architecture

```
React Frontend (3 pages)
    │ REST API (JSON)
    ▼
FastAPI Backend
    ├── Resume Parser Service (Gemini)
    ├── Interview State Machine
    ├── Difficulty Adaptor (rules engine)
    ├── Gemini AI Service (evaluation + generation)
    ├── Scoring & Report Generator
    └── In-Memory Session Store (Python dict)
```

### Key Decisions

- **No database** — in-memory dict keyed by session_id. Hackathon scope, no persistence needed.
- **No authentication** — direct to interview setup. Zero friction.
- **REST API only** — no WebSockets. 2-min question pace doesn't need streaming.
- **3 pages:** Setup → Interview Room → Results Dashboard.

---

## Backend Design

### Project Structure

```
Hack2Hire_Backend/
├── main.py                  # FastAPI app, CORS, router mounting
├── requirements.txt
├── .env                     # GEMINI_API_KEY
├── routers/
│   └── interview.py         # All 4 endpoints
├── services/
│   ├── gemini_service.py    # All Gemini API calls
│   ├── resume_parser.py     # PDF text extraction + Gemini analysis
│   ├── state_machine.py     # Interview state management
│   ├── difficulty_adaptor.py # Deterministic difficulty rules
│   └── scoring.py           # Score computation + time penalties
├── models/
│   ├── schemas.py           # Pydantic request/response models
│   └── interview_state.py   # InterviewSession dataclass
└── prompts/
    ├── resume_analysis.py   # Resume extraction prompt
    ├── question_generation.py # Question gen prompt
    ├── answer_evaluation.py # Scoring rubric prompt
    └── report_generation.py # Final report prompt
```

### API Endpoints

#### POST /api/interview/setup
- **Input:** `resume_file` (PDF upload), `job_description` (text field)
- **Process:**
  1. Extract text from PDF using PyPDF2
  2. Send to Gemini for structured extraction → `{ name, skills[], experience[], projects[], education, total_years_experience }`
  3. Send JD to Gemini for analysis → `{ role_title, required_skills[], preferred_skills[], experience_level, key_responsibilities[] }`
  4. Compute `matched_skills[]` (intersection of resume skills and JD requirements)
  5. Create session in memory store with state = `setup`
- **Output:** `{ session_id, candidate_profile, jd_analysis, matched_skills[] }`

#### POST /api/interview/start
- **Input:** `{ session_id }`
- **Process:**
  1. Validate session exists and state == `setup`
  2. Set state to `in_progress`, current_question = 1, difficulty = `easy`
  3. Call Gemini to generate first question (Easy, Technical category)
- **Output:** `{ question_number, question_text, difficulty, category, time_limit: 120 }`

#### POST /api/interview/answer
- **Input:** `{ session_id, answer_text, time_taken_seconds }`
- **Process:**
  1. Validate session state == `in_progress`
  2. Call Gemini to evaluate answer → structured JSON with 5 rubric scores (each 0-20)
  3. Apply time penalty: if time_taken > 120 → multiply total by 0.7
  4. Store evaluation in session
  5. Run difficulty adaptor (deterministic rules) to determine next difficulty
  6. Check termination conditions
  7. If not terminated and question < 10: generate next question via Gemini
  8. If question == 10 or terminated: set state to `completed` or `terminated`
- **Output:**
  ```json
  {
    "evaluation": { "accuracy": 0-20, "clarity": 0-20, "depth": 0-20, "relevance": 0-20, "completeness": 0-20, "total": 0-100, "reasoning": "..." },
    "next_question": { "question_number": N, "question_text": "...", "difficulty": "...", "category": "..." } | null,
    "interview_status": "in_progress | completed | terminated",
    "termination_reason": "..." | null,
    "progress": { "current_question": N, "total_questions": 10, "current_difficulty": "...", "avg_score": N }
  }
  ```

#### GET /api/interview/report/{session_id}
- **Input:** session_id as path param
- **Process:**
  1. Validate session state == `completed` or `terminated`
  2. Compile full interview data
  3. Send to Gemini for comprehensive report generation
- **Output:**
  ```json
  {
    "readiness_score": 0-100,
    "readiness_label": "Strong | Average | Needs Improvement",
    "hiring_readiness": "Ready | Almost Ready | Not Ready",
    "skill_breakdown": [{ "skill": "Python", "score": 82, "label": "Strong" }],
    "strengths": ["...", "...", "..."],
    "weaknesses": ["...", "...", "..."],
    "recommendations": ["...", "...", "..."],
    "question_history": [{ "number": 1, "question": "...", "answer": "...", "score": 85, "difficulty": "easy", "category": "technical", "time_taken": 45, "evaluation": {...} }],
    "difficulty_progression": ["easy", "easy", "medium", "medium", "hard", ...],
    "interview_summary": { "total_questions": 10, "avg_score": 72, "terminated_early": false, "total_time": 890 }
  }
  ```

### Interview State Machine

**States:** `setup` → `in_progress` → `evaluating` → `completed` | `terminated`

The `evaluating` state is internal (happens synchronously within the `/answer` endpoint). From the frontend's perspective, it sends an answer and gets back either the next question (`in_progress`) or the end signal (`completed`/`terminated`).

### Difficulty Adaptor (Deterministic Rules)

| Current Difficulty | Answer Score | Next Difficulty |
|---|---|---|
| Easy | > 70 | Medium |
| Easy | 40-70 | Easy |
| Easy | < 40 | Easy |
| Medium | > 70 | Hard |
| Medium | 40-70 | Medium |
| Medium | < 40 | Easy |
| Hard | > 70 | Hard |
| Hard | 40-70 | Medium |
| Hard | < 40 | Medium |

### Early Termination Rules

- **3 consecutive scores below 30** → terminate with reason "Consistent low performance"
- **Running average below 25** (after at least 3 questions) → terminate with reason "Overall performance below threshold"

### Time Penalty

- 0-120 seconds: no penalty (full score)
- Timer expires (120s auto-submit): score multiplied by 0.7
- Empty or near-empty answer (fewer than 10 non-whitespace characters): score = 0, reasoning = "No substantive answer provided"

### Question Category Rotation

Questions rotate through categories to ensure variety:
```
Q1: Technical, Q2: Conceptual, Q3: Behavioral, Q4: Scenario,
Q5: Technical, Q6: Conceptual, Q7: Behavioral, Q8: Scenario,
Q9: Technical, Q10: Conceptual
```

---

## Gemini AI Service

### Model Configuration

- **Model:** `gemini-2.0-flash`
- **Evaluation calls:** temperature = 0.3 (consistency)
- **Question generation:** temperature = 0.7 (variety)
- **All structured outputs:** JSON mode via `response_mime_type: "application/json"`

### Prompt 1: Resume Analysis

System: "You are an expert resume analyzer for tech roles. Extract structured information from the following resume text. Return valid JSON."

Input: raw PDF text. Output: `{ name, email, skills[], experience[{ company, role, duration, highlights[] }], projects[{ name, description, technologies[] }], education[{ institution, degree, year }], total_years_experience }`

### Prompt 2: JD Analysis

System: "Analyze this job description and extract structured requirements. Return valid JSON."

Input: JD text. Output: `{ role_title, required_skills[], preferred_skills[], experience_level, key_responsibilities[], company_name }`

### Prompt 3: Question Generation

System: "You are a senior technical interviewer conducting a mock interview. Generate exactly ONE question based on the following context. The question must be at {difficulty} level, in the {category} category, and test skills relevant to the job description. Do not repeat topics already covered: {covered_topics}. Return only the question text."

Input: candidate_profile, jd_analysis, difficulty, category, covered_topics[]. Output: question text (plain string).

### Prompt 4: Answer Evaluation

System: "You are an objective interview evaluator. Score the candidate's answer using these rubrics. Each dimension is scored 0-20. Be calibrated to the difficulty level — a correct Easy answer scores high on accuracy, but a Hard question requires edge cases and trade-offs for full accuracy marks. Return valid JSON."

Rubrics provided in the prompt:
- **Accuracy (0-20):** Correctness of facts, concepts, and technical details
- **Clarity (0-20):** How clearly and coherently the answer is communicated
- **Depth (0-20):** Level of detail, examples, and thoroughness
- **Relevance (0-20):** How well the answer addresses the specific question asked
- **Completeness (0-20):** Coverage of all aspects of the question

Input: question, answer, difficulty, candidate_profile. Output: `{ accuracy, clarity, depth, relevance, completeness, total, reasoning }`

### Prompt 5: Final Report

System: "Analyze this complete interview session and generate a comprehensive readiness report. Consider the difficulty progression, scoring trends, and the specific job description requirements. Return valid JSON."

Input: full session data. Output: readiness_score, readiness_label, hiring_readiness, skill_breakdown[], strengths[], weaknesses[], recommendations[].

---

## Frontend Design

### Project Structure

```
Hack2Hire_Frontend/
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── App.jsx               # Router setup
│   ├── index.js
│   ├── api/
│   │   └── interview.js      # API client functions
│   ├── pages/
│   │   ├── SetupPage.jsx      # Resume upload + JD input
│   │   ├── InterviewRoom.jsx  # Split-panel interview
│   │   └── ResultsPage.jsx    # Final report dashboard
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ResumeUploader.jsx # Drag & drop PDF upload
│   │   ├── QuestionPanel.jsx  # Left panel: question display
│   │   ├── AnswerPanel.jsx    # Right panel: text input + submit
│   │   ├── Timer.jsx          # Countdown timer with color states
│   │   ├── ProgressBar.jsx    # Question progress indicator
│   │   ├── DifficultyBadge.jsx
│   │   ├── ScoreCard.jsx      # Previous answer score display
│   │   ├── DifficultyTrend.jsx # Bottom bar difficulty dots
│   │   ├── ReadinessGauge.jsx # Circular score gauge
│   │   ├── SkillBreakdown.jsx # Horizontal bar chart
│   │   └── QuestionHistory.jsx # Expandable accordion
│   └── styles/
│       └── theme.css          # TakeOff design tokens
```

### Theme / Design Tokens

```css
--color-navy: #1a1a2e;
--color-navy-light: #16213e;
--color-orange: #ff6b35;
--color-orange-hover: #e55a2b;
--color-white: #ffffff;
--color-gray-bg: #f5f5f5;
--color-gray-text: #6b7280;
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger: #ef4444;
--font-heading: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;
--radius: 12px;
--shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
```

### Page 1: Setup Page (`/`)

- Navbar with TakeOff logo (rocket emoji + text)
- Hero section: "From layoff to your **dream job.**" (orange accent on "dream job")
- Two-column form below:
  - Left: PDF drag-and-drop upload zone with file preview
  - Right: JD textarea with placeholder
- Orange CTA button: "Start Your TakeOff"
- On submit: shows loading spinner → navigates to `/interview/:sessionId`

### Page 2: Interview Room (`/interview/:sessionId`)

Split-panel layout:
- **Top bar:** Logo, question counter (Q 3/10), progress bar, countdown timer
- **Left panel (Question):** Difficulty badge (colored), category label, question text, previous score card (slides in after each answer)
- **Right panel (Answer):** Large textarea, Submit button (orange), Skip button (gray, applies score 0)
- **Bottom bar:** Difficulty trend (colored dots), running average score

**Timer behavior:**
- Starts at 120s, counts down
- Green (120-31s) → Orange (30-11s) → Red (10-0s)
- At 0: auto-submits current text
- Visual pulse animation in red zone

**After answer submission:**
- Show brief loading state ("Evaluating...")
- Score card slides into left panel showing score + reasoning
- 2-second pause, then next question appears
- If terminated: modal overlay with reason + "View Results" button

### Page 3: Results Dashboard (`/results/:sessionId`)

- **Top section:** Two cards side by side
  - Left: Circular readiness gauge (0-100) with label
  - Right: Hiring readiness indicator with matched/gap skills
- **Middle section:** Skill breakdown horizontal bar chart
- **Three columns:** Strengths, Weaknesses, Recommendations (card layout)
- **Bottom section:** Question history accordion (expandable, shows Q&A + score per question)
- **Actions:** "Start New Interview" button, back to setup

---

## Error Handling

- **Resume parsing fails:** Show error toast, let user re-upload
- **Gemini API errors:** Retry once, then show "AI service temporarily unavailable" with option to retry
- **Invalid session_id:** 404 response, frontend redirects to setup
- **Empty answer on timer expiry:** Submit with empty text, backend scores as 0
- **Network errors during interview:** Frontend shows reconnection message, preserves typed answer

---

## Dependencies

### Backend
```
fastapi
uvicorn
python-multipart
pydantic
google-generativeai
PyPDF2
python-dotenv
```

### Frontend
```
react (via create-react-app or vite)
react-router-dom
axios
```

No additional UI libraries — plain CSS matching the TakeOff theme. Keeps bundle small and avoids dependency issues.

---

## What We're NOT Building

- User authentication / accounts
- Database persistence
- Interview history across sessions
- Voice/video features
- Real-time WebSocket streaming
- Multiple concurrent interviews (single-user focus)
- Payment or subscription features
