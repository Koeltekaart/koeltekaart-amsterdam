# Koeltekaart Amsterdam — Partner Guide (English)

This is the guide for GGD Amsterdam staff and location managers who maintain the Koeltekaart (Cool Map). You do not need technical knowledge to update the map.

---

## Contents

1. [Updating Cooling Shelters](#1-updating-cooling-shelters)
2. [Activating or Deactivating the Heat Plan](#2-activating-or-deactivating-the-heat-plan)
3. [Starting the Map](#3-starting-the-map)
4. [Frequently Asked Questions](#4-frequently-asked-questions)

---

## 1. Updating Cooling Shelters

All cooling shelters are stored in a single file: **`data/koelteplekken.csv`**

This is a standard spreadsheet that you can open in Excel, Google Sheets, or LibreOffice.

### Adding a Location

1. Open `data/koelteplekken.csv` in Excel
2. Add a new row at the bottom
3. Fill in the columns (see table below)
4. Save the file as CSV (comma-separated)
5. Restart the server (or wait for the server to reload the file automatically)

### Column Descriptions

| Column | Description | Example |
|---|---|---|
| `name` | Name of the location | OBA Slotermeer |
| `type` | Type of location | `library`, `church`, `supermarket`, `urban_farm` |
| `stadsdeel` | District | Nieuw-West |
| `wijk` | Neighborhood | Geuzenveld |
| `address` | Address | Plein '40-'45 102, 1064 SW Amsterdam |
| `latitude` | Latitude (decimal) | 52.3812 |
| `longitude` | Longitude (decimal) | 4.8100 |
| `active` | Visible on the map? | `yes` or `no` |
| `website_url` | Location website | https://www.oba.nl/... |
| `photo_url` | Photo URL or path | /images/koelteplekken/oba-slotermeer.webp |
| `hours_mon` to `hours_sun` | Opening hours per day | `09:00-17:00` (empty = closed) |
| `note` | Special notes | Open in summer only |
| `seating` | Seating available? | `yes` or `no` |
| `toilets` | Toilets available? | `yes` or `no` |
| `free_water` | Free drinking water? | `yes` or `no` |
| `free_fruit` | Free fruit? | `yes` or `no` |
| `food_to_buy` | Food for purchase? | `yes` or `no` |
| `own_food_ok` | Own food allowed? | `yes` or `no` |
| `airco` | Air conditioning? | `yes` or `no` |
| `supervisor` | Staff on-site? | `yes` or `no` |
| `accessible` | Wheelchair accessible? | `yes` or `no` |
| `games` | Games/activities? | `yes` or `no` |
| `pets_ok` | Pets welcome? | `yes` or `no` |

### Temporarily Hiding a Location

Set the `active` column to `no`. The location will remain in the file but will appear greyed out on the map.

### Removing a Location

Delete the entire row from the CSV file.

---

## 2. Activating or Deactivating the Heat Plan

When the Amsterdam Heat Plan is active, a red banner appears at the top of the website and cooling shelter markers pulse on the map.

### Activating the Heat Plan

Send an HTTP request to the server:

**Using curl (terminal):**
```bash
curl -X POST https://YOUR-SERVER-ADDRESS/api/heat-plan \
  -H "Content-Type: application/json" \
  -d '{"active": true, "secret": "YOUR-SECRET"}'
```

**Using a browser extension** (such as RESTer or Postman):
- Method: `POST`
- URL: `https://YOUR-SERVER-ADDRESS/api/heat-plan`
- Body (JSON): `{"active": true, "secret": "YOUR-SECRET"}`

### Deactivating the Heat Plan

Use the same request, but with `"active": false`:
```bash
curl -X POST https://YOUR-SERVER-ADDRESS/api/heat-plan \
  -H "Content-Type: application/json" \
  -d '{"active": false, "secret": "YOUR-SECRET"}'
```

> **Note:** The heat plan status is stored in the server's memory. If the server restarts, the heat plan will be off. Activate it again if needed.

> **Secret key:** Set the environment variable `HEAT_PLAN_SECRET` on the server to protect the API. See the README for instructions.

---

## 3. Starting the Map

### Using Docker (recommended)

Requirement: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
docker-compose up --build
```

Open the map at http://localhost:8000

### Manual Setup (Python)

Requirement: Python 3.10 or higher.

```bash
cd backend
pip install -r requirements.txt
flask --app wsgi:app run
```

Open the map at http://localhost:5000

### On a Server

Use the Docker method above on the server. Make sure port 8000 is accessible (or adjust the port in `docker-compose.yml`).

For production, you can also set an environment variable for the heat plan secret:
```bash
HEAT_PLAN_SECRET=choose-a-strong-password docker-compose up -d
```

---

## 4. Frequently Asked Questions

**A location's coordinates are incorrect. How do I find the right ones?**  
Visit [maps.amsterdam.nl](https://maps.amsterdam.nl) or [maps.google.com](https://maps.google.com), search for the address, right-click on the location, and copy the coordinates. The latitude (first value) is around ±52, and longitude (second value) is around ±4 or 5.

**How do I add a photo to a cooling shelter?**  
Place the image in the `frontend/images/koelteplekken/` folder (preferably in `.webp` format for faster loading). Then enter the path in the `photo_url` column: `/images/koelteplekken/filename.webp`.

**The website isn't showing my changes after editing the CSV.**  
The server stores data temporarily in memory. Restart the server to load the latest version of the CSV.

**The heat plan is active but the banner isn't visible.**  
The banner status updates automatically every 5 minutes in the browser. Wait a moment or refresh the page.

**I want to add a new location type (not library/church/supermarket/urban_farm).**  
This requires code changes. To add a new type:

1. **Add the type to the CSV file** — fill in the `type` column with the new type name (for example, `community_center` or `sports`).
2. **Contact your IT team** — they will need to:
   - Add a colour to `CATEGORY_COLORS` in `frontend/js/app.js`
   - Optionally add the type to `CATEGORY_DEFS` in `frontend/js/app.js` for filtering

Examples of existing types and colours:
- `library` (Library) → Blue (#1D5EAD)
- `church` (Church) → Purple (#7B4EA6)
- `supermarket` (Supermarket) → Teal (#0D8A7E)
- `urban_farm` (Urban farm) → Green (#2E7A30)
- `community_center` (Community centre) → Orange (#B86520) — not yet used
- `sports` (Sports) → Red (#B82030) — not yet used

---

*Questions or problems? Contact: Leefomgeving@ggd.amsterdam.nl*
