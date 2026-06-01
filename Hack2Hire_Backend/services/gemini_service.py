import json
import os
from typing import Any

import google.generativeai as genai

from prompts.answer_evaluation import ANSWER_EVALUATION_PROMPT
from prompts.jd_analysis import JD_ANALYSIS_PROMPT
from prompts.question_generation import QUESTION_GENERATION_PROMPT
from prompts.report_generation import REPORT_GENERATION_PROMPT
from prompts.resume_analysis import RESUME_ANALYSIS_PROMPT


MODEL_NAME = "gemini-2.0-flash"


def _configure_gemini() -> None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    genai.configure(api_key=api_key)


def _model(temperature: float, json_mode: bool = False) -> genai.GenerativeModel:
    _configure_gemini()
    config_args: dict[str, Any] = {"temperature": temperature}
    if json_mode:
        config_args["response_mime_type"] = "application/json"

    return genai.GenerativeModel(
        MODEL_NAME,
        generation_config=genai.GenerationConfig(**config_args),
    )


def _json_from_response_text(text: str) -> dict[str, Any]:
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini returned malformed JSON: {exc}") from exc


def _clamp(value: Any, minimum: int, maximum: int) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        numeric = minimum
    return max(minimum, min(maximum, numeric))


def analyze_resume(resume_text: str) -> dict[str, Any]:
    """Extract structured data from resume text."""
    response = _model(temperature=0.3, json_mode=True).generate_content(
        RESUME_ANALYSIS_PROMPT.format(resume_text=resume_text)
    )
    return _json_from_response_text(response.text)


def analyze_jd(jd_text: str) -> dict[str, Any]:
    """Extract structured requirements from job description."""
    response = _model(temperature=0.3, json_mode=True).generate_content(
        JD_ANALYSIS_PROMPT.format(jd_text=jd_text)
    )
    return _json_from_response_text(response.text)


def generate_question(
    candidate_profile: dict[str, Any],
    jd_analysis: dict[str, Any],
    question_number: int,
    difficulty: str,
    category: str,
    covered_topics: list[str],
) -> str:
    """Generate a single interview question."""
    skills = ", ".join(candidate_profile.get("skills", [])) or "Not provided"
    experience_summary = "; ".join(
        f"{experience.get('role', '')} at {experience.get('company', '')}".strip()
        for experience in candidate_profile.get("experience", [])
    )
    projects_summary = "; ".join(
        f"{project.get('name', '')}: {project.get('description', '')}".strip()
        for project in candidate_profile.get("projects", [])
    )

    prompt = QUESTION_GENERATION_PROMPT.format(
        skills=skills,
        experience_summary=experience_summary or "No prior experience listed",
        projects_summary=projects_summary or "No projects listed",
        role_title=jd_analysis.get("role_title", "Software Engineer"),
        required_skills=", ".join(jd_analysis.get("required_skills", [])) or "Not provided",
        responsibilities="; ".join(jd_analysis.get("key_responsibilities", [])) or "Not provided",
        question_number=question_number,
        difficulty=difficulty,
        category=category,
        covered_topics="; ".join(covered_topics) if covered_topics else "None yet",
    )

    response = _model(temperature=0.7).generate_content(prompt)
    return response.text.strip().strip('"')


def evaluate_answer(
    question: str,
    answer: str,
    difficulty: str,
    category: str,
    time_taken: int,
    candidate_profile: dict[str, Any],
) -> dict[str, Any]:
    """Evaluate a candidate's answer and return normalized structured scores."""
    prompt = ANSWER_EVALUATION_PROMPT.format(
        question=question,
        answer=answer,
        difficulty=difficulty,
        category=category,
        time_taken=time_taken,
        skills=", ".join(candidate_profile.get("skills", [])) or "Not provided",
        experience_level=f"{candidate_profile.get('total_years_experience', 0)} years",
    )
    response = _model(temperature=0.3, json_mode=True).generate_content(prompt)
    result = _json_from_response_text(response.text)

    for key in ("accuracy", "clarity", "depth", "relevance", "completeness"):
        result[key] = _clamp(result.get(key), 0, 20)

    result["total"] = sum(
        result[key] for key in ("accuracy", "clarity", "depth", "relevance", "completeness")
    )
    result["reasoning"] = str(result.get("reasoning", "")).strip() or "No reasoning provided."
    return result


def generate_report(
    candidate_profile: dict[str, Any],
    jd_analysis: dict[str, Any],
    questions: list[dict[str, Any]],
    avg_score: float,
    difficulty_progression: list[str],
    terminated_early: bool,
) -> dict[str, Any]:
    """Generate comprehensive interview report."""
    session_data = json.dumps(
        [
            {
                "question_number": question["number"],
                "question": question["text"],
                "answer": question["answer"],
                "difficulty": question["difficulty"],
                "category": question["category"],
                "score": question["score"],
                "time_taken": question["time_taken"],
            }
            for question in questions
        ],
        indent=2,
    )

    prompt = REPORT_GENERATION_PROMPT.format(
        candidate_profile=json.dumps(candidate_profile, indent=2),
        jd_analysis=json.dumps(jd_analysis, indent=2),
        session_data=session_data,
        total_questions=len(questions),
        avg_score=f"{avg_score:.1f}",
        difficulty_progression=" -> ".join(difficulty_progression),
        terminated_early=str(terminated_early).lower(),
    )
    response = _model(temperature=0.7, json_mode=True).generate_content(prompt)
    result = _json_from_response_text(response.text)

    # Normalise required top-level fields so ReportResponse validation never fails
    result["readiness_score"] = _clamp(result.get("readiness_score", 0), 0, 100)
    result["readiness_label"] = str(result.get("readiness_label") or "Needs Improvement").strip()
    result["hiring_readiness"] = str(result.get("hiring_readiness") or "Not Ready").strip()

    # Normalise skill_breakdown entries
    raw_skills = result.get("skill_breakdown")
    if not isinstance(raw_skills, list):
        raw_skills = []
    normalized_skills = []
    for entry in raw_skills:
        if not isinstance(entry, dict):
            continue
        normalized_skills.append(
            {
                "skill": str(entry.get("skill") or "Unknown"),
                "score": _clamp(entry.get("score", 0), 0, 100),
                "label": str(entry.get("label") or "Needs Improvement"),
            }
        )
    result["skill_breakdown"] = normalized_skills

    # Ensure list fields are always lists of strings
    for list_key in ("strengths", "weaknesses", "recommendations"):
        raw = result.get(list_key)
        if not isinstance(raw, list):
            result[list_key] = []
        else:
            result[list_key] = [str(item) for item in raw if item]

    return result
