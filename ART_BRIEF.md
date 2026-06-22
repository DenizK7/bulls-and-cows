# DigitDuel — Art Brief & AI Prompt Pack

A ready-to-use brief for generating game art with an AI image tool (Midjourney, Scenario.gg,
Layer.ai, DALL·E, SDXL/Flux + pixel LoRA) and dropping it straight into the game.

> Workflow in one line: **lock the style → generate a character sheet → reuse it (cref / trained
> model / img2img) for every other asset → export transparent PNG at the right size → (clean up in
> Aseprite) → hand to dev for integration.**

---

## 1. The game (context to paste)
DigitDuel is a fast 1v1 "crack-the-code" duel (Bulls & Cows with numbers or colors). Real-time
PvP, vs-AI, daily challenge, ELO ranks. Vibe: **retro arcade meets cozy fantasy duel**.

**Core mascot concept — read this:** the fighters ARE numbers. The mascot is a **"Digit Warrior"**:
a number (e.g. the digit **7**) personified as a little fighter — the **glyph itself is the body**,
with eyes, small arms/legs, a sword, a warrior headband. NOT a knight holding a number. Think
"living number that fights." Each digit 0–9 can be its own warrior; **7** is the hero/face.

## 2. Style bible (PASTE THIS AS A PREFIX TO EVERY PROMPT)

**Pixel-art track (in-game, primary):**
> pixel art, 32x32 sprite style, limited 16-color palette, 1px dark outline, top-left light source,
> crisp clean pixels (no anti-aliasing), warm "forest & honey" dark fantasy palette, retro arcade,
> strong readable silhouette, centered, transparent background

**Illustrated/raster track (marketing / key art):**
> polished mobile game art, hand-painted illustration, soft glossy shading, thick rounded shapes,
> playful premium "Candy-Crush-quality" finish, warm honey + forest-green palette, dramatic rim
> light, clean vector-like edges, transparent background where applicable

**Locked palette (give the AI these hex):**
`#12100e bg` · `#1b1816 panel` · `#c2916a honey (primary)` · `#8a5e3a honey-shade` ·
`#7cb87c green (correct)` · `#d49a5c amber (close)` · `#ede5d8 light` · `#bf7b7b red` · `#241812 outline`

## 3. Asset list + format spec (what to produce, how)

| # | Asset | Size (px) | Transparent? | Notes |
|---|-------|-----------|--------------|-------|
| 1 | **App icon** | 1024×1024 | no (full bleed) | the number-7 warrior + sword; bold, readable at 48px |
| 2 | **Mascot — idle** | 512×512 | yes | "Digit Warrior" = the living number 7; also export @256 |
| 3 | **Mascot — win / lose** | 512×512 | yes | same digit warrior, sword raised (win) / slumped (lose) |
| 4 | **Logo / wordmark** | 1024×320 | yes | "DIGIT DUEL" pixel lettering w/ depth |
| 5 | **Key art** | 1920×1080 | no | two duelists clashing, numbers sparking — for store + social |
| 6 | **Background (parallax)** | 1920×1080 ×3 layers | yes (layers) | night forest + castle + sky; separate sky/mid/fore layers |
| 7 | **UI panel frame (9-slice)** | 256×256 | yes | ornate rounded frame; mark the 9-slice safe area |
| 8 | **Rank emblems** | 128×128 ×6 | yes | Bronze→Master shields |
| 9 | **FX** | 256×256 sheets | yes | sparkle, confetti, sword-clash flash |

**Naming for drop-in:** `mascot-idle.png`, `mascot-win.png`, `icon-1024.png`, `keyart.png`,
`bg-sky.png` / `bg-mid.png` / `bg-fore.png`, `panel-frame.png`, `rank-bronze.png` … Put them in
`client/public/art/`. Tell me when they're there and I wire them in.

## 4. Copy-paste prompts

### ★ FINAL mascot prompt (LOCKED — use this one)
Aesthetic decision: **chibi pixel-fantasy**, friendly-but-fierce, warm honey body + glowing green
eyes + subtle neon rim glow. Copy-paste:

> pixel art, chibi character sprite, **the number "7" personified as a warrior — the bold digit 7
> glyph IS the body/torso**, big round expressive green eyes with angry-cute eyebrows set into the
> top of the 7, short stubby armored arms and legs, a small amber warrior headband with trailing
> tails, gripping a tiny steel sword, warm honey-bronze body with a subtle neon rim-light glow, 1px
> dark outline, limited 16-color "forest & honey" palette (honey #c2916a, green #7cb87c, amber
> #d49a5c, dark #241812), top-left light, crisp clean pixels, strong readable silhouette, the shape
> stays clearly a "7", centered, full body, transparent background --ar 1:1
>
> Midjourney: add `--style raw` (and a pixel `--sref` if you have one). Scenario/Layer: use a pixel
> model. Then upscale + clean in Aseprite, recolor to the palette above.

### Mascot character sheet (do this FIRST, then reuse)
> [STYLE PREFIX] character reference sheet of a "Digit Warrior": the NUMBER **7** personified as a
> chibi fighter — the bold glowing **digit "7" glyph IS the character's body/torso**, with big
> expressive eyes set into the number, short armored arms and legs, a small warrior headband, holding
> a sword. The shape stays clearly readable as the number 7. Heroic and energetic. Front + 3/4 + back
> views, consistent proportions, transparent background. (NOT a knight — the number itself is alive.)

(Optional: ask for the full set "digits 0–9 each as its own warrior, consistent style" for per-player characters.)

### Mascot poses (use --cref / trained model on the sheet above)
> [STYLE PREFIX] "Digit Warrior 7" (the living number 7), **victory pose**, sword raised high, sparks, big happy eyes — transparent bg
> [STYLE PREFIX] "Digit Warrior 7", **defeat pose**, slumped, dim/cracked, sweat drop — transparent bg
> [STYLE PREFIX] "Digit Warrior 7", **idle**, ready fighting stance, sword at side — transparent bg

### App icon
> [STYLE PREFIX] app icon, a bold glowing **number "7" personified as a warrior** (the digit is the
> body) with fierce eyes and a raised sword, honey-bronze with a neon digital edge, dark warm
> background with glow, centered, no text, instantly readable as a tiny thumbnail

### Key art (marketing)
> [ILLUSTRATED PREFIX] two rival **number-warriors** — a glowing **"3"** and a **"7"**, each a living
> digit with eyes, little arms and a sword — clashing blades, sparks of glowing code/numbers between
> them, cozy night forest with a distant castle, warm honey vs cool green, dynamic and playful,
> mobile game key art, no text

### Background (parallax — generate 3 separate layers)
> [STYLE PREFIX] seamless side-scroll background, **sky layer**: deep warm night sky, twinkling
> pixel stars, drifting clouds, crescent moon — transparent foreground
> … **mid layer**: pixel forest tree-line + a small castle silhouette …
> … **fore layer**: dark grassy hill bumps with a few pine trees …

### UI panel frame (9-slice)
> [STYLE PREFIX] ornate rounded UI panel frame, honey-bronze beveled border with subtle gloss,
> empty center, designed for 9-slice scaling, transparent background

## 5. Consistency = the hard part (how the pros do it)
- **Scenario.gg / Layer.ai:** upload 5–15 of your best refs → train a custom model → every
  generation matches your style + character. Best for a coherent asset *set*. Exports transparent PNG / sheets.
- **Midjourney:** use `--cref <mascot-sheet-url>` (character reference) + `--sref` (style reference)
  to keep the mascot consistent across poses. Great for key art quality.
- **SDXL/Flux local:** a pixel-art LoRA + img2img from the sheet; full control, free.
- Always finish in **Aseprite** for pixel assets (snap to grid, fix stray pixels, recolor to the
  palette above, cut animation frames).

## 6. Marketing assets that sell installs (ASO)
1. **App icon** — biggest lever; make 2–3 variants and A/B test.
2. **5–6 store screenshots** — mascot + a real UI screen + one short headline each
   ("Duel friends in real time", "Crack the code", "Climb the ranks").
3. **Feature graphic** 1024×500 (Play Store).
4. **15–30s trailer / GIF** of a quick duel + a win.
5. **Key art** (#5) for the listing header + social posts.

## 7. Suggested order
1. Mascot sheet → app icon (unlocks store presence + the game's "face").
2. Key art + 3 background layers (transforms every screen).
3. Panel frame + rank emblems + FX (UI polish).
4. Screenshots + trailer from the polished build.

Hand me the PNGs (in `client/public/art/`) and I'll integrate each — sprites, 9-slice frames,
parallax layers, swapping the code-drawn placeholder mascot for the real one.
