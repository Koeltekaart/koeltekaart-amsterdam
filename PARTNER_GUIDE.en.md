# Partner Guide — Koeltekaart Amsterdam

Welcome as a partner of the **Koeltekaart Amsterdam** (Amsterdam Cool Map)! This guide explains how to register a location, what information is needed, and how the map is updated.

---

## What is the Koeltekaart?

The Koeltekaart Amsterdam is a public map of **cooling spots** (koelteplekken) in Amsterdam — places where Amsterdammers can cool down during heat waves. These include libraries, churches, supermarkets, urban farms, community centres, and sports facilities.

The map is available via amsterdam.nl and displays live opening hours, amenities, and directions.

---

## Registering a Location

Send your details by email to the GGD Amsterdam project team. Use the overview below as a checklist, or fill in the provided CSV template (`data/locatie-template.csv`) and attach it to your email.

### Required fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Name of the location | `OBA Slotermeer` |
| `latitude` | Latitude (decimal, 8 digits) | `52.37936085` |
| `longitude` | Longitude (decimal, 8 digits) | `4.820190547` |
| `type` | Category (see list below) | `library` |
| `stadsdeel` | City district (stadsdeel) | `Nieuw-West` |
| `wijk` | Neighbourhood (wijk) | `Slotermeer` |
| `address` | Full street address | `Plein '40-'45 117, Amsterdam` |
| `active` | Show on map? | `yes` or `no` |

### Optional fields

| Field | Description | Values |
|-------|-------------|--------|
| `website_url` | Location website | `https://oba.nl/...` |
| `photo_url` | Link to a photo (see §Photos) | Google Drive link |
| `description` | Short description in Dutch | Free text |
| `note` | Practical note (e.g. opening hours remark) | Free text |

### Amenities (yes / no)

| Field | Meaning |
|-------|---------|
| `airco` | Air conditioning present |
| `seating` | Seating available |
| `toilets` | Toilet available |
| `free_water` | Free drinking water |
| `free_fruit` | Free fruit or snack |
| `food_to_buy` | Food or drinks available for purchase |
| `own_food_ok` | Bringing your own food is allowed |
| `supervisor` | Staff or supervisor present |
| `accessible` | Wheelchair accessible |
| `games` | Games or children's activities available |
| `pets_ok` | Pets allowed |

### Opening hours

Provide opening hours per day in the format `HH:MM-HH:MM`. Leave blank if the location is closed on that day.

| Field | Day |
|-------|-----|
| `hours_mon` | Monday |
| `hours_tue` | Tuesday |
| `hours_wed` | Wednesday |
| `hours_thu` | Thursday |
| `hours_fri` | Friday |
| `hours_sat` | Saturday |
| `hours_sun` | Sunday |

**Example:** `10:00-20:00`

> **Note:** The opening hours shown on the map are the regular hours. Adjusted hours during heat waves can be noted in the `note` field, e.g.: *"Extended opening hours during hot weather. Check the website for current times."*

---

## Location Categories

Use one of the following values for the `type` field:

| Value | Description |
|-------|-------------|
| `library` | Public library (OBA) |
| `church` | Church or place of worship |
| `supermarket` | Supermarket |
| `urban_farm` | Urban farm (stadsboerderij) |
| `community_center` | Community centre or theatre |
| `sports` | Sports facility |

Not sure which category fits? Choose `community_center` or contact the project team.

---

## Providing Photos

1. Upload the photo to **Google Drive** and set sharing to *"Anyone with the link can view"*.
2. Copy the share link. It will look like this:
   `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
3. Paste the full link into the `photo_url` field. The system will convert it automatically.

**Recommended:** landscape orientation, at least 800 × 500 px, maximum 2 MB, JPG or WebP format.

---

## Partner Contact Details (internal use only)

The following fields are **not visible on the map** and are used only for internal project management:

| Field | Description |
|-------|-------------|
| `contact_name` | Name of contact person |
| `contact_phone` | Phone number |
| `contact_email` | Email address |

---

## When Will My Location Appear on the Map?

Once your details have been received and reviewed, the location is added to the Google Spreadsheet that powers the map. Changes are **visible within minutes** — the map loads data live.

Want to temporarily hide a location (e.g. outside the summer season)? Set `active` to `no` and the location will be hidden from the map without losing any data.

---

## Heat Plan (Hitteplan)

When the **Amsterdam Heat Plan** is active, a red banner appears at the top of the map. Locations with `active = yes` are then available as cooling spots.

Outside the heat plan, the map displays a grey banner: *"Locations are not available as cooling spots."*

---

## Questions?

Contact the GGD Amsterdam project team via the contact details on amsterdam.nl.
