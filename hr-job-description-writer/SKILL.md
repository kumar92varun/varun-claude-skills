---
name: HR - Create Job Description
description: >
  Use this skill whenever the user wants to create, write, draft, improve, or review a job description (JD) or job posting — especially for engineering and technical roles. Trigger this skill when the user says things like "write a JD for", "create a job description for", "help me hire a", "draft a job post", "we're hiring a [role]", or asks how to describe a technical role to candidates. Also trigger it when a user pastes an existing JD and asks to improve or rewrite it, or when they want help deciding what to require vs. what's just nice-to-have. Specializes in engineering, data, ML, DevOps, platform, and other technical roles. Use it even if the user only provides a job title and nothing else — the skill will guide the process.
---

# Job Description Writer

A skill for writing compelling, structured, and effective job descriptions from the perspective of both an HR professional and a technical hiring manager.

---

## Philosophy

A good JD does three things:
1. **Attracts** the right candidates by clearly communicating what makes the role exciting
2. **Filters** mismatched candidates by being specific about real requirements
3. **Represents** the company honestly and professionally
4. Brings **Clarity** by writing crisp job description defining the job role point-to-point with least ambiguity and mismatched expectations

Avoid: vague buzzwords, inflated requirements, gendered language, and walls of bullet points with no context.

---

## Input Gathering

Before writing, collect the following from the user. If any are missing, ask for them — but if the user is in a hurry, make smart assumptions and flag them. Ask all the required and optional questions one by one, don't print all the points to ask together, go one by one. Also for each and every question, do provide a pre-generated recommended answer for that question. Based on the question, the recommended answer may be a word, sentence, paragraph, bullet points, etc. Understand the answer type from below. Always show the pre-generated default answer in the prompt for user to get a hint what they will get if they let you to generate answer for this question automatically.

### Required
- **Job title** — be precise (e.g., "Senior Backend Engineer" not just "Engineer"). Answer type - sentence
- **Years of experience** — how much work experience an ideal candidate should have? Answer type - sentence
- **Work timings** — the timezone candidate is expected to work in? Defaults to IST (Indian Standard Timezone). Answer type - sentence. NEVER display official work timings, just mention the timezone. Also mention that we would expect 2-3 hours of flexibility to adjust work timings according to the client's timezone and their meeting times.
- **Location** — remote, hybrid, on-site, city. Defaults to "remote job". Answer type - sentence
- **Key responsibilities** — what will they actually do day-to-day?. Answer type - numbered bullet points. Don't move forward until user is fully satisfied with all the numbered bullet points verified by them or added by them that you will input and add in this question's numbered bullet points answer.
- **Key technical skills** — what technical skills are mandatory for this job? User may provide multiple technical skills . Answer type - numbered bullet points. Don't move forward until user is fully satisfied with all the numbered bullet points verified by them or added by them that you will input and add in this question's numbered bullet points answer. ALWAYS mention the name of firm tools and technologies to use as part of technical skills.
- **Must-have requirements** — non-negotiables (years of experience, specific skills, credentials). Answer type - numbered bullet points. Don't move forward until user is fully satisfied with all the numbered bullet point s verified by them or added by them that you will input and add in this question's numbered bullet points answer

### Helpful (ask if not provided)
- **Nice-to-have skills** — differentiators, not blockers. Answer type - numbered bullet points. Don't move forward until user is fully satisfied with all the numbered bullet points verified by them or added by them that you will input and add in this question's numbered bullet points answer
- **Seniority level** — junior, mid, senior, lead, director, VP. Defaults to Senior position. Answer type - word
- **Employment type** — full-time, contract, part-time. Defaults to full-time. Answer type - word
- **Soft skills** — what soft skills a person should have? Answer type - numbered bullet points. Defaults to "Proactive, dependable, and trustworthy", "Strong team player and technical leader", "Helps team members grow and mentors others", "Open to feedback and continuous improvement" and "Enjoys brainstorming and problem-solving". Don't move forward until user is fully satisfied with all the numbered bullet points verified by them or added by them that you will input and add in this question's numbered bullet points answer

---

## Output Structure

Produce the JD in this order. Use clear section headers as mentioned below.

### Job Title
Clean, specific, industry-standard title.

### Experience
Show years of experience as a single sentence.

### Work Timings
Show the timezone name as well as the note that we require flexibility of 2-3 hours for client meetings

### Role Overview (6-10 bullet points)
A compelling summary that answers:
- What is expected from you to do on a daily basis?
- What does this team/product do?
- What is the core mission of this role?
- Why is it exciting or impactful?

### What You'll Do (Responsibilities)
- 6–10 bullet points
- Start each with a strong action verb (Lead, Build, Design, Own, Collaborate, etc.)
- Be specific — avoid "assist with various tasks"
- Include both day-to-day and strategic responsibilities if applicable
- Order from most important to least

### What We're Looking For (Requirements)

**Must-haves technical skills:**
- 4–7 bullets — only true non-negotiables
- Avoid inflating: if 3 years experience is fine, don't say 5+
- Be specific about tools, languages, frameworks, domains

**Nice-to-haves technical skills:**
- 3–5 bullets — genuine differentiators
- Frame positively: "Experience with X is a plus"

### Soft Skills We Value
Mention here the bullet points of soft-skills chosen by the user

---

## Writing Guidelines

### Language & Tone
- Match formality to the company's culture (startup = casual-confident; enterprise = professional)
- Use "you" and "we" for warmth and directness
- Avoid jargon unless it's domain-standard and candidates would recognize it
- Keep sentences concise, crisp and to-the-point without lucratiive talks
- Don't use tables, and never use icons anywhere

### Bias Reduction
- Avoid gendered language ("rockstar", "ninja", "aggressive", "nurturing")
- Don't over-specify years of experience — focus on demonstrated skills
- Prefer "experience with" over "degree in" unless a credential is legally required
- Avoid culture-fit language that signals homogeneity ("work hard, play hard")

### Requirements Calibration
Apply the rule of thumb:
- **Must-have**: Would you reject a candidate who lacks this? If no → nice-to-have
- **Nice-to-have**: Would this meaningfully differentiate candidates? If no → drop it

### Technical Roles (Primary Focus)
This skill is optimized for engineering and technical hiring. Always apply these rules:

**Tech Stack Specificity**
- Name exact languages, frameworks, and tools (e.g., "Go and Rust" not "backend languages")
- Separate daily-use tools from occasional ones in the JD
- Include infra/cloud specifics: AWS vs GCP vs Azure, Kubernetes, Terraform, etc.
- For data/ML roles: specify data volumes, model types, pipeline frameworks (Spark, Airflow, Ray, etc.)

**System Scale Cues** — include where relevant
- User scale: "serving 50M+ daily active users"
- Data scale: "processing 5TB of events per day"
- Reliability expectations: "99.99% SLA", "on-call rotation (X weeks/year)"

**Engineering Culture Signals** — always include at least 2–3:
- Code review culture (async, pairing, mob)
- CI/CD and deployment cadence
- Testing philosophy (TDD, coverage expectations)
- Incident response / on-call expectations
- Team size and autonomy level
- Technical decision-making process (RFCs, ADRs, etc.)

**Seniority Calibration for Technical Roles**

| Level | Ownership | Scope | Collaboration |
|---|---|---|---|
| Junior | Task-level | Own code | Guided by senior |
| Mid | Feature-level | Component | Peers + some autonomy |
| Senior | System-level | Service/domain | Cross-team influence |
| Staff/Principal | Org-level | Multi-system | Sets technical direction |
| Engineering Manager | People + delivery | Team | Stakeholder alignment |

Calibrate responsibilities and requirements to match the level above.

---

**Rules for the split:**
- Must-have = candidate would fail or be severely blocked without it in week 1
- Nice-to-have = would meaningfully raise your bar, but absence isn't a dealbreaker
- Aim for: 4–6 must-haves, 3–5 nice-to-haves maximum
- Never require a degree unless legally mandated — prefer "or equivalent experience"
- Years-of-experience requirements: use as a proxy only; prefer skill-based framing
- Flag any requirement that could disproportionately filter underrepresented candidates

---

## Example Trigger Phrases
- "Write a JD for a senior data engineer"
- "Help me hire a product manager for our fintech startup"
- "Here's a job description I wrote — can you improve it?"
- "We're looking for a DevOps lead, help me draft the posting"
- "What should I include in a JD for an ML engineer role?"