from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models.schemas import (
    AnswerRequest,
    AnswerResponse,
    ReportResponse,
    SetupResponse,
    StartRequest,
    StartResponse,
)
from services.state_machine import get_report, setup_interview, start_interview, submit_answer


router = APIRouter(prefix="/api/interview", tags=["interview"])


def _value_error_status(error: ValueError) -> int:
    return 404 if "not found" in str(error).lower() else 400


@router.post("/setup", response_model=SetupResponse)
async def interview_setup(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
) -> SetupResponse:
    """Upload a resume PDF and job description to create an interview session."""
    filename = resume_file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        session = setup_interview(await resume_file.read(), job_description)
        return SetupResponse(
            session_id=session.session_id,
            candidate_profile=session.candidate_profile or {},
            jd_analysis=session.jd_analysis or {},
            matched_skills=session.matched_skills,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to process setup: {error}") from error


@router.post("/start", response_model=StartResponse)
async def interview_start(request: StartRequest) -> StartResponse:
    """Start an existing setup session and return the first question."""
    try:
        return StartResponse(**start_interview(request.session_id))
    except ValueError as error:
        raise HTTPException(status_code=_value_error_status(error), detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {error}") from error


@router.post("/answer", response_model=AnswerResponse)
async def interview_answer(request: AnswerRequest) -> AnswerResponse:
    """Submit an answer, receive scoring, and get the next question if any."""
    try:
        return AnswerResponse(
            **submit_answer(
                session_id=request.session_id,
                answer_text=request.answer_text,
                time_taken_seconds=request.time_taken_seconds,
            )
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to process answer: {error}") from error


@router.get("/report/{session_id}", response_model=ReportResponse)
async def interview_report(session_id: str) -> ReportResponse:
    """Return the completed or terminated interview report."""
    try:
        return ReportResponse(**get_report(session_id))
    except ValueError as error:
        raise HTTPException(status_code=_value_error_status(error), detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {error}") from error
