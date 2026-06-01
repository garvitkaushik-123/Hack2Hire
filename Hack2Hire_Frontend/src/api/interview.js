import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://hack2hire-backend.onrender.com";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

function getErrorMessage(error) {
  if (error.response?.data?.detail) {
    return typeof error.response.data.detail === "string"
      ? error.response.data.detail
      : "Request failed. Please check your input and try again.";
  }

  if (error.code === "ECONNABORTED") {
    return "The AI service took too long to respond. Please try again.";
  }

  return error.message || "Network error. Please try again.";
}

async function requestWithRetry(requester, retries = 1) {
  try {
    return await requester();
  } catch (error) {
    if (retries > 0 && (!error.response || error.response.status >= 500)) {
      return requestWithRetry(requester, retries - 1);
    }

    throw new Error(getErrorMessage(error));
  }
}

export async function setupInterview(resumeFile, jobDescription) {
  const formData = new FormData();
  formData.append("resume_file", resumeFile);
  formData.append("job_description", jobDescription);

  const response = await requestWithRetry(() =>
    client.post("/api/interview/setup", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );

  return response.data;
}

export async function startInterview(sessionId) {
  const response = await requestWithRetry(() =>
    client.post("/api/interview/start", { session_id: sessionId })
  );

  return response.data;
}

export async function submitAnswer(sessionId, answerText, timeTakenSeconds) {
  const response = await requestWithRetry(() =>
    client.post("/api/interview/answer", {
      session_id: sessionId,
      answer_text: answerText,
      time_taken_seconds: timeTakenSeconds,
    })
  );

  return response.data;
}

export async function getReport(sessionId) {
  const response = await requestWithRetry(() =>
    client.get(`/api/interview/report/${sessionId}`)
  );

  return response.data;
}
