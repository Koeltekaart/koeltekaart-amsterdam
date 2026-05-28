# Amsterdam Brand Color Palette

Reference for color assignments in koeltekaart-amsterdam.
Source: Gemeente Amsterdam huisstijl / corporate identity.

## Full Palette (in assignment order)

| # | Hex       | Name            | Current use in app         |
|---|-----------|-----------------|----------------------------|
| 1 | `#004699` | Dark blue       | library                    |
| 2 | `#a00078` | Purple          | church                     |
| 3 | `#00893c` | Dark green      | supermarket                |
| 4 | `#bed200` | Lime green      | urban_farm                 |
| 5 | `#ff9100` | Orange          | community_center           |
| 6 | `#e50082` | Magenta/pink    | sports                     |
| 7 | `#009de6` | Light blue      | (next auto-assigned)       |
| 8 | `#ffe600` | Yellow          | (next auto-assigned)       |
| 9 | `#ec0000` | Red             | (next auto-assigned)       |
|10 | `#202020` | Near-black      | (next auto-assigned)       |

## Additional Amsterdam brand colors (not in auto-rotation)

| Hex       | Name            | Notes                        |
|-----------|-----------------|------------------------------|
| `#00b4c8` | Turquoise/teal  | Used for swimming_pools layer |
| `#1a56db` | Bright blue     | Used for shade layer          |

## How auto-assignment works

When a new `type` value appears in the Google Sheet that is not in `CATEGORY_COLORS` in `app.js`:
1. `getCategoryColor(type)` picks the next color from `AMSTERDAM_PALETTE` (wrapping around).
2. `_ensureCategoryDef(type)` adds it to `CATEGORY_DEFS` with:
   - Dutch label: from `TYPE_DISPLAY_NL[type]` — falls back to raw key with underscores replaced by spaces
   - English label: from `TYPE_DISPLAY_EN[type]` — falls back to title-cased key

## To add a new category — via Google Sheet (preferred)

Add rows to the **settings tab** (columns: `key`, `value`):

```
category.museum.en,   Museum
category.museum.nl,   Museum
```

Colors are assigned automatically from the palette above — no color row needed.
Amenity tags work the same way:

```
amenity.lockers.en,   Lockers
amenity.lockers.nl,   Kluisjes
```

## To add a new category — hardcoded fallback

If the Sheet is not configured, add to `TYPE_DISPLAY_EN` and `TYPE_DISPLAY_NL` in `frontend/js/app.js`. Colors and `CATEGORY_DEFS` are populated automatically.
