import logging
from typing import Any

from models.interview_state import InterviewSession, QuestionRecord, sessions
from services.difficulty_adaptor import get_next_difficulty
from services.gemini_service import (
    analyze_jd,
    analyze_resume,
    evaluate_answer,
    generate_question,
    generate_report,
)
from services.resume_parser import extract_text_from_pdf
from services.scoring import apply_time_penalty, check_termination, is_empty_answer

logger = logging.getLogger(__name__)


def _normalize_skill(skill: str) -> str:
    return " ".join(skill.lower().split())


def _compute_matched_skills(candidate_profile: dict[str, Any], jd_analysis: dict[str, Any]) -> list[str]:
    resume_skills = candidate_profile.get("skills", [])
    jd_skills = {
        _normalize_skill(skill)
        for skill in jd_analysis.get("required_skills", []) + jd_analysis.get("preferred_skills", [])
    }
    return [skill for skill in resume_skills if _normalize_skill(skill) in jd_skills]


def setup_interview(resume_bytes: bytes, job_description: str) -> InterviewSession:
    """Parse resume and JD, then create an in-memory interview session."""
    if not job_description.strip():
        raise ValueError("Job description is required")

    resume_text = extract_text_from_pdf(resume_bytes)
    candidate_profile = analyze_resume(resume_text)
    jd_analysis = analyze_jd(job_description)

    session = InterviewSession(
        candidate_profile=candidate_profile,
        jd_analysis=jd_analysis,
        matched_skills=_compute_matched_skills(candidate_profile, jd_analysis),
    )
    sessions[session.session_id] = session
    logger.info(f"Session {session.session_id} created in state '{session.state}'")
    return session


def start_interview(session_id: str) -> dict[str, Any]:
    """Start the interview and generate the first question."""
    session = sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")
    if session.state != "setup":
        raise ValueError(f"Session is in '{session.state}' state, expected 'setup'")

    session.state = "in_progress"
    session.current_question = 1
    session.current_difficulty = "easy"
    category = session.get_category_for_question(session.current_question)

    logger.info(f"Session {session_id} started. Generating first question ({session.current_difficulty} {category}).")

    question_text = generate_question(
        candidate_profile=session.candidate_profile or {},
        jd_analysis=session.jd_analysis or {},
        question_number=session.current_question,
        difficulty=session.current_difficulty,
        category=category,
        covered_topics=[],
    )

    session.questions.append(
        QuestionRecord(
            number=session.current_question,
            text=question_text,
            category=category,
            difficulty=session.current_difficulty,
        )
    )

    return {
        "question_number": session.current_question,
        "question_text": question_text,
        "difficulty": session.current_difficulty,
        "category": category,
        "time_limit": 120,
    }


def _empty_evaluation() -> dict[str, Any]:
    return {
        "accuracy": 0,
        "clarity": 0,
        "depth": 0,
        "relevance": 0,
        "completeness": 0,
        "total": 0,
        "reasoning": "No substantive answer provided",
    }


def submit_answer(session_id: str, answer_text: str, time_taken_seconds: int) -> dict[str, Any]:
    """Evaluate an answer, update state, and produce the next question when needed."""
    session = sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")
    if session.state != "in_progress":
        raise ValueError(f"Session is in '{session.state}' state, expected 'in_progress'")
    if not session.questions:
        raise ValueError("Interview has no active question")

    current_question = session.questions[-1]
    if current_question.evaluation is not None:
        raise ValueError("Current question has already been answered")

    if is_empty_answer(answer_text):
        evaluation = _empty_evaluation()
    else:
        evaluation = evaluate_answer(
            question=current_question.text,
            answer=answer_text,
            difficulty=current_question.difficulty,
            category=current_question.category,
            time_taken=time_taken_seconds,
            candidate_profile=session.candidate_profile or {},
        )
        original_total = int(evaluation["total"])
        evaluation["total"] = apply_time_penalty(original_total, time_taken_seconds)
        if evaluation["total"] != original_total:
            evaluation["reasoning"] = (
                f"{evaluation['reasoning']} "
                f"(Time penalty applied: {original_total} -> {evaluation['total']})"
            )

    current_question.answer = answer_text
    current_question.time_taken = time_taken_seconds
    current_question.evaluation = evaluation

    score = int(evaluation["total"])
    session.consecutive_low_scores = (
        session.consecutive_low_scores + 1 if score < 30 else 0
    )
    old_difficulty = session.current_difficulty
    session.current_difficulty = get_next_difficulty(session.current_difficulty, score)

    logger.info(f"Session {session_id} Q{current_question.number} scored {score}. Difficulty {old_difficulty} -> {session.current_difficulty}. Consecutive low scores: {session.consecutive_low_scores}")

    termination_reason = check_termination(
        consecutive_low_scores=session.consecutive_low_scores,
        scores=session.get_scores(),
    )
    next_question_data = None

    if termination_reason:
        session.state = "terminated"
        session.termination_reason = termination_reason
        interview_status = "terminated"
        logger.warning(f"Session {session_id} terminated early: {termination_reason}")
    elif session.current_question >= 10:
        session.state = "completed"
        interview_status = "completed"
        logger.info(f"Session {session_id} completed successfully.")
    else:
        session.current_question += 1
        category = session.get_category_for_question(session.current_question)
        logger.info(f"Session {session_id} generating Q{session.current_question} ({session.current_difficulty} {category}).")
        question_text = generate_question(
            candidate_profile=session.candidate_profile or {},
            jd_analysis=session.jd_analysis or {},
            question_number=session.current_question,
            difficulty=session.current_difficulty,
            category=category,
            covered_topics=session.get_covered_topics(),
        )
        session.questions.append(
            QuestionRecord(
                number=session.current_question,
                text=question_text,
                category=category,
                difficulty=session.current_difficulty,
            )
        )
        next_question_data = {
            "question_number": session.current_question,
            "question_text": question_text,
            "difficulty": session.current_difficulty,
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


def get_report(session_id: str) -> dict[str, Any]:
    """Generate the final interview report payload."""
    session = sessions.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")
    if session.state not in ("completed", "terminated"):
        raise ValueError(f"Session is in '{session.state}' state, interview not finished")

    questions_data = []
    difficulty_progression = []
    total_time = 0

    for question in session.questions:
        if question.evaluation is None:
            continue
        questions_data.append(
            {
                "number": question.number,
                "text": question.text,
                "answer": question.answer or "",
                "difficulty": question.difficulty,
                "category": question.category,
                "score": int(question.evaluation["total"]),
                "time_taken": question.time_taken or 0,
                "evaluation": question.evaluation,
            }
        )
        difficulty_progression.append(question.difficulty)
        total_time += question.time_taken or 0

    avg_score = session.get_avg_score()
    report = generate_report(
        candidate_profile=session.candidate_profile or {},
        jd_analysis=session.jd_analysis or {},
        questions=questions_data,
        avg_score=avg_score,
        difficulty_progression=difficulty_progression,
        terminated_early=session.state == "terminated",
    )

    question_history = [
        {
            "number": question["number"],
            "question": question["text"],
            "answer": question["answer"],
            "score": question["score"],
            "difficulty": question["difficulty"],
            "category": question["category"],
            "time_taken": question["time_taken"],
            "evaluation": question["evaluation"],
        }
        for question in questions_data
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
