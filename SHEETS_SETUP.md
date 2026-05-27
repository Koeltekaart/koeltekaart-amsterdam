# Google Sheets setup

The app is now fully client-side. Locations and the heat plan toggle are driven by a Google Sheet — no backend required.

---

## 1. Create the sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Rename the first tab **`locations`**.
3. Add a second tab named **`settings`**.

---

## 2. Populate the tabs

### `locations` tab
Copy the header row and data from `data/koelteplekken.csv` into this tab.

Column reference (same as the CSV):

| Column | Description |
|---|---|
| `name` | Location name (required) |
| `latitude` / `longitude` | Coordinates (required) |
| `type` | `library`, `church`, `supermarket`, `urban_farm`, `community_center`, `sports` |
| `stadsdeel` | District |
| `wijk` | Neighbourhood |
| `address` | Street address |
| `active` | `yes` / `no` — set to `no` to grey out a location without deleting it |
| `website_url` | Full URL |
| `photo_url` | Full URL or path |
| `airco`, `seating`, `toilets`, `free_water`, `free_fruit`, `food_to_buy`, `own_food_ok`, `supervisor`, `accessible`, `games`, `pets_ok` | `yes` / `no` |
| `hours_mon` … `hours_sun` | `09:00-17:00` format, leave blank if closed that day |
| `note`, `description` | Free text |

### `settings` tab
Two columns: `key` and `value`.

| key | value |
|---|---|
| `heat_plan_active` | `TRUE` or `FALSE` |

To **activate** the heat plan: change the value to `TRUE` and save.  
To **deactivate**: change back to `FALSE`.

> ⚠️ Google caches published CSVs for ~1–5 minutes. Changes won't appear instantly.

---

## 3. Publish to web

Do this **once per tab**:

1. **File → Share → Publish to web**
2. In the first dropdown, select the **`locations`** tab
3. In the second dropdown, select **Comma-separated values (.csv)**
4. Click **Publish** — copy the URL
5. Repeat for the **`settings`** tab

---

## 4. Paste the URLs into app.js

Open `frontend/js/app.js` and find the `SHEETS_CONFIG` block near the top:

```js
const SHEETS_CONFIG = {
  locations: "PASTE_LOCATIONS_TAB_CSV_URL_HERE",
  settings:  "PASTE_SETTINGS_TAB_CSV_URL_HERE",
};
```

Replace the placeholder strings with your two published CSV URLs.

---

## 5. Hosting (no backend needed)

The app is now static HTML + JS. You can serve it from:

- **GitHub Pages** — push the `frontend/` folder and enable Pages
- **Netlify / Cloudflare Pages** — drag-drop or connect the repo, set publish dir to `frontend`
- **Any static file server** — `npx serve frontend`

The `backend/` folder and `data/koelteplekken.csv` are no longer needed at runtime (the sheet is the live source of truth), but keep the CSV as a backup/export.
