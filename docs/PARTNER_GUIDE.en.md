# Partner Guide — Koeltekaart Amsterdam

This guide explains how to update your location's information and how to manage the heat plan.

---

## Updating location information

All location data is stored in a shared **Google Spreadsheet**. To make changes, open the spreadsheet and find your location's row. You can edit any field directly — changes are live on the map within a few minutes.

If you don't have access to the spreadsheet, contact the project team (details at the bottom of this page).

### Main fields

| Field | What it is | Example |
|-------|------------|---------|
| `name` | Name of the location | `OBA Slotermeer` |
| `address` | Full address | `Plein '40-'45 117, Amsterdam` |
| `type` | Category | `library` |
| `stadsdeel` | City district | `Nieuw-West` |
| `wijk` | Neighbourhood | `Slotermeer` |
| `latitude` / `longitude` | GPS coordinates | `52.3793` / `4.8201` |
| `active` | Show on map? | `yes` or `no` |

Set `active` to `no` to temporarily hide your location (for example, outside summer). The data stays in the spreadsheet and can be turned back on at any time.

### Optional fields

| Field | What it is |
|-------|------------|
| `website_url` | Link to your website |
| `photo_url` | Link to a photo (see below) |
| `description` | Short description in Dutch |
| `note` | Practical note, e.g. "Lift available" |
| `description_en` | English translation of `description` (optional; falls back to Dutch) |
| `note_en` | English translation of `note` (optional; falls back to Dutch) |

### Amenities

Set each to `yes` or `no`:

`airco` · `seating` · `toilets` · `free_water` · `free_fruit` · `food_to_buy` · `own_food_ok` · `supervisor` · `accessible` · `games` · `pets_ok`

---

## Opening hours

Enter hours in `HH:MM-HH:MM` format. Leave the cell blank if the location is closed that day (or type `closed`).

> **Tip:** if you type something the map can't read (e.g. `open all day`), it shows "unknown — check the website" rather than a wrong open/closed status. To mark a day closed, leave it blank or type `closed`.

| Field | Day |
|-------|-----|
| `hours_mon` | Monday |
| `hours_tue` | Tuesday |
| `hours_wed` | Wednesday |
| `hours_thu` | Thursday |
| `hours_fri` | Friday |
| `hours_sat` | Saturday |
| `hours_sun` | Sunday |

**Example:** `09:00-21:00`

---

## Heat plan hours

When the Amsterdam Heat Plan is active, the map automatically uses heat plan hours instead of the regular ones. Only fill in **the days that differ** — for each day:

- **Blank** → no change: that day's regular hours are used.
- **`closed`** → closed that day during the heat plan (even if normally open).
- **`HH:MM-HH:MM`** → special heat plan hours for that day.

> Does a location have no regular hours (only open during a heat plan)? Then fill in the heat plan hours completely. Outside the heat plan the map shows the location as closed.

| Field | Day |
|-------|-----|
| `heat_mon` | Monday |
| `heat_tue` | Tuesday |
| `heat_wed` | Wednesday |
| `heat_thu` | Thursday |
| `heat_fri` | Friday |
| `heat_sat` | Saturday |
| `heat_sun` | Sunday |

**Example:** a library normally open `09:00-17:00` that stays open later during the heat plan enters `09:00-21:00`. A day that is closed during the heat plan gets `closed`.

---

## Activating or deactivating the heat plan

The heat plan is controlled from the **Settings tab** in the Google Spreadsheet.

1. Open the spreadsheet and go to the **Settings** tab.
2. Find the row labelled `heat_plan_active`.
3. Change the value to `yes` to activate the heat plan, or `no` to deactivate it.

When the heat plan is active, a red banner appears at the top of the map and all locations switch to their heat plan hours (if provided).

---

## Adding a photo

1. Upload your photo to **Google Drive**.
2. Right-click the file → **Share** → set to *"Anyone with the link can view"*.
3. Copy the link and paste it into the `photo_url` field in the spreadsheet.

Recommended: landscape orientation, at least 800 × 500 px, JPG or WebP, max 2 MB.

---

## Location categories

Use one of these values for the `type` field:

`library` · `church` · `supermarket` · `urban_farm` · `community_center` · `theater` · `sports`

Not sure? Use `community_center` or ask the project team.

---

## Questions or changes?

- **Heat stress / heat plan:** Leefomgeving@ggd.amsterdam.nl — +31 20 555 5405
- **Add or update a location:** pratischa.koirala@amsterdam.nl — +31 6 117 38 325
