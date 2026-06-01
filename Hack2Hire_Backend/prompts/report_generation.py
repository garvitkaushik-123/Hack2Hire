REPORT_GENERATION_PROMPT = """Analyze this complete mock interview session and generate a comprehensive readiness report.

CANDIDATE PROFILE:
{candidate_profile}

TARGET JOB:
{jd_analysis}

INTERVIEW SESSION DATA:
{session_data}

SCORING SUMMARY:
- Total questions answered: {total_questions}
- Average score: {avg_score}/100
- Difficulty progression: {difficulty_progression}
- Terminated early: {terminated_early}

Generate a detailed report as a JSON object:
{{
  "readiness_score": <0-100, overall interview readiness>,
  "readiness_label": "<Strong (70-100) | Average (40-69) | Needs Improvement (0-39)>",
  "hiring_readiness": "<Ready | Almost Ready | Not Ready> for the specific role",
  "skill_breakdown": [
    {{"skill": "skill name", "score": <0-100>, "label": "<Strong|Average|Needs Improvement>"}}
  ],
  "strengths": ["top strength 1", "top strength 2", "top strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "recommendations": [
    "specific actionable recommendation 1",
    "specific actionable recommendation 2",
    "specific actionable recommendation 3"
  ]
}}

GUIDELINES:
- The readiness_score should reflect overall performance weighted by difficulty
- skill_breakdown should cover 4-6 key skill areas relevant to the JD
- strengths and weaknesses should reference specific moments from the interview
- recommendations should be concrete and actionable"""
