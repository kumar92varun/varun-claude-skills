---
name: cv-modifier
description: >
  Use this skill whenever the user wants to modify, tailor, or improve a CV (curriculum vitae / resume)
  for a specific job, client, or project requirement. Triggers include: any mention of modifying a CV,
  tailoring a resume, adding or removing skills from a CV, updating a candidate's CV, or any request
  involving a Google Docs link that is a CV or resume. Also triggers when the user says things like
  "help me update this CV", "add a skill to the resume", "remove a technology from the CV",
  "tailor this CV for a client", or "improve this resume". Always use this skill — do NOT handle
  CV modification requests from memory or general knowledge alone.
compatibility:
  required_mcps:
    - Google Drive MCP (for reading the CV — read-only, no write-back ever)
---

# CV Modifier Skill

A structured, loop-based skill for reading a candidate's CV from Google Drive, analysing it,
and producing precise content-only modifications — displayed clearly in chat so the user can
apply them manually in Google Drive.

**No write-back. No file creation. Read only.**
All changes are shown in chat in a formatted, section-by-section layout.
The user applies them manually to their Google Doc.

---

## PHASE 1 — Read & Analyse the CV

### Step 1: Get the Google Doc link
Ask the user for the Google Docs link to the CV if not already provided.

### Step 2: Read the full CV via Google Drive MCP
Use the Google Drive MCP to fetch the full content of the document. **Read only — never write.**

**MANDATORY:** Read every section completely — Objective, Summary, Technical Skills, every Project
(name, tech stack, description, roles & responsibilities), Education, Certifications, and any
other section present. Do NOT skip, truncate, or skim any part.

**If the document cannot be fully read** (access restricted, content truncated, or partial load):
- Immediately warn the user: explain exactly what could and could not be read
- Do NOT proceed with modification until the user confirms how to handle it
- Offer options: request access, proceed with partial content (with risk caveat), or abort

### Step 3: Hold full CV knowledge in context
Store the complete CV in working memory — every sentence, bullet point, skill, and project detail.
**Never discard this original knowledge until the skill session ends.**
You will need it to:
- Detect redundancy when adding skills
- Ensure grammatical coherence after removals/replacements
- Evaluate improvements accurately

### Step 4: Analyse and prepare improvement recommendations
Silently evaluate the CV for the following (only flag issues you are confident about):

| Category | What to look for |
|---|---|
| Grammar & clarity | Typos, awkward phrasing, inconsistent tense |
| Weak action verbs | "worked on", "helped with", "was involved in" → stronger alternatives |
| Missing quantification | Vague claims like "improved performance" where a metric would strengthen it |
| Inconsistencies | Skills listed in Technical Skills but never mentioned in projects, or vice versa |
| Incomplete sections | Blank or placeholder content (e.g. empty "Role & Responsibilities") |
| Redundancy | Repeated phrases or points across sections |

Save this list. You will present it to the user in Phase 3 if they select Mod Type 4.

---

## PHASE 2 — Select Modification Types

Present the following as a multi-select checklist. The user may select one or more:

```
Which modifications would you like to make to this CV?
(You can select more than one)

[ ] 1. Add one or more technologies / skills
[ ] 2. Remove one or more technologies / skills
[ ] 3. Replace a skill / technology with another
[ ] 4. Work on Claude's recommended improvements
```

Process each selected modification type **one at a time**, in the order selected.
Complete one type fully before moving to the next.

---

## PHASE 3 — Execute Modifications & Display Changes

For every modification type, Claude computes what needs to change and **displays all changes
in chat** using the output format defined below. Claude does NOT attempt to write anything
back to Google Drive.

---

### OUTPUT FORMAT — How to display changes

For each modification type, output:

1. A **section heading** that states what is being improved, e.g.:
   `## ➕ Adding "LangChain" to the CV`

2. A **table** underneath with one row per text change required:

| # | CV Location | Current Text | Updated Text |
|---|---|---|---|
| 1 | Objective | "...experienced in React and Node..." | "...experienced in React, Node, and LangChain..." |
| 2 | Technical Skills > Agentic Frameworks | "AutoGen, CrewAI" | "AutoGen, CrewAI, LangChain" |
| 3 | Project: B2B Telecom > Tech Stack | "React, Node.js, PostgreSQL" | "React, Node.js, PostgreSQL, LangChain" |
| 4 | Project: B2B Telecom > Roles & Responsibilities | *(new bullet — insert after bullet 2)* | "Integrated LangChain to build a retrieval-augmented pipeline for document summarisation." |

**Rules for the table:**
- **CV Location** must be specific enough for the user to find the exact spot: include section name, subsection, project name, and position (e.g. "after bullet 2") where relevant.
- **Current Text** shows the exact existing text that needs to be replaced. For new insertions, write *(new — insert after [reference point])*.
- **Updated Text** shows the exact final text the user should type in.
- Never abbreviate or truncate — show complete sentences/bullets so there is zero ambiguity.
- If a whole bullet is being deleted with no replacement, put *(delete this bullet)* in the Updated Text column.

After the table, add a short note:
> 💡 **How to apply:** Open your Google Doc, locate each row by CV Location, and replace the Current Text with the Updated Text exactly as shown.

---

### MOD TYPE 1: Add one or more technologies / skills

**Step A — Collect the skill to add**
Ask: "What technology or skill would you like to add?"
Handle one skill at a time (if user mentions multiple, queue them and handle sequentially).

**Redundancy check (MANDATORY before proceeding):**
Check if this skill already exists anywhere in the CV (case-insensitive, including abbreviations).
- If found: warn the user ("This skill already appears in the CV under [location]. Skipping to avoid duplication.") and move to the next skill.
- If not found: proceed.

**Step B — Choose placement locations**
Show this checklist and let the user select one or more:

```
Where should "[SKILL]" be added?

[ ] Objective
[ ] Summary
[ ] Technical Skills
[ ] Projects
```

**Step C — Compute all changes and display using the Output Format**

#### Adding to Objective
- Modify an existing sentence in the Objective paragraph to naturally incorporate the skill, OR
- Add a new sentence if no existing sentence can accommodate it cleanly
- The result must read fluently and sound like the candidate genuinely has this expertise

#### Adding to Summary
- Add one or more new bullet points referencing the skill
- Insert these new bullet points **between** existing ones — never at the very top or very bottom
- Each bullet must be consistent in tone and style with the surrounding bullets

#### Adding to Technical Skills
- Identify the most appropriate existing category for this skill (e.g. "Frontend", "Backend", "Cloud & DevOps")
- Add it to that category's list
- If no existing category fits well, propose a new category name and confirm with the user before showing changes

#### Adding to Projects
- Show the user a checklist of all projects in the CV and ask which ones to update
- For each selected project:
  - Add the skill to the **tech stack line**
  - Add one or more relevant bullet points under **Roles & Responsibilities** that naturally describe using this skill
  - Bullet points must be consistent in style/tone with existing bullets for that project
  - Do NOT invent project details or outcomes — only write plausible, generic usage statements consistent with the project's described domain

**Repeat Step A–C** for each additional skill the user wants to add.
Each skill gets its own section heading and table.

---

### MOD TYPE 2: Remove one or more technologies / skills

**Step A — Show the full skills inventory**
Extract every distinct skill and technology name from the entire CV.
Sort alphabetically and present as a multi-select checklist.

**Step B — Confirm before proceeding**
After the user selects skills to remove, confirm: "You've selected to remove: [list]. Shall I proceed?"

**Step C — Compute all changes and display using the Output Format**

For each selected skill, scan all sections and determine every text change needed:
1. **Objective** — remove the skill name; rewrite the sentence if needed so it still reads correctly
2. **Summary** — remove bullet points that solely reference this skill; if a bullet references multiple skills, remove only the skill mention and rewrite the bullet
3. **Technical Skills** — remove from the relevant category row
4. **Projects** — remove from tech stack lines; remove or rewrite bullet points that solely reference this skill

**After every removal:** verify the affected sentence/bullet still makes grammatical and semantic sense.
If a sentence becomes broken or meaningless after removal, rewrite it to restore coherence.
If an entire bullet becomes empty or meaningless, mark it for deletion.

Each skill removal gets its own section heading and table.

---

### MOD TYPE 3: Replace a skill / technology with another

**Step A — Show the full skills inventory**
Same alphabetical multi-select list as Mod Type 2.
User selects the skill(s) to replace.

**Step B — Collect replacement**
For each selected skill, ask: "What should replace [SKILL]?"

**Redundancy check:** if the replacement already exists in the CV, warn the user and ask how to proceed (skip replacement, or merge mentions).

**Step C — Compute all changes and display using the Output Format**

Find every occurrence of the original skill across all sections and determine the replacement text.
After each replacement, verify the sentence reads correctly — rewrite if needed to maintain
grammatical and semantic coherence (e.g. if "Redux Saga" is replaced with "Zustand", surrounding
context may need adjustment).

Each replacement gets its own section heading and table.

---

### MOD TYPE 4: Claude's recommended improvements

Display **all improvements at once**, grouped by improvement category.

For each improvement category identified in Phase 1 Step 4, output:

1. A **section heading** naming the improvement category, e.g.:
   `## ✏️ Weak Action Verbs`

2. A **table** with one row per change:

| # | CV Location | Current Text | Suggested Text | Reason |
|---|---|---|---|---|
| 1 | Project: OneView > Roles & Responsibilities > Bullet 3 | "Was involved in building the payment module" | "Engineered the payment module, reducing checkout errors by improving validation logic" | Replaces passive phrase with a strong action verb and adds specificity |
| 2 | Summary > Bullet 5 | "Helped with CI/CD pipelines" | "Configured and maintained CI/CD pipelines using GitHub Actions" | Removes weak "helped with"; adds the tool for concreteness |

Repeat for every improvement category that has findings.
Categories with no findings are silently skipped.

After all tables, add:
> 💡 **How to apply:** Review each suggestion above. Open your Google Doc and manually apply the ones you agree with.

---

## PHASE 4 — Round Summary & Loop

After all selected modification types have been displayed, present a summary:

```
✅ Round [N] Complete — Changes Displayed:
───────────────────────────────────────────
[List every change shown this round, grouped by section]

Example:
• Technical Skills → Add "LangChain" to Agentic Frameworks
• Summary → Insert new bullet after bullet 3
• Project: B2B Telecom → Tech stack update + 1 new bullet
• Objective → Reworded sentence to include LangChain reference

All changes are shown above. Please apply them manually in your Google Doc.
```

Then ask:
> "Once you've applied the changes, would you like to start another round of modifications?"

- If **another round**: re-read the CV fresh from Google Drive (so any manual edits the user just made are captured), then restart from Phase 1 Step 2
- If **done**: close gracefully — "The CV is ready. Good luck! 🎯"

---

## HARD RULES (never violate these)

| Rule | Detail |
|---|---|
| **Never write to Google Drive** | Use Google Drive MCP for reading only. NEVER call any write, update, create, or patch operation on any Google Drive or Google Docs resource — not as a primary action, not as a fallback, under any circumstances. |
| **Never create new documents** | Do NOT use create_file or any equivalent to produce a new Google Doc, .docx, or any other file. |
| **Display changes in chat only** | All modifications are shown in chat using the section heading + table format. The user applies them manually. |
| **Content only** | Never modify formatting, layout, fonts, heading styles, table structure, or bullet styles — unless the user explicitly asks |
| **No invented skills** | Never add a skill or technology that wasn't in the original CV or explicitly requested by the user |
| **No invented projects** | Never create a project that doesn't exist in the original CV |
| **No invented metrics** | Never add numbers, percentages, or outcomes you don't know to be true |
| **One skill at a time** | When adding multiple skills, handle each one sequentially — collect placement, compute changes, display, then move to the next |
| **Redundancy check always** | Always check if a skill already exists before adding it |
| **Warn on partial reads** | Never silently proceed with an incomplete CV read |
| **Exact text in tables** | Current Text and Updated Text columns must always show complete, unambiguous text — never truncate or summarise |
