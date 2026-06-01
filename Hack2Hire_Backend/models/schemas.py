from typing import Any

from pydantic import BaseModel, Field


class SetupResponse(BaseModel):
    session_id: str
    candidate_profile: dict[str, Any]
    jd_analysis: dict[str, Any]
    matched_skills: list[str]


class StartRequest(BaseModel):
    session_id: str


class QuestionOut(BaseModel):
    question_number: int
    question_text: str
    difficulty: str
    category: str
    time_limit: int = 120


class StartResponse(QuestionOut):
    pass


class AnswerRequest(BaseModel):
    session_id: str
    answer_text: str = ""
    time_taken_seconds: int = Field(ge=0)


class EvaluationOut(BaseModel):
    accuracy: int = Field(ge=0, le=20)
    clarity: int = Field(ge=0, le=20)
    depth: int = Field(ge=0, le=20)
    relevance: int = Field(ge=0, le=20)
    time_efficiency: int = Field(ge=0, le=20)
    total: int = Field(ge=0, le=100)
    reasoning: str


class ProgressOut(BaseModel):
    current_question: int
    total_questions: int = 10
    current_difficulty: str
    avg_score: float


class AnswerResponse(BaseModel):
    evaluation: EvaluationOut
    next_question: QuestionOut | None = None
    interview_status: str
    termination_reason: str | None = None
    progress: ProgressOut


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
    evaluation: dict[str, Any]


class InterviewSummary(BaseModel):
    total_questions: int
    avg_score: float
    terminated_early: bool
    total_time: int


class LearningResource(BaseModel):
    title: str
    url: str
    type: str  # youtube | article | documentation | course
    topic: str


class ReportResponse(BaseModel):
    readiness_score: int
    readiness_label: str
    hiring_readiness: str
    skill_breakdown: list[SkillScore]
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    learning_resources: list[LearningResource] = []
    question_history: list[QuestionHistoryItem]
    difficulty_progression: list[str]
    interview_summary: InterviewSummary
