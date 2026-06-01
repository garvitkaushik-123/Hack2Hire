# TakeOff — Demo Video Script

**Target Duration:** 4-5 minutes
**Setup Before Recording:** Have both backend and frontend running. Have a sample resume PDF and a JD ready to paste. Use Chrome (best voice support).

---

## SCENE 1: Introduction (15 seconds)

**Show:** The Setup page (landing page) in full screen

**Say:**
> "Hi, this is TakeOff — an AI-powered mock interview platform built for the Hack2Hire hackathon. TakeOff simulates a real-world tech interview using an AI interviewer that thinks, adapts, evaluates, and decides — just like a real interviewer would. Let me walk you through a complete interview."

---

## SCENE 2: Setup — Resume + JD Upload (30 seconds)

**Do:**
1. Drag and drop your resume PDF into the upload zone
2. Paste a job description into the textarea (use a real one — e.g., "Senior Backend Engineer requiring Python, distributed systems, REST APIs, microservices, 3+ years experience")
3. Click "Start Your TakeOff"
4. Show the loading spinner ("Analyzing your resume and preparing your interview...")

**Say:**
> "First, the candidate uploads their resume as a PDF and pastes the target job description. Behind the scenes, our Gemini AI parses the resume — extracting skills, experience, and projects — and analyzes the JD to identify required skills and responsibilities. It then matches the candidate's skills against the job requirements to personalize the entire interview."

**Feature Callout:**
> "This covers the problem statement's requirement to **analyze the candidate resume** and **accept a job description** to align questions with role requirements."

---

## SCENE 3: Interview Room — First Question (30 seconds)

**Do:**
1. The interview room loads with the first question displayed
2. Point out the UI elements: difficulty badge (green "EASY"), category label ("technical"), progress bar (Q 1/10), countdown timer (2:00)
3. Click the **speaker icon** to have the question read aloud

**Say:**
> "Here's the interview room. On the left is the question panel showing the difficulty level — we start at Easy — and the question category. The categories rotate through Technical, Conceptual, Behavioral, and Scenario to ensure variety. On the right is the answer area. Up top we have the progress bar and a strict 120-second countdown timer per question."

> "Notice the speaker icon — clicking it reads the question aloud using text-to-speech, making the experience feel like a real interview."

**Feature Callout:**
> "This demonstrates **relevant interview questions** across multiple categories with **strict time constraints** — both required by the problem statement."

---

## SCENE 4: Answering — Type + Voice (40 seconds)

**Do:**
1. Click the **"Speak"** mic button and answer part of the question by speaking
2. Show the text appearing in the textarea as you speak
3. Stop recording, then type a few more words manually to show both modes coexist
4. Submit the answer before the timer runs out

**Say:**
> "Candidates can answer by typing, or by clicking the Speak button to use voice-to-text. Watch as my spoken words appear in real time in the text area. I can also type to edit or add more. Both modes work together seamlessly."

> "The timer is counting down — if it hits zero, the answer auto-submits with whatever's been typed, and a 30% time penalty is applied to the score."

**Feature Callout:**
> "This covers **enforcing strict time constraints** with **penalties for over-time or incomplete answers**."

---

## SCENE 5: Adaptive Difficulty (45 seconds)

**Do:**
1. Answer questions 2 and 3 well (give good answers)
2. After each answer, point out the difficulty badge changing: Easy → Medium
3. Point at the **Difficulty Trend** bar at the bottom showing the colored dots
4. Point at the running average score

**Say:**
> "Here's where TakeOff really shines — **dynamic difficulty adaptation**. I answered the first question well, scoring above 70, so the system automatically increased the difficulty to Medium. This is powered by a deterministic rules engine — not the LLM guessing. The rules are explicit:"

> "Score above 70? Difficulty goes up. Between 40 and 70? Stays the same. Below 40? Drops down. You can see the difficulty path in the trend bar at the bottom — green dots for Easy, yellow for Medium, red for Hard."

**Feature Callout:**
> "This is the **adaptive question difficulty** requirement — increasing difficulty for strong responses and reducing it for weaker ones, using a state-based rules engine."

---

## SCENE 6: Show Scoring System (30 seconds)

**Do:**
1. Continue answering questions (you can give shorter answers for questions 4-6 to speed up the recording)
2. Briefly mention the scoring happens in the background

**Say:**
> "Every answer is evaluated by Gemini AI on five dimensions — exactly as the problem statement requires: **Accuracy**, **Clarity**, **Depth**, **Relevance**, and **Time Efficiency**. Each dimension scores 0 to 20, giving a total of 0 to 100 per question. The scoring is calibrated to difficulty — an Easy question is graded differently than a Hard one."

> "The platform also tracks consecutive low scores. If a candidate scores below 30 three times in a row, or their average drops below 25 after three questions, the interview terminates early — just like a real interviewer would cut short a poor performance."

**Feature Callout:**
> "This covers the **objective scoring mechanism** and **early interview termination** requirements."

---

## SCENE 7: Complete the Interview (20 seconds)

**Do:**
1. Speed through remaining questions (or skip a couple to save time)
2. After question 10, the "Interview Complete" modal appears
3. Click "View Results"

**Say:**
> "After 10 questions, the interview concludes and TakeOff generates a comprehensive readiness report using all the data collected during the session."

---

## SCENE 8: Results Dashboard — Readiness Score (30 seconds)

**Do:**
1. Show the Results page loading
2. Point to the **Readiness Gauge** (circular score 0-100)
3. Point to the **Hiring Readiness** indicator (Ready / Almost Ready / Not Ready)
4. Point to the interview stats (questions, avg score, duration)

**Say:**
> "Here's the results dashboard. At the top we have the **Interview Readiness Score** — a 0 to 100 gauge — and the **Hiring Readiness** indicator for the specific job description: Ready, Almost Ready, or Not Ready. We can see the total questions answered, average score, and total interview duration."

**Feature Callout:**
> "This is the **final interview readiness score** with a **categorized feedback** indicator — exactly what the problem statement asks for."

---

## SCENE 9: Results — Skill Breakdown (20 seconds)

**Do:**
1. Scroll down to the **Skill Breakdown** section
2. Point out the horizontal bars for each skill with scores

**Say:**
> "The skill breakdown shows performance across specific skill areas relevant to the job description — each with a score and a label. This gives the candidate a clear picture of where they're strong and where they need work."

**Feature Callout:**
> "This delivers the **performance breakdown by skill areas** requirement."

---

## SCENE 10: Results — Strengths, Weaknesses, Recommendations (20 seconds)

**Do:**
1. Show the three-column section: Strengths, Weaknesses, Recommendations
2. Briefly read one from each

**Say:**
> "Next we have specific **strengths** from the interview, identified **weaknesses**, and most importantly — concrete, actionable **recommendations** for improvement. These aren't generic tips — they reference the actual questions and answers from this interview."

**Feature Callout:**
> "This covers **strengths and weaknesses** and **actionable feedback for improvement**."

---

## SCENE 11: Results — Learning Resources (20 seconds)

**Do:**
1. Scroll to the **Recommended Resources** section
2. Show the resource cards with YouTube/article/docs types
3. Click one to show it opens in a new tab

**Say:**
> "TakeOff goes beyond just scoring — it recommends specific learning resources targeted at the candidate's weaknesses. YouTube tutorials, articles, documentation — each linked to a specific skill gap identified during the interview. These are real resources from channels like freeCodeCamp, NeetCode, and sites like GeeksforGeeks."

---

## SCENE 12: Results — Question History (20 seconds)

**Do:**
1. Scroll to the **Question History** accordion
2. Click to expand one question — show the Q&A, score, difficulty, time taken, and AI feedback

**Say:**
> "Finally, the full question history — every question, the candidate's answer, the score breakdown, difficulty level, time taken, and the AI's reasoning. This is complete transparency into how the interview was evaluated."

---

## SCENE 13: Technical Highlights & Wrap-up (30 seconds)

**Show:** Keep results page visible, or briefly flash the architecture from README

**Say:**
> "Under the hood, TakeOff uses a **stateful interview state machine** with explicit states — setup, in progress, completed, and terminated. The difficulty adaptation is **deterministic and rule-based**, not left to LLM chance. Scoring uses **structured JSON output** from Gemini with validation and normalization."

> "The stack is **FastAPI** on the backend, **React** on the frontend, and **Google Gemini 2.5 Flash** for AI — with 31 unit tests covering the core logic."

> "TakeOff — from layoff to your dream job. Thank you!"

---

## Quick Reference: All Problem Statement Features Covered

| Requirement | Where in Demo |
|---|---|
| Analyze Candidate Resume | Scene 2 — resume PDF upload + AI parsing |
| Accept Job Description | Scene 2 — JD paste + skill matching |
| Ask Relevant Interview Questions | Scene 3 — technical/conceptual/behavioral/scenario |
| Varying difficulty levels (Easy → Medium → Hard) | Scene 5 — difficulty badges + trend dots |
| Adapt Question Difficulty Dynamically | Scene 5 — deterministic rules engine |
| Enforce Strict Time Constraints | Scene 3-4 — 120s timer + auto-submit |
| Penalize over-time or incomplete answers | Scene 4 — 30% time penalty |
| Early Interview Termination | Scene 6 — explained (3 consecutive <30 or avg <25) |
| Objective Scoring (Accuracy, Clarity, Depth, Relevance, Time Efficiency) | Scene 6 — 5-dimension scoring |
| Final Interview Readiness Score (0-100) | Scene 8 — circular gauge |
| Categorized feedback (Strong/Average/Needs Improvement) | Scene 8 — readiness label |
| Performance breakdown by skill areas | Scene 9 — skill bars |
| Strengths and weaknesses | Scene 10 — three-column cards |
| Actionable feedback for improvement | Scene 10 — recommendations |
| Hiring readiness indicator for the given JD | Scene 8 — Ready/Almost Ready/Not Ready |

## Bonus Features (Beyond Problem Statement)

| Feature | Where in Demo |
|---|---|
| Text-to-Speech (listen to questions) | Scene 3 — speaker icon |
| Speech-to-Text (speak your answers) | Scene 4 — mic button |
| Learning Resources (YouTube + articles) | Scene 11 — resource cards |
| Difficulty Trend visualization | Scene 5 — bottom bar colored dots |
| Voice + text hybrid answering | Scene 4 — both modes coexist |
