# Partner Guide — Koeltekaart Amsterdam

Welcome as a partner of the **Koeltekaart Amsterdam** (Amsterdam Cool Map)! This guide explains how to register a cooling spot, what information is required, and how the map is updated.

---

## What is the Koeltekaart?

The Koeltekaart Amsterdam is a public map of **cooling spots** (koelteplekken) — places where Amsterdammers can cool down during heat waves. These include libraries, churches, supermarkets, urban farms, community centres, and sports facilities.

All location data is managed via a Google Spreadsheet — no technical knowledge or code changes are needed.

---

## Registering a Location

Send your details to the GGD Amsterdam project team by email. You can also fill in the provided CSV template (`docs/location-template.csv`) and attach it to your email. The team will add your location to the spreadsheet after review.

---

## Required fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Name of the location | `OBA Slotermeer` |
| `latitude` | Latitude (decimal) | `52.37936085` |
| `longitude` | Longitude (decimal) | `4.820190547` |
| `type` | Category (see list below) | `library` |
| `stadsdeel` | City district | `Nieuw-West` |
| `wijk` | Neighbourhood | `Slotermeer` |
| `address` | Full street address | `Plein '40-'45 117, Amsterdam` |
| `active` | Show on map? | `yes` or `no` |

---

## Optional fields

| Field | Description |
|-------|-------------|
| `website_url` | Location website |
| `photo_url` | Link to a photo (see §Photos) |
| `description` | Short description in Dutch |
| `note` | Practical note (e.g. "Lift available") |

---

## Amenities (yes / no)

| Field | Meaning |
|-------|---------|
| `airco` | Air conditioning present |
| `seating` | Seating available |
| `toilets` | Toilet available |
| `free_water` | Free drinking water |
| `free_fruit` | Free fruit or snack |
| `food_to_buy` | Food or drinks for purchase |
| `own_food_ok` | Bringing own food is allowed |
| `supervisor` | Staff or supervisor on-site |
| `accessible` | Wheelchair accessible |
| `games` | Games or activities available |
| `pets_ok` | Pets allowed |

---

## Opening hours

Provide opening hours per day in the format `HH:MM-HH:MM`. Leave blank if closed that day.

### Regular hours

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

### Heat plan hours

When the Amsterdam Heat Plan is active, locations may operate on extended or adjusted schedules. Provide those separately:

| Field | Day |
|-------|-----|
| `heat_mon` | Monday (heat plan) |
| `heat_tue` | Tuesday (heat plan) |
| `heat_wed` | Wednesday (heat plan) |
| `heat_thu` | Thursday (heat plan) |
| `heat_fri` | Friday (heat plan) |
| `heat_sat` | Saturday (heat plan) |
| `heat_sun` | Sunday (heat plan) |

Leave blank if hours are the same as regular. The map automatically shows heat plan hours when the heat plan is active.

---

## Location Categories

Use one of the following values for the `type` field:

| Value | Description |
|-------|-------------|
| `library` | Public library (OBA) |
| `church` | Church or place of worship |
| `supermarket` | Supermarket |
| `urban_farm` | Urban farm (stadsboerderij) |
| `community_center` | Community centre |
| `theater` | Theatre |
| `sports` | Sports facility |

Not sure? Choose `community_center` or contact the project team.

---

## Providing Photos

1. Upload the photo to **Google Drive** and set sharing to *"Anyone with the link can view"*.
2. Copy the share link (`https://drive.google.com/file/d/FILE_ID/view?usp=sharing`).
3. Paste the full link into the `photo_url` field — the map converts it automatically.

**Recommended:** landscape orientation, at least 800 × 500 px, max 2 MB, JPG or WebP.

---

## When Will My Location Appear?

Once your details are reviewed by the project team, the location is added to the Google Spreadsheet. Changes are **live within minutes** — the map fetches fresh data on every visit.

To temporarily hide a location (e.g. outside the summer season), set `active` to `no`. The data is retained and the location can be re-enabled at any time.

---

## The Amsterdam Heat Plan

When the **Amsterdam Heat Plan** is active, a red banner appears at the top of the map. Locations with `active = yes` are shown as cooling spots and display heat plan hours if provided.

The heat plan is activated and deactivated by the GGD team via the Google Spreadsheet settings tab.

---

## Questions or updates?

Contact the GGD Amsterdam project team:

- **Heat stress questions:** Leefomgeving@ggd.amsterdam.nl — +31 20 555 5405
- **Register a location:** pratischa.koirala@amsterdam.nl — +31 6 117 38 325
