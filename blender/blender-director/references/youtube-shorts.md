# YouTube Shorts Pipeline

Read this together with `animation.md` whenever the deliverable is a Shorts video. The user's main genre: educational videos explaining AI concepts in 3D. The user gives the concept and rough animation idea; you improvise it into polished motion design — that elevation is the point of this file.

## Format and platform rules

- 1080×1920 (9:16 vertical). Length ≤ 60 s; aim for 20–40 s — retention drops with length. fps 30 by default (24 for cinematic mood, 60 for fast "satisfying" motion).
- Vertical composition: ONE focal element per beat; frame subjects center to upper-center; keep the bottom ~20–25% and side edges clear — captions and platform UI live there. Get closer and scale bigger than you would for a landscape frame.
- Output is silent — the user adds voiceover, music, and captions in an editor. In-scene 3D text labels only if they ask for text baked in.
- If they share a narration script, time the animation beats to it at roughly 2.5 spoken words per second.

## Beat structure (retention is the design constraint)

- **0–2 s hook:** motion plus the most striking visual immediately. Never a slow fade-in — viewers decide to swipe within the first second.
- **Middle:** one concept, developed in 2–4 visual beats. Something must always be moving; a slow camera push is the minimum.
- **End:** a payoff frame, and when the concept allows, land back on the hook state for a seamless loop — loops multiply rewatches.
- Storyboard format for the plan-approval step: `0:00–0:03 — what's on screen — camera — narration beat (if provided)`.

## AI-explainer visual language (the user's genre)

The look that reads "premium tech explainer": dark gradient world background, restrained palette (one base hue + one accent), emissive glowing elements, glass / brushed-metal / matte-dark materials, shallow DoF, slow deliberate camera. During the interview, propose 2–3 metaphors per concept from this library (or invent better ones):

- **Neural network:** node spheres connected by curve "axons"; signals = small emissive spheres or beams traveling along the curves (Follow Path); learning = connections brightening and thickening over time (keyframed emission strength / curve bevel radius).
- **Data / tokens:** instanced tiles or cubes streaming along a curve into a machine or structure.
- **Embeddings / vector space:** a point cloud drifting from random noise into clean clusters.
- **Attention:** lines between token blocks lighting up at different intensities.
- **Gradient descent / loss landscape:** noise-displaced terrain with a ball rolling into the minimum, leaving a glowing trail.
- **Model scale / parameters:** slow camera pull-back revealing a vast instanced grid.
- **Training over time:** time-lapse of the structure organizing, brightening, stabilizing.

Animate with: Follow Path on curves, keyframed emission strength, instancing (arrays, geometry nodes), and Noise F-curve modifiers for organic drift.

## Glow without Eevee bloom

Cycles has no bloom, and this look depends on glow. Build it in the compositor: Render Layers → **Glare node** (Fog Glow or Streaks; threshold just under your emission strengths; tune size/mix) → Composite. Enable it *before* check-in renders so your critique matches the final look. Use strong emission values (5–30) so the Glare threshold has something to bite.

## Render and delivery policy (user's standing choices)

- Check-in rounds: critique on Cycles key-frame stills per `animation.md`; a fast viewport playblast may be offered for timing only.
- Final render: never start unprompted. Render one test frame at final settings, time it, multiply by frame count, present the estimate with quality options (full samples vs balanced 128–256 + denoise — animation noise hides more than stills), and wait for an explicit go.
- Render a PNG sequence to the project folder, then encode H.264 MP4 with yuv420p pixel format (maximum player compatibility), 1080×1920. Hand over both the sequence folder and the .mp4 path, named by concept and version (`ai_attention_v01.mp4`).
- Close by reminding where captions/voiceover fit: the bottom margin you kept clear is their caption zone.
