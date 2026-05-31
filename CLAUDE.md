# Koeltekaart Amsterdam — Claude Instructions

## Amsterdam Design System (ADS)

All UI changes must be compatible with the **Amsterdam Design System**.
The ADS repo is cloned locally at `C:/Users/nojus/Desktop/design-system/`.

### Icons

Use SVG path data from `packages-proprietary/assets/icons/` — never hand-draw icons.
344 icons available. Key ones for this project:
- `Building` — koelteplekken (cooling shelters)
- `PersonSwimming` — swimming spots
- `WaterLadder` — drinking water taps
- `Park` — parks
- `Leaf` — shade layer
- `Search`, `Filter`, `CrossHair`, `ArrowBackward`, `X`, `ChevronDown/Forward/Backward`, `Map`, `Menu`
- `Mail`, `Phone`, `MapMarkerOnMap`

In `app.js`, use the `adsIcon(key, { size, fill, cls })` helper. In static HTML, inline the full `<svg>` from the icon file.

### Colours

Source: `packages-proprietary/tokens/src/brand/ams/color.tokens.json`

| Token | Value | Use |
|---|---|---|
| interactive.default | `#004699` | Primary interactive / links / buttons |
| interactive.hover | `#003677` | Hover state |
| interactive.disabled | `#767676` | Disabled state |
| text.default | `#202020` | Body text |
| text.secondary | `#767676` | Muted / supporting text |
| feedback.error | `#ec0000` | Errors |
| feedback.success | `#00893c` | Success / open status |
| feedback.warning | `#ff9100` | Warnings |
| feedback.info | `#009de6` | Info / water |
| highlight.purple | `#a00078` | Churches |
| highlight.lime | `#bed200` | Urban farms |
| highlight.magenta | `#e50082` | Sports |

Do not introduce colours outside this palette. The existing `AMSTERDAM_PALETTE` and `CATEGORY_COLORS` in `app.js` already follow it.

### Typography

Source: `packages-proprietary/tokens/src/brand/ams/typography.tokens.json`

- **Typeface:** Amsterdam Sans only (already loaded via `frontend/fonts/`) — no other fonts
- **Body text:** 18–20px fluid (`clamp(1.125rem, 1.0893rem + 0.1786vw, 1.25rem)`), weight 400, line-height 1.6
- **Bold body:** weight 700
- **Small/meta text:** 16px fixed, line-height 1.5
- **Headings:** weight 700, `text-wrap: balance`
  - h1: 32–48px fluid, line-height 1.2
  - h2: 24–32px fluid, line-height 1.3
  - h3: 21–25px fluid, line-height 1.3
  - h4: body size, line-height 1.4

### Spacing

Source: `packages-proprietary/tokens/src/brand/ams/space.tokens.json`
All values are fluid (scale between 320px and 1600px viewports):

| Token | Range |
|---|---|
| `xs` | 4–6px |
| `s` | 8–12px |
| `m` | 16–24px |
| `l` | 24–36px |
| `xl` | 36–60px |
| `2xl` | 48–90px |

### Borders

Source: `packages-proprietary/tokens/src/brand/ams/border.tokens.json`

| Token | Value | Use |
|---|---|---|
| `s` | 1px | Subtle borders, hover reinforcement |
| `m` | 2px | Default inputs and containers |
| `l` | 3px | Emphasis |
| `xl` | 4px | Active tab indicators |

### CSS Components

Source: `packages/css/src/components/` — SCSS files and READMEs per component.
Class naming follows BEM: `.ams-component` root, `.ams-component--variant` modifier.

Available components relevant to this project:
- **Button:** `.ams-button`, `.ams-button--primary`, `.ams-button--secondary`, `.ams-button--tertiary`, `.ams-button--icon-only`
- **Heading:** `.ams-heading`, `.ams-heading--1` through `.ams-heading--5`, `.ams-heading--inverse`
- **Paragraph:** `.ams-paragraph`
- **Link:** `.ams-link`, `.ams-link--contrast`, `.ams-link--inverse`
- **Badge:** `.ams-badge`
- **Alert:** `.ams-alert`
- **Switch:** `.ams-switch`
- **Search field:** `.ams-search-field`
- **Skip link:** `.ams-skip-link`
- **Visually hidden:** `.ams-visually-hidden`
- **Page header/footer:** `.ams-page-header`, `.ams-page-footer`

Check `packages/css/src/components/<name>/README.md` before building any custom component — the ADS version may already exist.

Button guidelines:
- Use verbs in infinitive form (NL: "Opslaan", not "Sla op")
- Only 1 primary button per screen
- Don't use a button to navigate — use a link
- Wrap multiple buttons in an Action Group

---

## Branch Rules

- `main` and `data-analysis-trial` are kept **separate** — never merge one into the other
- Frontend-only changes (CSS/JS/HTML) go to **both** branches independently: commit on one, then `git checkout <other-branch> -- frontend/css/app.css frontend/index.html frontend/js/app.js`
- Data analysis changes (`Data_analysis/`) go to `data-analysis-trial` only
