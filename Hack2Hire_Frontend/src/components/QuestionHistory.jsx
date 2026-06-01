export default function QuestionHistory({ items = [] }) {
  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <span className="eyebrow">Question history</span>
        <h2>Review the full interview</h2>
      </div>
      <div className="history-list">
        {items.map((item) => (
          <details key={item.number} className="history-item">
            <summary>
              <span>Q{item.number}. {item.question}</span>
              <strong>{item.score}/100</strong>
            </summary>
            <div className="history-body">
              <p><b>Answer:</b> {item.answer || "No answer submitted."}</p>
              <p><b>Evaluation:</b> {item.evaluation?.reasoning || "No reasoning provided."}</p>
              <div className="history-meta">
                <span>{item.difficulty}</span>
                <span>{item.category}</span>
                <span>{item.time_taken}s</span>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
