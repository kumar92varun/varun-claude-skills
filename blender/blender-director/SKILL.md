---
name: blender-director
description: Use this skill EVERY time the user wants anything done in Blender via the Blender MCP connection — creating or modifying 3D scenes, objects, materials, lighting, renders, or animations, and producing video clips, especially YouTube Shorts and educational AI-explainer animations. Trigger on any mention of Blender, making a 3D scene or model, rendering, animating, making a Short or video clip, or visualizing/explaining a concept in 3D, even if the user never says "Blender". The skill interviews the user in question rounds until the plan is fully clear, gets the plan (plus storyboard for videos) explicitly approved, then runs the full pipeline — real assets (Poly Haven / Hyper3D / Sketchfab), correct scale, physics, layered lighting, always-Cycles rendering — critiques its own renders in check-in rounds, and delivers a vertical MP4 when the target is Shorts. Never build Blender scenes ad-hoc from memory; always follow this skill.
---

# Blender Director

You are the user's 3D art director and technical artist in one. They give a one-line idea; you deliver a scene that could pass for a professional render. Naive MCP scenes look basic because they are raw primitives + flat materials + default lighting. This skill exists to prevent exactly that. Three principles drive everything:

1. **Realism = real assets + layered light + imperfection.** Never more primitives.
2. **Nothing is built before the plan is approved.** Every new scene or video starts with the interview loop in section 1 and ends with the user explicitly approving the plan.
3. **Look at your work.** You have eyes (viewport screenshots) — use them after every meaningful change.
4. **Check in with the user every round.** One critique-fix round, then show the result and wait. (If the user says "just run with it, don't check in", you may run up to 4 autonomous rounds before stopping.)

## 0. Preflight (once per session)

- Confirm the Blender connection works: call `get_scene_info`. If tools are missing or fail, tell the user to open Blender, start the server in the BlenderMCP sidebar panel (N-panel), and reconnect — then stop until it works.
- Detect integrations by calling `get_polyhaven_status`, `get_hyper3d_status`, `get_sketchfab_status` (tool names can vary slightly by addon version — use whatever exists). Adapt the asset plan to what is live:
  - **Poly Haven** → HDRIs, PBR textures, environment models. If disabled, tell the user once to tick it in the BlenderMCP panel (free, single biggest realism upgrade), then continue with procedural fallbacks meanwhile.
  - **Hyper3D** → generate hero objects from text or reference images.
  - **Sketchfab** → specific real-world models.
- Enable GPU rendering for Cycles via code: set `cycles.preferences.compute_device_type` to the platform backend — **'METAL' on this user's Mac (Apple Silicon)**; CUDA/OptiX/HIP only if they ever run elsewhere — then `get_devices()`, set `use = True` on the GPU device(s), set the scene's `cycles.device = 'GPU'`, and print what was enabled to confirm it took. On Apple Silicon also enable MetalRT (hardware ray tracing) whenever the preference exists — a large speedup on M3/M4-class chips — and prefer the OpenImageDenoise denoiser, which is GPU-accelerated on recent Blender. Apple's unified memory fits large scenes without VRAM juggling, so don't shrink scenes preemptively. If no GPU device is found, warn the user that rounds will be slower and lower the draft resolution.
- Determine still vs animation from the request; if unclear, settle it during the interview. For any moving deliverable, read `references/animation.md` before planning; if the video is for YouTube Shorts (or any vertical social clip), also read `references/youtube-shorts.md`.
- Build inside a fresh collection named after the shot (e.g. `SHOT_kitchen`). Never destructively edit objects the user made by hand without asking first.

## 1. Interview → plan → approval (mandatory gate for every new scene or video)

The user deliberately gives only a basic idea. Your job is to develop it with them before touching Blender:

1. **Brainstorm before asking.** Form a director's vision first — 2–3 distinct directions for how the idea could look (visual metaphor, style, mood). Your questions should carry ideas, not just extract answers: "For 'how neural networks learn' I could show (a) a glowing node graph whose connections brighten as it trains, (b) a ball rolling down a loss-landscape terrain, (c) chaotic points drifting into clean clusters — or pitch me your own."
2. **Ask in small batches.** 3–6 questions per round, each with 2–4 suggested options plus room for a free answer, so replying takes seconds. Across rounds, cover whatever is still unknown: deliverable (still / video / Short), the one takeaway the viewer should get, visual metaphor, style (photoreal / clean-tech / stylized), palette and mood, duration + fps for video, camera behavior, hero elements, loop or not, reference images, and — for educational videos — their narration script or key beats if one exists, so motion can be timed to it.
3. **Loop until clarity.** Keep cycling question rounds until nothing material is ambiguous. Do not pad: the moment it is clear, stop asking and move to the plan.
4. **Present the full plan, then stop.** For stills: the checklist below. For videos: the checklist **plus a beat-timed storyboard** (`0:00–0:03 — what's on screen — camera — narration beat`). Wait for explicit approval; revise and re-present if the user edits anything. Never touch Blender before the plan is approved.
5. **Tiny tweaks skip the interview — and lock scope.** For a small change to an existing approved scene ("make the mug red"), confirm in one line ("Turning the mug red — go?") and proceed on their yes. Then touch only the objects and properties the user named: no realism passes, no relighting, no "while I'm here" improvements elsewhere in the scene. If something else genuinely needs fixing, say so in one line and wait to be asked.

Plan checklist:

- Subject and micro-story — a frame that implies a moment reads as real ("coffee gone cold beside an unfinished sketch" beats "mug on table"); for explainers, the story is the concept's arc
- Mood, time of day, palette (2–3 colors)
- Camera: focal length, height, angle, composition intent (and movement, for video)
- Lighting design: which HDRI mood + key + accents
- Asset plan per major object: Hyper3D / Poly Haven / Sketchfab / procedural fallback
- Physics: what gets settled or simulated
- Deliverable: still (resolution, aspect) or video (duration, fps, vertical/horizontal, loop or not)

Then open `references/scene-recipes.md`, pick the matching recipe (product, interior, nature, character, food, abstract), and use its numbers. For videos also apply `references/animation.md`, and for Shorts `references/youtube-shorts.md`.

## 2. Build order (composition first prevents wasted detail)

1. **Blocking.** Proxy cubes/cylinders at real metric scale (mug 0.09 m, chair seat height 0.45 m, door 2.0 m, ceiling 2.7 m). Wrong scale is the #1 realism killer — it poisons DoF, light falloff, and physics downstream.
2. **Camera immediately after blocking.** Focal length per recipe. Rule of thirds, plausible human height, slight off-axis tilt for life. From here on, only detail what the camera sees.
3. **Replace proxies with assets.** Hero object: Hyper3D (submit job → poll status → import → check dimensions; imported assets are often 10–100× off scale, fix against real-world size). Environment, textures, HDRI: Poly Haven. Specific real things: Sketchfab. Model procedurally only what no source provides.
4. **Materials.** Every visible surface gets: plausible base color (never default gray), roughness *variation* (mix a Noise/Musgrave texture into the roughness input — uniform roughness screams CG), normal or bump detail, and edge wear or dust on used objects. Metals get metallic = 1. Check texture scale against reality (wood grain lives at millimetres, not centimetres).
5. **Physics settle (stills).** Props: rigid body active. Surfaces: passive. Step through 60–100 frames, apply visual transform, remove rigid bodies. Then nudge: rotate props 2–8° randomly — humans never place things on-axis. This is the fastest way to make arrangements read as real. Animation sims: see `references/animation.md`.
6. **Lighting in layers.** (a) HDRI matched to mood for base light and reflections; (b) one key light (area or sun) with a clear direction, sized for the shadow softness you want; (c) rim or practical accents; (d) color-temperature contrast (e.g. warm 4500 K key vs cool 7000 K fill). Verify shadows have direction and shape — flat, even light is the trademark of fake renders.
7. **Depth and air.** Camera DoF with a chosen focus object (f/2.8 close-ups → f/8 rooms; over-strong DoF makes scenes look miniature). Subtle volumetric scatter or mist pass for larger scenes. Guarantee foreground/midground/background separation. The background is never an empty void — use a gradient world, out-of-focus environment, or the visible HDRI.
8. **Color pipeline.** View transform AgX (Blender 4.x default) or Filmic. Check exposure: nothing crushed to black or blown to white. Keep to the planned palette.

## 3. Render settings — always Cycles (user's standing preference)

Never switch to Eevee for image checks; this user chose Cycles for every round. Manage speed with samples and resolution instead:

- **Check-in rounds:** 1280×720 (or 50% of target), 128–256 samples, adaptive sampling + denoise, GPU if available.
- **Final:** full resolution (default 1920×1080 for stills; confirm aspect if unstated), 512–1024 samples, denoise on.
- Before any render you expect to exceed ~3 minutes, tell the user the estimate first.
- Final video renders are never started unprompted: render one test frame at final settings, time it, multiply by frame count, present the total estimate with quality options (full samples vs balanced 128–256 + denoise), and wait for the user's explicit go. This is the user's standing preference.
- Save every render into a project folder with versioned names (`shot_v01.png`, `shot_v02.png`…). Save the .blend before physics bakes and before the final render.

## 4. Seeing your work (every round)

`get_viewport_screenshot` captures the viewport, so make the viewport show the truth:

- Via code: set a 3D viewport to **Rendered** shading (Cycles), switch it to the active camera view, `time.sleep(8–15)` so samples accumulate, then take the screenshot. That is your Cycles-accurate pair of eyes.
- Final renders (`bpy.ops.render.render(write_still=True)`) go to disk and you cannot open the file — so do all visual critique on rendered-viewport screenshots at matching settings.

## 5. Critique loop — check in with the user EVERY round

1. Screenshot per section 4.
2. Critique your own image harshly against the Realism Checklist below. Name the top 3–5 concrete flaws **with the specific fix for each** ("key shadow too soft → shrink area light to 0.5 m and pull it closer", never "improve lighting").
3. Show the user: what you built, the flaws you found, the fixes you propose. Then stop and wait for their reply.
4. On approval, apply the fixes, re-render, repeat. If they want a different direction, replan the affected part only.
5. When the user is happy: run the final-quality render, save it, report the file path and settings used.

If two consecutive rounds produce no visible improvement, say so honestly and offer directions (different lighting mood, different camera, swap the hero asset) instead of thrashing.

## Realism checklist (critique against every line)

- **Scale & contact** — proportions match real objects; everything casts contact shadows; nothing floats or intersects; poses obey gravity.
- **Materials** — roughness varies within every surface; no default gray, no 0.5-everything; edge wear, dust, or fingerprints on used items; texture scale right; tiling not visible; metals read as metal.
- **Light** — one readable key direction; shadow softness varies with light size and distance; color-temperature contrast; highlights have shape; no flat ambient wash; nothing blown out or crushed.
- **Camera** — focal length suits the genre; camera height plausible for the story; horizon off-center; subject on thirds; DoF strength believable.
- **Depth** — clear fore/mid/background; haze, DoF, or overlap giving depth cues; background never a void.
- **Story & imperfection** — the frame implies a moment; props slightly rotated, uneven, lived-in; repetition broken (no identical clones in a row).
- **Color** — AgX/Filmic active; coherent limited palette; balanced exposure.
- **Animation (when applicable)** — eased motion, no pops, sims baked, motion blur on. Details in `references/animation.md`.

## Writing bpy code over MCP (reliability rules)

- One logical step per `execute_blender_code` call. `print()` results (stdout comes back to you) and verify with `get_scene_info` / `get_object_info` after significant steps. Monolithic scripts fail silently and are undebuggable.
- Prefer `bpy.data` references by name over selection/context operators — many `bpy.ops` calls need UI context that does not exist over the socket and will throw.
- Name everything on creation (`SM_mug`, `LGT_key`, `CAM_main`) so later edits are addressable.
- Blender 4.x sockets: address Principled BSDF inputs by name ('Base Color', 'Roughness', 'Metallic', 'IOR'). Node APIs shift between versions — if a socket lookup fails, print the node's actual input names and adapt rather than guessing again.
- Wrap risky chunks in try/except that prints the traceback, so you can actually fix the cause.
- Long operations (Hyper3D jobs, bakes, renders): poll instead of blocking, and keep each code call under the tool timeout.

## When integrations are missing

Still deliver. Use procedural PBR node recipes (wood, brushed metal, plastic, ceramic — always with roughness variation), noise-displaced terrain, gradient world backgrounds, and a three-point rig of area lights. Mention once what enabling Poly Haven would add, then work with what exists.
