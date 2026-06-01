# TakeOff AI Interview Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered mock interview platform where users upload a resume + JD, undergo a 10-question adaptive interview with Gemini AI, and receive a comprehensive readiness report.

**Architecture:** FastAPI backend with stateful interview state machine, deterministic difficulty adaptor, and Gemini 2.0 Flash for question generation/answer evaluation. React frontend with 3 pages (Setup, Interview Room, Results Dashboard). In-memory session store, no auth, no database.

**Tech Stack:** Python 3.11+, FastAPI, google-generativeai, PyPDF2, React 18, react-router-dom, axios, plain CSS

**Spec:** `docs/superpowers/specs/2026-06-01-takeoff-ai-interview-platform-design.md`

---

## File Structure

### Backend (`Hack2Hire_Backend/`)

| File | Responsibility |
|---|---|
| `main.py` | FastAPI app, CORS config, router mount |
| `requirements.txt` | Python dependencies |
| `.env` | `GEMINI_API_KEY` (not committed) |
| `.gitignore` | Ignore .env, __pycache__, venv |
| `models/schemas.py` | All Pydantic request/response models |
| `models/interview_state.py` | InterviewSession dataclass + in-memory store |
| `services/gemini_service.py` | All Gemini API calls (5 prompt functions) |
| `services/resume_parser.py` | PDF text extraction via PyPDF2 |
| `services/difficulty_adaptor.py` | Deterministic difficulty transition rules |
| `services/scoring.py` | Time penalty logic + termination checks |
| `services/state_machine.py` | Interview flow orchestration |
| `prompts/resume_analysis.py` | System prompt for resume extraction |
| `prompts/jd_analysis.py` | System prompt for JD extraction |
| `prompts/question_generation.py` | System prompt for question generation |
| `prompts/answer_evaluation.py` | System prompt + rubric for answer scoring |
| `prompts/report_generation.py` | System prompt for final report |
| `routers/interview.py` | 4 API endpoints |
| `tests/test_difficulty_adaptor.py` | Unit tests for difficulty rules |
| `tests/test_scoring.py` | Unit tests for time penalty + termination |

### Frontend (`Hack2Hire_Frontend/`)

| File | Responsibility |
|---|---|
| `src/App.jsx` | Router setup (3 routes) |
| `src/index.js` | React entry point |
| `src/index.css` | Global styles + CSS variables (theme) |
| `src/api/interview.js` | Axios client for all 4 endpoints |
| `src/pages/SetupPage.jsx` | Resume upload + JD input form |
| `src/pages/SetupPage.css` | Setup page styles |
| `src/pages/InterviewRoom.jsx` | Split-panel interview page (orchestrator) |
| `src/pages/InterviewRoom.css` | Interview room styles |
| `src/pages/ResultsPage.jsx` | Final report dashboard |
| `src/pages/ResultsPage.css` | Results page styles |
| `src/components/Navbar.jsx` | Top nav with TakeOff branding |
| `src/components/Navbar.css` | Navbar styles |
| `src/components/ResumeUploader.jsx` | Drag & drop PDF upload zone |
| `src/components/QuestionPanel.jsx` | Left panel: question + difficulty + prev score |
| `src/components/AnswerPanel.jsx` | Right panel: textarea + submit + skip |
| `src/components/Timer.jsx` | Countdown timer with color transitions |
| `src/components/ProgressBar.jsx` | Question progress (Q 3/10 + bar) |
| `src/components/DifficultyBadge.jsx` | Colored difficulty label |
| `src/components/ScoreCard.jsx` | Previous answer score display |
| `src/components/DifficultyTrend.jsx` | Bottom bar difficulty dots + avg score |
| `src/components/ReadinessGauge.jsx` | Circular SVG gauge (0-100) |
| `src/components/SkillBreakdown.jsx` | Horizontal bar chart |
| `src/components/QuestionHistory.jsx` | Expandable accordion |

---

## Task 1: Backend Project Scaffold

**Files:**
- Create: `Hack2Hire_Backend/main.py`
- Create: `Hack2Hire_Backend/requirements.txt`
- Create: `Hack2Hire_Backend/.env`
- Create: `Hack2Hire_Backend/.gitignore`

- [ ] **Step 1: Create requirements.txt**

```
fastapi==0.115.0
uvicorn==0.30.0
python-multipart==0.0.9
pydantic==2.9.0
google-generativeai==0.8.0
PyPDF2==3.0.1
python-dotenv==1.0.1
pytest==8.3.0
```

- [ ] **Step 2: Create .env**

```
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 3: Create .gitignore**

```
.env
__pycache__/
*.pyc
venv/
.venv/
```

- [ ] **Step 4: Create main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TakeOff API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "TakeOff API"}
```

- [ ] **Step 5: Create empty __init__.py files for packages**

```bash
mkdir -p Hack2Hire_Backend/models Hack2Hire_Backend/services Hack2Hire_Backend/prompts Hack2Hire_Backend/routers Hack2Hire_Backend/tests
touch Hack2Hire_Backend/models/__init__.py Hack2Hire_Backend/services/__init__.py Hack2Hire_Backend/prompts/__init__.py Hack2Hire_Backend/routers/__init__.py Hack2Hire_Backend/tests/__init__.py
```

- [ ] **Step 6: Install dependencies and verify server starts**

```bash
cd Hack2Hire_Backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Expected: Server starts, `GET http://localhost:8000/api/health` returns `{"status": "ok", "service": "TakeOff API"}`

- [ ] **Step 7: Commit**

```bash
git add Hack2Hire_Backend/
git commit -m "feat: scaffold FastAPI backend with dependencies and health endpoint"
```

---

## Task 2: Pydantic Models & Interview State

**Files:**
- Create: `Hack2Hire_Backend/models/schemas.py`
- Create: `Hack2Hire_Backend/models/interview_state.py`

- [ ] **Step 1: Create models/interview_state.py**

This defines the in-memory session data structure and the session store.

```python
from dataclasses import dataclass, field
from typing import Optional
import uuid


CATEGORY_ROTATION = [
    "technical", "conceptual", "behavioral", "scenario",
    "technical", "conceptual", "behavioral", "scenario",
    "technical", "conceptual",
]


@dataclass
class QuestionRecord:
    number: int
    text: str
    category: str
    difficulty: str
    answer: Optional[str] = None
    time_taken: Optional[int] = None
    time_limit: int = 120
    evaluation: Optional[dict] = None


@dataclass
class InterviewSession:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    state: str = "setup"  # setup | in_progress | completed | terminated
    candidate_profile: Optional[dict] = None
    jd_analysis: Optional[dict] = None
    matched_skills: list = field(default_factory=list)
    current_question: int = 0
    current_difficulty: str = "easy"
    questions: list = field(default_factory=list)
    consecutive_low_scores: int = 0
    termination_reason: Optional[str] = None

    def get_covered_topics(self) -> list[str]:
        return [q.text for q in self.questions if q.answer is not None]

    def get_scores(self) -> list[int]:
        return [
            q.evaluation["total"]
            for q in self.questions
            if q.evaluation is not None
        ]

    def get_avg_score(self) -> float:
        scores = self.get_scores()
        if not scores:
            return 0.0
        return sum(scores) / len(scores)

    def get_next_category(self) -> str:
        return CATEGORY_ROTATION[self.current_question]


# In-memory session store
sessions: dict[str, InterviewSession] = {}
```

- [ ] **Step 2: Create models/schemas.py**

All Pydantic request/response models for the 4 endpoints.

```python
from pydantic import BaseModel
from typing import Optional


# --- Setup ---
class SetupResponse(BaseModel):
    session_id: str
    candidate_profile: dict
    jd_analysis: dict
    matched_skills: list[str]


# --- Start ---
class StartRequest(BaseModel):
    session_id: str


class QuestionOut(BaseModel):
    question_number: int
    question_text: str
    difficulty: str
    category: str
    time_limit: int = 120


class StartResponse(BaseModel):
    question_number: int
    question_text: str
    difficulty: str
    category: str
    time_limit: int = 120


# --- Answer ---
class AnswerRequest(BaseModel):
    session_id: str
    answer_text: str
    time_taken_seconds: int


class EvaluationOut(BaseModel):
    accuracy: int
    clarity: int
    depth: int
    relevance: int
    completeness: int
    total: int
    reasoning: str


class ProgressOut(BaseModel):
    current_question: int
    total_questions: int = 10
    current_difficulty: str
    avg_score: float


class AnswerResponse(BaseModel):
    evaluation: EvaluationOut
    next_question: Optional[QuestionOut] = None
    interview_status: str
    termination_reason: Optional[str] = None
    progress: ProgressOut


# --- Report ---
class SkillScore(BaseModel):
    skill: str
    score: int
    label: str


class QuestionHistoryItem(BaseModel):
    number: int
    question: str
    answer: str
    score: int
    difficulty: str
    category: str
    time_taken: int
    evaluation: dict


class InterviewSummary(BaseModel):
    total_questions: int
    avg_score: float
    terminated_early: bool
    total_time: int


class ReportResponse(BaseModel):
    readiness_score: int
    readiness_label: str
    hiring_readiness: str
    skill_breakdown: list[SkillScore]
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    question_history: list[QuestionHistoryItem]
    difficulty_progression: list[str]
    interview_summary: InterviewSummary
```

- [ ] **Step 3: Commit**

```bash
git add Hack2Hire_Backend/models/
git commit -m "feat: add Pydantic schemas and InterviewSession dataclass"
```

---

## Task 3: Difficulty Adaptor (with tests)

**Files:**
- Create: `Hack2Hire_Backend/services/difficulty_adaptor.py`
- Create: `Hack2Hire_Backend/tests/test_difficulty_adaptor.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_difficulty_adaptor.py
from services.difficulty_adaptor import get_next_difficulty


class TestDifficultyAdaptor:
    # Easy transitions
    def test_easy_strong_goes_to_medium(self):
        assert get_next_difficulty("easy", 85) == "medium"

    def test_easy_average_stays_easy(self):
        assert get_next_difficulty("easy", 55) == "easy"

    def test_easy_weak_stays_easy(self):
        assert get_next_difficulty("easy", 20) == "easy"

    # Medium transitions
    def test_medium_strong_goes_to_hard(self):
        assert get_next_difficulty("medium", 75) == "hard"

    def test_medium_average_stays_medium(self):
        assert get_next_difficulty("medium", 50) == "medium"

    def test_medium_weak_goes_to_easy(self):
        assert get_next_difficulty("medium", 30) == "easy"

    # Hard transitions
    def test_hard_strong_stays_hard(self):
        assert get_next_difficulty("hard", 80) == "hard"

    def test_hard_average_goes_to_medium(self):
        assert get_next_difficulty("hard", 60) == "medium"

    def test_hard_weak_goes_to_medium(self):
        assert get_next_difficulty("hard", 25) == "medium"

    # Boundary values
    def test_score_exactly_70_is_average(self):
        assert get_next_difficulty("easy", 70) == "easy"

    def test_score_71_is_strong(self):
        assert get_next_difficulty("easy", 71) == "medium"

    def test_score_exactly_40_is_average(self):
        assert get_next_difficulty("medium", 40) == "medium"

    def test_score_39_is_weak(self):
        assert get_next_difficulty("medium", 39) == "easy"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd Hack2Hire_Backend && python -m pytest tests/test_difficulty_adaptor.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'services.difficulty_adaptor'`

- [ ] **Step 3: Implement difficulty_adaptor.py**

```python
# services/difficulty_adaptor.py

def get_next_difficulty(current_difficulty: str, score: int) -> str:
    """
    Deterministic difficulty transition based on current difficulty and answer score.

    Rules:
    - Score > 70: strong → increase difficulty
    - Score 40-70: average → stay same (or drop from hard to medium)
    - Score < 40: weak → decrease or stay at floor

    Returns: "easy", "medium", or "hard"
    """
    if current_difficulty == "easy":
        if score > 70:
            return "medium"
        return "easy"

    elif current_difficulty == "medium":
        if score > 70:
            return "hard"
        elif score < 40:
            return "easy"
        return "medium"

    elif current_difficulty == "hard":
        if score > 70:
            return "hard"
        return "medium"

    return current_difficulty
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd Hack2Hire_Backend && python -m pytest tests/test_difficulty_adaptor.py -v
```

Expected: All 13 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Hack2Hire_Backend/services/difficulty_adaptor.py Hack2Hire_Backend/tests/test_difficulty_adaptor.py
git commit -m "feat: add deterministic difficulty adaptor with full test coverage"
```

---

## Task 4: Scoring Service (with tests)

**Files:**
- Create: `Hack2Hire_Backend/services/scoring.py`
- Create: `Hack2Hire_Backend/tests/test_scoring.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_scoring.py
from services.scoring import apply_time_penalty, check_termination, is_empty_answer


class TestTimePenalty:
    def test_within_time_no_penalty(self):
        assert apply_time_penalty(80, 90) == 80

    def test_at_exactly_120_no_penalty(self):
        assert apply_time_penalty(80, 120) == 80

    def test_over_time_applies_0_7_multiplier(self):
        assert apply_time_penalty(100, 121) == 70

    def test_over_time_rounds_down(self):
        assert apply_time_penalty(85, 130) == 59  # int(85 * 0.7) = 59


class TestEmptyAnswer:
    def test_empty_string(self):
        assert is_empty_answer("") is True

    def test_whitespace_only(self):
        assert is_empty_answer("     ") is True

    def test_short_answer(self):
        assert is_empty_answer("idk") is True  # 3 non-whitespace chars < 10

    def test_valid_answer(self):
        assert is_empty_answer("This is a real answer") is False

    def test_exactly_10_chars(self):
        assert is_empty_answer("abcdefghij") is False


class TestTermination:
    def test_three_consecutive_low_scores_terminates(self):
        result = check_termination(
            consecutive_low_scores=3,
            scores=[25, 28, 22],
        )
        assert result is not None
        assert "Consistent low performance" in result

    def test_two_consecutive_low_scores_no_termination(self):
        result = check_termination(
            consecutive_low_scores=2,
            scores=[25, 28],
        )
        assert result is None

    def test_avg_below_25_after_3_questions_terminates(self):
        result = check_termination(
            consecutive_low_scores=0,
            scores=[20, 24, 22],
        )
        assert result is not None
        assert "below threshold" in result

    def test_avg_below_25_with_only_2_questions_no_termination(self):
        result = check_termination(
            consecutive_low_scores=0,
            scores=[20, 24],
        )
        assert result is None

    def test_good_scores_no_termination(self):
        result = check_termination(
            consecutive_low_scores=0,
            scores=[70, 65, 80],
        )
        assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd Hack2Hire_Backend && python -m pytest tests/test_scoring.py -v
```

Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement scoring.py**

```python
# services/scoring.py


def apply_time_penalty(score: int, time_taken: int) -> int:
    """
    Apply time penalty to score.
    - Within 120s: no penalty
    - Over 120s: multiply by 0.7
    """
    if time_taken > 120:
        return int(score * 0.7)
    return score


def is_empty_answer(answer_text: str) -> bool:
    """Answer is empty if fewer than 10 non-whitespace characters."""
    stripped = "".join(answer_text.split())
    return len(stripped) < 10


def check_termination(consecutive_low_scores: int, scores: list[int]) -> str | None:
    """
    Check if interview should terminate early.
    Returns termination reason string, or None to continue.

    Rules:
    - 3 consecutive scores below 30 → terminate
    - Running average below 25 (after at least 3 questions) → terminate
    """
    if consecutive_low_scores >= 3:
        return "Consistent low performance"

    if len(scores) >= 3:
        avg = sum(scores) / len(scores)
        if avg < 25:
            return "Overall performance below threshold"

    return None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd Hack2Hire_Backend && python -m pytest tests/test_scoring.py -v
```

Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Hack2Hire_Backend/services/scoring.py Hack2Hire_Backend/tests/test_scoring.py
git commit -m "feat: add scoring service with time penalties and termination checks"
```

---

## Task 5: Gemini Prompts

**Files:**
- Create: `Hack2Hire_Backend/prompts/resume_analysis.py`
- Create: `Hack2Hire_Backend/prompts/jd_analysis.py`
- Create: `Hack2Hire_Backend/prompts/question_generation.py`
- Create: `Hack2Hire_Backend/prompts/answer_evaluation.py`
- Create: `Hack2Hire_Backend/prompts/report_generation.py`

- [ ] **Step 1: Create prompts/resume_analysis.py**

```python
RESUME_ANALYSIS_PROMPT = """You are an expert resume analyzer for tech roles. Analyze the following resume text and extract structured information.

Return a JSON object with exactly these fields:
{
  "name": "candidate's full name",
  "email": "email if found, otherwise empty string",
  "skills": ["list", "of", "technical", "skills"],
  "experience": [
    {
      "company": "company name",
      "role": "job title",
      "duration": "e.g. Jan 2022 - Dec 2023",
      "highlights": ["key achievement 1", "key achievement 2"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "institution": "university name",
      "degree": "degree name",
      "year": "graduation year or expected"
    }
  ],
  "total_years_experience": 0
}

Be thorough in extracting skills — include programming languages, frameworks, tools, databases, cloud platforms, and methodologies mentioned anywhere in the resume.

RESUME TEXT:
{resume_text}"""
```

- [ ] **Step 2: Create prompts/jd_analysis.py**

```python
JD_ANALYSIS_PROMPT = """Analyze this job description and extract structured requirements for interview preparation.

Return a JSON object with exactly these fields:
{
  "role_title": "the job title",
  "required_skills": ["must-have skills"],
  "preferred_skills": ["nice-to-have skills"],
  "experience_level": "entry | mid | senior | lead",
  "key_responsibilities": ["main responsibilities"],
  "company_name": "company name if mentioned, otherwise empty string"
}

JOB DESCRIPTION:
{jd_text}"""
```

- [ ] **Step 3: Create prompts/question_generation.py**

```python
QUESTION_GENERATION_PROMPT = """You are a senior technical interviewer conducting a mock interview for a tech role.

CANDIDATE PROFILE:
- Skills: {skills}
- Experience: {experience_summary}
- Projects: {projects_summary}

JOB REQUIREMENTS:
- Role: {role_title}
- Required Skills: {required_skills}
- Key Responsibilities: {responsibilities}

INTERVIEW CONTEXT:
- Current question number: {question_number} of 10
- Difficulty level: {difficulty} (easy/medium/hard)
- Category: {category} (technical/conceptual/behavioral/scenario)
- Topics already covered (DO NOT repeat): {covered_topics}

DIFFICULTY GUIDELINES:
- EASY: Fundamental concepts, definitions, basic usage. Example: "What is a REST API?"
- MEDIUM: Application, comparison, design decisions. Example: "Compare SQL vs NoSQL for a social media feed."
- HARD: Complex scenarios, trade-offs, system design, edge cases. Example: "Design a rate limiter for a distributed API gateway handling 10M requests/sec."

CATEGORY GUIDELINES:
- TECHNICAL: Coding, algorithms, specific technology questions
- CONCEPTUAL: Theory, architecture, design principles
- BEHAVIORAL: Past experience, teamwork, conflict resolution (STAR method)
- SCENARIO: Hypothetical situations, problem-solving, debugging

Generate exactly ONE interview question. The question must:
1. Be at the specified difficulty level
2. Match the specified category
3. Be relevant to both the candidate's background AND the job requirements
4. NOT repeat any topic already covered
5. Be clear and specific (not vague or overly broad)

Return ONLY the question text, nothing else."""
```

- [ ] **Step 4: Create prompts/answer_evaluation.py**

```python
ANSWER_EVALUATION_PROMPT = """You are an objective interview evaluator. Score the candidate's answer to the following interview question.

QUESTION ({difficulty} difficulty, {category} category):
{question}

CANDIDATE'S ANSWER:
{answer}

TIME TAKEN: {time_taken} seconds (limit: 120 seconds)

CANDIDATE BACKGROUND:
- Skills: {skills}
- Experience Level: {experience_level}

SCORING RUBRIC — score each dimension from 0 to 20:

1. ACCURACY (0-20): Correctness of facts, concepts, and technical details.
   - 0-5: Mostly incorrect or irrelevant
   - 6-10: Partially correct with significant errors
   - 11-15: Mostly correct with minor gaps
   - 16-20: Fully correct and precise

2. CLARITY (0-20): How clearly and coherently the answer is communicated.
   - 0-5: Incoherent or very poorly structured
   - 6-10: Understandable but disorganized
   - 11-15: Clear with minor structure issues
   - 16-20: Exceptionally clear and well-structured

3. DEPTH (0-20): Level of detail, examples, and thoroughness.
   - 0-5: Surface-level only
   - 6-10: Some detail but lacking examples
   - 11-15: Good detail with examples
   - 16-20: Exceptional depth with multiple examples and edge cases

4. RELEVANCE (0-20): How well the answer addresses the specific question asked.
   - 0-5: Off-topic or tangential
   - 6-10: Partially addresses the question
   - 11-15: Addresses the question well
   - 16-20: Directly and comprehensively addresses every aspect

5. COMPLETENESS (0-20): Coverage of all aspects of the question.
   - 0-5: Major aspects missing
   - 6-10: Some aspects covered
   - 11-15: Most aspects covered
   - 16-20: All aspects thoroughly covered

DIFFICULTY CALIBRATION:
- For EASY questions: a correct, clear answer should score 14-16+ per dimension
- For MEDIUM questions: requires comparison, analysis, or applied knowledge for high scores
- For HARD questions: requires edge cases, trade-offs, and deep expertise for high scores

Return a JSON object:
{{
  "accuracy": <0-20>,
  "clarity": <0-20>,
  "depth": <0-20>,
  "relevance": <0-20>,
  "completeness": <0-20>,
  "total": <sum of all five, 0-100>,
  "reasoning": "2-3 sentence explanation of the score, noting strengths and areas for improvement"
}}"""
```

- [ ] **Step 5: Create prompts/report_generation.py**

```python
REPORT_GENERATION_PROMPT = """Analyze this complete mock interview session and generate a comprehensive readiness report.

CANDIDATE PROFILE:
{candidate_profile}

TARGET JOB:
{jd_analysis}

INTERVIEW SESSION DATA:
{session_data}

SCORING SUMMARY:
- Total questions answered: {total_questions}
- Average score: {avg_score}/100
- Difficulty progression: {difficulty_progression}
- Terminated early: {terminated_early}

Generate a detailed report as a JSON object:
{{
  "readiness_score": <0-100, overall interview readiness>,
  "readiness_label": "<Strong (70-100) | Average (40-69) | Needs Improvement (0-39)>",
  "hiring_readiness": "<Ready | Almost Ready | Not Ready> for the specific role",
  "skill_breakdown": [
    {{"skill": "skill name", "score": <0-100>, "label": "<Strong|Average|Needs Improvement>"}}
  ],
  "strengths": ["top strength 1", "top strength 2", "top strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "recommendations": [
    "specific actionable recommendation 1",
    "specific actionable recommendation 2",
    "specific actionable recommendation 3"
  ]
}}

GUIDELINES:
- The readiness_score should reflect overall performance weighted by difficulty (harder questions count more)
- skill_breakdown should cover 4-6 key skill areas relevant to the JD
- strengths and weaknesses should reference specific moments from the interview
- recommendations should be concrete and actionable (e.g., "Practice system design problems focusing on distributed caching" not "Improve system design skills")"""
```

- [ ] **Step 6: Commit**

```bash
git add Hack2Hire_Backend/prompts/
git commit -m "feat: add all 5 Gemini prompt templates"
```

---

## Task 6: Gemini AI Service

**Files:**
- Create: `Hack2Hire_Backend/services/gemini_service.py`

- [ ] **Step 1: Implement gemini_service.py**

```python
# services/gemini_service.py
import os
import json
import google.generativeai as genai
from prompts.resume_analysis import RESUME_ANALYSIS_PROMPT
from prompts.jd_analysis import JD_ANALYSIS_PROMPT
from prompts.question_generation import QUESTION_GENERATION_PROMPT
from prompts.answer_evaluation import ANSWER_EVALUATION_PROMPT
from prompts.report_generation import REPORT_GENERATION_PROMPT

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Model instances
_eval_model = genai.GenerativeModel(
    "gemini-2.0-flash",
    generation_config=genai.GenerationConfig(
        temperature=0.3,
        response_mime_type="application/json",
    ),
)

_gen_model = genai.GenerativeModel(
    "gemini-2.0-flash",
    generation_config=genai.GenerationConfig(
        temperature=0.7,
    ),
)

_json_gen_model = genai.GenerativeModel(
    "gemini-2.0-flash",
    generation_config=genai.GenerationConfig(
        temperature=0.7,
        response_mime_type="application/json",
    ),
)


def analyze_resume(resume_text: str) -> dict:
    """Extract structured data from resume text."""
    prompt = RESUME_ANALYSIS_PROMPT.format(resume_text=resume_text)
    response = _eval_model.generate_content(prompt)
    return json.loads(response.text)


def analyze_jd(jd_text: str) -> dict:
    """Extract structured requirements from job description."""
    prompt = JD_ANALYSIS_PROMPT.format(jd_text=jd_text)
    response = _eval_model.generate_content(prompt)
    return json.loads(response.text)


def generate_question(
    candidate_profile: dict,
    jd_analysis: dict,
    question_number: int,
    difficulty: str,
    category: str,
    covered_topics: list[str],
) -> str:
    """Generate a single interview question."""
    skills = ", ".join(candidate_profile.get("skills", []))
    experience_summary = "; ".join(
        f"{e.get('role', '')} at {e.get('company', '')}"
        for e in candidate_profile.get("experience", [])
    )
    projects_summary = "; ".join(
        f"{p.get('name', '')}: {p.get('description', '')}"
        for p in candidate_profile.get("projects", [])
    )

    prompt = QUESTION_GENERATION_PROMPT.format(
        skills=skills,
        experience_summary=experience_summary or "No prior experience listed",
        projects_summary=projects_summary or "No projects listed",
        role_title=jd_analysis.get("role_title", "Software Engineer"),
        required_skills=", ".join(jd_analysis.get("required_skills", [])),
        responsibilities="; ".join(jd_analysis.get("key_responsibilities", [])),
        question_number=question_number,
        difficulty=difficulty,
        category=category,
        covered_topics="; ".join(covered_topics) if covered_topics else "None yet",
    )

    response = _gen_model.generate_content(prompt)
    return response.text.strip().strip('"')


def evaluate_answer(
    question: str,
    answer: str,
    difficulty: str,
    category: str,
    time_taken: int,
    candidate_profile: dict,
) -> dict:
    """Evaluate a candidate's answer and return structured scores."""
    prompt = ANSWER_EVALUATION_PROMPT.format(
        question=question,
        answer=answer,
        difficulty=difficulty,
        category=category,
        time_taken=time_taken,
        skills=", ".join(candidate_profile.get("skills", [])),
        experience_level=f"{candidate_profile.get('total_years_experience', 0)} years",
    )

    response = _eval_model.generate_content(prompt)
    result = json.loads(response.text)

    # Ensure total is the sum of individual scores
    result["total"] = (
        result.get("accuracy", 0)
        + result.get("clarity", 0)
        + result.get("depth", 0)
        + result.get("relevance", 0)
        + result.get("completeness", 0)
    )

    return result


def generate_report(
    candidate_profile: dict,
    jd_analysis: dict,
    questions: list[dict],
    avg_score: float,
    difficulty_progression: list[str],
    terminated_early: bool,
) -> dict:
    """Generate comprehensive interview report."""
    session_data = json.dumps(
        [
            {
                "question_number": q["number"],
                "question": q["text"],
                "answer": q["answer"],
                "difficulty": q["difficulty"],
                "category": q["category"],
                "score": q["score"],
                "time_taken": q["time_taken"],
            }
            for q in questions
        ],
        indent=2,
    )

    prompt = REPORT_GENERATION_PROMPT.format(
        candidate_profile=json.dumps(candidate_profile, indent=2),
        jd_analysis=json.dumps(jd_analysis, indent=2),
        session_data=session_data,
        total_questions=len(questions),
        avg_score=f"{avg_score:.1f}",
        difficulty_progression=" → ".join(difficulty_progression),
        terminated_early=str(terminated_early).lower(),
    )

    response = _json_gen_model.generate_content(prompt)
    return json.loads(response.text)
```

- [ ] **Step 2: Verify import works**

```bash
cd Hack2Hire_Backend && python -c "from services.gemini_service import analyze_resume; print('OK')"
```

Expected: prints `OK`

- [ ] **Step 3: Commit**

```bash
git add Hack2Hire_Backend/services/gemini_service.py
git commit -m "feat: add Gemini AI service with all 5 API functions"
```

---

## Task 7: Resume Parser Service

**Files:**
- Create: `Hack2Hire_Backend/services/resume_parser.py`

- [ ] **Step 1: Implement resume_parser.py**

```python
# services/resume_parser.py
from PyPDF2 import PdfReader
from io import BytesIO


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF file."""
    reader = PdfReader(BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)

    text = "\n".join(text_parts)

    if not text.strip():
        raise ValueError("Could not extract text from PDF. The file may be image-based.")

    return text
```

- [ ] **Step 2: Commit**

```bash
git add Hack2Hire_Backend/services/resume_parser.py
git commit -m "feat: add PDF text extraction service"
```

---

## Task 8: Interview State Machine

**Files:**
- Create: `Hack2Hire_Backend/services/state_machine.py`

- [ ] **Step 1: Implement state_machine.py**

This orchestrates the entire interview flow by composing the other services.

```python
# services/state_machine.py
from models.interview_state import InterviewSession, QuestionRecord, sessions
from services.gemini_service import (
    analyze_resume,
    analyze_jd,
    generate_question,
    evaluate_answer,
    generate_report,
)
from services.resume_parser import extract_text_from_pdf
from services.difficulty_adaptor import get_next_difficulty
from services.scoring import apply_time_penalty, is_empty_answer, check_termination


def setup_interview(resume_bytes: bytes, job_description: str) -> InterviewSession:
    """Parse resume and JD, create interview session."""
    # Extract text from PDF
    resume_text = extract_text_from_pdf(resume_bytes)

    # Analyze resume and JD via Gemini
    candidate_profile = analyze_resume(resume_text)
    jd_analysis = analyze_jd(job_description)

    # Compute matched skills
    resume_skills = {s.lower() for s in candidate_profile.get("skills", [])}
    required_skills = {s.lower() for s in jd_analysis.get("required_skills", [])}
    preferred_skills = {s.lower() for s in jd_analysis.get("preferred_skills", [])}
    all_jd_skills = required_skills | preferred_skills

    matched = [s for s in candidate_profile.get("skills", []) if s.lower() in all_jd_skills]

    # Create session
    session = InterviewSession()
    session.candidate_profile = candidate_profile
    session.jd_analysis = jd_analysis
    session.matched_skills = matched

    # Store in memory
    sessions[session.session_id] = session
    return session


def start_interview(session_id: str) -> dict:
    """Start the interview — generate the first question."""
    session = sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")
    if session.state != "setup":
        raise ValueError(f"Session is in '{session.state}' state, expected 'setup'")

    session.state = "in_progress"
    session.current_question = 1
    session.current_difficulty = "easy"

    category = session.get_next_category()

    question_text = generate_question(
        candidate_profile=session.candidate_profile,
        jd_analysis=session.jd_analysis,
        question_number=1,
        difficulty="easy",
        category=category,
        covered_topics=[],
    )

    record = QuestionRecord(
        number=1,
        text=question_text,
        category=category,
        difficulty="easy",
    )
    session.questions.append(record)

    return {
        "question_number": 1,
        "question_text": question_text,
        "difficulty": "easy",
        "category": category,
        "time_limit": 120,
    }


def submit_answer(session_id: str, answer_text: str, time_taken_seconds: int) -> dict:
    """Process an answer: evaluate, adapt difficulty, check termination, generate next Q."""
    session = sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")
    if session.state != "in_progress":
        raise ValueError(f"Session is in '{session.state}' state, expected 'in_progress'")

    current_q = session.questions[-1]

    # Handle empty answers
    if is_empty_answer(answer_text):
        evaluation = {
            "accuracy": 0,
            "clarity": 0,
            "depth": 0,
            "relevance": 0,
            "completeness": 0,
            "total": 0,
            "reasoning": "No substantive answer provided",
        }
    else:
        # Evaluate via Gemini
        evaluation = evaluate_answer(
            question=current_q.text,
            answer=answer_text,
            difficulty=current_q.difficulty,
            category=current_q.category,
            time_taken=time_taken_seconds,
            candidate_profile=session.candidate_profile,
        )

        # Apply time penalty
        if time_taken_seconds > 120:
            original_total = evaluation["total"]
            evaluation["total"] = apply_time_penalty(original_total, time_taken_seconds)
            evaluation["reasoning"] += f" (Time penalty applied: {original_total} → {evaluation['total']})"

    # Store answer and evaluation
    current_q.answer = answer_text
    current_q.time_taken = time_taken_seconds
    current_q.evaluation = evaluation

    score = evaluation["total"]

    # Track consecutive low scores
    if score < 30:
        session.consecutive_low_scores += 1
    else:
        session.consecutive_low_scores = 0

    # Get next difficulty
    next_difficulty = get_next_difficulty(session.current_difficulty, score)
    session.current_difficulty = next_difficulty

    # Check termination
    all_scores = session.get_scores()
    termination_reason = check_termination(
        consecutive_low_scores=session.consecutive_low_scores,
        scores=all_scores,
    )

    # Determine interview status
    is_last_question = session.current_question >= 10
    next_question_data = None

    if termination_reason:
        session.state = "terminated"
        session.termination_reason = termination_reason
        interview_status = "terminated"
    elif is_last_question:
        session.state = "completed"
        interview_status = "completed"
    else:
        # Generate next question
        session.current_question += 1
        category = session.get_next_category()

        question_text = generate_question(
            candidate_profile=session.candidate_profile,
            jd_analysis=session.jd_analysis,
            question_number=session.current_question,
            difficulty=next_difficulty,
            category=category,
            covered_topics=session.get_covered_topics(),
        )

        record = QuestionRecord(
            number=session.current_question,
            text=question_text,
            category=category,
            difficulty=next_difficulty,
        )
        session.questions.append(record)

        next_question_data = {
            "question_number": session.current_question,
            "question_text": question_text,
            "difficulty": next_difficulty,
            "category": category,
            "time_limit": 120,
        }
        interview_status = "in_progress"

    return {
        "evaluation": evaluation,
        "next_question": next_question_data,
        "interview_status": interview_status,
        "termination_reason": termination_reason,
        "progress": {
            "current_question": session.current_question,
            "total_questions": 10,
            "current_difficulty": session.current_difficulty,
            "avg_score": round(session.get_avg_score(), 1),
        },
    }


def get_report(session_id: str) -> dict:
    """Generate the final interview report."""
    session = sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")
    if session.state not in ("completed", "terminated"):
        raise ValueError(f"Session is in '{session.state}' state, interview not finished")

    # Build question data for report
    questions_data = []
    difficulty_progression = []
    total_time = 0

    for q in session.questions:
        if q.evaluation is not None:
            questions_data.append({
                "number": q.number,
                "text": q.text,
                "answer": q.answer or "",
                "difficulty": q.difficulty,
                "category": q.category,
                "score": q.evaluation["total"],
                "time_taken": q.time_taken or 0,
                "evaluation": q.evaluation,
            })
            difficulty_progression.append(q.difficulty)
            total_time += q.time_taken or 0

    avg_score = session.get_avg_score()

    # Generate report via Gemini
    report = generate_report(
        candidate_profile=session.candidate_profile,
        jd_analysis=session.jd_analysis,
        questions=questions_data,
        avg_score=avg_score,
        difficulty_progression=difficulty_progression,
        terminated_early=session.state == "terminated",
    )

    # Build question history for response
    question_history = [
        {
            "number": q["number"],
            "question": q["text"],
            "answer": q["answer"],
            "score": q["score"],
            "difficulty": q["difficulty"],
            "category": q["category"],
            "time_taken": q["time_taken"],
            "evaluation": q["evaluation"],
        }
        for q in questions_data
    ]

    return {
        **report,
        "question_history": question_history,
        "difficulty_progression": difficulty_progression,
        "interview_summary": {
            "total_questions": len(questions_data),
            "avg_score": round(avg_score, 1),
            "terminated_early": session.state == "terminated",
            "total_time": total_time,
        },
    }
```

- [ ] **Step 2: Commit**

```bash
git add Hack2Hire_Backend/services/state_machine.py
git commit -m "feat: add interview state machine orchestrating full interview flow"
```

---

## Task 9: API Router & Wire to main.py

**Files:**
- Create: `Hack2Hire_Backend/routers/interview.py`
- Modify: `Hack2Hire_Backend/main.py`

- [ ] **Step 1: Implement routers/interview.py**

```python
# routers/interview.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.state_machine import setup_interview, start_interview, submit_answer, get_report
from models.schemas import (
    SetupResponse,
    StartRequest,
    StartResponse,
    AnswerRequest,
    AnswerResponse,
    ReportResponse,
)

router = APIRouter(prefix="/api/interview", tags=["interview"])


@router.post("/setup", response_model=SetupResponse)
async def interview_setup(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
):
    """Upload resume and JD to start interview setup."""
    if not resume_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        file_bytes = await resume_file.read()
        session = setup_interview(file_bytes, job_description)

        return SetupResponse(
            session_id=session.session_id,
            candidate_profile=session.candidate_profile,
            jd_analysis=session.jd_analysis,
            matched_skills=session.matched_skills,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process: {str(e)}")


@router.post("/start", response_model=StartResponse)
async def interview_start(request: StartRequest):
    """Start the interview and get the first question."""
    try:
        result = start_interview(request.session_id)
        return StartResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start: {str(e)}")


@router.post("/answer", response_model=AnswerResponse)
async def interview_answer(request: AnswerRequest):
    """Submit an answer and get evaluation + next question."""
    try:
        result = submit_answer(
            session_id=request.session_id,
            answer_text=request.answer_text,
            time_taken_seconds=request.time_taken_seconds,
        )
        return AnswerResponse(
            evaluation=result["evaluation"],
            next_question=result["next_question"],
            interview_status=result["interview_status"],
            termination_reason=result["termination_reason"],
            progress=result["progress"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process answer: {str(e)}")


@router.get("/report/{session_id}", response_model=ReportResponse)
async def interview_report(session_id: str):
    """Get the final interview report."""
    try:
        result = get_report(session_id)
        return ReportResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
```

- [ ] **Step 2: Update main.py to mount the router**

Replace the full content of `main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.interview import router as interview_router

load_dotenv()

app = FastAPI(title="TakeOff API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "TakeOff API"}
```

- [ ] **Step 3: Verify server starts and docs load**

```bash
cd Hack2Hire_Backend && uvicorn main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` — should show all 4 interview endpoints + health.

- [ ] **Step 4: Commit**

```bash
git add Hack2Hire_Backend/routers/interview.py Hack2Hire_Backend/main.py
git commit -m "feat: add interview API router with all 4 endpoints"
```

---

## Task 10: Frontend Project Scaffold + Theme

**Files:**
- Create: `Hack2Hire_Frontend/` (via Vite)
- Create: `Hack2Hire_Frontend/src/index.css`
- Create: `Hack2Hire_Frontend/src/App.jsx`
- Create: `Hack2Hire_Frontend/src/api/interview.js`
- Create: `Hack2Hire_Frontend/src/components/Navbar.jsx`
- Create: `Hack2Hire_Frontend/src/components/Navbar.css`

- [ ] **Step 1: Scaffold React app with Vite**

```bash
cd Hack2Hire_Frontend && npm create vite@latest . -- --template react
npm install
npm install react-router-dom axios
```

- [ ] **Step 2: Replace src/index.css with TakeOff theme**

```css
/* TakeOff Design System */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  --color-navy: #1a1a2e;
  --color-navy-light: #16213e;
  --color-orange: #ff6b35;
  --color-orange-hover: #e55a2b;
  --color-orange-light: rgba(255, 107, 53, 0.1);
  --color-white: #ffffff;
  --color-gray-bg: #f5f5f7;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-text: #6b7280;
  --color-gray-dark: #374151;
  --color-success: #22c55e;
  --color-success-bg: rgba(34, 197, 94, 0.1);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-danger: #ef4444;
  --color-danger-bg: rgba(239, 68, 68, 0.1);
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  --transition: all 0.2s ease;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-main);
  background: var(--color-gray-bg);
  color: var(--color-navy);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

button {
  cursor: pointer;
  font-family: var(--font-main);
  border: none;
  outline: none;
  transition: var(--transition);
}

input, textarea {
  font-family: var(--font-main);
  outline: none;
  transition: var(--transition);
}

.btn-primary {
  background: var(--color-orange);
  color: white;
  padding: 14px 32px;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover {
  background: var(--color-orange-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: var(--color-white);
  color: var(--color-gray-dark);
  padding: 14px 32px;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  border: 1px solid var(--color-gray-200);
}

.btn-secondary:hover {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
}

.card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

.animate-pulse {
  animation: pulse 1s ease-in-out infinite;
}
```

- [ ] **Step 3: Create src/api/interview.js**

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/interview';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s timeout for Gemini calls
});

export async function setupInterview(resumeFile, jobDescription) {
  const formData = new FormData();
  formData.append('resume_file', resumeFile);
  formData.append('job_description', jobDescription);

  const response = await api.post('/setup', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function startInterview(sessionId) {
  const response = await api.post('/start', { session_id: sessionId });
  return response.data;
}

export async function submitAnswer(sessionId, answerText, timeTakenSeconds) {
  const response = await api.post('/answer', {
    session_id: sessionId,
    answer_text: answerText,
    time_taken_seconds: timeTakenSeconds,
  });
  return response.data;
}

export async function getReport(sessionId) {
  const response = await api.get(`/report/${sessionId}`);
  return response.data;
}
```

- [ ] **Step 4: Create src/components/Navbar.jsx and Navbar.css**

```jsx
// src/components/Navbar.jsx
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <span className="navbar-icon">&#128640;</span>
        <span className="navbar-title">TakeOff</span>
      </div>
    </nav>
  );
}
```

```css
/* src/components/Navbar.css */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 40px;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.navbar-icon {
  font-size: 28px;
}

.navbar-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-navy);
  letter-spacing: -0.5px;
}
```

- [ ] **Step 5: Create src/App.jsx with router**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import InterviewRoom from './pages/InterviewRoom';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SetupPage />} />
        <Route path="/interview/:sessionId" element={<InterviewRoom />} />
        <Route path="/results/:sessionId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Create placeholder pages so app compiles**

Create `src/pages/SetupPage.jsx`:
```jsx
export default function SetupPage() {
  return <div>Setup Page</div>;
}
```

Create `src/pages/InterviewRoom.jsx`:
```jsx
export default function InterviewRoom() {
  return <div>Interview Room</div>;
}
```

Create `src/pages/ResultsPage.jsx`:
```jsx
export default function ResultsPage() {
  return <div>Results Page</div>;
}
```

- [ ] **Step 7: Verify frontend starts**

```bash
cd Hack2Hire_Frontend && npm run dev
```

Expected: App loads at `http://localhost:5173`, shows "Setup Page"

- [ ] **Step 8: Commit**

```bash
git add Hack2Hire_Frontend/
git commit -m "feat: scaffold React frontend with theme, routing, and API client"
```

---

## Task 11: Setup Page

**Files:**
- Modify: `Hack2Hire_Frontend/src/pages/SetupPage.jsx`
- Create: `Hack2Hire_Frontend/src/pages/SetupPage.css`
- Create: `Hack2Hire_Frontend/src/components/ResumeUploader.jsx`

- [ ] **Step 1: Create src/components/ResumeUploader.jsx**

```jsx
import { useState, useRef } from 'react';

export default function ResumeUploader({ onFileSelect, selectedFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`resume-uploader ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {selectedFile ? (
        <div className="file-preview">
          <span className="file-icon">&#128196;</span>
          <span className="file-name">{selectedFile.name}</span>
          <span className="file-check">&#10003;</span>
        </div>
      ) : (
        <div className="upload-prompt">
          <span className="upload-icon">&#128196;</span>
          <p className="upload-title">Upload Resume</p>
          <p className="upload-subtitle">Drag & drop your PDF here, or click to browse</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create src/pages/SetupPage.css**

```css
.setup-page {
  min-height: 100vh;
  background: var(--color-white);
}

.setup-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 60px 24px;
}

.setup-hero {
  text-align: center;
  margin-bottom: 48px;
}

.setup-hero h1 {
  font-size: 48px;
  font-weight: 800;
  color: var(--color-navy);
  line-height: 1.2;
  margin-bottom: 16px;
  letter-spacing: -1px;
}

.setup-hero h1 .accent {
  color: var(--color-orange);
}

.setup-hero p {
  font-size: 18px;
  color: var(--color-gray-text);
  max-width: 520px;
  margin: 0 auto;
}

.setup-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.resume-uploader {
  border: 2px dashed var(--color-gray-300);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: var(--transition);
  background: var(--color-gray-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
}

.resume-uploader:hover,
.resume-uploader.dragging {
  border-color: var(--color-orange);
  background: var(--color-orange-light);
}

.resume-uploader.has-file {
  border-color: var(--color-success);
  border-style: solid;
  background: var(--color-success-bg);
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 48px;
  opacity: 0.5;
}

.upload-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-navy);
}

.upload-subtitle {
  font-size: 14px;
  color: var(--color-gray-text);
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 32px;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-navy);
}

.file-check {
  color: var(--color-success);
  font-size: 20px;
  font-weight: bold;
}

.jd-section {
  display: flex;
  flex-direction: column;
}

.jd-section label {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-navy);
  margin-bottom: 12px;
}

.jd-textarea {
  flex: 1;
  min-height: 250px;
  padding: 16px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius);
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  background: var(--color-gray-bg);
  color: var(--color-navy);
}

.jd-textarea:focus {
  border-color: var(--color-orange);
  background: var(--color-white);
}

.jd-textarea::placeholder {
  color: var(--color-gray-text);
}

.setup-actions {
  text-align: center;
}

.setup-actions .btn-primary {
  padding: 16px 48px;
  font-size: 18px;
}

.setup-loading {
  text-align: center;
  padding: 60px 24px;
}

.setup-loading p {
  font-size: 18px;
  color: var(--color-gray-text);
  margin-top: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-gray-200);
  border-top-color: var(--color-orange);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  padding: 12px 20px;
  border-radius: var(--radius-sm);
  text-align: center;
  margin-bottom: 24px;
  font-weight: 500;
}
```

- [ ] **Step 3: Implement src/pages/SetupPage.jsx**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ResumeUploader from '../components/ResumeUploader';
import { setupInterview, startInterview } from '../api/interview';
import './SetupPage.css';

export default function SetupPage() {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = resumeFile && jobDescription.trim().length > 20 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      const setupData = await setupInterview(resumeFile, jobDescription);
      await startInterview(setupData.session_id);
      navigate(`/interview/${setupData.session_id}`);
    } catch (err) {
      const message = err.response?.data?.detail || 'Something went wrong. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="setup-page">
        <Navbar />
        <div className="setup-content">
          <div className="setup-loading">
            <div className="spinner" />
            <p>Analyzing your resume and preparing your interview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <Navbar />
      <div className="setup-content">
        <div className="setup-hero">
          <h1>
            From layoff<br />
            to your <span className="accent">dream job.</span>
          </h1>
          <p>
            Upload your resume and paste the job description.
            Our AI interviewer will prepare a personalized mock interview.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="setup-form">
          <ResumeUploader onFileSelect={setResumeFile} selectedFile={resumeFile} />
          <div className="jd-section">
            <label>Job Description</label>
            <textarea
              className="jd-textarea"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="setup-actions">
          <button className="btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
            &#128640; Start Your TakeOff &#8599;
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify page renders**

```bash
cd Hack2Hire_Frontend && npm run dev
```

Navigate to `http://localhost:5173` — should see the hero, upload zone, and JD textarea.

- [ ] **Step 5: Commit**

```bash
git add Hack2Hire_Frontend/src/
git commit -m "feat: implement Setup page with resume upload and JD input"
```

---

## Task 12: Interview Room — Components

**Files:**
- Create: `Hack2Hire_Frontend/src/components/Timer.jsx`
- Create: `Hack2Hire_Frontend/src/components/DifficultyBadge.jsx`
- Create: `Hack2Hire_Frontend/src/components/ProgressBar.jsx`
- Create: `Hack2Hire_Frontend/src/components/ScoreCard.jsx`
- Create: `Hack2Hire_Frontend/src/components/QuestionPanel.jsx`
- Create: `Hack2Hire_Frontend/src/components/AnswerPanel.jsx`
- Create: `Hack2Hire_Frontend/src/components/DifficultyTrend.jsx`

- [ ] **Step 1: Create Timer.jsx**

```jsx
import { useState, useEffect, useRef } from 'react';

export default function Timer({ duration, onExpire, isPaused }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (isPaused) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isPaused, duration]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const percentage = (timeLeft / duration) * 100;

  let colorClass = 'timer-green';
  if (timeLeft <= 10) colorClass = 'timer-red';
  else if (timeLeft <= 30) colorClass = 'timer-orange';

  return (
    <div className={`timer ${colorClass} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
      <div className="timer-bar" style={{ width: `${percentage}%` }} />
      <span className="timer-text">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create DifficultyBadge.jsx**

```jsx
export default function DifficultyBadge({ difficulty }) {
  const config = {
    easy: { label: 'Easy', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    medium: { label: 'Medium', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
    hard: { label: 'Hard', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  };

  const { label, color, bg } = config[difficulty] || config.easy;

  return (
    <span
      className="difficulty-badge"
      style={{ color, background: bg, border: `1px solid ${color}` }}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 3: Create ProgressBar.jsx**

```jsx
export default function ProgressBar({ current, total }) {
  const percentage = (current / total) * 100;

  return (
    <div className="progress-container">
      <span className="progress-label">Q {current}/{total}</span>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ScoreCard.jsx**

```jsx
export default function ScoreCard({ evaluation }) {
  if (!evaluation) return null;

  const { total, reasoning, accuracy, clarity, depth, relevance, completeness } = evaluation;

  let scoreColor = 'var(--color-danger)';
  if (total > 70) scoreColor = 'var(--color-success)';
  else if (total >= 40) scoreColor = 'var(--color-warning)';

  return (
    <div className="score-card animate-slide-in">
      <div className="score-header">
        <span className="score-label">Previous Score</span>
        <span className="score-value" style={{ color: scoreColor }}>{total}/100</span>
      </div>
      <div className="score-breakdown">
        <ScoreBar label="Accuracy" value={accuracy} />
        <ScoreBar label="Clarity" value={clarity} />
        <ScoreBar label="Depth" value={depth} />
        <ScoreBar label="Relevance" value={relevance} />
        <ScoreBar label="Completeness" value={completeness} />
      </div>
      <p className="score-reasoning">{reasoning}</p>
    </div>
  );
}

function ScoreBar({ label, value }) {
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${(value / 20) * 100}%` }} />
      </div>
      <span className="score-bar-value">{value}</span>
    </div>
  );
}
```

- [ ] **Step 5: Create QuestionPanel.jsx**

```jsx
import DifficultyBadge from './DifficultyBadge';
import ScoreCard from './ScoreCard';

export default function QuestionPanel({ question, previousEvaluation }) {
  if (!question) return null;

  return (
    <div className="question-panel">
      <div className="question-meta">
        <DifficultyBadge difficulty={question.difficulty} />
        <span className="question-category">{question.category}</span>
      </div>
      <div className="question-text">
        {question.question_text}
      </div>
      {previousEvaluation && <ScoreCard evaluation={previousEvaluation} />}
    </div>
  );
}
```

- [ ] **Step 6: Create AnswerPanel.jsx**

```jsx
import { useState } from 'react';

export default function AnswerPanel({ onSubmit, onSkip, isSubmitting }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (isSubmitting) return;
    onSubmit(answer);
    setAnswer('');
  };

  const handleSkip = () => {
    if (isSubmitting) return;
    onSkip();
    setAnswer('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="answer-panel">
      <textarea
        className="answer-textarea"
        placeholder="Type your answer here... (Ctrl+Enter to submit)"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
      />
      <div className="answer-actions">
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Evaluating...' : 'Submit Answer →'}
        </button>
        <button
          className="btn-secondary btn-skip"
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create DifficultyTrend.jsx**

```jsx
export default function DifficultyTrend({ questions, avgScore }) {
  const dotColors = {
    easy: 'var(--color-success)',
    medium: 'var(--color-warning)',
    hard: 'var(--color-danger)',
  };

  return (
    <div className="difficulty-trend">
      <div className="trend-dots">
        {questions.map((q, i) => (
          <span
            key={i}
            className="trend-dot"
            style={{ background: dotColors[q.difficulty] }}
            title={`Q${q.number}: ${q.difficulty} - Score: ${q.evaluation?.total ?? '?'}`}
          />
        ))}
      </div>
      <span className="trend-avg">Avg: {Math.round(avgScore)}/100</span>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add Hack2Hire_Frontend/src/components/
git commit -m "feat: add interview room UI components (timer, panels, badges, scores)"
```

---

## Task 13: Interview Room — Page Orchestrator

**Files:**
- Modify: `Hack2Hire_Frontend/src/pages/InterviewRoom.jsx`
- Create: `Hack2Hire_Frontend/src/pages/InterviewRoom.css`

- [ ] **Step 1: Implement InterviewRoom.jsx**

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Timer from '../components/Timer';
import ProgressBar from '../components/ProgressBar';
import QuestionPanel from '../components/QuestionPanel';
import AnswerPanel from '../components/AnswerPanel';
import DifficultyTrend from '../components/DifficultyTrend';
import { submitAnswer } from '../api/interview';
import './InterviewRoom.css';

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [previousEvaluation, setPreviousEvaluation] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [progress, setProgress] = useState({ current_question: 1, total_questions: 10, current_difficulty: 'easy', avg_score: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [showTermination, setShowTermination] = useState(null);

  const startTimeRef = useRef(Date.now());
  const answerRef = useRef('');

  // Load first question from sessionStorage (set during setup)
  useEffect(() => {
    const stored = sessionStorage.getItem(`interview_${sessionId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setCurrentQuestion(data);
      startTimeRef.current = Date.now();
    }
  }, [sessionId]);

  const handleSubmit = useCallback(async (answerText) => {
    if (isSubmitting || !currentQuestion) return;
    setIsSubmitting(true);

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const result = await submitAnswer(sessionId, answerText, timeTaken);

      // Store answered question
      const answeredQ = {
        ...currentQuestion,
        answer: answerText,
        time_taken: timeTaken,
        evaluation: result.evaluation,
      };
      setAnsweredQuestions((prev) => [...prev, answeredQ]);
      setPreviousEvaluation(result.evaluation);
      setProgress(result.progress);

      if (result.interview_status === 'terminated') {
        setShowTermination(result.termination_reason);
        setCurrentQuestion(null);
      } else if (result.interview_status === 'completed') {
        setTimeout(() => navigate(`/results/${sessionId}`), 2000);
        setCurrentQuestion(null);
      } else if (result.next_question) {
        // Brief pause to show score, then next question
        setTimeout(() => {
          setCurrentQuestion(result.next_question);
          setTimerKey((k) => k + 1);
          startTimeRef.current = Date.now();
          setIsSubmitting(false);
        }, 2000);
        return; // Don't set isSubmitting false yet
      }
    } catch (err) {
      console.error('Submit error:', err);
    }

    setIsSubmitting(false);
  }, [isSubmitting, currentQuestion, sessionId, navigate]);

  const handleSkip = useCallback(() => {
    handleSubmit('');
  }, [handleSubmit]);

  const handleTimerExpire = useCallback(() => {
    // Auto-submit with whatever is typed
    const textarea = document.querySelector('.answer-textarea');
    const currentAnswer = textarea?.value || '';
    handleSubmit(currentAnswer);
  }, [handleSubmit]);

  if (showTermination) {
    return (
      <div className="interview-page">
        <Navbar />
        <div className="termination-overlay">
          <div className="termination-modal card">
            <h2>Interview Ended Early</h2>
            <p>{showTermination}</p>
            <button className="btn-primary" onClick={() => navigate(`/results/${sessionId}`)}>
              View Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="interview-page">
        <Navbar />
        <div className="interview-loading">
          <div className="spinner" />
          <p>Preparing your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-page">
      <div className="interview-topbar">
        <div className="topbar-brand">
          <span>&#128640;</span>
          <span className="topbar-title">TakeOff</span>
        </div>
        <ProgressBar current={currentQuestion.question_number} total={10} />
        <Timer
          key={timerKey}
          duration={120}
          onExpire={handleTimerExpire}
          isPaused={isSubmitting}
        />
      </div>

      <div className="interview-body">
        <QuestionPanel
          question={currentQuestion}
          previousEvaluation={previousEvaluation}
        />
        <AnswerPanel
          onSubmit={handleSubmit}
          onSkip={handleSkip}
          isSubmitting={isSubmitting}
        />
      </div>

      <div className="interview-bottombar">
        <DifficultyTrend
          questions={answeredQuestions}
          avgScore={progress.avg_score}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update SetupPage to store first question in sessionStorage**

In `SetupPage.jsx`, update the `handleSubmit` function:

```jsx
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      const setupData = await setupInterview(resumeFile, jobDescription);
      const firstQuestion = await startInterview(setupData.session_id);
      sessionStorage.setItem(
        `interview_${setupData.session_id}`,
        JSON.stringify(firstQuestion)
      );
      navigate(`/interview/${setupData.session_id}`);
    } catch (err) {
      const message = err.response?.data?.detail || 'Something went wrong. Please try again.';
      setError(message);
      setLoading(false);
    }
  };
```

- [ ] **Step 3: Create InterviewRoom.css**

```css
.interview-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-gray-bg);
}

.interview-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
  gap: 24px;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
}

.topbar-title {
  font-weight: 800;
  color: var(--color-navy);
}

/* Progress */
.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 300px;
}

.progress-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-navy);
  white-space: nowrap;
}

.progress-track {
  flex: 1;
  height: 8px;
  background: var(--color-gray-200);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-orange);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Timer */
.timer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 18px;
  min-width: 100px;
  position: relative;
  overflow: hidden;
}

.timer-green { background: var(--color-success-bg); color: var(--color-success); }
.timer-orange { background: var(--color-warning-bg); color: var(--color-warning); }
.timer-red { background: var(--color-danger-bg); color: var(--color-danger); }

.timer-text { position: relative; z-index: 1; }

.timer-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  opacity: 0.15;
  transition: width 1s linear;
}

.timer-green .timer-bar { background: var(--color-success); }
.timer-orange .timer-bar { background: var(--color-warning); }
.timer-red .timer-bar { background: var(--color-danger); }

/* Body */
.interview-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: hidden;
}

/* Question Panel */
.question-panel {
  padding: 32px;
  overflow-y: auto;
  border-right: 1px solid var(--color-gray-200);
  background: var(--color-white);
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.difficulty-badge {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.question-category {
  font-size: 14px;
  color: var(--color-gray-text);
  text-transform: capitalize;
}

.question-text {
  font-size: 20px;
  line-height: 1.6;
  color: var(--color-navy);
  font-weight: 500;
}

/* Score Card */
.score-card {
  margin-top: 24px;
  padding: 20px;
  background: var(--color-gray-bg);
  border-radius: var(--radius);
  border: 1px solid var(--color-gray-200);
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.score-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-gray-text);
}

.score-value {
  font-size: 24px;
  font-weight: 800;
}

.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.score-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-bar-label {
  font-size: 12px;
  color: var(--color-gray-text);
  width: 90px;
  text-align: right;
}

.score-bar-track {
  flex: 1;
  height: 6px;
  background: var(--color-gray-200);
  border-radius: 3px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  background: var(--color-orange);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.score-bar-value {
  font-size: 12px;
  font-weight: 600;
  width: 24px;
  color: var(--color-navy);
}

.score-reasoning {
  font-size: 13px;
  color: var(--color-gray-text);
  font-style: italic;
  line-height: 1.5;
}

/* Answer Panel */
.answer-panel {
  padding: 32px;
  display: flex;
  flex-direction: column;
  background: var(--color-gray-bg);
}

.answer-textarea {
  flex: 1;
  padding: 20px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius);
  font-size: 16px;
  line-height: 1.7;
  resize: none;
  background: var(--color-white);
  color: var(--color-navy);
  min-height: 200px;
}

.answer-textarea:focus {
  border-color: var(--color-orange);
}

.answer-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.answer-actions .btn-primary {
  flex: 1;
}

.btn-skip {
  padding: 14px 24px;
}

/* Bottom Bar */
.interview-bottombar {
  padding: 12px 32px;
  background: var(--color-white);
  border-top: 1px solid var(--color-gray-200);
}

.difficulty-trend {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trend-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}

.trend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.trend-avg {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-navy);
}

/* Termination */
.termination-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.termination-modal {
  text-align: center;
  max-width: 400px;
  padding: 48px;
}

.termination-modal h2 {
  color: var(--color-danger);
  margin-bottom: 16px;
}

.termination-modal p {
  color: var(--color-gray-text);
  margin-bottom: 24px;
}

/* Loading */
.interview-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.interview-loading p {
  color: var(--color-gray-text);
  font-size: 18px;
}
```

- [ ] **Step 4: Verify interview page renders**

Start both backend and frontend. Upload a resume + JD on setup page. Should navigate to interview room with first question visible, timer counting, split panels displayed.

- [ ] **Step 5: Commit**

```bash
git add Hack2Hire_Frontend/src/pages/ Hack2Hire_Frontend/src/components/
git commit -m "feat: implement Interview Room page with timer, scoring, and adaptive flow"
```

---

## Task 14: Results Dashboard Page

**Files:**
- Modify: `Hack2Hire_Frontend/src/pages/ResultsPage.jsx`
- Create: `Hack2Hire_Frontend/src/pages/ResultsPage.css`
- Create: `Hack2Hire_Frontend/src/components/ReadinessGauge.jsx`
- Create: `Hack2Hire_Frontend/src/components/SkillBreakdown.jsx`
- Create: `Hack2Hire_Frontend/src/components/QuestionHistory.jsx`

- [ ] **Step 1: Create ReadinessGauge.jsx**

```jsx
export default function ReadinessGauge({ score, label }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color = 'var(--color-danger)';
  if (score >= 70) color = 'var(--color-success)';
  else if (score >= 40) color = 'var(--color-warning)';

  return (
    <div className="readiness-gauge">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke="var(--color-gray-200)"
          strokeWidth="12"
        />
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="90" y="82" textAnchor="middle" fontSize="36" fontWeight="800" fill="var(--color-navy)">
          {score}
        </text>
        <text x="90" y="108" textAnchor="middle" fontSize="14" fill="var(--color-gray-text)">
          {label}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Create SkillBreakdown.jsx**

```jsx
export default function SkillBreakdown({ skills }) {
  if (!skills || skills.length === 0) return null;

  return (
    <div className="skill-breakdown">
      <h3>Skill Breakdown</h3>
      <div className="skill-bars">
        {skills.map((skill, i) => {
          let color = 'var(--color-danger)';
          if (skill.score >= 70) color = 'var(--color-success)';
          else if (skill.score >= 40) color = 'var(--color-warning)';

          return (
            <div key={i} className="skill-row">
              <span className="skill-name">{skill.skill}</span>
              <div className="skill-track">
                <div
                  className="skill-fill"
                  style={{ width: `${skill.score}%`, background: color }}
                />
              </div>
              <span className="skill-score" style={{ color }}>{skill.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create QuestionHistory.jsx**

```jsx
import { useState } from 'react';
import DifficultyBadge from './DifficultyBadge';

export default function QuestionHistory({ questions }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggle = (i) => {
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  return (
    <div className="question-history">
      <h3>Question History</h3>
      <div className="history-list">
        {questions.map((q, i) => {
          let scoreColor = 'var(--color-danger)';
          if (q.score > 70) scoreColor = 'var(--color-success)';
          else if (q.score >= 40) scoreColor = 'var(--color-warning)';

          return (
            <div key={i} className="history-item">
              <div className="history-header" onClick={() => toggle(i)}>
                <span className="history-number">Q{q.number}</span>
                <DifficultyBadge difficulty={q.difficulty} />
                <span className="history-category">{q.category}</span>
                <span className="history-score" style={{ color: scoreColor }}>
                  {q.score}/100
                </span>
                <span className="history-time">&#9201; {q.time_taken}s</span>
                <span className="history-toggle">
                  {expandedIndex === i ? '▼' : '▶'}
                </span>
              </div>
              {expandedIndex === i && (
                <div className="history-detail animate-slide-in">
                  <div className="history-question">
                    <strong>Q:</strong> {q.question}
                  </div>
                  <div className="history-answer">
                    <strong>A:</strong> {q.answer || '(skipped)'}
                  </div>
                  {q.evaluation?.reasoning && (
                    <div className="history-feedback">
                      <strong>Feedback:</strong> {q.evaluation.reasoning}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement ResultsPage.jsx**

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ReadinessGauge from '../components/ReadinessGauge';
import SkillBreakdown from '../components/SkillBreakdown';
import QuestionHistory from '../components/QuestionHistory';
import { getReport } from '../api/interview';
import './ResultsPage.css';

export default function ResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReport() {
      try {
        const data = await getReport(sessionId);
        setReport(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="results-page">
        <Navbar />
        <div className="results-loading">
          <div className="spinner" />
          <p>Generating your interview report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-page">
        <Navbar />
        <div className="results-error">
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Start New Interview</button>
        </div>
      </div>
    );
  }

  const { readiness_score, readiness_label, hiring_readiness, skill_breakdown,
    strengths, weaknesses, recommendations, question_history, interview_summary } = report;

  return (
    <div className="results-page">
      <Navbar />
      <div className="results-content">
        <div className="results-header">
          <h1>Interview Results</h1>
          <button className="btn-primary" onClick={() => navigate('/')}>
            &#128640; Start New Interview
          </button>
        </div>

        {/* Top Cards */}
        <div className="results-top">
          <div className="card gauge-card">
            <h3>Interview Readiness</h3>
            <ReadinessGauge score={readiness_score} label={readiness_label} />
          </div>
          <div className="card hiring-card">
            <h3>Hiring Readiness</h3>
            <div className="hiring-status">
              <span className={`hiring-badge hiring-${hiring_readiness.toLowerCase().replace(' ', '-')}`}>
                {hiring_readiness}
              </span>
            </div>
            <div className="interview-stats">
              <div className="stat">
                <span className="stat-value">{interview_summary.total_questions}</span>
                <span className="stat-label">Questions</span>
              </div>
              <div className="stat">
                <span className="stat-value">{interview_summary.avg_score.toFixed(0)}</span>
                <span className="stat-label">Avg Score</span>
              </div>
              <div className="stat">
                <span className="stat-value">{Math.round(interview_summary.total_time / 60)}m</span>
                <span className="stat-label">Duration</span>
              </div>
            </div>
            {interview_summary.terminated_early && (
              <p className="terminated-notice">Interview was terminated early due to performance.</p>
            )}
          </div>
        </div>

        {/* Skill Breakdown */}
        <div className="card">
          <SkillBreakdown skills={skill_breakdown} />
        </div>

        {/* Strengths, Weaknesses, Recommendations */}
        <div className="results-feedback">
          <div className="card feedback-card">
            <h3>&#128170; Strengths</h3>
            <ul>
              {strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="card feedback-card">
            <h3>&#9888;&#65039; Weaknesses</h3>
            <ul>
              {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
          <div className="card feedback-card">
            <h3>&#128161; Recommendations</h3>
            <ul>
              {recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>

        {/* Question History */}
        <div className="card">
          <QuestionHistory questions={question_history} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create ResultsPage.css**

```css
.results-page {
  min-height: 100vh;
  background: var(--color-gray-bg);
}

.results-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.results-header h1 {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-navy);
}

/* Top Cards */
.results-top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.gauge-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.gauge-card h3 {
  font-size: 18px;
  color: var(--color-gray-text);
}

.readiness-gauge {
  display: flex;
  justify-content: center;
}

.hiring-card h3 {
  font-size: 18px;
  color: var(--color-gray-text);
  margin-bottom: 16px;
}

.hiring-status {
  text-align: center;
  margin-bottom: 24px;
}

.hiring-badge {
  display: inline-block;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 18px;
  font-weight: 700;
}

.hiring-ready { background: var(--color-success-bg); color: var(--color-success); }
.hiring-almost-ready { background: var(--color-warning-bg); color: var(--color-warning); }
.hiring-not-ready { background: var(--color-danger-bg); color: var(--color-danger); }

.interview-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 16px;
  border-top: 1px solid var(--color-gray-200);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 800;
  color: var(--color-navy);
}

.stat-label {
  font-size: 13px;
  color: var(--color-gray-text);
}

.terminated-notice {
  margin-top: 12px;
  text-align: center;
  color: var(--color-danger);
  font-size: 13px;
  font-weight: 500;
}

/* Skill Breakdown */
.skill-breakdown h3 {
  font-size: 18px;
  color: var(--color-navy);
  margin-bottom: 16px;
}

.skill-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skill-name {
  width: 140px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-navy);
  text-align: right;
}

.skill-track {
  flex: 1;
  height: 10px;
  background: var(--color-gray-200);
  border-radius: 5px;
  overflow: hidden;
}

.skill-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 1s ease;
}

.skill-score {
  width: 32px;
  font-size: 14px;
  font-weight: 700;
}

/* Feedback */
.results-feedback {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  margin: 24px 0;
}

.feedback-card h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: var(--color-navy);
}

.feedback-card ul {
  list-style: none;
  padding: 0;
}

.feedback-card li {
  padding: 8px 0;
  font-size: 14px;
  color: var(--color-gray-dark);
  border-bottom: 1px solid var(--color-gray-100);
  line-height: 1.5;
}

.feedback-card li:last-child {
  border-bottom: none;
}

/* Question History */
.question-history h3 {
  font-size: 18px;
  color: var(--color-navy);
  margin-bottom: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: var(--transition);
}

.history-header:hover {
  background: var(--color-gray-100);
}

.history-number {
  font-weight: 700;
  color: var(--color-navy);
  min-width: 32px;
}

.history-category {
  font-size: 13px;
  color: var(--color-gray-text);
  text-transform: capitalize;
  flex: 1;
}

.history-score {
  font-weight: 700;
  font-size: 14px;
}

.history-time {
  font-size: 13px;
  color: var(--color-gray-text);
}

.history-toggle {
  font-size: 12px;
  color: var(--color-gray-text);
}

.history-detail {
  padding: 16px;
  background: var(--color-gray-bg);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-question,
.history-answer,
.history-feedback {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-gray-dark);
}

/* Loading & Error */
.results-loading,
.results-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.results-loading p,
.results-error p {
  font-size: 18px;
  color: var(--color-gray-text);
}
```

- [ ] **Step 6: Verify results page renders**

Complete a full interview flow (backend + frontend). After the last question, should redirect to results page showing gauge, skills, feedback, and history.

- [ ] **Step 7: Commit**

```bash
git add Hack2Hire_Frontend/src/
git commit -m "feat: implement Results Dashboard with gauge, skills, feedback, and history"
```

---

## Task 15: End-to-End Smoke Test & Polish

**Files:**
- Possibly modify any file for bug fixes

- [ ] **Step 1: Start both servers**

Terminal 1:
```bash
cd Hack2Hire_Backend && uvicorn main:app --reload --port 8000
```

Terminal 2:
```bash
cd Hack2Hire_Frontend && npm run dev
```

- [ ] **Step 2: Run full interview flow**

1. Go to `http://localhost:5173`
2. Upload a sample resume PDF
3. Paste a sample JD (e.g., "Senior Backend Engineer at Google, requiring Python, distributed systems, REST APIs, 5+ years experience")
4. Click "Start Your TakeOff"
5. Answer all 10 questions (or get terminated early)
6. Verify results page loads with all sections

- [ ] **Step 3: Test edge cases**

- Submit empty answers (should score 0)
- Let timer expire (should auto-submit)
- Skip a question (should score 0)
- Upload a non-PDF file (should show error)
- Submit with very short JD (should show error or handle gracefully)

- [ ] **Step 4: Fix any issues found**

Address bugs discovered during smoke testing.

- [ ] **Step 5: Run backend tests**

```bash
cd Hack2Hire_Backend && python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: polish and bug fixes from end-to-end smoke testing"
```

---

## Task 16: README & Submission Prep

**Files:**
- Create: `README.md` (project root)

- [ ] **Step 1: Create README.md**

```markdown
# TakeOff - AI-Powered Mock Interview Platform

TakeOff is an AI-powered mock interview platform that simulates real-world tech interviews. Upload your resume and a job description, and our AI interviewer will conduct an adaptive 10-question interview — evaluating your answers on accuracy, clarity, depth, relevance, and completeness.

## Demo Video

[Screen recording of the working project](link-to-video)

## Features

- **Resume Analysis**: Upload PDF resume — AI extracts skills, experience, and projects
- **JD Alignment**: Paste any tech job description — questions tailored to role requirements
- **Adaptive Difficulty**: Questions dynamically adjust (Easy → Medium → Hard) based on performance
- **Strict Time Management**: 120-second timer per question with time penalties
- **Early Termination**: Interview ends early if performance drops below threshold
- **Objective Scoring**: Each answer scored on 5 dimensions (Accuracy, Clarity, Depth, Relevance, Completeness)
- **Comprehensive Report**: Readiness score, skill breakdown, strengths, weaknesses, and actionable recommendations

## Tech Stack

- **Frontend**: React 18, React Router, Axios, Plain CSS
- **Backend**: FastAPI, Python 3.11+
- **AI**: Google Gemini 2.0 Flash
- **PDF Parsing**: PyPDF2

## Architecture

The system uses a **Stateful Interview State Machine** with a **Deterministic Difficulty Adaptor**:

1. Resume + JD analyzed by Gemini → structured profiles
2. Questions generated based on difficulty level, category rotation, and covered topics
3. Answers evaluated via structured JSON rubric (5 dimensions × 20 points = 100)
4. Difficulty adapts deterministically based on score thresholds
5. Early termination if 3 consecutive scores < 30 or average < 25
6. Final report generated with skill breakdown and actionable feedback

## Setup & Run

### Backend
```bash
cd Hack2Hire_Backend
pip install -r requirements.txt
# Create .env with GEMINI_API_KEY=your_key_here
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd Hack2Hire_Frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to start.

## Team

- [Your names here]
```

- [ ] **Step 2: Record screen recording of the working project**

Use QuickTime or OBS to record a full interview flow: setup → interview → results.

- [ ] **Step 3: Final commit and push**

```bash
git add README.md
git commit -m "docs: add README with demo video placeholder and setup instructions"
git push origin main
```
