DigitDuel art drop-in folder.

Place transparent PNG sprites here and they appear automatically (the Mascot
component prefers these over the code-drawn placeholder):

  mascot-idle.png   ← shown on login + loading (use one of the AI knights)
  mascot-win.png    ← shown on the game-over WIN screen (optional)
  mascot-lose.png   ← shown on the game-over LOSE screen (optional)

Requirements:
  - Transparent background (PNG with alpha)
  - A single character, roughly square, trimmed close
  - Pixel art is rendered crisp (image-rendering: pixelated)

To get a transparent cutout from a generated sheet:
  1. Crop ONE character (Preview.app: select + Tools > Crop).
  2. Remove the background: drag into https://remove.bg, or Photopea (free) magic-wand
     the background and delete — or just re-generate in your AI tool with
     "transparent background".
  3. Save here with the names above.

Other assets (see /ART_BRIEF.md): icon-1024.png, keyart.png, bg-sky/mid/fore.png,
panel-frame.png, rank-*.png — tell the dev when added and they'll be wired in.
