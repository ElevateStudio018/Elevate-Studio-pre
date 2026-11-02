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

## Storyboard (fast cuts, ~0.4s per word at the start, total 25s)
**Message:** we make things easy for businesses, and everything is in one place.

1. **0–2.3s: the problem.** Fast word swaps in the centre, each one pops in with a back-ease scale 0.7→1: "Hemsida." → "Domän." → "Mejl." → "Fakturor." → "**Krångligt?**" The last word is bigger, mint coloured, and gives a small shake.
2. **2.3–3.7s: the promise.** "Vi gör det **enkelt.**", where the highlight wipes in. Zoom out into the next scene.
3. **3.7–8.3s: domain search, exactly like elevatestudio.nu/domaner.**
   - Layout: the eyebrow "DOMÄNER", the headline "Hitta ert *domännamn*" (Fraunces italic on "domännamn"), a large white pill-shaped search field with a dark green "Sök" button inside it, and price chips below it (.se 149 kr, .nu 149 kr, .com 169 kr, .net 189 kr, .eu 129 kr).
   - The cursor clicks the field and "haningebyggteam" types quickly. The cursor clicks Sök.
   - The chips fold away and a white results card pops in: .se Ledig 149 kr första året, .nu Ledig, .com Upptagen.
   - The cursor clicks "Lägg till" on .se, which turns into "Tillagd ✓" with a sparkle. The cart pill bumps from 0 to 1.
4. **8.3–11.9s: mail.** "info**@haningebyggteam.se**" with a highlight wipe at the top. Three plan cards pop up with a stagger. Företag slowly turns green (0.8s), lifts and glows, and the cursor clicks "Välj", which turns into "Vald ✓".
5. **11.9–15.1s: test your site, exactly like elevatestudio.nu/testa.** "Hur presterar din sajt?", then a white pill with "haningebyggteam.se" and a "Testa" button. The cursor clicks Testa. Three glass tiles with rings fill up and count to 98 / 100 / 100 (Prestanda, Tillgänglighet, SEO och AI).
6. **15.1–18.9s: customer portal.** "Och allt syns i **kundportalen.**" The dashboard swings in in 3D. "1 284 besökare" counts up, the line chart draws itself, and the KPIs count up. Then a new lead notification slides in: "Ny – Karin Lund vill ha offert på badrum".
7. **18.9–22.2s: the message.** "Allt på **ett** ställe." scales in. Floating chips fly in around it and bob gently: Domän, Företagsmejl, Hemsida, Kundportal, Testa din sajt. Below it: "Mindre krångel. Mer tid för kunderna."
8. **22.2–25s: end card on light mint.** The logo pops in, then "Elevate Studio", "Vi gör det enkelt för företag." and "elevatestudio.nu".

## Technical
- One `<Timeline>` component driven by a single time value, so everything stays in sync and can be scrubbed.
- Add a hidden `?t=12.5` URL parameter that freezes the timeline at that time, for screenshots.
- Respect a 16:9 frame with letterboxing on other screen sizes.
- 60 fps, GPU-friendly transforms only (no layout animation).
