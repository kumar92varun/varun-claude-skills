# Animation & Simulation Pipeline

Read this whenever the deliverable moves. Animations multiply render cost by the frame count, so the workflow below exists to catch problems on stills and previews *before* committing hours to a final render.

## 1. Lock the spec first

Confirm or state in the plan: duration (default 5 s), fps (default 24), resolution, and exactly what moves — objects, camera, simulation, or a mix. Frame count = duration × fps; keep first passes ≤ 120 frames. If the deliverable is a YouTube Short or vertical social clip, `references/youtube-shorts.md` overrides these format defaults — read it too.

## 2. Keyframing

- Insert keyframes via code on `location/rotation_euler/scale` at explicit frames; name actions.
- Default interpolation Bezier with ease-in/out — linear motion looks robotic. For mechanical motion, deliberately choose linear/constant.
- Organic drift and handheld camera: add Noise F-curve modifiers (small scale/strength) instead of hand-keying jitter.
- Camera moves must be motivated and slow: push-in, orbit, or parallax slide. A static camera with moving subject is often stronger than both moving.

## 3. Physics simulations

- **Rigid body**: set active/passive, adjust mass and friction, then step the timeline through the sim range with `scene.frame_set(f)` in a loop so the cache fills. For stills-style settling inside an animation, bake the result to keyframes.
- **Cloth**: set quality steps 8–12, enable object collisions (and self-collision for garments), pin where needed, then bake the cache. Cloth without collision margin tuning will clip — check a mid-frame screenshot.
- **Smoke/fluid**: warn the user first — domain resolution drives bake time hard. Start at low resolution (64–96) to check motion, only then raise for final.
- Always save the .blend before baking, and bake caches before rendering — an unbaked sim renders differently frame to frame.

## 4. Check-in protocol for motion (user checks in every round)

Because you cannot watch video, review motion like this each round:

1. Render draft stills at 3–5 key frames (first, last, and action peaks) using the normal check-in Cycles settings, screenshot each via the rendered viewport, and critique them against the realism checklist plus the motion lines below.
2. For *timing* checks only, you may offer a fast viewport playblast (OpenGL preview) as a courtesy file for the user to scrub — image-quality judgments still happen only on Cycles frames, per the user's always-Cycles preference.
3. Present key frames + motion description + flaws + fixes, then stop and wait, exactly like still rounds.

Motion critique lines: motion eases in and out; nothing pops or teleports between frames; sim objects come to rest believably; camera move is smooth and motivated; action reads within the frame timing (not too fast to see).

## 5. Final animation render — never without explicit approval

- Compute and state the estimate first: (draft frame render time × quality multiplier) × frame count. Say it in minutes/hours and get a clear yes.
- Settings: motion blur ON, persistent data ON (big speedup across frames), denoise ON, samples 256–512 for animation (temporal noise hides more than stills do).
- Output a PNG image sequence to the project folder rather than a video file — a crash mid-render then loses nothing. After the sequence completes, encode to MP4 (H.264) either through Blender's sequencer/FFmpeg output or a one-line ffmpeg command, and give the user both paths.
- Report where every artifact lives: .blend, PNG sequence folder, final MP4.
