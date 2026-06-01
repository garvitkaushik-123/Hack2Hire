from dataclasses import dataclass, field
from typing import Any
import uuid


CATEGORY_ROTATION = [
    "technical",
    "conceptual",
    "behavioral",
    "scenario",
    "technical",
    "conceptual",
    "behavioral",
    "scenario",
    "technical",
    "conceptual",
]


@dataclass
class QuestionRecord:
    number: int
    text: str
    category: str
    difficulty: str
    answer: str | None = None
    time_taken: int | None = None
    time_limit: int = 120
    evaluation: dict[str, Any] | None = None


@dataclass
class InterviewSession:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    state: str = "setup"
    candidate_profile: dict[str, Any] | None = None
    jd_analysis: dict[str, Any] | None = None
    matched_skills: list[str] = field(default_factory=list)
    current_question: int = 0
    current_difficulty: str = "easy"
    questions: list[QuestionRecord] = field(default_factory=list)
    consecutive_low_scores: int = 0
    termination_reason: str | None = None

    def get_covered_topics(self) -> list[str]:
        return [question.text for question in self.questions if question.answer is not None]

    def get_scores(self) -> list[int]:
        return [
            int(question.evaluation["total"])
            for question in self.questions
            if question.evaluation is not None
        ]

    def get_avg_score(self) -> float:
        scores = self.get_scores()
        if not scores:
            return 0.0
        return sum(scores) / len(scores)

    def get_category_for_question(self, question_number: int) -> str:
        if not 1 <= question_number <= len(CATEGORY_ROTATION):
            raise ValueError(f"Question number {question_number} is outside the interview range")
        return CATEGORY_ROTATION[question_number - 1]


sessions: dict[str, InterviewSession] = {}
