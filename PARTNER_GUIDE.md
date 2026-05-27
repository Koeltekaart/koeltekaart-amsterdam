# Partnerhandleiding Koeltekaart Amsterdam

Welkom als partner van de **Koeltekaart Amsterdam**! Dit document legt uit hoe u een locatie kunt aanmelden, welke gegevens nodig zijn, en hoe de kaart wordt bijgewerkt.

---

## Wat is de Koeltekaart?

De Koeltekaart Amsterdam is een openbare kaart van koelteplekken in Amsterdam — locaties waar Amsterdammers tijdens hittegolven kunnen afkoelen. Denk aan bibliotheken, kerken, supermarkten, stadsboerderijen, buurtcentra en sportaccommodaties.

De kaart is beschikbaar via amsterdam.nl en toont live openingstijden, voorzieningen en routebeschrijvingen.

---

## Locatie aanmelden

Stuur uw gegevens per e-mail naar het projectteam van GGD Amsterdam. Gebruik het onderstaande overzicht als checklist. U kunt ook de meegeleverde CSV-sjabloon invullen (`data/locatie-template.csv`) en opsturen.

### Verplichte velden

| Veld | Omschrijving | Voorbeeld |
|------|-------------|---------|
| `name` | Naam van de locatie | `OBA Slotermeer` |
| `latitude` | Breedtegraad (decimaal, 8 cijfers) | `52.37936085` |
| `longitude` | Lengtegraad (decimaal, 8 cijfers) | `4.820190547` |
| `type` | Categorie (zie lijst hieronder) | `library` |
| `stadsdeel` | Stadsdeel | `Nieuw-West` |
| `wijk` | Wijk | `Slotermeer` |
| `address` | Volledig adres | `Plein '40-'45 117, Amsterdam` |
| `active` | Locatie tonen op kaart? | `yes` of `no` |

### Optionele velden

| Veld | Omschrijving | Waarden |
|------|-------------|---------|
| `website_url` | Website van de locatie | `https://oba.nl/...` |
| `photo_url` | Link naar een foto (zie §Foto's) | Google Drive-link |
| `description` | Korte beschrijving in het Nederlands | Vrije tekst |
| `note` | Praktische opmerking (bijv. openingstijden) | Vrije tekst |

### Voorzieningen (yes / no)

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
| `games` | Spelmateriaal of activiteiten voor kinderen |
| `pets_ok` | Huisdieren toegestaan |

### Openingstijden

Geef openingstijden op per dag in het formaat `HH:MM-HH:MM`. Laat leeg als de locatie op die dag gesloten is.

| Veld | Dag |
|------|-----|
| `hours_mon` | Maandag |
| `hours_tue` | Dinsdag |
| `hours_wed` | Woensdag |
| `hours_thu` | Donderdag |
| `hours_fri` | Vrijdag |
| `hours_sat` | Zaterdag |
| `hours_sun` | Zondag |

**Voorbeeld:** `10:00-20:00`

> **Let op:** De openingstijden op de kaart zijn de gebruikelijke tijden. Aangepaste tijden tijdens hittegolven kunnen in het veld `note` worden vermeld, bijv.: *"Tijdens warme periodes ruimere openingstijden. Bekijk actuele tijden op de website."*

---

## Locatiecategorieën

Gebruik één van de volgende waarden voor het veld `type`:

| Waarde | Omschrijving |
|--------|-------------|
| `library` | Bibliotheek (OBA) |
| `church` | Kerk of gebedsruimte |
| `supermarket` | Supermarkt |
| `urban_farm` | Stadsboerderij |
| `community_center` | Buurtcentrum of theater |
| `sports` | Sportaccommodatie |

Twijfelt u? Kies `community_center` of neem contact op.

---

## Foto's aanleveren

1. Upload de foto naar **Google Drive** en stel de map in op *"Iedereen met de link kan bekijken"*.
2. Kopieer de deellink. Uw link ziet er zo uit:
   `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
3. Plak de volledige link in het veld `photo_url`. Het systeem converteert deze automatisch.

**Aanbevolen:** horizontale foto, minimaal 800 × 500 px, maximaal 2 MB, JPG of WebP.

---

## Contactgegevens partner (intern gebruik)

De volgende velden zijn **niet zichtbaar op de kaart** en worden alleen intern gebruikt voor projectbeheer:

| Veld | Omschrijving |
|------|-------------|
| `contact_name` | Naam contactpersoon |
| `contact_phone` | Telefoonnummer |
| `contact_email` | E-mailadres |

---

## Wanneer verschijnt mijn locatie op de kaart?

Na ontvangst en controle van uw gegevens wordt de locatie toegevoegd aan het Google Spreadsheet dat de kaart aandrijft. Wijzigingen zijn **binnen enkele minuten** zichtbaar — de kaart laadt de data live.

Wilt u een locatie tijdelijk verbergen (bijv. buiten het zomerseizoen)? Zet `active` op `no` en de locatie verdwijnt van de kaart zonder dat de gegevens verloren gaan.

---

## Hitteplan

Wanneer het **Amsterdam Hitteplan** actief is, verschijnt er een rode banner bovenaan de kaart. Locaties waarvoor `active = yes` zijn dan als koelteplek beschikbaar.

Buiten het hitteplan toont de kaart een grijze banner: *"Geen hitteplan actief — locaties worden niet als koelteplek ingezet."*

---

## Vragen?

Neem contact op met het projectteam van GGD Amsterdam via de contactgegevens op amsterdam.nl.
