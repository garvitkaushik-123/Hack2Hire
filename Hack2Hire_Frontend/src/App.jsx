import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import SetupPage from "./pages/SetupPage.jsx";
import InterviewRoom from "./pages/InterviewRoom.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<SetupPage />} />
          <Route path="/interview/:sessionId" element={<InterviewRoom />} />
          <Route path="/results/:sessionId" element={<ResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
