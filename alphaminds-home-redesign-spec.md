# AlphaMinds Home Screen Redesign — Build Spec

Target reference: new "Commons" home screen design (light/cream theme, lime-green accents).
Goal: replace the current dark-nav/black-hero home screen with this new layout, on both mobile (PWA) and desktop/PC breakpoints, using the SAME brand colors already defined below (do not introduce new colors).

---

## 1. GLOBAL / COLOR TOKENS (do not change these values)

- `--bg-page`: #F4F3EC (warm off-white/cream — the page background, replaces the current black/dark-green sections)
- `--bg-card`: #EDEDE4 (slightly darker card panel background, e.g. "Today's Code" card, "Your Journey" card)
- `--bg-card-white`: #FFFFFF (pure white cards, e.g. "My Chapter" and "Daily Insight" mini-cards)
- `--accent-lime`: #C6FA3C (bright lime-green — logo dot, "Read more" button fill, streak underline, "Listen now" button fill, active nav underline)
- `--accent-lime-text`: #1F2A1A (dark text used on lime buttons)
- `--accent-dark-green`: #16321F (deep green — "Today's Code" icon square, "Daily Insight" play button square)
- `--accent-purple`: #5B4FE0 (Seeker Journey progress ring, "Orientation" completed step, chapter icon circle stroke)
- `--text-primary`: #14140F (near-black, headlines)
- `--text-secondary`: #6B6B63 (muted gray, dates/subtext/labels)
- `--text-eyebrow-green`: #4C8C2E or same as accent-lime darkened (used for "THE COMMONS //", "SEEKER JOURNEY", "ALPHAMINDS DAILY" eyebrow labels)
- `--divider`: #E2E1D8 (hairline separators)
- `--flame-red`: #F04B3E (streak flame icon)
- `--lock-gray`: #9C9C93 (locked step icons/text)

Font: keep existing app font (appears to be a rounded sans-serif, e.g. similar to "Söhne" or "General Sans"). Headlines are bold/heavy weight; body/labels are medium weight with wide letter-spacing on eyebrow/section labels (uppercase, tracked out ~0.08em).

---

## 2. TOP NAVIGATION BAR (both breakpoints)

- Full-width bar, `--bg-page` background, no shadow, thin `--divider` line at bottom.
- **Left:** hamburger menu icon (3 lines, black) — on mobile this replaces the current circular menu button; on desktop this can sit far-left or be replaced by a persistent left sidebar (see §7).
- **Center:** Logo lockup — stylized "A" mark (black triangle/A shape with a small lime-green dot at its base-right) + wordmark "AlphaMinds" in bold black, centered as a group (on desktop, left-align this lockup instead of centering; hamburger and bell move to far left/right).
- **Right:** bell/notification icon (black outline, no badge shown here) — remove the old circular gray button background; icon sits directly on the bar.
- Remove: the old dark hamburger circle, the old gray bell circle background. Icons are now plain line icons directly on the cream background.

---

## 3. GREETING / "THE COMMONS" HEADER BLOCK

- Eyebrow label: small lime-green dot (•) + `THE COMMONS //` in uppercase, letter-spaced, small bold caps, color `--text-eyebrow-green`.
- Headline: `Good morning, {FirstName}` — large, heavy black bold serif-free headline (~32–40px mobile, ~44–52px desktop). The user's name is underlined with a solid lime-green (`--accent-lime`) bar beneath just the name (not the whole phrase).
- Below headline, one line: `{Day}, {Month} {Date}` in `--text-secondary`, followed by a small flame icon (`--flame-red`) and `{N} day streak` in bold black text, inline on the same row separated by ~16px gap.
- Section padding: generous — ~24px horizontal on mobile, contained to a max-width column (~600–680px) on desktop, left-aligned, not centered.

---

## 4. "TODAY'S CODE" CARD

Single rounded card (`--bg-card`, corner radius ~20px, padding ~20–24px):

- Top row: small square icon tile (`--accent-dark-green` background, rounded corners ~8px) containing a simple white "quote mark" or bookmark glyph, followed by label `TODAY'S CODE` in small bold uppercase `--accent-lime`/dark-green tracked text.
- Quote body: large serif-free bold black text, quotation marks included, ~22–26px, line-height loose (this replaces the old plain "No Code Today" state — when content exists, render the actual quote text here; keep a graceful empty state matching this same card style if no code is published).
- Decorative botanical leaf/sprig illustration (thin-line green leaf sprig, matches `--accent-dark-green`/light sage tones) floating in the card's right-hand whitespace, behind/beside the quote text — decorative only, non-interactive, hidden or scaled down on narrow mobile widths if it crowds text.
- Byline: `The Code • {Month Date}` in `--text-secondary`, small.
- Action row (bottom of card, left-to-right):
  1. **Read more →** — pill button, filled `--accent-lime` background, dark text, arrow icon right.
  2. **Save** — pill button, white/`--bg-card-white` background, thin border, bookmark icon left, black text.
  3. **Share** — pill button, same style as Save, share icon left, black text.
  - On mobile these three buttons wrap: "Read more" full-width or left-aligned on its own row, "Save"/"Share" pair together on the next row (as shown in reference). On desktop, all three sit in one horizontal row, left-aligned, with natural widths (not stretched).

---

## 5. "YOUR JOURNEY" SECTION

- Section header row: `YOUR JOURNEY` (uppercase, bold, tracked, black) on the left; `View all →` link on the right in `--accent-lime`-adjacent green/black with arrow.
- Card (`--bg-card`, rounded ~20px, padding ~20–24px):
  - **Left:** circular progress ring (~80–90px diameter), stroke color `--accent-purple`, showing partial fill proportional to completion; center text stacked: large bold number `{completed}` + small "of {total}" beside it on the same baseline, and below that smaller gray `Completed`.
  - **Right of ring:** eyebrow `SEEKER JOURNEY` in `--accent-purple`, bold uppercase small; below it bold black headline `You're on your way, {Name}!`; below that a `--text-secondary` sentence describing the next milestone (e.g., "Complete the steps below to become an Examiner and join Alpha Circle.").
  - **Step tracker row** (horizontal, below, with connecting thin lines between nodes):
    - Each step = circular icon node + label stack beneath (label bold black, sub-label like "Locked"/"Play Now" in `--text-secondary` or `--lock-gray`).
    - States: **Completed** = filled `--accent-purple` circle with white checkmark. **Active/current** = white circle with `--accent-purple` outline + play-triangle icon, label emphasized. **Locked** = solid `--lock-gray` circle with white padlock icon, muted gray labels. **Final/reward** = white circle with `--accent-purple` outline + star icon.
    - Connecting line between nodes: thin horizontal `--divider`/gray line.
    - On mobile this row scrolls horizontally or compresses spacing to fit all steps; on desktop it lays out in one full-width row with even spacing.

---

## 6. LOWER TWO-CARD ROW

Two cards side by side on desktop (50/50 split, ~20px gap); stacked full-width on mobile.

**Card A — "My Chapter" (white card, rounded ~20px):**
- Eyebrow `MY CHAPTER` (small bold gray/black uppercase tracked).
- Row: circular avatar-group icon (people glyph, `--accent-purple` outline circle) + bold black chapter name (e.g. `Mahé Chapter`) + `{N} members` in `--text-secondary` beneath.
- Divider line.
- Row: small calendar icon + `Next Alpha Circle` label (`--accent-purple` or black) with date/time bold black beneath.
- Row: small lock icon + gray helper text (e.g. "Complete your Seeker Journey to participate in Alpha Circle.").

**Card B — "Daily Insight" (white card, rounded ~20px):**
- Top-right: 3-dot overflow menu icon, gray.
- Eyebrow `ALPHAMINDS DAILY` in green.
- Square dark-green (`--accent-dark-green`) tile with white play-triangle icon.
- Bold black title `Daily Insight` + subtitle/description line beneath in `--text-secondary` (e.g. episode title/topic).
- **Listen now →** pill button, filled `--accent-lime`, dark text, arrow icon.

---

## 7. BOTTOM NAVIGATION (mobile) / SIDE NAVIGATION (desktop)

Mobile: fixed bottom tab bar, white/cream background, 6 items unchanged in function but restyle to match new light theme — icon + label stacked, active tab (Home) shown with a short lime-green bar/pill indicator above the icon and black icon+label; inactive tabs gray icon+label. Items: Home, Your Journey, The Code, Daily, Plans (may show lock badge if gated), Profile.

Desktop/PC: convert this into a persistent **left vertical sidebar** (not a bottom bar) — same 6 items stacked vertically with icon+label, logo lockup pinned at top of sidebar, active item gets a lime-green left-border accent or filled pill background; main content area (everything in §3–§6) becomes a centered/left-aligned column with max-width ~680–760px plus surrounding cream `--bg-page` margin, OR a 2-column layout where sidebar is fixed ~240px wide and content fills the remainder with comfortable side padding (~48–64px). Keep top bar (logo/bell) visible on desktop as well, sitting above the content column, to the right of the sidebar.

---

## 8. GENERAL RULES FOR THE AI AGENT

1. Do not introduce any new brand colors — use only the tokens in §1.
2. Replace ALL dark/black hero sections and dark bottom-sheet-style cards from the current build with the light cream `--bg-page` + light `--bg-card` treatment shown here.
3. Every card uses consistent corner radius (~20px) and consistent internal padding (~20–24px) and consistent vertical spacing between sections (~28–32px).
4. Eyebrow labels are always: small uppercase, bold, letter-spaced (~0.06–0.08em), colored per section (green for Commons/Journey headers, purple for Seeker Journey, gray for card sub-labels).
5. Primary CTAs (Read more, Listen now) = filled lime pill buttons with dark text. Secondary CTAs (Save, Share) = white/outline pill buttons with icon + black text.
6. Empty states (no code today, no active challenges, no plans) should reuse this same card shell (rounded card, icon, muted illustration) rather than the old plain-text/dark placeholder currently used — keep them light-themed and on-brand, not the previous black "No content available today" block.
7. Maintain existing navigation structure/behavior (routes, tab order, lock gating on Plans) — this is a visual/layout redesign only, not a functional/IA change.
8. Responsive behavior: mobile = single column, stacked cards, bottom tab bar; desktop = left sidebar nav, single centered content column with the two lower cards side-by-side instead of stacked.
