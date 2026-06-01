from models.interview_state import InterviewSession, QuestionRecord, sessions
from services import state_machine


def setup_function():
    sessions.clear()


def test_submit_answer_advances_to_second_category(monkeypatch):
    session = InterviewSession(
        candidate_profile={"skills": ["Python"], "total_years_experience": 2},
        jd_analysis={"role_title": "Backend Engineer", "required_skills": ["Python"]},
        state="in_progress",
        current_question=1,
        current_difficulty="easy",
    )
    session.questions.append(
        QuestionRecord(number=1, text="What is Python?", category="technical", difficulty="easy")
    )
    sessions[session.session_id] = session

    monkeypatch.setattr(
        state_machine,
        "evaluate_answer",
        lambda **_: {
            "accuracy": 16,
            "clarity": 16,
            "depth": 15,
            "relevance": 15,
            "time_efficiency": 15,
            "total": 77,
            "reasoning": "Strong answer.",
        },
    )
    monkeypatch.setattr(state_machine, "generate_question", lambda **_: "Explain an event loop.")

    result = state_machine.submit_answer(
        session_id=session.session_id,
        answer_text="Python is a high-level programming language.",
        time_taken_seconds=60,
    )

    assert result["interview_status"] == "in_progress"
    assert result["next_question"]["question_number"] == 2
    assert result["next_question"]["category"] == "conceptual"
    assert result["next_question"]["difficulty"] == "medium"


def test_submit_empty_answer_terminates_after_three_low_scores(monkeypatch):
    session = InterviewSession(
        candidate_profile={"skills": ["Python"]},
        jd_analysis={"role_title": "Backend Engineer"},
        state="in_progress",
        current_question=3,
        current_difficulty="easy",
        consecutive_low_scores=2,
    )
    session.questions.extend(
        [
            QuestionRecord(
                number=1,
                text="Question 1",
                category="technical",
                difficulty="easy",
                answer="",
                time_taken=120,
                evaluation={"total": 0},
            ),
            QuestionRecord(
                number=2,
                text="Question 2",
                category="conceptual",
                difficulty="easy",
                answer="",
                time_taken=120,
                evaluation={"total": 0},
            ),
            QuestionRecord(number=3, text="Question 3", category="behavioral", difficulty="easy"),
        ]
    )
    sessions[session.session_id] = session
    monkeypatch.setattr(state_machine, "generate_question", lambda **_: "Should not be called")

    result = state_machine.submit_answer(
        session_id=session.session_id,
        answer_text="",
        time_taken_seconds=120,
    )

    assert result["interview_status"] == "terminated"
    assert result["termination_reason"] == "Consistent low performance"
    assert result["next_question"] is None
