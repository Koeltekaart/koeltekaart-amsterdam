# Partnerhandleiding Koeltekaart Amsterdam

Welkom als partner van de **Koeltekaart Amsterdam**! Dit document legt uit hoe u een locatie kunt aanmelden, welke gegevens nodig zijn, en hoe de kaart wordt bijgewerkt.

---

## Wat is de Koeltekaart?

De Koeltekaart Amsterdam is een openbare kaart van koelteplekken in Amsterdam — locaties waar Amsterdammers tijdens hittegolven kunnen afkoelen. Denk aan bibliotheken, kerken, supermarkten, stadsboerderijen, buurtcentra en sportaccommodaties.

De kaart toont live openingstijden, voorzieningen en routebeschrijvingen. Alle locatiegegevens worden beheerd via een Google Spreadsheet — u hoeft geen code aan te passen.

---

## Locatie aanmelden

Stuur uw gegevens naar het projectteam van GGD Amsterdam. U kunt ook de meegeleverde CSV-sjabloon (`docs/location-template.csv`) invullen en opsturen. Na verwerking wordt de locatie direct in het spreadsheet toegevoegd.

---

## Verplichte velden

| Veld | Omschrijving | Voorbeeld |
|------|-------------|---------|
| `name` | Naam van de locatie | `OBA Slotermeer` |
| `latitude` | Breedtegraad (decimaal) | `52.37936085` |
| `longitude` | Lengtegraad (decimaal) | `4.820190547` |
| `type` | Categorie (zie lijst hieronder) | `library` |
| `stadsdeel` | Stadsdeel | `Nieuw-West` |
| `wijk` | Wijk | `Slotermeer` |
| `address` | Volledig adres | `Plein '40-'45 117, Amsterdam` |
| `active` | Locatie tonen op kaart? | `yes` of `no` |

---

## Optionele velden

| Veld | Omschrijving |
|------|-------------|
| `website_url` | Website van de locatie |
| `photo_url` | Link naar een foto (zie §Foto's) |
| `description` | Korte beschrijving in het Nederlands |
| `note` | Praktische opmerking (bijv. "Lift aanwezig") |
| `description_en` | Engelse vertaling van `description` (optioneel; valt terug op NL) |
| `note_en` | Engelse vertaling van `note` (optioneel; valt terug op NL) |

---

## Voorzieningen (yes / no)

| Veld | Betekenis |
|------|-----------|
| `airco` | Airconditioning aanwezig |
| `seating` | Zitplaatsen beschikbaar |
| `toilets` | Toilet beschikbaar |
| `free_water` | Gratis drinkwater |
| `free_fruit` | Gratis fruit of snack |
| `food_to_buy` | Eten/drinken te koop |
| `own_food_ok` | Eigen eten meenemen toegestaan |
| `supervisor` | Toezichthouder/medewerker aanwezig |
| `accessible` | Rolstoeltoegankelijk |
| `games` | Spelmateriaal of activiteiten |
| `pets_ok` | Huisdieren toegestaan |

---

## Openingstijden

Vul per dag de openingstijden in het formaat `UU:MM-UU:MM`. Laat de cel leeg als de locatie op die dag gesloten is (of typ `gesloten`).

> **Tip:** typ je iets dat de kaart niet kan lezen (bijv. `de hele dag open`), dan toont de kaart "onbekend — check de website" in plaats van een verkeerde open/dicht-status. Een gesloten dag laat je leeg of zet je op `gesloten`.

### Reguliere openingstijden

| Veld | Dag |
|------|-----|
| `hours_mon` | Maandag |
| `hours_tue` | Dinsdag |
| `hours_wed` | Woensdag |
| `hours_thu` | Donderdag |
| `hours_fri` | Vrijdag |
| `hours_sat` | Zaterdag |
| `hours_sun` | Zondag |

**Voorbeeld:** `09:00-21:00`

### Openingstijden tijdens het Hitteplan

Wanneer het Amsterdam Hitteplan actief is, gebruikt de kaart automatisch de hitteplantijden in plaats van de reguliere tijden. Vul **alleen de dagen in die afwijken** — per dag geldt:

- **Leeg** → geen afwijking: de reguliere tijd van die dag wordt gebruikt.
- **`gesloten`** → die dag dicht tijdens het hitteplan (ook al is de locatie normaal open).
- **`UU:MM-UU:MM`** → afwijkende hitteplantijd voor die dag.

> Heeft een locatie géén reguliere tijden (alleen open tijdens een hitteplan)? Vul dan de hitteplantijden volledig in. Buiten het hitteplan toont de kaart de locatie als gesloten.

| Veld | Dag |
|------|-----|
| `heat_mon` | Maandag (hitteplan) |
| `heat_tue` | Dinsdag (hitteplan) |
| `heat_wed` | Woensdag (hitteplan) |
| `heat_thu` | Donderdag (hitteplan) |
| `heat_fri` | Vrijdag (hitteplan) |
| `heat_sat` | Zaterdag (hitteplan) |
| `heat_sun` | Zondag (hitteplan) |

**Voorbeeld:** een bibliotheek die normaal `09:00-17:00` open is maar tijdens het hitteplan langer openblijft, vult `09:00-21:00` in. Een dag die tijdens het hitteplan juist dicht is, krijgt `gesloten`.

---

## Locatiecategorieën

Gebruik één van de volgende waarden voor het veld `type`:

| Waarde | Omschrijving |
|--------|-------------|
| `library` | Bibliotheek (OBA) |
| `church` | Kerk of gebedsruimte |
| `supermarket` | Supermarkt |
| `urban_farm` | Stadsboerderij |
| `community_center` | Buurtcentrum |
| `theater` | Theater |
| `sports` | Sportaccommodatie |

Twijfelt u? Kies `community_center` of neem contact op.

---

## Foto's aanleveren

1. Upload de foto naar **Google Drive** en stel de toegang in op *"Iedereen met de link kan bekijken"*.
2. Kopieer de deellink (begint met `https://drive.google.com/file/d/...`).
3. Plak de link in het veld `photo_url`. De kaart converteert dit automatisch naar een insluitbare afbeelding.

**Aanbevolen:** liggende foto (landscape), minimaal 800 × 500 px, maximaal 2 MB, JPG of WebP.

---

## Wanneer verschijnt mijn locatie op de kaart?

Na ontvangst en controle van uw gegevens wordt de locatie door het projectteam toegevoegd aan het Google Spreadsheet. Wijzigingen zijn **binnen enkele minuten** zichtbaar — de kaart laadt de data live bij elk bezoek.

Wilt u een locatie tijdelijk verbergen (bijv. buiten het zomerseizoen)? Zet `active` op `no`. De locatie verdwijnt van de kaart zonder dat de gegevens verloren gaan.

---

## Het Amsterdam Hitteplan

Wanneer het **Amsterdam Hitteplan** actief is, verschijnt er een rode banner bovenaan de kaart. Locaties met `active = yes` zijn dan als koelteplek beschikbaar en tonen — indien ingevuld — hun hitteplanopeningstijden.

Het hitteplan wordt door het GGD-team via het spreadsheet in- en uitgeschakeld.

---

## Vragen of wijzigingen doorgeven?

Neem contact op met het projectteam van GGD Amsterdam:

- **Koelteplekken & hittestress:** Leefomgeving@ggd.amsterdam.nl — 020 555 5405
- **Locatie aanmelden:** pratischa.koirala@amsterdam.nl — 06 117 38 325
