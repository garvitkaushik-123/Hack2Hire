import DifficultyBadge from "./DifficultyBadge.jsx";
import ScoreCard from "./ScoreCard.jsx";

export default function QuestionPanel({ question, previousEvaluation }) {
  return (
    <section className="question-panel panel">
      <div className="question-kicker">
        <DifficultyBadge difficulty={question?.difficulty} />
        <span>{question?.category || "technical"}</span>
      </div>
      <h1>{question?.question_text || "Preparing your first question..."}</h1>
      <ScoreCard evaluation={previousEvaluation} />
    </section>
  );
}
