# Scene Recipes

Pick the recipe that matches the request and use its numbers as starting values, then adjust by eye during critique rounds. Contents: Product/Studio · Interior/Archviz · Nature/Exterior · Character/Creature · Food · Abstract.

## Product / studio shot

- Camera: 85–105 mm, f/4–5.6, lens slightly below the product's vertical center, subtle upward tilt.
- Backdrop: seamless cyclorama — a plane with a smooth curved transition to vertical (bevel or subdivided curve), single neutral or brand color.
- Lights: (1) large soft key, area light ~1×1 m at 45° above-left; (2) fill card or dim area opposite at ~1/4 key strength; (3) rim/edge light behind for separation; (4) optional gradient on the backdrop from a spot aimed low behind the product.
- Material focus: the product must have roughness breakup and believable edge wear on chamfers; add a subtle fingerprint/smudge noise on glossy plastics and glass.
- Ground the product: contact shadow must be visible; a barely-glossy floor reflection sells it.
- Physics: drop small accompanying props (caps, beans, fabric) so they rest naturally.
- Pitfalls: pure-white blown backdrop, product floating one pixel above floor, perfectly centered composition.
- Animation variant: slow turntable (empty parent, 8–12 s per revolution) or 10–15% push-in.

## Interior / archviz

- Camera: 24–35 mm at 1.2–1.6 m height (seated or standing eye line). Verticals kept vertical (shift or level the camera). f/5.6–8.
- Light: sun through a window as key (low angle for mood) + HDRI outside for ambient + warm practicals (lamp bulbs ~3000 K, emission or point lights inside shades).
- Cycles: add light portals at window openings to cut noise dramatically.
- Clutter pass is mandatory: books, plants, throw, rug, cables, wall art — 10–20 small objects from Poly Haven, physics-settled and randomly rotated. Empty rooms read as renders.
- Depth: doorway or foreground furniture edge as framing; very subtle mist; DoF mild (rooms at f/8-equivalent).
- Pitfalls: everything parallel to walls, uniform ceiling light with no direction, oversized furniture (check chair seat 0.45 m, table 0.75 m, counter 0.9 m).

## Nature / exterior

- Camera: 24–35 mm wide vista or 135–200 mm compressed layers. Height ~1.6 m unless drone shot is requested.
- Light: sun + sky (Nishita sky texture) or a Poly Haven outdoor HDRI; golden hour (sun 5–15° above horizon) is the reliable beauty setting; backlight foliage so leaves glow.
- Vegetation: three size classes (ground cover, bushes, trees). Instance a few Poly Haven models as collection instances with randomized rotation/scale (±20%) — never rows of identical clones.
- Terrain: subdivided plane + Noise/Musgrave displacement, layered large-then-small; blend grass/dirt/rock materials by slope or noise mask.
- Atmosphere: mist pass or a light volumetric scatter box; distant layers get hazier and bluer — this alone creates depth.
- Pitfalls: noon-flat sun, identical trees, terrain texture obviously tiling, horizon dead center.

## Character / creature

- Camera: 85 mm portrait, f/2.8–4, eye-level or slightly above, catchlight visible in eyes.
- Source the model from Hyper3D (text or reference image) or Sketchfab. Full rigging with weight painting and IK is beyond reliable MCP capability — pose with a simple armature or keep a static pose, and say so honestly if the user asks for complex animation.
- Skin/organic: Principled subsurface (radius biased red), roughness map variation, bump for pores.
- Light: soft key 30–45° (Rembrandt triangle), rim light for silhouette separation, background darker or lighter than the subject — never the same value.
- Pitfalls: dead eyes (no catchlight), plastic skin (no SSS, uniform roughness), subject lit identically to the background.

## Food

- Camera: 50–100 mm close, f/2.8–4, shallow DoF focused on the hero bite; 30–45° down-angle or dramatic side-on.
- Light: one big soft key from behind-and-side (backlight makes food glisten and edges glow), white card fill at the front. Warm white balance.
- Materials: subsurface on anything organic (bread, fruit, meat), gloss variation on sauces, micro-bump everywhere.
- Dressing: crumbs, garnish, droplets scattered with physics; a hot dish gets a faint volumetric steam cone above it.
- Pitfalls: front-lit flat food, spotless plate, everything centered.

## Abstract / motion graphics

- Full creative freedom, but realism rules still apply to *rendering*: depth layering, DoF, roughness variation, gradient world background, 2–3 color palette with one accent.
- Geometry: arrays, geometry-node scatters, curves with bevel, metaballs — abstract shapes with real materials (satin, glass, brushed metal) look premium.
- Glass/refraction: raise transmission bounces; put something interesting behind glass to refract.
- Light: one strong colored key + complementary rim reads better than even studio light.
- Pitfalls: default-cube-with-emission look, saturated RGB primaries, no depth cues.
