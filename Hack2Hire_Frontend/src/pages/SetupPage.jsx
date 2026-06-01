import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupInterview } from "../api/interview.js";
import ResumeUploader from "../components/ResumeUploader.jsx";

export default function SetupPage() {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [setupPreview, setSetupPreview] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!resumeFile) {
      setError("Upload a PDF resume to begin.");
      return;
    }

    if (jobDescription.trim().length < 30) {
      setError("Paste a job description with enough role context.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await setupInterview(resumeFile, jobDescription.trim());
      setSetupPreview(data);
      sessionStorage.setItem(`takeoff:setup:${data.session_id}`, JSON.stringify(data));
      navigate(`/interview/${data.session_id}`);
    } catch (requestError) {
      setError(requestError.message || "Unable to set up the interview.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="setup-page">
      <section className="setup-hero">
        <div>
          <span className="eyebrow">Adaptive technical practice</span>
          <h1>
            From layoff to <span>TakeOff.</span>
          </h1>
          <p>
            Upload your resume, paste the role, and TakeOff will build a focused
            10-question interview that adapts as you answer.
          </p>
        </div>
      </section>

      <form className="setup-grid" onSubmit={handleSubmit}>
        <ResumeUploader file={resumeFile} onChange={setResumeFile} disabled={isSubmitting} />

        <section className="jd-panel">
          <label htmlFor="job-description">Job description</label>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the role description, required skills, responsibilities, and seniority expectations..."
            disabled={isSubmitting}
          />
          {error && <div className="error-banner">{error}</div>}
          {setupPreview && (
            <div className="matched-preview">
              Matched skills: {setupPreview.matched_skills?.join(", ") || "Analyzing"}
            </div>
          )}
          <button className="button button-primary setup-cta" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Preparing TakeOff..." : "Start Your TakeOff"}
          </button>
        </section>
      </form>
    </div>
  );
}
