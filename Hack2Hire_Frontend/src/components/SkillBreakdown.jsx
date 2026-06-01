export default function SkillBreakdown({ skills = [] }) {
  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <span className="eyebrow">Skill breakdown</span>
        <h2>Role readiness by skill</h2>
      </div>
      <div className="skill-list">
        {skills.length === 0 && <p className="muted-text">No skill scores were returned.</p>}
        {skills.map((skill) => (
          <div className="skill-row" key={skill.skill}>
            <div className="skill-label">
              <span>{skill.skill}</span>
              <small>{skill.label}</small>
            </div>
            <div className="skill-meter">
              <div style={{ width: `${Math.min(100, Math.max(0, skill.score))}%` }} />
            </div>
            <strong>{skill.score}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
