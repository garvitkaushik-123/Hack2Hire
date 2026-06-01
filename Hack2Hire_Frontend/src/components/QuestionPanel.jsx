import DifficultyBadge from "./DifficultyBadge.jsx";
import ScoreCard from "./ScoreCard.jsx";
import SpeakButton from "./SpeakButton.jsx";

export default function QuestionPanel({ question, previousEvaluation }) {
  return (
    <section className="question-panel panel">
      <div className="question-kicker">
        <DifficultyBadge difficulty={question?.difficulty} />
        <span>{question?.category || "technical"}</span>
        <SpeakButton text={question?.question_text} />
      </div>
      <p className="question-body">
        {question?.question_text || "Preparing your first question..."}
      </p>
      <ScoreCard evaluation={previousEvaluation} />
    </section>
  );
}
