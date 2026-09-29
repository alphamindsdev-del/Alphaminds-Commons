# AlphaMinds Public Landing Page — Build Spec (Pre-Login Entry Point)

## 0. WHAT IS CHANGING — ROUTING / APP FLOW (read this first, this is not optional)

**Current (broken) flow:**
`App opens → splash/logo loading animation → Login form → (if login succeeds) → Home dashboard`
The actual "about the organisation" marketing content currently lives on a *separate old website*, disconnected from the PWA and using old/inconsistent branding.

**New required flow:**
`App opens → splash/logo loading animation → NEW LANDING PAGE (this spec) → user taps "Login" in the nav → Login form appears → (if login succeeds) → Home dashboard`

Rules for the agent implementing this:
1. Do **not** delete or redesign the login form itself — it already exists and works. It simply needs to be moved so it is no longer the first thing shown. It should now open when the user explicitly taps the **Login** nav item/button described in §2, e.g. as a route (`/login`) or modal/sheet triggered from the landing page.
2. This new landing page becomes the new **root/unauthenticated route** of the PWA (e.g. `/` or `/welcome`) — it replaces whatever route currently redirects straight to the login form.
3. If a session/token already exists (user is already logged in), skip this landing page entirely and route straight to the Home dashboard as it does today — this landing page is ONLY for logged-out visitors.
4. All content below must live **inside the PWA itself** (same codebase/domain as the app) — this replaces the separate old external website. Nothing should link out to the old site.
5. Preserve the splash/logo loading animation exactly as it is today — only what comes *after* it changes.

---

## 1. BRANDING — REUSE THESE EXACT TOKENS (already defined for the Home dashboard redesign — do not invent new colors, do not keep the old site's teal/brown/orange palette)

- `--bg-page`: #F4F3EC (cream — main page background)
- `--bg-card`: #EDEDE4 (soft card panels)
- `--bg-card-white`: #FFFFFF
- `--accent-lime`: #C6FA3C (primary buttons, highlights, underlines)
- `--accent-lime-text`: #1F2A1A (text on lime buttons)
- `--accent-dark-green`: #16321F (dark photo-overlay sections, icon tiles, footer background)
- `--accent-purple`: #5B4FE0 (secondary accent — badges, small highlights only)
- `--text-primary`: #14140F
- `--text-secondary`: #6B6B63
- `--flame-red`: #F04B3E (only if a streak/energy motif is reused — optional here)
- `--divider`: #E2E1D8

**Explicitly replace every old-site color** with the above:
- The old site's teal pill buttons ("Join The Club", "Become A Member", "Join Us") → become `--accent-lime` filled pill buttons with `--accent-lime-text` text (same pill/rounded shape, just recolored).
- The old site's tan/brown wellness section background → becomes `--accent-dark-green` background with white/cream text (keep the same photo, just change the background color block and text color).
- The old site's warm orange "Rhythm & Soul" section → keep the same photography, but any solid color overlays/badges become `--accent-dark-green` or `--accent-lime`, never orange/brown.
- The dark footer stays dark, but recolor it to `--accent-dark-green` (not plain black) to match the app's dark accent, with `--accent-lime` for the CTA button and white text.

Typography: same bold, heavy, rounded sans-serif used throughout the Home dashboard. Big headlines are bold black (`--text-primary`), never colored teal like the old site.

---

## 2. TOP NAVIGATION (new, sticky, appears on landing page only for logged-out users)

- Background: `--bg-page`, thin `--divider` bottom border, no shadow.
- **Left:** logo lockup — the "A" mark (with lime dot) + "AlphaMinds" wordmark, same as the Home dashboard nav.
- **Center or right (match old site's simple two-link nav, just restyle):** text nav links `Home` and `Membership` in `--text-primary`, medium weight, no underline until hover.
- **Far right — NEW element that did not exist before:** a **"Login"** button/link, styled as a pill outline button (white/`--bg-card-white` background, thin black or dark-green border, black text) OR simply a bold text link — must be clearly visible and always present in this nav. Tapping/clicking it opens the existing login form (route or modal, per §0 rule 2).
- On mobile: collapse `Home`/`Membership` into a hamburger menu if needed, but the **Login** button must remain visible/pinned in the top bar at all times, not hidden inside the hamburger — it's the single most important action on this page for return users.

---

## 3. HERO SECTION

- Centered layout, generous top padding below the nav.
- Small centered "A" logo mark above the headline (same mark as nav, slightly larger).
- Headline: large, bold, centered, black text — reuse the existing copy: **"Embracing Fun, Becoming, and Humanity In All Of Us."** (keep line breaks similar to reference).
- Sub-line beneath: one small centered sentence in `--text-secondary` — reuse existing copy: *"A growing community of curious minds exploring healthier lifestyles, purposeful living, and human progress through evidence-based ideas."*
- Primary CTA button directly under headline: **"Join The Club"** — pill button, `--accent-lime` fill, `--accent-lime-text` text, centered.

---

## 4. THREE-UP FEATURE STRIP ("The Rel-Fi Games / The Walks / The Grounding")

- Three equal-width photo cards in a row on desktop, stacked full-width on mobile.
- Each card: rounded-corner photo (reuse the exact existing photos — real people, real activities), corner radius ~12–16px, no heavy overlay/filter.
- Caption directly below each photo, centered, small bold text in `--text-primary`: **"The Rel-Fi Games"**, **"The Walks"**, **"The Grounding"** (keep exact existing labels).
- Remove any leftover old-site styling (borders, drop shadows in teal, etc.) — keep this section clean and minimal, cream background only.

---

## 5. "CHANGING THE WORLD STARTS WITH CONVERSATIONS" SECTION

- Two-column layout on desktop (text left, photo right), stacked on mobile (text above photo).
- Left: large bold headline stacked on 3 lines, `--text-primary`: **"Changing The World starts with conversations"**.
- Right: rounded-corner photo of a group in conversation/meeting (reuse existing group-of-people-at-a-table photo).
- Background: `--bg-page` (cream) — do not reintroduce the broken/blank placeholder image seen in the old site; if the original image asset for the left side is missing/broken, simply leave that area as clean cream background with the headline only (no placeholder box, no gray blur).

---

## 6. "YOU WILL NOT HAVE TO GO THROUGH LIFE ALONE" SECTION

- Header row: large two-line bold headline **"You will not have to go through life alone."** on the left, with a small **"Become A Member"** pill button (`--accent-lime` fill) inline to the right of the headline on desktop, or stacked below it on mobile. Small caption text **"Alphaminds Family Spirit"** beside/under the button in `--text-secondary`.
- Below that: one large full-bleed (edge-to-edge within the content column) rounded-corner portrait photo — reuse the existing reflective/portrait photo. Keep this large and emotionally quiet — no text overlay needed.

---

## 7. "SAFE SPACE FOR WELLNESS" SECTION

- Full-width colored band, background recolored to `--accent-dark-green` (replacing the old tan/brown).
- Small eyebrow label top-left: **"MINDFUL, TOGETHER"** — small bold uppercase, `--accent-lime` color, tracked letters.
- Large bold headline below it, two lines, in white or `--accent-lime` (whichever passes contrast best against dark green — prefer white for the headline, lime only for small accents): **"Safe Space for Wellness"**.
- **"Join Us"** pill button beneath headline — `--accent-lime` fill, dark text.
- Right side (or below on mobile): rounded-corner photo of the outdoor seating/garden area (reuse existing photo).

---

## 8. TESTIMONIAL/JOURNEY TEXT + PHOTO SECTION

- Two-column: paragraph text on one side, photo of two people (mentor and mentee) embracing/talking on the other — reuse existing photo and copy:
  *"Life unfolds more beautifully when journeys are shared and wisdom lights the way. Walking beside others, we borrow strength, perspective, and the quiet lessons experience leaves behind. In that gentle exchange, living becomes deeper, warmer, and more meaningful."*
- Background: `--bg-card` (soft cream-tan panel) — keep it visually distinct from pure white/cream sections above and below, but do NOT use the old site's brown/beige — use the app's own `--bg-card` tone instead.
- Text color: `--text-primary` for body copy on this section.

---

## 9. PODCAST SECTION ("Curiosity Lab Podcast")

- Full-width photo section (reuse existing butterfly/flowers nature photo) with a dark overlay gradient at top/bottom for text legibility (dark overlay should use `--accent-dark-green` at partial opacity, not a generic black gradient).
- Top-left: eyebrow **"ALPHAMINDS · Curiosity Lab Podcast"** in white/lime small bold uppercase text.
- Small pill badge near it: **"Feature On The Podcast"** — `--accent-lime` fill, dark text, small pill.
- Mid-section large bold white headline (3 lines): **"Small talk around big ideas"**.
- Bottom caption line, smaller white/light text: *"No jargon. No gatekeeping. Just real conversations about how the world works."*

---

## 10. "RHYTHM & SOUL" EVENT SECTION

- Full-width photo section(s) (reuse the existing two photos — silhouette portrait, and musician/mic scene) with dark overlay as needed for text contrast (use `--accent-dark-green` overlay, not plain black/orange).
- Small pill badge top-right: **"THIS IS"** — same lime pill style as elsewhere.
- Giant bold white headline: **"RHYTHM & SOUL"** (two lines, very large, this is a marquee moment — keep it dramatic, this is the one place a huge headline size is appropriate).
- Bottom caption over the second photo, right-aligned or centered, uppercase small bold white text: *"EXPERIENCE OUR PERIODIC SING-ALONG SESSIONS. IT'S GROUNDING, IT'S UPLIFTING, IT'S ALPHAMINDS."*

---

## 11. THOUGHT LEADER / BIO SECTION

- Background: `--bg-page` (cream).
- Left: circular or rounded-square photo of Dr. Nd Esther Aguh (reuse existing photo), with a small caption underneath: **"Thought Leader at AlphaMinds Commons"** in `--text-secondary`.
- Right: name **"Dr. Nd Esther Aguh"** bold black, sub-label **"(dr Nd) — Also call her: Estee"** in `--text-secondary` italics/small, followed by 2–3 short paragraphs of bio copy (reuse existing bio text verbatim) in `--text-primary`/`--text-secondary` body text, comfortable line-height.

---

## 12. MISSION STATEMENT STRIP

- Full-width simple band, background `--bg-card` or light gray-cream, centered bold text (medium-large size, not huge), `--text-primary`:
  *"At AlphaMinds, we design our spaces and experiences so everyone feels welcome, supported, and able to participate fully."*
- No buttons/images here — pure statement strip, generous vertical padding.

---

## 13. CONTACT SECTION

- Two-column row (stack on mobile): **Email** label + address with small mail icon; **Phone** label + number with small phone icon. Use `--text-primary` for labels, `--text-secondary` for the actual contact details.
- Adjacent short paragraph: *"We're constantly updating this space with new opportunities and experiences. Check back often, many events and online activities are in the pipeline."* in `--text-secondary`.
- Background: `--bg-page`.

---

## 14. "COMING SOON" CONTENT CALENDAR TEASER

- Small header label: **"Coming Soon"**.
- A compact grid/row of small preview cards (image thumbnail + a few solid-color placeholder swatches per the reference, representing a content calendar) — recreate this as a small horizontal-scroll or grid of ~6–8 small rounded thumbnail cards, using `--bg-card`, `--accent-dark-green`, and `--accent-lime` as the placeholder swatch colors (replace the old brown/gray/blue placeholder swatches with these brand colors) plus one real photo thumbnail.
- Keep this section compact/low-emphasis — it's a teaser, not a major section.

---

## 15. FOOTER

- Full-width band, background `--accent-dark-green` (replacing old plain black).
- Centered **"Become A Member"** pill button — `--accent-lime` fill, dark text.
- Below it, a row of small square partner/category badge icons (reuse existing icon set — e.g. lifestyle, community sub-brand icons) laid out in a horizontal row, evenly spaced, small rounded-square tiles.
- Small social icons row (if present in old footer) at the very bottom, white/lime icon color on the dark green background.
- Footer text (if any copyright line) in `--text-secondary`/light gray, small.

---

## 16. GENERAL RULES FOR THE AI AGENT (do not skip)

1. **Reuse every existing photo asset as-is** — this is a re-skin/rebrand of layout and color, not a new photoshoot. Only recolor backgrounds, buttons, badges, overlays, and text — do not replace or crop the real photography unless an asset is literally broken/missing (see §5 exception).
2. **Reuse all existing copy verbatim** unless explicitly told otherwise — headlines, captions, bio text, contact info all carry over exactly as written in the old site.
3. Every pill button across the entire page uses the same shape/style: fully rounded, `--accent-lime` fill + `--accent-lime-text` text as the default primary style (this replaces every teal button on the old site, no exceptions).
4. Every dark/overlay section (Wellness band, Podcast, Rhythm & Soul, Footer) uses `--accent-dark-green` as its dark base — never black, brown, or orange, even though the old site used those.
5. Section order top-to-bottom must match the old site exactly, as listed in §3 through §15 — this is a re-skin, not a re-architecture.
6. Maintain generous whitespace and rounded corners (~12–20px radius) consistent with the Home dashboard's card style, on every image and card in this page.
7. Mobile-first: this is a PWA, so build and test the mobile layout first (single column, full-width stacked sections, sticky top nav with visible Login button), then adapt to a wider centered/multi-column layout for desktop/PC.
8. The **Login button in the nav (§2)** is the single functional requirement that must work correctly — verify it actually opens the existing login form/flow before considering this done. Everything else on this page is static marketing content.
