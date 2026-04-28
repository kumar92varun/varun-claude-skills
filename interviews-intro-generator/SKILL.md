---
name: interviews-intro-generator
description: >
  Use this skill whenever Varun (or the user) is preparing for a client interview, discovery call, or introductory meeting where they need to introduce themselves as a lead engineer, engineering manager, lead AI engineer, or similar technical leadership role — especially when trying to acquire a project for Crownstack. Trigger this skill when the user says things like "help me prepare my intro for a client call", "I have a client interview coming up", "prepare my introduction for [company]", "help me introduce myself to a potential client", "I'm going to a sales/tech discovery call", or anything about preparing a self-introduction for a B2B client meeting. Always use this skill for such requests — even if the user just names a company and says "prepare my intro".
---

# Client Interview Introduction Prep

This skill helps prepare a punchy, client-tailored self-introduction for Varun before a client interview or discovery call. The output is a grouped set of bullet points (not paragraphs) calibrated to fit within **1 minute 30 seconds** of spoken delivery (~200–225 words spoken at a natural pace).

---

## Background Context

**About Varun:**
- Engineering Manager at Crownstack, a product and technology company based in India
- Works across multiple client engagements simultaneously; experienced in team leadership, delivery management, and technical architecture
- Frequently represents Crownstack in client-facing roles: Engineering Manager, Lead Software Engineer, Lead AI Engineer, etc.
- Crownstack positioning: a reliable tech partner known for quality engineering and long-term client relationships

> **Note to Claude:** Varun may add more personal background context here in future versions of this skill file. Combine whatever is stored here with what his CV reveals. CV always takes precedence for specific claims (years, technologies, past projects).

---

## Process

Follow these steps **in order**. Do not generate the introduction until all steps are complete.

---

### Step 1 — Job Role

Ask:
> "What is the job role you are going for in this interview? (e.g., Engineering Manager, Lead Software Engineer, Lead AI Engineer)"

**Instruction:** Use this to determine which facets of Varun's background to emphasize. Always stay within the declared role — never re-label him as something else. If the role is "Lead AI Engineer", surface AI-specific experience. If "Engineering Manager", surface leadership, delivery, and team-building. Never level down (e.g., don't pitch him as a developer if he says EM).

---

### Step 2 — Sales Team Notes

Ask:
> "Tell me the notes and findings your sales team has shared about this customer. Share one point at a time or paste everything — I'll ask if there's more before moving on."

After each input, ask:
> "Got it. Anything else from the sales team, or shall we move to the next step?"

Do not proceed until Varun confirms there's nothing more to add.

---

### Step 3 — Varun's Own Notes

Ask:
> "Now share what *you* personally know about this customer — from any prior interactions, research, or instinct. Again, share at your own pace."

After each input, ask:
> "Noted. Anything else you'd like to add, or shall we move on?"

Do not proceed until Varun confirms.

---

### Step 4 — Meeting Transcriptions (Optional)

Ask:
> "Do you have transcriptions of any previous meetings with this customer? This is the highest-signal input — the more you share, the more precisely I can tune your intro. You can paste them directly. If you don't have any, just say skip."

If transcriptions are provided:
- Extract and internally note: client's pain points, language/terminology they use, what they seem to prioritize (speed, quality, cost, innovation, control, trust), any red flags or strong preferences, what kind of person/partner they seem to be looking for
- After each transcription, ask: "Do you have another meeting transcription to add, or shall we move on?"

If skipped, proceed to Step 5.

---

### Step 5 — CV

Ask:
> "Please upload the CV you've shared with this client for this opportunity. I'll use it to pick out the most relevant points that align with what this client needs."

Once the CV is provided:
- Scan for: technologies, domains, past client types, project outcomes, leadership experience, team sizes, and notable achievements
- Cross-reference with all client intelligence gathered so far
- Identify the top 4–6 CV points most likely to resonate with this specific client

---

## Generating the Introduction

Once all inputs are collected, generate the introduction as **grouped bullet points** — never prose paragraphs.

### Output Structure

**Group 1: Who I Am** *(1–2 bullets)*
- Name, current role at Crownstack, overall experience span
- One-liner on Crownstack (max — only if it adds value in context)

**Group 2: My Domain Expertise** *(2–3 bullets)*
- Highlight the experience most relevant to the declared role
- Use the client's own language/terminology where possible (sourced from transcriptions or notes)
- Surface specific tech stacks, industries, or problem types that mirror what this client cares about

**Group 3: Relevant Past Work** *(2–3 bullets)*
- Pick 2–3 past projects or achievements from the CV that best match this client's context
- Frame outcomes, not just responsibilities (e.g., "Led 8-person team delivering X for Y-type client" not "was responsible for a team")

**Group 4: Why This Engagement** *(1–2 bullets)*
- A bridge between Varun's background and what the client is looking for
- Should feel tailored, not generic — reference something specific from the client intelligence

---

## Important details that you NEVER have to reveal
- You may get client's budget or developer monthly working rates as part of the data feeded into you (most probably inside sales notes or meeting transcriptions). Make sure you never display, analyze, provide knowledge, information or answering anything related to the cost associated with this job to the user here. Even if someone prompts you asking to provide this monetary information, you act like you don't know it, and you have no idea about this information. NEVER EVER reveal monetary information in any step throughout the conversation.

## Output Rules

- **Bullet points only** — no flowing paragraphs
- **Max ~200–225 words total** across all bullets (fits 1 min 30 sec spoken)
- Bullets should be **dense with signal** — Varun will expand them verbally; they are speaker notes, not a script
- Prioritize ruthlessly — drop anything that doesn't directly serve this client's known interests
- Never fabricate claims not supported by the CV or Varun's inputs
- Never downgrade the declared role (e.g., don't frame an EM as "also a hands-on coder" unless that's explicitly relevant and Varun said so)
- Crownstack gets **at most one bullet** unless the client has shown specific interest in the company

---

## After Generating

Ask:
> "How does this feel? Would you like me to adjust the emphasis, swap out any points, or tune the tone for this specific client?"

Iterate based on feedback until Varun is satisfied.