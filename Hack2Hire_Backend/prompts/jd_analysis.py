JD_ANALYSIS_PROMPT = """Analyze this job description and extract structured requirements for interview preparation.

Return a JSON object with exactly these fields:
{
  "role_title": "the job title",
  "required_skills": ["must-have skills"],
  "preferred_skills": ["nice-to-have skills"],
  "experience_level": "entry | mid | senior | lead",
  "key_responsibilities": ["main responsibilities"],
  "company_name": "company name if mentioned, otherwise empty string"
}

JOB DESCRIPTION:
{jd_text}"""
