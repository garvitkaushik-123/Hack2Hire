import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { startInterview, submitAnswer } from "../api/interview.js";
import AnswerPanel from "../components/AnswerPanel.jsx";
import DifficultyTrend from "../components/DifficultyTrend.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import QuestionPanel from "../components/QuestionPanel.jsx";
import Timer from "../components/Timer.jsx";

const DEFAULT_TIME_LIMIT = 120;

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");

  const [secondsRemaining, setSecondsRemaining] = useState(DEFAULT_TIME_LIMIT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [terminalState, setTerminalState] = useState(null);
  const [progress, setProgress] = useState({
    current_question: 1,
    total_questions: 10,
    current_difficulty: "easy",
    avg_score: 0,
  });
  const [difficultyHistory, setDifficultyHistory] = useState([]);
  const submittedRef = useRef(false);
  const answerRef = useRef(answer);

  // Keep answerRef current so the timer callback can read the latest answer
  // without needing answer in its dependency array (which would restart the
  // interval on every keystroke).
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    let isMounted = true;

    async function bootInterview() {
      setIsLoading(true);
      setError("");
      try {
        const firstQuestion = await startInterview(sessionId);
        if (!isMounted) return;
        setQuestion(firstQuestion);
        setProgress((current) => ({
          ...current,
          current_question: firstQuestion.question_number,
          current_difficulty: firstQuestion.difficulty,
        }));
        setDifficultyHistory([firstQuestion.difficulty]);
        setSecondsRemaining(firstQuestion.time_limit || DEFAULT_TIME_LIMIT);
      } catch (requestError) {
        if (isMounted) setError(requestError.message || "Could not start this interview.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    bootInterview();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleSubmit = useCallback(
    async (answerText) => {
      // answerText must always be passed explicitly; default to current ref value
      // so callers that pass undefined still work correctly.
      const text = answerText !== undefined ? answerText : answerRef.current;
      if (!question || isSubmitting || submittedRef.current) return;

      submittedRef.current = true;
      setIsSubmitting(true);
      setError("");

      const limit = question.time_limit || DEFAULT_TIME_LIMIT;
      const timeTaken = Math.max(0, limit - secondsRemaining);

      try {
        const response = await submitAnswer(sessionId, text, timeTaken);
        setProgress(response.progress);

        if (response.interview_status === "in_progress" && response.next_question) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          setQuestion(response.next_question);
          setAnswer("");
          answerRef.current = "";
          setSecondsRemaining(response.next_question.time_limit || DEFAULT_TIME_LIMIT);
          setDifficultyHistory((current) => [...current, response.next_question.difficulty]);
          submittedRef.current = false;
        } else {
          setTerminalState({
            status: response.interview_status,
            reason: response.termination_reason,
          });
        }
      } catch (requestError) {
        setError(requestError.message || "Network error. Your answer is still here.");
        submittedRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, question, secondsRemaining, sessionId]
  );

  useEffect(() => {
    if (!question || isSubmitting || terminalState) return undefined;

    const timerId = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          // Use answerRef so the interval is not recreated on every keystroke.
          handleSubmit(answerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [handleSubmit, isSubmitting, question, terminalState]);

  if (isLoading) {
    return <div className="loading-state">Preparing your first question...</div>;
  }

  if (error && !question) {
    return (
      <div className="empty-state">
        <h1>Interview unavailable</h1>
        <p>{error}</p>
        <Link className="button button-primary" to="/">Back to setup</Link>
      </div>
    );
  }

  return (
    <div className="interview-room">
      <div className="interview-topbar">
        <ProgressBar
          current={progress.current_question || question?.question_number || 1}
          total={progress.total_questions || 10}
        />
        <Timer secondsRemaining={secondsRemaining} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="interview-grid">
        <QuestionPanel question={question} />
        <AnswerPanel
          value={answer}
          onChange={setAnswer}
          onSubmit={() => handleSubmit(answer)}
          onSkip={() => handleSubmit("")}
          disabled={Boolean(terminalState)}
          isSubmitting={isSubmitting}
        />
      </div>

      <DifficultyTrend history={difficultyHistory} avgScore={progress.avg_score} />

      {terminalState && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <span className="eyebrow">{terminalState.status}</span>
            <h2>Interview complete</h2>
            {terminalState.reason && <p>{terminalState.reason}</p>}
            <button
              className="button button-primary"
              type="button"
              onClick={() => navigate(`/results/${sessionId}`)}
            >
              View Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
