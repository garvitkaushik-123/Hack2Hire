import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReport } from "../api/interview.js";
import DifficultyTrend from "../components/DifficultyTrend.jsx";
import QuestionHistory from "../components/QuestionHistory.jsx";
import ReadinessGauge from "../components/ReadinessGauge.jsx";
import SkillBreakdown from "../components/SkillBreakdown.jsx";

export default function ResultsPage() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cachedSetup = sessionStorage.getItem(`takeoff:setup:${sessionId}`);
    if (cachedSetup) {
      setSetupData(JSON.parse(cachedSetup));
    }

    let isMounted = true;
    async function loadReport() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getReport(sessionId);
        if (isMounted) setReport(data);
      } catch (requestError) {
        if (isMounted) setError(requestError.message || "Could not load report.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (isLoading) {
    return <div className="loading-state">Generating your readiness dashboard...</div>;
  }

  if (error || !report) {
    return (
      <div className="empty-state">
        <h1>Report unavailable</h1>
        <p>{error || "Could not load report. Please try again."}</p>
        <Link className="button button-primary" to="/">Start New Interview</Link>
      </div>
    );
  }

  const matchedSkills = setupData?.matched_skills || [];
  const summary = report?.interview_summary || {};

  return (
    <div className="results-page">
      <section className="results-hero">
        <div>
          <span className="eyebrow">Readiness report</span>
          <h1>{report.hiring_readiness}</h1>
          <p>
            Average score {Math.round(summary.avg_score || 0)} across{" "}
            {summary.total_questions || report.question_history?.length || 0} questions.
          </p>
        </div>
        <Link className="button button-secondary" to="/">Start New Interview</Link>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card gauge-card">
          <ReadinessGauge score={report.readiness_score} label={report.readiness_label} />
        </article>
        <article className="dashboard-card readiness-card">
          <span className="eyebrow">Hiring signal</span>
          <h2>{report.hiring_readiness}</h2>
          <p>
            {summary.terminated_early
              ? "The interview ended early based on performance thresholds."
              : "The interview reached a complete readiness snapshot."}
          </p>
          <div className="chip-list">
            {matchedSkills.slice(0, 8).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
            {matchedSkills.length === 0 && <span>No matched skills cached</span>}
          </div>
        </article>
      </section>

      <SkillBreakdown skills={report.skill_breakdown} />

      <section className="insight-grid">
        <InsightList title="Strengths" items={report.strengths} tone="success" />
        <InsightList title="Weaknesses" items={report.weaknesses} tone="warning" />
        <InsightList title="Recommendations" items={report.recommendations} tone="accent" />
      </section>

      {report.learning_resources?.length > 0 && (
        <LearningResources resources={report.learning_resources} />
      )}

      <DifficultyTrend
        history={report.difficulty_progression || []}
        avgScore={summary.avg_score || 0}
      />
      <QuestionHistory items={report.question_history || []} />
    </div>
  );
}

function InsightList({ title, items = [], tone }) {
  return (
    <article className={`insight-card insight-${tone}`}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

const TYPE_ICONS = {
  youtube: "▶️",
  article: "📝",
  documentation: "📚",
  course: "🎓",
};

function LearningResources({ resources = [] }) {
  return (
    <section className="dashboard-section resources-section">
      <div className="section-heading">
        <span className="eyebrow">Improve your skills</span>
        <h2>Recommended Resources</h2>
      </div>
      <div className="resources-grid">
        {resources.map((res, i) => (
          <a
            key={i}
            href={res.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`resource-card resource-${res.type}`}
          >
            <span className="resource-type-icon">{TYPE_ICONS[res.type] || "🔗"}</span>
            <div className="resource-content">
              <span className="resource-title">{res.title}</span>
              <span className="resource-topic">{res.topic}</span>
              <span className="resource-type-label">{res.type}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
