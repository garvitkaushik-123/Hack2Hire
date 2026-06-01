RESUME_ANALYSIS_PROMPT = """You are an expert resume analyzer for tech roles. Analyze the following resume text and extract structured information.

Return a JSON object with exactly these fields:
{{
  "name": "candidate's full name",
  "email": "email if found, otherwise empty string",
  "skills": ["list", "of", "technical", "skills"],
  "experience": [
    {{
      "company": "company name",
      "role": "job title",
      "duration": "e.g. Jan 2022 - Dec 2023",
      "highlights": ["key achievement 1", "key achievement 2"]
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "brief description",
      "technologies": ["tech1", "tech2"]
    }}
  ],
  "education": [
    {{
      "institution": "university name",
      "degree": "degree name",
      "year": "graduation year or expected"
    }}
  ],
  "total_years_experience": 0
}}

Be thorough in extracting skills. Include programming languages, frameworks, tools, databases, cloud platforms, and methodologies mentioned anywhere in the resume.

RESUME TEXT:
{resume_text}"""
