# Koeltekaart Amsterdam — Claude Instructions

## Design System

All UI changes must be compatible with the **Amsterdam Design System** (ADS).

- The ADS repo is cloned locally at `C:/Users/nojus/Desktop/design-system/`
- Icons: use SVG path data from `packages-proprietary/assets/icons/` — never hand-draw icons
- Colours: use the Amsterdam brand palette already defined in `app.js` (`AMSTERDAM_PALETTE`, `CATEGORY_COLORS`)
- Typography: Amsterdam Sans is already loaded via `frontend/fonts/` — do not introduce other typefaces

Before adding any new icon, button, or UI element, check whether the ADS provides it first.

## Branch rules

- `main` and `data-analysis-trial` are kept **separate** — never merge one into the other
- Frontend-only changes (CSS/JS/HTML) go to **both** branches independently (checkout files, not merge)
- Data analysis changes go to `data-analysis-trial` only
