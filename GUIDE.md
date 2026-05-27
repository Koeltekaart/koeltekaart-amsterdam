# Koeltekaart Amsterdam — Handleiding voor partners

Dit is de handleiding voor medewerkers van GGD Amsterdam en locatiebeheerders die de Koeltekaart bijhouden. U hoeft geen technische kennis te hebben om de kaart bij te werken.

---

## Inhoud

1. [Koelteplekken bijwerken](#1-koelteplekken-bijwerken)
2. [Het hitteplan in- of uitschakelen](#2-het-hitteplan-in--of-uitschakelen)
3. [De kaart starten](#3-de-kaart-starten)
4. [Veelgestelde vragen](#4-veelgestelde-vragen)

---

## 1. Koelteplekken bijwerken

Alle koelteplekken staan in één bestand: **`data/koelteplekken.csv`**

Dit is een gewone spreadsheet die u kunt openen in Excel, Google Spreadsheets of LibreOffice.

### Een locatie toevoegen

1. Open `data/koelteplekken.csv` in Excel
2. Voeg onderaan een nieuwe rij toe
3. Vul de kolommen in (zie hieronder)
4. Sla het bestand op als CSV (komma-gescheiden)
5. Herstart de server (of wacht tot de server het bestand opnieuw laadt)

### Kolommen uitleg

| Kolom | Uitleg | Voorbeeld |
|---|---|---|
| `name` | Naam van de locatie | OBA Slotermeer |
| `type` | Soort locatie | `library`, `church`, `supermarket`, `urban_farm` |
| `stadsdeel` | Stadsdeel | Nieuw-West |
| `wijk` | Wijk | Geuzenveld |
| `address` | Adres | Plein '40-'45 102, 1064 SW Amsterdam |
| `latitude` | Breedtegraad (decimaal) | 52.3812 |
| `longitude` | Lengtegraad (decimaal) | 4.8100 |
| `active` | Zichtbaar op de kaart? | `yes` of `no` |
| `website_url` | Website van de locatie | https://www.oba.nl/... |
| `photo_url` | URL of pad naar foto | /images/koelteplekken/oba-slotermeer.webp |
| `hours_mon` t/m `hours_sun` | Openingstijden per dag | `09:00-17:00` (leeg = gesloten) |
| `note` | Bijzondere opmerking | Alleen in de zomer open |
| `seating` | Zitplaatsen aanwezig? | `yes` of `no` |
| `toilets` | Toiletten aanwezig? | `yes` of `no` |
| `free_water` | Gratis drinkwater? | `yes` of `no` |
| `free_fruit` | Gratis fruit? | `yes` of `no` |
| `food_to_buy` | Eten te koop? | `yes` of `no` |
| `own_food_ok` | Eigen eten meebrengen? | `yes` of `no` |
| `airco` | Airconditioning? | `yes` of `no` |
| `supervisor` | Toezichthouder aanwezig? | `yes` of `no` |
| `accessible` | Rolstoeltoegankelijk? | `yes` of `no` |
| `games` | Spelletjes/activiteiten? | `yes` of `no` |
| `pets_ok` | Huisdieren welkom? | `yes` of `no` |

### Een locatie tijdelijk verbergen

Zet de `active`-kolom op `no`. De locatie blijft in het bestand staan maar wordt grijs weergegeven op de kaart.

### Een locatie verwijderen

Verwijder de hele rij uit het CSV-bestand.

---

## 2. Het hitteplan in- of uitschakelen

Wanneer het Amsterdamse Hitteplan actief is, verschijnt er een rode banner bovenaan de website en gaan de koelteplek-markeringen pulseren.

### Hitteplan inschakelen

Stuur een HTTP-verzoek naar de server:

**Met curl (terminal):**
```bash
curl -X POST https://UW-SERVER-ADRES/api/heat-plan \
  -H "Content-Type: application/json" \
  -d '{"active": true, "secret": "UW-GEHEIM"}'
```

**Met een webbrowser-extensie** (zoals RESTer of Postman):
- Methode: `POST`
- URL: `https://UW-SERVER-ADRES/api/heat-plan`
- Body (JSON): `{"active": true, "secret": "UW-GEHEIM"}`

### Hitteplan uitschakelen

Zelfde verzoek, maar met `"active": false`:
```bash
curl -X POST https://UW-SERVER-ADRES/api/heat-plan \
  -H "Content-Type: application/json" \
  -d '{"active": false, "secret": "UW-GEHEIM"}'
```

> **Let op:** De status van het hitteplan wordt opgeslagen in het geheugen van de server. Als de server herstart, staat het hitteplan weer uit. Schakel het dan opnieuw in.

> **Geheime sleutel:** Stel de omgevingsvariabele `HEAT_PLAN_SECRET` in op de server om de API te beveiligen. Zie de README voor instructies.

---

## 3. De kaart starten

### Met Docker (aanbevolen)

Vereiste: [Docker Desktop](https://www.docker.com/products/docker-desktop/) geïnstalleerd.

```bash
docker-compose up --build
```

Open de kaart op http://localhost:8000

### Handmatig (Python)

Vereiste: Python 3.10 of hoger.

```bash
cd backend
pip install -r requirements.txt
flask --app wsgi:app run
```

Open de kaart op http://localhost:5000

### Op een server

Gebruik de bovenstaande Docker-methode op de server. Zorg dat poort 8000 bereikbaar is (of pas de poort aan in `docker-compose.yml`).

Voor productie kunt u ook een omgevingsvariabele instellen voor de geheime sleutel van het hitteplan:
```bash
HEAT_PLAN_SECRET=kies-een-sterk-wachtwoord docker-compose up -d
```

---

## 4. Veelgestelde vragen

**De coördinaten van een locatie kloppen niet. Hoe vind ik de juiste?**  
Ga naar [maps.amsterdam.nl](https://maps.amsterdam.nl) of [maps.google.com](https://maps.google.com), zoek het adres op, klik rechts op de locatie en kopieer de coördinaten. De breedtegraad (latitude) is de eerste waarde (±52), de lengtegraad (longitude) de tweede (±4 of 5).

**Een foto wil ik toevoegen aan een koelteplek. Hoe doe ik dat?**  
Plaats de afbeelding in de map `frontend/images/koelteplekken/` (bij voorkeur `.webp`-formaat voor snelle laadtijden). Vul daarna in de `photo_url`-kolom het pad in: `/images/koelteplekken/bestandsnaam.webp`.

**De website toont de wijzigingen niet na een aanpassing in het CSV.**  
De server slaat de data tijdelijk op in het geheugen. Herstart de server om de nieuwste versie van het CSV in te laden.

**Het hitteplan staat aan maar de banner is niet zichtbaar.**  
De banner-status wordt elke 5 minuten automatisch bijgewerkt in de browser. Wacht even of ververs de pagina.

**Ik wil een nieuwe soort locatie toevoegen (niet library/church/supermarket/urban_farm).**  
Neem contact op met de ontwikkelaar. Een nieuw type vereist een kleine aanpassing in `frontend/js/app.js`.

---

*Vragen of problemen? Neem contact op via Leefomgeving@ggd.amsterdam.nl*
