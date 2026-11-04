# App mockups v1: approved by Edgar, 2026-10-04

**Target design for the Android app** (UX tiers U1/U2 in `ANDROID-APP-UX-PROMPT.md`).
Live canvas: https://claude.ai/artifact/AxE6pTZP9htVLa5m6aEpPp. You can't open it from
Claude Code; these files are the same screens.

- Each `*.dc.html` is one 390×844 phone screen, written with inline styles.
- Read them for the layout, spacing, sizes, copy and hierarchy.
- **Do not copy them into the app.** Build the real screens from the app's components and
  CSS tokens.
- The `{{…}}` / `<x-dc>` wrapper is the mockup tool's format. Ignore it.
- Mascots: `bruno.svg`, `hamsti.svg`, `quaki.svg`, `regi.svg`, exported from
  `src/lib/mascots.js`. In the app, use the existing mascot component.

| File | Screen |
| --- | --- |
| `Onboarding.dc.html` | First start: app language, asked once (replaces the language banner) |
| `Main.dc.html` | Start (light) |
| `StartDunkel.dc.html` | Start (dark) |
| `Mehr.dc.html` | Mehr = settings, full scroll height (960) |
| `Einfach.dc.html` | One Einfach task inside a unit (no tab bar) |
| `Woerter.dc.html` | Wörter: level tabs, continue card, topic sets |
| `Karte.dc.html` | One flashcard (no tab bar) |
| `KarteSheet.dc.html` | Deck settings as a bottom sheet |
| `Sprechen.dc.html` | Aussprache: one word per screen (no tab bar) |

## Design rules taken from the mockups

**Tokens:** the site's existing ones.
- Light:
  - ink `#1a2230`, muted `#4b5768`, border `#e7e9ee`, surface `#f7f8fa`;
  - teal text and buttons `#0f766e`, teal tint `#f0fdfa` / `#ccfbf1`;
  - weekly goal `#f97316` on `#ffedd5`;
  - record button `#c2410c`.
- Dark: the site's dark tokens (`StartDunkel.dc.html`).

**Type: five sizes.**
- 26/700 Sora: screen title.
- 20/600 Sora: card title.
- 16–17 Sora: body, list rows, buttons.
- 14/600 Albert Sans: labels, section heads.
- 13/500 Albert Sans: captions and meta.
- 12/600–700 Albert Sans: tab labels only.

**Display face:** Big Shoulders Display 800 is used **only** for the German being practised
("Wie heißt du?", "der Name"). It is not used for titles.

**Spacing and sizes:**
- 20 px page gutter;
- 20–24 px between blocks;
- cards with radius 16–20;
- list rows 52–72 px;
- primary buttons 56 px, pill shaped;
- big action buttons in Sprechen 72 px;
- every tap target is at least 44 px.

**Tab bar:**
- Start · Einfach · Wörter · Sprechen · Mehr;
- 84 px including the gesture area;
- the active tab is a teal pill behind the icon.
- **Hidden inside practice screens:** Einfach task, flashcard, Sprechen word. Those screens
  have their own top bar (✕ or ‹, the title, one action) and their action at the bottom.

**Principles:**
1. One job per screen.
2. Settings live in a sheet behind one button.
3. Ask once (language, native language, level), then remember. Change it in Mehr.
4. Actions sit in the bottom third.
5. No overlays or tours when a screen opens.
6. Must hold at 130% system font size.

**Home:**
- "Weiter, wo du warst" is the dominant card: the last exercise with its progress.
- The weekly goal bar sits below it.
- Then three rows: Einfach lernen, Wörter, Sprechen.
- The "Alles andere auf englishacademy.com" link moves to Mehr › Info.
