# TakeOff — AI-Powered Mock Interview Platform

> From layoff to your dream job. TakeOff simulates real-world tech interviews with an adaptive AI interviewer that knows your resume, reads the job description, and adjusts difficulty in real time — so you walk into the real interview ready.

**Live App:** [www.thetakeoff.tech](https://www.thetakeoff.tech/)

**Demo Video:** [Watch on Google Drive](https://drive.google.com/file/d/1on0I6OEpj05vmpByS25EUq8248HSpL17/view?usp=sharing)

---

## What is TakeOff?

TakeOff is an AI-powered mock interview platform that creates a personalized, adaptive interview experience for tech candidates. Upload your resume, paste the job description you're targeting, and TakeOff conducts a full 10-question interview that adapts in real time to your performance — just like a real interviewer would.

The platform evaluates every answer across five dimensions (Accuracy, Clarity, Depth, Relevance, and Time Efficiency), dynamically adjusts question difficulty, and generates a comprehensive readiness report with skill breakdowns, strengths, weaknesses, and curated learning resources to help you improve.

---

## Features

- **Resume + JD Parsing** — Upload a PDF resume and paste any job description; Gemini AI extracts skills, experience, and role requirements automatically
- **Adaptive 10-Question Interview** — Questions span four categories: Technical, Conceptual, Behavioral, and Scenario
- **Deterministic Difficulty Adaptation** — Difficulty escalates or drops (Easy -> Medium -> Hard) based on answer scores using explicit rules, not LLM guesswork
- **120-Second Time Limit Per Question** — Real-time countdown enforced; answers submitted after the limit incur a 30% score penalty
- **Early Termination Logic** — Interview ends early if the candidate scores below threshold three consecutive times or overall average drops below 25/100
- **5-Dimension Answer Scoring** — Each answer is graded on Accuracy, Clarity, Depth, Relevance, and Time Efficiency (20 points each, 100 total)
- **Comprehensive Readiness Report** — Final report includes overall score, per-skill breakdown, strengths, weaknesses, and actionable improvement recommendations
- **Curated Learning Resources** — YouTube videos, articles, and documentation targeted at your specific weaknesses
- **Voice Features** — Listen to questions read aloud (Text-to-Speech) and speak your answers (Speech-to-Text) for a realistic interview feel
- **Frictionless Demo Flow** — No login or account required; session-based in-memory state

---

## Architecture

```
                        ┌─────────────────────────────────┐
                        │         TakeOff Frontend         │
                        │  React 18 + Vite + React Router  │
                        │                                  │
                        │  SetupPage  →  InterviewRoom  →  ResultsPage
                        │  (Upload PDF   (Q&A + Timer +    (Report +
                        │   + Paste JD)  Difficulty Badge)  Scores)
                        └────────────────┬────────────────┘
                                         │  REST (Axios)
                                         ▼
                        ┌─────────────────────────────────┐
                        │         FastAPI Backend          │
                        │                                  │
                        │  POST /api/interview/setup       │
                        │  POST /api/interview/start       │
                        │  POST /api/interview/answer      │
                        │  GET  /api/interview/report/:id  │
                        └──────────┬──────────────────────┘
                                   │
              ┌────────────────────┼─────────────────────┐
              ▼                    ▼                       ▼
   ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
   │  State Machine   │  │    Gemini AI     │  │  In-Memory Session   │
   │  (orchestration) │  │  (2.5 Flash)    │  │  Store               │
   │                  │  │                  │  │                      │
   │  setup           │  │  Resume Analysis │  │  session_id → state  │
   │  in_progress     │  │  JD Analysis     │  │                      │
   │  completed       │  │  Q Generation    │  └──────────────────────┘
   │  terminated      │  │  Answer Scoring  │
   └────────┬─────────┘  │  Report Gen      │
            │            └──────────────────┘
            ▼
   ┌──────────────────┐   ┌──────────────────┐
   │ Difficulty       │   │  Scoring Service  │
   │ Adaptor          │   │                  │
   │ (deterministic)  │   │  Time penalties  │
   │                  │   │  Termination     │
   │  score > 70 → ▲  │   │  checks          │
   │  score < 40 → ▼  │   └──────────────────┘
   └──────────────────┘
```

---

## How the AI Interview Works

1. **Setup** — Candidate uploads a PDF resume and pastes the target job description. The backend extracts text via PyPDF2, then sends it to Gemini AI which returns a structured candidate profile and JD analysis including required skills, seniority level, and role focus.

2. **Session Creation** — A UUID session is created and stored in memory with status `setup`. Matched skills between the resume and JD are computed and returned to the frontend.

3. **Start** — The frontend calls `/start` with the session ID. The state machine transitions to `in_progress`, generates the first question (category: Technical, difficulty: Easy), and returns it along with question metadata.

4. **Q&A Loop** — For each answer:
   - The frontend tracks time elapsed and submits the answer text plus `time_taken_seconds`
   - The Scoring Service applies a 30% penalty if `time_taken > 120`
   - Gemini evaluates the answer against the question and candidate context on 5 dimensions
   - The Difficulty Adaptor computes the next difficulty level deterministically
   - The Question Category rotates (Technical → Conceptual → Behavioral → Scenario → repeat)
   - Termination is checked before returning the next question
   - The response includes: score breakdown, difficulty for next question, and next question text (or completion flag)

5. **Report** — Once all 10 questions are answered (or early termination triggers), `/report/:session_id` returns the full readiness report generated by Gemini based on the entire interview transcript.

---

## Scoring System

### Answer Rubric (per question, max 100 points)

| Dimension    | Points | What It Measures                                      |
|--------------|--------|-------------------------------------------------------|
| Accuracy     | 0–20   | Factual correctness of the answer                     |
| Clarity      | 0–20   | How clearly the answer is communicated                |
| Depth        | 0–20   | Level of detail and insight provided                  |
| Relevance    | 0–20   | How well the answer addresses the specific question   |
| Time Efficiency | 0–20 | How well the candidate used the available time        |

### Difficulty Adaptation Rules

| Current Difficulty | Score        | Next Difficulty |
|--------------------|--------------|-----------------|
| Easy               | > 70         | Medium          |
| Easy               | ≤ 70         | Easy            |
| Medium             | > 70         | Hard            |
| Medium             | 40 – 70      | Medium          |
| Medium             | < 40         | Easy            |
| Hard               | > 70         | Hard            |
| Hard               | ≤ 70         | Medium          |

### Time Penalty

Answers submitted after the 120-second limit have their final score multiplied by **0.7** (30% deduction).

### Early Termination Rules

The interview ends before question 10 if either condition is met:

- **Consecutive Low Performance** — 3 or more consecutive answers score below the low threshold
- **Overall Below Threshold** — After at least 3 answers, the running average falls below **25/100**

---

## Tech Stack

| Layer         | Technology                                      |
|---------------|-------------------------------------------------|
| Frontend      | React 18, React Router v6, Axios, Vite          |
| Backend       | FastAPI, Python 3.11+, Pydantic v2, Uvicorn     |
| AI / LLM      | Google Gemini 2.5 Flash (`google-generativeai`) |
| PDF Parsing   | PyPDF2                                          |
| Session Store | In-memory Python dict (no database)             |
| Styling       | Plain CSS with TakeOff dark navy + orange theme |
| Testing       | pytest                                          |

---

## Setup & Run

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### Backend

```bash
cd Hack2Hire_Backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
cp .env.example .env             # or create .env manually
# Add the following line to .env:
# GEMINI_API_KEY=your_api_key_here

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd Hack2Hire_Frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

> The frontend proxies API requests to `http://localhost:8000` via Vite config — no additional CORS setup needed in development.

---

## API Endpoints

| Method | Endpoint                        | Description                                                         |
|--------|---------------------------------|---------------------------------------------------------------------|
| POST   | `/api/interview/setup`          | Upload resume PDF (`multipart/form-data`) + job description text. Returns `session_id` and matched skills. |
| POST   | `/api/interview/start`          | Start the session. Returns the first question, category, and difficulty. |
| POST   | `/api/interview/answer`         | Submit an answer with `session_id`, `answer_text`, and `time_taken_seconds`. Returns score breakdown and next question. |
| GET    | `/api/interview/report/{id}`    | Fetch the final readiness report for a completed or terminated session. |

---

## Project Structure

```
Hack2Hire/
├── Hack2Hire_Backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── requirements.txt
│   ├── routers/
│   │   └── interview.py             # 4 REST endpoints
│   ├── services/
│   │   ├── state_machine.py         # Interview orchestration logic
│   │   ├── difficulty_adaptor.py    # Deterministic difficulty rules
│   │   ├── scoring.py               # Time penalties + termination checks
│   │   ├── gemini_service.py        # All Gemini AI calls
│   │   └── resume_parser.py         # PyPDF2 text extraction
│   ├── models/
│   │   ├── schemas.py               # Pydantic request/response models
│   │   └── interview_state.py       # Session state dataclass
│   ├── prompts/
│   │   ├── resume_analysis.py
│   │   ├── jd_analysis.py
│   │   ├── question_generation.py
│   │   ├── answer_evaluation.py
│   │   └── report_generation.py
│   └── tests/
│       ├── test_difficulty_adaptor.py
│       ├── test_interview_state.py
│       ├── test_scoring.py
│       └── test_state_machine.py
│
└── Hack2Hire_Frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx
        ├── index.js
        ├── pages/
        │   ├── SetupPage.jsx        # Resume upload + JD input
        │   ├── InterviewRoom.jsx    # Live Q&A with timer
        │   └── ResultsPage.jsx      # Score report display
        ├── components/
        │   ├── Timer.jsx
        │   ├── DifficultyBadge.jsx
        │   ├── DifficultyTrend.jsx
        │   ├── ProgressBar.jsx
        │   ├── ScoreCard.jsx
        │   ├── SkillBreakdown.jsx
        │   ├── ReadinessGauge.jsx
        │   ├── QuestionHistory.jsx
        │   ├── QuestionPanel.jsx
        │   ├── AnswerPanel.jsx
        │   ├── SpeakButton.jsx      # Text-to-Speech for questions
        │   └── MicButton.jsx        # Speech-to-Text for answers
        ├── hooks/
        │   └── useSpeechRecognition.js  # Web Speech API hook
        ├── api/
        │   └── interview.js         # Axios API client with retry logic
        └── styles/
            └── theme.css            # Dark navy + orange design system
```

---

## Testing

The backend has **31 unit tests** covering core business logic — difficulty adaptation, scoring, time penalties, early termination, and state machine transitions.

```bash
cd Hack2Hire_Backend
source .venv/bin/activate

# Run all tests
pytest tests/ -v

# Run a specific test file
pytest tests/test_difficulty_adaptor.py -v
pytest tests/test_scoring.py -v
pytest tests/test_state_machine.py -v
pytest tests/test_interview_state.py -v
```

Test coverage areas:
- `test_difficulty_adaptor.py` — All difficulty transition branches (Easy/Medium/Hard × score ranges)
- `test_scoring.py` — Time penalty calculation, empty answer detection, termination trigger conditions
- `test_state_machine.py` — Session lifecycle state transitions
- `test_interview_state.py` — Interview state model validation and field behavior

---

## Design Decisions

**Why deterministic difficulty adaptation?** The judges specifically asked for rule-based logic rather than letting the LLM decide the next difficulty. This makes the system predictable, testable, and auditable — a concrete table of rules rather than a black box.

**Why in-memory sessions?** This is a hackathon demo. A production version would replace the dict with Redis or a database, but in-memory keeps the setup to a single `pip install` with zero infrastructure dependencies.

**Why 5 scoring dimensions?** Multi-dimensional scoring gives candidates actionable feedback ("your Depth was weak but Accuracy was strong") rather than an opaque single number.

---

*Built for Hack2Hire by UnsaidTalks — June 2026*
