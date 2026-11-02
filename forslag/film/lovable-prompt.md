# Prompt till Lovable – reklamfilm för Elevate Studio

Klistra in allt nedan i Lovable.

---

Build a single-page, full-screen **animated product ad (25 seconds, 16:9, 1920×1080)** for Elevate Studio, a Swedish web agency. It must play automatically in a loop, with a "Replay" button, and be easy to screen-record. Use React + Framer Motion (or GSAP). No stock photos and no people. All text is in Swedish.

## Visual style
- **Colours:** deep green background `#0f2418`, accent green `#1d3b2a`, mint `#8fd3a6`, white. Never lime, never beige. The end card is light mint `#f1f8ef`.
- **Background:** large, soft green gradient glows (blurred radial gradients) that drift slowly the whole time, plus a faint grain/dot texture.
- **Fonts:** Hanken Grotesk (bold, tight letter-spacing −0.03em) for headlines. Fraunces italic for single accent words.
- **Typography (most important):** short, punchy kinetic text, 1–4 words per beat. Words fade and slide up ~40px with ease-out over 0.5s. One keyword per line gets a **mint highlight box** that wipes in from left to right (clip-path, 0.5s) behind dark text.
- **UI screens:** shown as white rounded cards (radius 22px) with big soft shadows. They enter in **3D**: start at rotateX 15–20° and translateY 60px, then settle flat. They keep a very slow 3D tilt while on screen.
- **Big cursor:** a white arrow cursor, about 76px, with a dark outline and drop shadow. It moves with ease-in-out curves, never linearly. On each click it shrinks to 82% for 0.2s and a mint ring ripples out from the tip (scale 0.3→1.3, fade out over 0.5s). Important clicks also get a small star sparkle that rotates and fades.
- **Small details everywhere:** a counter on the cart icon that bumps (scale 1.25), numbers that count up, line charts that draw themselves (stroke-dashoffset), result rows that pop in with a slight overshoot (back-ease, 0.15s stagger). The selected card **slowly turns green over 1 second** while it lifts 16px, scales to 1.06 and gets a mint glow; the other cards dim to 80% brightness.
- **Transitions:** cross-fade combined with a slight zoom (scale 1→1.6 on the outgoing text). Never a hard cut, never a slow intro.

## Storyboard (start strong — no slow intro)
1. **0–3s.** "Ert företag." slides up. Then "*Ert* **namn.**", where "namn." gets the highlight wipe. Zoom out to the next scene.
2. **3–10.5s: Domain search.** A 3D card with a search field slides in. The cursor flies in and clicks the field. "haningebyggteam" types letter by letter with a blinking caret. The cursor clicks **Sök** (the button presses in). Three rows pop in: `haningebyggteam.se – Ledig – 149 kr första året`, then `.nu` and `.com`. The cursor clicks **Lägg till** on .se, which turns dark green with "Tillagd ✓" and a sparkle. The cart pill in the top right bumps from 0 to 1.
3. **10.5–13s.** Kinetic text: "info" + highlight wipe "@haningebyggteam.se".
4. **13–18s: Business mail.** Headline "Mejl som ser **proffsigt** ut." Three plan cards (Bas 49 kr, Företag 199 kr, Pro 449 kr per month) pop up with a stagger. The cursor hovers Företag, which slowly turns green, lifts and glows. The cursor clicks **Välj**, which turns into "Vald ✓".
5. **18–22.5s: Checkout.** A 3D card shows the lines "haningebyggteam.se 149 kr" and "Mejl Företag · 5 konton 199 kr/mån", and "Totalt idag 149 kr". The cursor clicks **Skicka beställning**. A big mint circle with ✓ scales in with overshoot.
6. **22.5–28.5s: Customer portal.** Headline "Och allt syns i **kundportalen.**" A dashboard swings in from the side in 3D. It has a dark green sidebar (Översikt, Hemsidans admin, Besökare, Ändringar, Mejl & domän, Fakturor) and a green hero box where "1 284 besökare" counts up and a line chart draws itself. KPI tiles show Förfrågningar 23 (counts up), Drifttid 99,98 % and Google-betyg 100.
7. **28.5–31.5s.** Small text "Domän · Mejl · Hemsida · Portal", then a big "Allt på **ett** ställe." that scales up from 0.85.
8. **31.5–35s: End card.** The background fades to light mint. The Elevate Studio logo mark (an angular "A/mountain" shape in `#1d3b2a`) pops in with a slight rotation, then "Elevate Studio" and "elevatestudio.nu" fade in.

## Technical
- One `<Timeline>` component driven by a single time value, so everything stays in sync and can be scrubbed.
- Add a hidden `?t=12.5` URL parameter that freezes the timeline at that time, for screenshots.
- Respect a 16:9 frame with letterboxing on other screen sizes.
- 60 fps, GPU-friendly transforms only (no layout animation).
