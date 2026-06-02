"use strict";

// ── Layer definitions ──────────────────────────────────────────────────────
const LAYER_DEFS = [
  { cat: "koelteplekken",  label: "Koelteplekken",   color: "#004699",   type: "geojson", radius: 8 },
  { cat: "water_taps",     label: "Water fountains",  color: "#009de6",   src: "data/raw/water_taps.geojson",  type: "geojson", radius: 4 },
  { cat: "parks",          label: "Parks",            color: "#00893c",   src: "data/raw/parks.json",          type: "polygon" },
  { cat: "swimming_pools", label: "Swimming spots",   color: "#00b4c8",   src: "data/raw/zwemwater.geojson",   type: "geojson", radius: 6 },
  { cat: "shade",          label: "Sidewalk shade",   color: "#1a56db",   type: "shade" },
  { cat: "hvi",            label: "Kwetsbaarheidskaart", color: "#CA0020", src: "data/hvi_map.geojson", type: "choropleth" },
  { cat: "temperature",    label: "Surface Temperature",color: "#CA0020",src: "data/stakeholders/temp_mean.geojson",type: "temperature"},
];

// ── Google Sheets data sources ─────────────────────────────────────────────
// Setup (one-time):
//   1. Open your Google Sheet
//   2. File → Share → Publish to web → publish the whole document → click Publish
//   3. The link shown looks like:
//        https://docs.google.com/spreadsheets/d/e/PUBLISHED_ID/pubhtml
//      Copy the PUBLISHED_ID (the long 2PACX-… string between /d/e/ and /pubhtml)
//   4. For each tab, click the tab in your browser — the URL bar ends with #gid=NUMBER
//      Copy those numbers into locationsGid / settingsGid
//      (The very first tab is almost always gid 0)
//
// Sheet layout:
//   "locations" tab — same columns as koelteplekken.csv (name, latitude, longitude, type, …)
//   "settings"  tab — two columns: key, value — with one row: heat_plan_active, TRUE
const SHEETS_CONFIG = {
  publishedId:  "2PACX-1vToR12t2LARCufEpqz2xv0An5XQqBHd1VvqBmS9k3OdlsvzUryxgmwXTpaVfIX4zMYE61DH0-ujlnqB",  // the 2PACX-… string from the publish URL
  locationsGid: "0",                         // #gid of the locations tab (first tab = 0)
  settingsGid:  "971775516",   // #gid of the settings tab
};

/** Build a published CSV URL for a given sheet tab gid. */
function _sheetsUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/e/${SHEETS_CONFIG.publishedId}/pub?gid=${gid}&single=true&output=csv`;
}
function _sheetsReady() {
  return SHEETS_CONFIG.publishedId && !SHEETS_CONFIG.publishedId.startsWith("PASTE_");
}

const TYPE_LABEL    = { koelteplekken: "Koelteplek", water_taps: "Water fountain", parks: "Park", swimming_pools: "Swimming spot" };
const TYPE_LABEL_NL = { koelteplekken: "Koelteplek", water_taps: "Drinkwaterkraan", parks: "Park", swimming_pools: "Zwemplek" };

// ── Amenity label map (translatable) — new keys discovered in data auto-add ─
const AMENITY_LABELS = {
  ac:               { en: "A/C",           nl: "Airco" },
  free_water:       { en: "Free water",    nl: "Gratis water" },
  seating:          { en: "Seating",       nl: "Zitplaatsen" },
  toilets:          { en: "Toilets",       nl: "Toiletten" },
  wheelchair:       { en: "Accessible",    nl: "Toegankelijk" },
  pets_allowed:     { en: "Pets OK",       nl: "Huisdieren OK" },
  food_to_buy:      { en: "Food nearby",   nl: "Eten te koop" },
  free_fruit:       { en: "Free fruit",    nl: "Gratis fruit" },
  own_food_allowed: { en: "Own food OK",   nl: "Eigen eten OK" },
  supervisor:       { en: "Staff on-site", nl: "Begeleiding" },
  games:            { en: "Activities",    nl: "Activiteiten" },
};
// Fields that are boolean but NOT amenity tags
const NON_AMENITY = new Set([
  "id","name","type","municipality","district","neighborhood",
  "address","website_url","hours","hours_note","photo_url","active","notes",
]);
// Populated dynamically from data
let AMENITY_DEFS = [];

function initAmenities(features) {
  const keys = new Set();
  features.forEach(f => {
    Object.entries(f.properties || {}).forEach(([k, v]) => {
      if (typeof v === "boolean" && !NON_AMENITY.has(k)) keys.add(k);
    });
  });
  AMENITY_DEFS = [...keys].map(key => ({
    key,
    label_en: AMENITY_LABELS[key]?.en || key.replace(/_/g, " "),
    label_nl: AMENITY_LABELS[key]?.nl || key.replace(/_/g, " "),
    filterable: true,
  }));
  state.filters = Object.fromEntries(AMENITY_DEFS.map(d => [d.key, false]));
  rebuildFilterChips();
}

const CATEGORY_DEFS = [
  { key: null,               label_en: "All",              label_nl: "Alles" },
  { key: "library",          label_en: "Library",          label_nl: "Bibliotheek" },
  { key: "church",           label_en: "Church",           label_nl: "Kerk" },
  { key: "supermarket",      label_en: "Supermarket",      label_nl: "Supermarkt" },
  { key: "urban_farm",       label_en: "Urban farm",       label_nl: "Stadsboerderij" },
  { key: "community_center", label_en: "Community centre", label_nl: "Buurtcentrum" },
  { key: "theater",          label_en: "Theater",          label_nl: "Theater" },
];

const TYPE_DISPLAY_NL = { library: "Bibliotheek", church: "Kerk", supermarket: "Supermarkt", urban_farm: "Stadsboerderij", community_center: "Buurtcentrum", sports: "Sport", theater: "Theater" };
const TYPE_DISPLAY_EN = { library: "Library", church: "Church", supermarket: "Supermarket", urban_farm: "Urban farm", community_center: "Community centre", sports: "Sports", theater: "Theater" };

const CATEGORY_COLORS = {
  library:          "#004699",  // Amsterdam dark blue
  church:           "#a00078",  // Amsterdam purple
  supermarket:      "#00893c",  // Amsterdam dark green
  urban_farm:       "#bed200",  // Amsterdam lime green
  community_center: "#ff9100",  // Amsterdam orange
  sports:           "#e50082",  // Amsterdam magenta
  theater:          "#ffa0d7",  // Amsterdam light blue
  default:          "#004699",  // Amsterdam dark blue
};

// Amsterdam brand palette used for auto-assigning colors to new/unknown categories
const AMSTERDAM_PALETTE = [
  "#004699", "#a00078", "#00893c", "#bed200", "#ff9100",
  "#e50082", "#ffa0d7", "#ffe600", "#ec0000", "#202020",
];
let _paletteIndex = Object.keys(CATEGORY_COLORS).filter(k => k !== "default").length;

/** Return the color for a given location type. Auto-assigns from Amsterdam palette for unknown types. */
function getCategoryColor(type) {
  if (!type) return CATEGORY_COLORS.default;
  if (CATEGORY_COLORS[type]) return CATEGORY_COLORS[type];
  // Auto-assign next available palette color
  const color = AMSTERDAM_PALETTE[_paletteIndex % AMSTERDAM_PALETTE.length];
  _paletteIndex++;
  CATEGORY_COLORS[type] = color;
  return color;
}

/** Ensure CATEGORY_DEFS contains an entry for the given type (called when loading data). */
function _ensureCategoryDef(type) {
  if (!type || CATEGORY_DEFS.find(d => d.key === type)) return;
  getCategoryColor(type); // ensure color is assigned
  CATEGORY_DEFS.push({
    key:      type,
    label_en: TYPE_DISPLAY_EN[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    label_nl: TYPE_DISPLAY_NL[type] || type.replace(/_/g, " "),
  });
}

// ── Swimming pool sub-types ────────────────────────────────────────────────
const SWIM_TYPE_DEFS = [
  { key: "Binnenzwembad",  label_en: "Indoor pool",               label_nl: "Binnenzwembad",              color: "#009de6" },
  { key: "Buitenzwembad",  label_en: "Outdoor pool",              label_nl: "Buitenzwembad",              color: "#009de6" },
  { key: "Zwemplek",       label_en: "Official outdoor swim spot", label_nl: "Officiële buitenzwemplek",  color: "#009de6" },
  { key: "Peuterbadje",    label_en: "Paddling pool",             label_nl: "Peuterbadje",                color: "#009de6" },
  { key: "Waterspeeltuin", label_en: "Water playground",          label_nl: "Waterspeeltuin",             color: "#009de6" },
];

function swimCategory(p) {
  return p?.category || p?.Categorie || p?.categorie || "";
}

function getSwimTypeDef(category) {
  const raw = String(category || "").trim();
  return SWIM_TYPE_DEFS.find(d => d.key.toLowerCase() === raw.toLowerCase()) || {
    key: raw || "unknown",
    label_en: raw || "Swimming spot",
    label_nl: raw || "Zwemplek",
    color: "#009de6",
  };
}

function swimmingPoolPassesFilters(p) {
  const selected = Object.entries(state.swimTypes || {})
    .filter(([, on]) => on)
    .map(([key]) => key.toLowerCase());
  if (!selected.length) return true;
  return selected.includes(String(swimCategory(p)).trim().toLowerCase());
}

const DAY_SHORT_NL = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const DAY_SHORT_EN = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_LONG_NL  = ["maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag","zondag"];
const DAY_LONG_EN  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ── Translations ───────────────────────────────────────────────────────────
const TR = {
  nl: {
    weather_temp_label: "Actuele temperatuur",
    weather_humidity_label: "Luchtvochtigheid",
    weather_feels_label: "Gevoelstemperatuur",
    weather_credit_prefix: "Weergegevens via",
    weather_feels_info: "Gevoelstemperatuur is hoe warm het buiten aanvoelt, op basis van temperatuur, luchtvochtigheid en wind.",
    skip_to_list: "Sla de kaart over en ga naar de lijst met koelteplekken",
    org: "GGD Amsterdam",
    title: "Koeltekaart Amsterdam",
    search_placeholder: "Zoek straat, buurt of locatie…",
    near_me: "In mijn buurt",
    stay_cool: "Blijf koel",
    heat_advice_btn: "Hitteadvies",
    back: "Terug",
    categories: "Categorieën",
    layers: "Lagen",
    overlays: "Overlays",
    policy_map: "Beleidskaart",
    koelteplekken_label: "Koelteplekken",
    water_label: "Drinkwaterkranen",
    parks_label: "Parken",
    swimming_pools_label: "Zwemplekken",
    shade_label: "Loopschaduw",
    mode_user: "Bewoners",
    mode_policy: "Beleid",
    lp_headline: "Vind verkoeling in Amsterdam",
    lp_hl1: "Te warm?",
    lp_hl2: "Vind verkoeling.",
    lp_sub: "Drinkwaterkranen, parken en koelteplekken — gratis, in jouw buurt.",
    lp_enter: "Open de kaart",
    lp_on_map_title: "Wat vind je op de kaart?",
    lp_layer_koelte_title: "Koelteplekken",
    lp_layer_koelte_desc: "298 overdekte locaties — bibliotheken, buurtcentra en meer.",
    lp_layer_water_title: "Drinkwaterkranen",
    lp_layer_water_desc: "554 openbare drinkwaterkranen verspreid door de stad, 24/7 beschikbaar.",
    lp_layer_parks_title: "Parken",
    lp_layer_parks_desc: "Groene longen van Amsterdam.",
    lp_tips_title: "Blijf koel tijdens een hittegolf",
    contact: "Contact",
    contact_text: "Vragen over de koelteplekken of de kaart?",
    contact_emergency: "Noodgeval? Bel 112",
    tips_cta_title: "Tips om koel te blijven",
    tips_cta_sub: "Advies van GGD Amsterdam",
    banner_active: "Het Amsterdam hitteplan is actief - locaties zijn nu open als koelteplek",
    banner_active_short: "Hitteplan actief — koelteplekken open",
    banner_inactive: "Geen hitteplan actief - locaties worden niet als koelteplek ingezet",
    banner_inactive_short: "Geen hitteplan actief",
    banner_toggle: "Wijzig status",
    open_now: "Open",
    closed_now: "Gesloten",
    closes_soon: "Sluit binnenkort",
    closes_at: "Sluit om",
    opens_at: "Opent om",
    opens_on: "Opent op",
    hours_unknown: "Openingstijden onbekend",
    get_directions: "Routebeschrijving",
    website_hours: "Website & openingstijden",
    near_you: "In jouw buurt",
    other_locations: "Andere locaties",
    no_near_results: "Geen locaties gevonden, probeer het later opnieuw.",
    no_search_results: "Geen resultaten gevonden in Amsterdam",
    tips_page_title: "Blijf koel",
    tips_page_subtitle: "Tips voor warme dagen van GGD Amsterdam",
    heat_plan_what_title: "Wat is het Hitteplan?",
    heat_plan_what_body: "Het Hitteplan Amsterdam wordt geactiveerd wanneer het KNMI een hittewaarschuwing afgeeft. Tijdens het plan zijn koelteplekken in de stad beschikbaar voor iedereen die verkoeling zoekt — gratis en zonder afspraak.",
    tip1_title: "Drink voldoende water",
    tip1_body: "Drink minimaal 1,5 tot 2 liter water per dag tijdens een hittegolf, ook als je geen dorst hebt.",
    tip2_title: "Houd je woning koel",
    tip2_body: "Sluit overdag gordijnen en zonneschermen op zonnige ramen. Open ramen 's avonds als de buitenlucht afkoelt.",
    tip3_title: "Beperk activiteiten buitenshuis",
    tip3_body: "Vermijd inspannende activiteiten tussen 12:00 en 16:00 uur.",
    tip4_title: "Gebruik een koelteplek",
    tip4_body: "Vind de dichtstbijzijnde koelteplek op deze kaart.",
    tip5_title: "Houd kwetsbare mensen in de gaten",
    tip5_body: "Ouderen, jonge kinderen en mensen met chronische ziekten lopen het grootste risico.",
    tip6_title: "Verkoeling voor dieren",
    tip6_body: "Laat huisdieren nooit achter in auto's. Zorg voor schaduw en voldoende water.",
    tip_emergency_title: "Wanneer schakel je hulp in?",
    tip_emergency_body: "Hitteberoerte is een medisch noodgeval. Bel 112 als iemand in de war raakt, stopt met zweten of het bewustzijn verliest.",
    tips_disclaimer: "Dit advies is gebaseerd op aanbevelingen van het RIVM en GGD Amsterdam. Bij medische noodgevallen: bel 112.",
    contact_page_btn: "Contactgegevens & aanmelden",
    contact_page_title: "Contact",
    contact_page_hero_sub: "Koeltekaart Amsterdam",
    contact_ggd_title: "Vragen over hittestress",
    contact_ggd_phone_label: "Telefoon",
    contact_ggd_phone: "020 555 5405",
    contact_ggd_phone_hours: "Maandag t/m vrijdag, 09:00–17:00",
    contact_ggd_post_label: "E-mail",
    contact_ggd_post: "Leefomgeving@ggd.amsterdam.nl",
    contact_ggd_visit_label: "",
    contact_ggd_visit: "",
    contact_ggd_web_label: "",
    contact_submit_title: "Koelteplek aanmelden",
    contact_submit_body: "Kent u een locatie die als koelteplek kan dienen? Neem dan contact op.",
    contact_submit_phone_label: "Telefoon",
    contact_submit_phone: "06 117 38 325",
    contact_submit_email_label: "E-mail",
    contact_submit_email: "pratischa.koirala@amsterdam.nl",
    district: "Stadsdeel",
    neighborhood: "Buurt",
    area: "Oppervlakte",
    city_park: "Stadspark",
    yes: "Ja",
    no: "Nee",
    address: "Adres",
    status: "Status",
    owner: "Eigenaar",
    type_label: "Type",
    installed: "Aangelegd",
    filter_fab: "Filters",
    filter_panel_title: "Filters",
    view_map: "Kaart",
    view_list: "Lijst",
    lv_title: "Koelteplekken",
    lv_found: "locaties",
    lv_no_results: "Geen resultaten",
    lv_no_results_sub: "Pas de filters aan om locaties te zien.",
    lv_always_open: "24/7",
    lv_unknown: "Onbekend",
  },
  en: {
    weather_temp_label: "Current temperature",
    weather_humidity_label: "Humidity",
    weather_feels_label: "Feels-like temperature",
    weather_credit_prefix: "Weather data via",
    weather_feels_info: "Feels-like temperature is how warm it feels outside, based on temperature, humidity and wind.",
    skip_to_list: "Skip the map and go to the list of cooling locations",
    org: "GGD Amsterdam",
    title: "Cool Map Amsterdam",
    search_placeholder: "Search street, neighbourhood or place…",
    near_me: "Near me",
    stay_cool: "Stay cool",
    heat_advice_btn: "Heat advice",
    back: "Back",
    categories: "Categories",
    layers: "Layers",
    overlays: "Overlays",
    policy_map: "Policy map",
    koelteplekken_label: "Cooling spots",
    water_label: "Water fountains",
    parks_label: "Parks",
    swimming_pools_label: "Swimming spots",
    shade_label: "Sidewalk shade",
    mode_user: "Residents",
    mode_policy: "Policy",
    lp_headline: "Find cooling spots in Amsterdam",
    lp_hl1: "Too warm?",
    lp_hl2: "Find relief.",
    lp_sub: "Water fountains, parks and cooling spots — free, near you.",
    lp_enter: "Open the map",
    lp_on_map_title: "What's on the map?",
    lp_layer_koelte_title: "Cooling spots",
    lp_layer_koelte_desc: "298 indoor spaces — libraries, community centres and more.",
    lp_layer_water_title: "Water fountains",
    lp_layer_water_desc: "554 public drinking taps across the city, available 24/7.",
    lp_layer_parks_title: "Parks",
    lp_layer_parks_desc: "Green spaces across Amsterdam.",
    lp_tips_title: "Stay cool during a heatwave",
    contact: "Contact",
    contact_text: "Questions about the cooling spots or this map?",
    contact_emergency: "Emergency? Call 112",
    tips_cta_title: "Stay cool tips",
    tips_cta_sub: "Advice from GGD Amsterdam",
    banner_active: "Amsterdam Heat Plan active — locations are now open as cooling spots",
    banner_active_short: "Heat Plan active — cooling spots open",
    banner_inactive: "No heat plan active — locations are not available as cooling spots",
    banner_inactive_short: "No heat plan active",
    banner_toggle: "Toggle status",
    open_now: "Open now",
    closed_now: "Closed",
    closes_soon: "Closes soon",
    closes_at: "Closes at",
    opens_at: "Opens at",
    opens_on: "Opens on",
    hours_unknown: "Opening hours unknown",
    get_directions: "Get directions",
    website_hours: "Website & opening hours",
    near_you: "Near you",
    other_locations: "Other locations",
    no_near_results: "No locations found — wait a moment and try again.",
    no_search_results: "No results found in Amsterdam",
    tips_page_title: "Stay cool",
    tips_page_subtitle: "Heat safety tips from GGD Amsterdam",
    heat_plan_what_title: "What is the Heat Plan?",
    heat_plan_what_body: "The Amsterdam Heat Plan is activated when the KNMI issues a heat warning. During the plan, cooling spots across the city are available to everyone — free of charge, no appointment needed.",
    tip1_title: "Stay hydrated",
    tip1_body: "Drink water regularly — at least 1.5–2 litres per day during a heatwave.",
    tip2_title: "Keep your home cool",
    tip2_body: "Close curtains and blinds on sun-facing windows during the day.",
    tip3_title: "Limit outdoor activity",
    tip3_body: "Avoid strenuous activity between 12:00 and 16:00 when temperatures peak.",
    tip4_title: "Use a cooling spot",
    tip4_body: "Find the nearest cooling spot using this map.",
    tip5_title: "Look out for others",
    tip5_body: "Elderly people, young children, and those with chronic illness are most at risk.",
    tip6_title: "Keeping pets cool",
    tip6_body: "Never leave pets in parked cars. Provide shade and plenty of water.",
    tip_emergency_title: "When to call for help",
    tip_emergency_body: "Heat stroke is a medical emergency. If someone is confused, stops sweating, or loses consciousness, call 112 immediately.",
    tips_disclaimer: "This guidance is based on RIVM and GGD Amsterdam heat-safety recommendations. For medical emergencies call 112.",
    contact_page_btn: "Contact details & register a spot",
    contact_page_title: "Contact",
    contact_page_hero_sub: "Koeltekaart Amsterdam",
    contact_ggd_title: "Heat stress questions",
    contact_ggd_phone_label: "Phone",
    contact_ggd_phone: "020 555 5405",
    contact_ggd_phone_hours: "Monday to Friday, 09:00–17:00",
    contact_ggd_post_label: "Email",
    contact_ggd_post: "Leefomgeving@ggd.amsterdam.nl",
    contact_ggd_visit_label: "",
    contact_ggd_visit: "",
    contact_ggd_web_label: "",
    contact_submit_title: "Register a cooling spot",
    contact_submit_body: "Do you know a location that could serve as a cooling spot? Get in touch with the details below.",
    contact_submit_phone_label: "Phone",
    contact_submit_phone: "06 117 38 325",
    contact_submit_email_label: "Email",
    contact_submit_email: "pratischa.koirala@amsterdam.nl",
    district: "District",
    neighborhood: "Neighbourhood",
    area: "Area",
    city_park: "City park",
    yes: "Yes",
    no: "No",
    address: "Address",
    status: "Status",
    owner: "Owner",
    type_label: "Type",
    installed: "Installed",
    filter_fab: "Filters",
    filter_panel_title: "Filters",
    view_map: "Map",
    view_list: "List",
    lv_title: "Cooling spots",
    lv_found: "locations",
    lv_no_results: "No results",
    lv_no_results_sub: "Adjust the filters to see locations.",
    lv_always_open: "24/7",
    lv_unknown: "Unknown",
  }
};

function t(key) { return TR[state.lang]?.[key] ?? TR.en[key] ?? key; }

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  map: null,
  layers: {},
  on: { koelteplekken: true, water_taps: true, parks: true, swimming_pools: true, shade: false, hvi: false, temperature: false},
  features: { koelteplekken: [], water_taps: [], parks: [], swimming_pools: [], hvi: [], temperature: [] },
  userMarker: null,
  userPos: null,
  rings: [],
  filters: {},
  swimTypes: Object.fromEntries(SWIM_TYPE_DEFS.map(d => [d.key, false])),
  search: "",
  lang: localStorage.getItem("koeltekaart_lang") || "nl",
  activeCategories: new Set(),
  heatPlanActive: false,
  panelMode: "list",    // "list" | "detail"
  mobileView: "map",    // "map"  | "list"   — mobile only
  detailBackTo: "map",  // "map"  | "list"   — where back button returns to on mobile
  currentDetailFeature: null,
  currentDetailRenderFn: null,

};

function isDesktop() { return window.innerWidth > 768; }

// ── Loader ─────────────────────────────────────────────────────────────────
let _pending = 0;
function setLoading(on) {
  _pending = Math.max(0, _pending + (on ? 1 : -1));
  document.getElementById("loader").classList.toggle("on", _pending > 0);
}

// ── Language ───────────────────────────────────────────────────────────────
function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  // Dutch tagline: wrap all letters except "g." in an underline span so the
  // descender of "g" doesn't collide with the decorative underline.
  const hlAccent = document.querySelector(".li-hl-accent");
  if (hlAccent && state.lang === "nl") {
    hlAccent.innerHTML = '<span class="li-hl-u">Vind verkoelin</span>g.';
  }
  document.querySelectorAll("[data-tooltip-i18n]").forEach(el => {
    const key = el.dataset.tooltipI18n;
    if (key) { el.setAttribute("data-tooltip", t(key)); el.setAttribute("aria-label", t(key)); }
  });
  const si = document.getElementById("search-input");
  if (si) si.placeholder = t("search_placeholder");
  const langBtn = document.getElementById("btn-lang");
  if (langBtn) langBtn.textContent = state.lang === "nl" ? "EN" : "NL";
  setupCategoryFilter();
  document.querySelectorAll(".filter-chip[data-filter]").forEach(btn => {
    const key = btn.dataset.filter;
    const def = AMENITY_DEFS.find(d => d.key === key);
    if (def) btn.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
  });
  updateBannerText();
  rebuildFilterChips();
  rebuildSwimmingPoolChips();
  renderMobileFilterBar();


  // Update panel title if in list mode
  updatePanelTitle();

  rerenderCurrentDetailPanel();
}

function setupLang() {
  document.getElementById("btn-lang").addEventListener("click", () => {
    state.lang = state.lang === "nl" ? "en" : "nl";
    localStorage.setItem("koeltekaart_lang", state.lang);
    applyLanguage();
    const tp = document.getElementById("tips-page");
    if (tp && tp.classList.contains("open")) renderTipsPage();
  });
}

// ── Heat plan banner + map marker pulse ──────────────────────────────────
function applyHeatPlanToMap() {
  // .heat-active on #map-section drives the CSS pulse rings on .koelte-marker
  // Pulse ONLY activates when heat plan is active
  const section = document.getElementById("map-section");
  if (section) section.classList.toggle("heat-active", state.heatPlanActive);
}

function updateBannerText() {
  const banner = document.getElementById("heat-banner");
  const text   = document.getElementById("banner-text");
  if (banner) {
    banner.classList.toggle("heat-banner--active",   state.heatPlanActive);
    banner.classList.toggle("heat-banner--inactive", !state.heatPlanActive);
  }
  if (text) {
    text.textContent = t(state.heatPlanActive ? "banner_active" : "banner_inactive");
  }
  applyHeatPlanToMap();
}

// ── Google Sheets settings ─────────────────────────────────────────────────
// Settings tab columns: key, value
// Supported keys:
//   heat_plan_active       TRUE / FALSE
//   category.<type>.en     English label  e.g. category.museum.en, Museum
//   category.<type>.nl     Dutch label    e.g. category.museum.nl, Museum
//   amenity.<key>.en       English label  e.g. amenity.lockers.en, Lockers
//   amenity.<key>.nl       Dutch label    e.g. amenity.lockers.nl, Kluisjes
//
// Colors are assigned automatically from the Amsterdam palette — no color row needed.

let _settingsPromise = null;

async function fetchSettings() {
  if (!_sheetsReady()) return;
  try {
    const r = await fetch(_sheetsUrl(SHEETS_CONFIG.settingsGid));
    if (!r.ok) return;
    const rows = parseCsv(await r.text());
    rows.forEach(row => {
      const key = (row.key || "").trim().toLowerCase();
      const val = (row.value || "").trim();
      if (!key || !val) return;

      if (key === "heat_plan_active") {
        const was = state.heatPlanActive;
        state.heatPlanActive = csvToBool(val) === true;
        if (was !== state.heatPlanActive) updateBannerText();
        return;
      }

      const parts = key.split(".");
      if (parts.length === 3 && parts[0] === "category") {
        const [, type, lang] = parts;
        if (lang === "en") TYPE_DISPLAY_EN[type] = val;
        if (lang === "nl") TYPE_DISPLAY_NL[type] = val;
        return;
      }

      if (parts.length === 3 && parts[0] === "amenity") {
        const [, akey, lang] = parts;
        if (!AMENITY_LABELS[akey]) AMENITY_LABELS[akey] = {};
        if (lang === "en") AMENITY_LABELS[akey].en = val;
        if (lang === "nl") AMENITY_LABELS[akey].nl = val;
      }
    });
  } catch (_) { /* sheets may be unreachable */ }
}

function _ensureSettingsLoaded() {
  if (!_settingsPromise) _settingsPromise = fetchSettings();
  return _settingsPromise;
}

function setupBanner() {
  updateBannerText();
  _ensureSettingsLoaded();
  setInterval(fetchSettings, 5 * 60 * 1000); // poll every 5 min
}

// Detect touch-primary devices — hover card is skipped on these
const IS_TOUCH_DEVICE = window.matchMedia("(hover: none), (pointer: coarse)").matches;

// ── Hover card ─────────────────────────────────────────────────────────────
const HC = (() => {
  let el;
  function init() { el = document.getElementById("hover-card"); }
  function _pos(x, y) {
    const W = window.innerWidth, H = window.innerHeight;
    const cw = 240, ch = 76;
    let left = x + 14, top = y - 40;
    if (left + cw > W - 8) left = x - cw - 14;
    if (left < 8) left = 8;
    if (top < 58) top = y + 14;
    if (top + ch > H - 8) top = y - ch - 14;
    el.style.left = left + "px";
    el.style.top  = top  + "px";
  }
  function show(clientX, clientY, name, sub, color) {
    el.innerHTML = "";
    const bar = document.createElement("div"); bar.className = "hc-accent"; bar.style.background = color;
    const nm  = document.createElement("div"); nm.className  = "hc-name";  nm.textContent = name;
    const sb  = document.createElement("div"); sb.className  = "hc-sub";   sb.textContent = sub;
    el.append(bar, nm, sb);
    _pos(clientX, clientY);
    el.classList.add("visible");
  }
  function hide()  { el.classList.remove("visible"); }
  function move(x, y) { if (el.classList.contains("visible")) _pos(x, y); }
  return { init, show, hide, move };
})();

// ── Geo helpers ────────────────────────────────────────────────────────────
function haversine(la1, lo1, la2, lo2) {
  const R = 6371, rad = d => (d * Math.PI) / 180;
  const a = Math.sin(rad(la2 - la1) / 2) ** 2 +
            Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(rad(lo2 - lo1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function fmtDist(km) {
  return km < 0.1 ? Math.round(km * 1000) + " m"
       : km < 1   ? (km * 1000).toFixed(0) + " m"
                  : km.toFixed(1) + " km";
}
function polygonCentroid(coordinates) {
  const ring = coordinates[0];
  return [ring.reduce((s,c) => s+c[1],0)/ring.length, ring.reduce((s,c) => s+c[0],0)/ring.length];
}

// ── Opening hours ──────────────────────────────────────────────────────────
function parseMinutes(str) { const [h,m] = str.split(":").map(Number); return h*60+m; }

function getOpenStatus(hours) {
  if (!hours || !Array.isArray(hours)) return { status: "unknown" };
  const now = new Date(), dow = (now.getDay()+6)%7;
  const today = hours[dow], nowM = now.getHours()*60+now.getMinutes();
  if (!today) {
    let nextDay = null;
    for (let i=1;i<=7;i++) { const d=(dow+i)%7; if(hours[d]){nextDay=d;break;} }
    return { status:"closed", today:null, nextDay };
  }
  const [openStr,closeStr] = today.split("-");
  const openM = parseMinutes(openStr), closeM = parseMinutes(closeStr);
  if (nowM < openM) return { status:"closed", opensAt:openStr, today };
  if (nowM >= closeM) {
    let nextDay = null;
    for (let i=1;i<=7;i++) { const d=(dow+i)%7; if(hours[d]){nextDay=d;break;} }
    return { status:"closed", today, nextDay };
  }
  return { status:"open", closesAt:closeStr, today };
}

function renderHoursBlock(hours) {
  const status   = getOpenStatus(hours);
  const dayShort = state.lang === "nl" ? DAY_SHORT_NL : DAY_SHORT_EN;
  const dayLong  = state.lang === "nl" ? DAY_LONG_NL  : DAY_LONG_EN;
  const closed   = state.lang === "nl" ? "Gesloten" : "Closed";
  const now      = new Date(), todayIdx = (now.getDay()+6)%7;
  const wrap = document.createElement("div"); wrap.className = "hours-wrap";
  if (status.status !== "unknown") {
    const badge = document.createElement("div");
    badge.className = "hours-status hours-status--" + status.status;
    const dot = document.createElement("span"); dot.className = "hours-dot";
    const msg = document.createElement("span");
    if (status.status === "open") {
      msg.innerHTML = `<strong>${t("open_now")}</strong> &mdash; ${t("closes_at")} ${status.closesAt}`;
    } else {
      let text = t("closed_now");
      if (status.opensAt) text += ` &mdash; ${t("opens_at")} ${status.opensAt}`;
      else if (status.nextDay != null) text += ` &mdash; ${t("opens_on")} ${dayLong[status.nextDay]} ${hours[status.nextDay].split("-")[0]}`;
      msg.innerHTML = text;
    }
    badge.append(dot, msg);
    wrap.appendChild(badge);
  } else {
    const badge = document.createElement("div"); badge.className = "hours-status hours-status--unknown";
    badge.textContent = t("hours_unknown");
    wrap.appendChild(badge);
  }
  if (hours && Array.isArray(hours)) {
    const table = document.createElement("div"); table.className = "hours-table";
    hours.forEach((slot, i) => {
      const row  = document.createElement("div");
      row.className = "hours-row" + (i===todayIdx ? " hours-row--today" : "");
      const day  = document.createElement("span"); day.className = "hours-day"; day.textContent = dayShort[i];
      const time = document.createElement("span"); time.className = "hours-time" + (!slot ? " hours-time--closed" : "");
      time.textContent = slot ? slot.replace("-"," – ") : closed;
      row.append(day, time); table.appendChild(row);
    });
    wrap.appendChild(table);
  }
  return wrap;
}

// ── Suppress heat pulse during layer rebuild (prevents animation restart flash) ──
function _withoutHeatPulse(fn) {
  const mapSection = document.getElementById("map-section");
  const wasActive = mapSection?.classList.contains("heat-active");
  if (wasActive) mapSection.classList.remove("heat-active");
  fn();
  if (wasActive) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (mapSection) mapSection.classList.add("heat-active");
    }));
  }
}

// ── Map init ───────────────────────────────────────────────────────────────
function initMap() {
  state.map = L.map("map", { zoomControl: false }).setView([52.368, 4.827], 13);

  // Custom panes: hvi (choropleth) < parks < points
  state.map.createPane("hviPane");
  state.map.getPane("hviPane").style.zIndex = 320;
  state.map.createPane("parksPane");
  state.map.getPane("parksPane").style.zIndex = 350;
  state.map.createPane("pointsPane");
  state.map.getPane("pointsPane").style.zIndex = 650;

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd", maxZoom: 19,
  }).addTo(state.map);
  L.control.zoom({ position: "topright" }).addTo(state.map);
  state.map.on("click", () => { closeSidebarMobile(); });
  state.map.on("mousemove", e => HC.move(e.originalEvent.clientX, e.originalEvent.clientY));
  // shade tiles are prefetched at load — no viewport tracking needed

  // Resize whenever the map container changes size (orientation change, sidebar toggle, etc.)
  if (typeof ResizeObserver !== "undefined") {
    const mapEl = document.getElementById("map");
    const ro = new ResizeObserver(() => { if (state.map) state.map.invalidateSize(); });
    ro.observe(mapEl);
  }

  // Ensure tiles render after initial layout is painted
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      state.map.invalidateSize();
    });
  });
}

// ── CSV utilities (replaces Python backend parser) ─────────────────────────

/** Parse a CSV string into an array of {header: value} objects. */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM
  const rows = [];
  let inQuotes = false, field = "", fields = [], i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(field); field = "";
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      fields.push(field); field = "";
      if (ch === '\r' && text[i + 1] === '\n') i++;
      rows.push(fields); fields = [];
    } else {
      field += ch;
    }
    i++;
  }
  if (field || fields.length) { fields.push(field); rows.push(fields); }
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(f => f.trim()))
    .map(r => Object.fromEntries(headers.map((h, j) => [h, (r[j] || "").trim()])));
}

function csvToBool(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text || ["unknown","onbekend","n/a","na","null","none","-"].includes(text)) return null;
  if (["yes","y","true","1","ja","j"].includes(text)) return true;
  if (["no","n","false","0","nee"].includes(text)) return false;
  return true;
}

function csvToFloat(value) {
  const text = String(value || "").trim().replace(",", ".");
  if (!text) return null;
  const n = parseFloat(text);
  return isNaN(n) ? null : n;
}

function csvSlugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const _CSV_DAY_COLS      = ["hours_mon","hours_tue","hours_wed","hours_thu","hours_fri","hours_sat","hours_sun"];
const _CSV_HEAT_DAY_COLS = ["heat_mon","heat_tue","heat_wed","heat_thu","heat_fri","heat_sat","heat_sun"];

function _normaliseSlot(raw) {
  const text = (raw || "").trim().replace(/\s/g, "").replace("–", "-");
  const match = text.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!match) return null;
  const pad = p => { const [h, m] = p.split(":"); return `${String(parseInt(h)).padStart(2, "0")}:${m}`; };
  return `${pad(match[1])}-${pad(match[2])}`;
}

function _parseHoursFromRow(row, cols) {
  const daycols = cols || _CSV_DAY_COLS;
  const slots = daycols.map(col => _normaliseSlot(row[col] || ""));
  return slots.every(s => s === null) ? null : slots;
}

/**
 * Convert a Google Drive sharing URL to a directly embeddable image URL.
 * Partners can paste any of these into the photo_url column:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/uc?id=FILE_ID
 *   https://drive.google.com/open?id=FILE_ID  (tab-shortcut link from Drive)
 * Other URLs (direct image links, local paths) pass through unchanged.
 */
function _resolvePhotoUrl(url) {
  if (!url) return url;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (fileMatch) return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*[?&]id=([^&]+)/);
  if (ucMatch) return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  const openMatch = url.match(/drive\.google\.com\/open\?.*[?&]id=([^&]+)/);
  if (openMatch) return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  return url;
}

/** Convert one CSV row into a GeoJSON Feature (returns null if row is invalid). */
function _rowToFeature(row) {
  const name = (row.name || "").trim();
  if (!name) return null;
  const lat = csvToFloat(row.latitude || row.lat);
  const lon = csvToFloat(row.longitude || row.lon || row.lng);
  if (lat === null || lon === null) return null;
  const type = (row.type || "").trim();
  // Auto-register any new category type found in data
  _ensureCategoryDef(type);
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {
      id:               (row.id || "").trim() || csvSlugify(name),
      name,
      type,
      municipality:     (row.municipality || "").trim() || "Amsterdam",
      district:         (row.district   || row.stadsdeel || "").trim(),
      neighborhood:     (row.neighborhood || row.wijk    || "").trim(),
      address:          (row.address    || "").trim(),
      website_url:      (row.website_url || "").trim(),
      photo_url:        _resolvePhotoUrl((row.photo_url || "").trim()),
      hours:            _parseHoursFromRow(row),
      hours_heat:       _parseHoursFromRow(row, _CSV_HEAT_DAY_COLS),
      hours_note:       (row.hours_note || row.note        || "").trim(),
      notes:            (row.notes      || row.description  || "").trim(),
      active:           row.active?.trim() ? csvToBool(row.active) : true,
      ac:               csvToBool(row.ac    || row.airco),
      seating:          csvToBool(row.seating),
      toilets:          csvToBool(row.toilets),
      free_water:       csvToBool(row.free_water),
      free_fruit:       csvToBool(row.free_fruit),
      food_to_buy:      csvToBool(row.food_to_buy),
      own_food_allowed: csvToBool(row.own_food_allowed || row.own_food_ok),
      supervisor:       csvToBool(row.supervisor),
      wheelchair:       csvToBool(row.wheelchair || row.accessible),
      games:            csvToBool(row.games),
      pets_allowed:     csvToBool(row.pets_allowed || row.pets_ok),
    },
  };
}

async function _loadKoelteplekkenFromSheets(def) {
  if (!_sheetsReady()) {
    console.warn("Koeltekaart: fill in SHEETS_CONFIG (publishedId + gids) in app.js");
    buildKoelteplekkenLayer(def, { type: "FeatureCollection", features: [] });
    return;
  }
  await _ensureSettingsLoaded(); // labels/translations must be ready before building markers
  const r = await fetch(_sheetsUrl(SHEETS_CONFIG.locationsGid));
  if (!r.ok) throw new Error(`Sheets locations fetch failed: ${r.status}`);
  const features = parseCsv(await r.text()).map(_rowToFeature).filter(Boolean);
  buildKoelteplekkenLayer(def, { type: "FeatureCollection", features });
}

// ── HVI choropleth layer ───────────────────────────────────────────────────
const HVI_TIER_COLORS = ["#2166AC", "#92C5DE", "#FFFFBF", "#F4A582", "#CA0020"];

function _hviTierColor(tier) {
  const t = parseInt(tier);
  if (!t || t < 1 || t > 5) return "#D1D5DB";
  return HVI_TIER_COLORS[t - 1];
}

function buildHviLayer(def, data) {
  state.features.hvi = data.features || [];
  _hviStats = null; // invalidate cache
  _renderHviLayer(def, state.features.hvi);
}

function _renderHviLayer(def, features) {
  if (state.layers.hvi) state.map.removeLayer(state.layers.hvi);
  const fc = { type: "FeatureCollection", features };
  state.layers.hvi = L.geoJSON(fc, {
    pane: "hviPane",
    style: f => {
      const tier = f.properties?.hvi_tier;
      const color = _hviTierColor(tier);
      const hasData = tier && tier !== "nan" && tier !== "None";
      return { fillColor: color, fillOpacity: hasData ? 0.65 : 0.12, color: "#fff", weight: 0.5, opacity: 0.5 };
    },
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const name = p.buurtnaam || "Buurt";
      const score = p.hvi != null ? "HVI: " + (p.hvi * 100).toFixed(0) + " / 100" : "Geen data";
      if (!IS_TOUCH_DEVICE) {
        l.on("mouseover", e => {
          l.setStyle({ fillOpacity: 0.85, weight: 1.5, color: "#333" });
          HC.show(e.originalEvent.clientX, e.originalEvent.clientY, name, score, _hviTierColor(p.hvi_tier));
        });
        l.on("mouseout", () => { state.layers.hvi.resetStyle(l); HC.hide(); });
        l.on("mousemove", e => HC.move(e.originalEvent.clientX, e.originalEvent.clientY));
      }
      l.on("click", e => { HC.hide(); L.DomEvent.stopPropagation(e); openDetailPanel(f, renderHviDetailContent); });
    },
  });
  if (state.on.hvi) state.layers.hvi.addTo(state.map);
}

// build temperature
const TEMP_MIN = 10;
const TEMP_MAX = 42;

function getTempColor(temp) {

  // Normalize to 0-1
  const t = Math.max(
    0,
    Math.min(
      1,
      (temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)
    )
  );

  // Blue → Red
  const hue = 240 - t * 240;

  return `hsl(${hue}, 90%, 50%)`;
}

function buildTemperatureLayer(def, data) {
  state.features.temperature = data.features || [];
  _renderTemperatureLayer(def, state.features.temperature);
}

function _renderTemperatureLayer(def, features) {

  if (state.layers.temperature) {
    state.map.removeLayer(state.layers.temperature);
  }

  const fc = {
    type: "FeatureCollection",
    features
  };

  state.layers.temperature = L.geoJSON(fc, {
    pane: "hviPane",

    style: f => {

      const temp = Number(
        f.properties?.temp_mean
      );

      return {
        fillColor: getTempColor(temp),
        fillOpacity: 0.65,
        color: "#ffffff",
        weight: 0.5,
        opacity: 0.5
      };
    },

    onEachFeature: (f, l) => {

      const p = f.properties || {};

      const name =
        p.buurtnaam || "Buurt";

      const temp =
        Number(p.temp_mean);

      if (!IS_TOUCH_DEVICE) {

        l.on("mouseover", e => {

          l.setStyle({
            fillOpacity: 0.85,
            weight: 1.5,
            color: "#333"
          });

          HC.show(
            e.originalEvent.clientX,
            e.originalEvent.clientY,
            name,
            `${temp.toFixed(1)} °C`,
            getTempColor(temp)
          );
        });

        l.on("mouseout", () => {
          state.layers.temperature.resetStyle(l);
          HC.hide();
        });

        l.on("mousemove", e =>
          HC.move(
            e.originalEvent.clientX,
            e.originalEvent.clientY
          )
        );
      }
    }
  });

  if (state.on.temperature) {
    state.layers.temperature.addTo(state.map);
  }
}


// ── HVI analytics — statistics, charts, spatial helpers ───────────────────
let _hviStats = null;

function _getHviStats() {
  if (_hviStats) return _hviStats;
  const feats = (state.features.hvi || []).map(f => f.properties).filter(p => p.hvi != null);
  if (!feats.length) return null;
  const sorted = feats.map(p => p.hvi).sort((a, b) => a - b);
  const median = arr => { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; };
  const pct = q => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(q * sorted.length)))];
  _hviStats = {
    total:      feats.length,
    hvi:        median(feats.map(p => p.hvi)),
    hi_norm:    median(feats.filter(p => p.hi_norm != null).map(p => p.hi_norm)),
    svi:        median(feats.filter(p => p.svi_pca != null).map(p => p.svi_pca)),
    access:     median(feats.filter(p => p.cooling_access != null).map(p => p.cooling_access)),
    sortedDesc: [...sorted].reverse(),
    allHvi:     sorted,
    thresholds: [pct(0.2), pct(0.4), pct(0.6), pct(0.8)],
  };
  return _hviStats;
}

function _hviRank(hvi) {
  const s = _getHviStats(); if (!s) return null;
  return s.sortedDesc.findIndex(v => v <= hvi) + 1;
}

function _hviGetTier(hvi) {
  const s = _getHviStats(); if (!s) return null;
  for (let i = 0; i < 4; i++) { if (hvi <= s.thresholds[i]) return i + 1; }
  return 5;
}

// Compute polygon centroid for distance calculations
function _featureCentroid(feature) {
  const geom = feature.geometry; if (!geom) return null;
  let ring;
  if (geom.type === "Polygon") ring = geom.coordinates[0];
  else if (geom.type === "MultiPolygon") ring = geom.coordinates[0][0];
  else return null;
  return { lat: ring.reduce((s,c)=>s+c[1],0)/ring.length, lon: ring.reduce((s,c)=>s+c[0],0)/ring.length };
}

// Nearest koelteplek from buurt centroid
function _nearestKoelteplek(centroid) {
  if (!centroid || !state.features.koelteplekken?.length) return null;
  let best = null, bestDist = Infinity;
  state.features.koelteplekken.forEach(f => {
    if (f.geometry?.type !== "Point") return;
    const [lon, lat] = f.geometry.coordinates;
    const d = haversine(centroid.lat, centroid.lon, lat, lon);
    if (d < bestDist) { bestDist = d; best = { name: f.properties?.name || "Koelteplek", dist: d }; }
  });
  return best;
}

// Top-N most similar buurten by Euclidean distance in [hi_norm, svi_pca, cooling_access]
function _similarBuurten(p, n = 5) {
  return (state.features.hvi || [])
    .map(f => f.properties)
    .filter(q => q.buurtnaam !== p.buurtnaam && q.hi_norm != null && q.svi_pca != null && q.cooling_access != null)
    .map(q => ({
      buurtnaam: q.buurtnaam,
      hvi: q.hvi,
      hvi_tier: q.hvi_tier,
      dist: Math.sqrt((q.hi_norm-p.hi_norm)**2 + (q.svi_pca-p.svi_pca)**2 + (q.cooling_access-p.cooling_access)**2),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

// What-if: how much does each intervention shift the HVI and tier?
function _whatIf(p, stats) {
  const W_H = 0.40, W_S = 0.40, W_A = 0.20;
  const hvi = (h, s, a) => W_H * h + W_S * s + W_A * (1 - a);
  const cur = hvi(p.hi_norm ?? stats.hi_norm, p.svi_pca ?? stats.svi, p.cooling_access ?? stats.access);
  return [
    { key: "access",  label_nl: "Koeltoegang → stadsmed.",        label_en: "Cooling access → median",     newHvi: hvi(p.hi_norm, p.svi_pca, Math.max(p.cooling_access, stats.access)) },
    { key: "social",  label_nl: "Sociale kwetsb. → stadsmed.",    label_en: "Social vulnerability → med.", newHvi: hvi(p.hi_norm, Math.min(p.svi_pca, stats.svi), p.cooling_access) },
    { key: "heat",    label_nl: "Hitteblootstelling → stadsmed.", label_en: "Heat exposure → median",      newHvi: hvi(Math.min(p.hi_norm, stats.hi_norm), p.svi_pca, p.cooling_access) },
  ].map(s => ({
    ...s,
    delta:    Math.round((s.newHvi - cur) * 100),
    newTier:  _hviGetTier(s.newHvi),
    curTier:  _hviGetTier(cur),
  }));
}

// Dominant driver: which component contributes most above city median
function _dominantDriver(p, stats, isNL) {
  const excess = [
    { label: isNL ? "Hitteblootstelling" : "Heat exposure",        val: Math.max(0, (p.hi_norm ?? 0) - stats.hi_norm) * 0.40 },
    { label: isNL ? "Sociale kwetsbaarheid" : "Social vulnerability", val: Math.max(0, (p.svi_pca ?? 0) - stats.svi) * 0.40 },
    { label: isNL ? "Slechte koeltoegang" : "Poor cooling access",  val: Math.max(0, stats.access - (p.cooling_access ?? 0)) * 0.20 },
  ].sort((a, b) => b.val - a.val);
  return excess[0].val > 0 ? excess[0].label : null;
}

// ── Chart.js helpers (destroy before recreate to avoid canvas reuse error) ─
const _charts = {};
function _destroyChart(id) { if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; } }

function _renderRadarChart(canvasId, buurtVals, medianVals, isNL) {
  _destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx || typeof Chart === "undefined") return;
  const labels = isNL
    ? ["Hitteblootstelling", "Sociale kwetsbaarheid", "Koelplaatsentekort"]
    : ["Heat exposure", "Social vulnerability", "Cooling gap"];
  _charts[canvasId] = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        { label: isNL ? "Deze buurt" : "This buurt", data: buurtVals,  borderColor: "#CA0020", backgroundColor: "rgba(202,0,32,0.15)",   borderWidth: 2, pointBackgroundColor: "#CA0020", pointRadius: 3 },
        { label: isNL ? "Stadsmed." : "City median", data: medianVals, borderColor: "#004699", backgroundColor: "rgba(0,70,153,0.07)",   borderWidth: 1.5, borderDash: [4,3], pointBackgroundColor: "#004699", pointRadius: 2 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 10 }, padding: 8, boxWidth: 10 } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.r.toFixed(0)}/100` } },
      },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 25, font: { size: 8 }, color: "#9CA3AF", backdropColor: "transparent" },
          grid: { color: "rgba(0,0,0,0.07)" },
          angleLines: { color: "rgba(0,0,0,0.07)" },
          pointLabels: { font: { size: 10 }, color: "#374151" },
        },
      },
    },
  });
}

function _renderDistributionChart(canvasId, allHvi, thisHvi, isNL) {
  _destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx || typeof Chart === "undefined") return;
  const bins = Array(10).fill(0);
  allHvi.forEach(v => { bins[Math.min(9, Math.floor(v * 10))]++; });
  const thisBin = Math.min(9, Math.floor(thisHvi * 10));
  const labels = ["0–10","10–20","20–30","30–40","40–50","50–60","60–70","70–80","80–90","90–100"];
  _charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: bins,
        backgroundColor: bins.map((_, i) => i === thisBin ? "#CA0020" : "rgba(0,70,153,0.2)"),
        borderRadius: 3, borderWidth: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          title: c => `HVI ${c[0].label}`,
          label: c => `${c.parsed.y} ${isNL ? "buurten" : "neighbourhoods"}`,
        }},
      },
      scales: {
        x: { ticks: { font: { size: 8 }, maxRotation: 45 }, grid: { display: false } },
        y: { ticks: { font: { size: 8 } }, grid: { color: "rgba(0,0,0,0.06)" },
             title: { display: true, text: isNL ? "Buurten" : "Neighbourhoods", font: { size: 8 }, color: "#9CA3AF" } },
      },
    },
  });
}

// ── HVI dashboard ──────────────────────────────────────────────────────────
function renderHviDetailContent(feature, container) {
  const p = feature.properties || {};
  const tier = parseInt(p.hvi_tier) || null;
  const color = _hviTierColor(p.hvi_tier);
  const isNL = state.lang === "nl";
  const stats = _getHviStats();

  const body = document.createElement("div"); body.className = "detail-panel-body";
  const dash = document.createElement("div"); dash.className = "hvi-dash";

  // ── Header ──
  const hdr = document.createElement("div"); hdr.className = "hvi-dash-hdr";
  const catLbl = document.createElement("div"); catLbl.className = "dp-cat";
  catLbl.textContent = isNL ? "Hittekwetsbaarheidsindex" : "Heat Vulnerability Index";
  const nameEl = document.createElement("div"); nameEl.className = "detail-panel-name";
  nameEl.textContent = p.buurtnaam || "Buurt";
  hdr.append(catLbl, nameEl);
  dash.appendChild(hdr);

  if (!tier || p.hvi == null) {
    const noData = document.createElement("p"); noData.className = "hvi-no-data";
    noData.textContent = isNL ? "Geen data beschikbaar voor deze buurt." : "No data available for this neighbourhood.";
    dash.appendChild(noData);
    body.appendChild(dash); container.appendChild(body); return;
  }

  const tierNames = isNL
    ? ["Laag", "Laag-gemiddeld", "Gemiddeld", "Hoog-gemiddeld", "Hoog"]
    : ["Low", "Low-medium", "Medium", "High-medium", "High"];

  // ── Tier badge ──
  const tierBadge = document.createElement("div"); tierBadge.className = "hvi-tier-badge";
  tierBadge.style.setProperty("--tier-color", color);
  const tierDot = document.createElement("span"); tierDot.className = "hvi-tier-dot";
  const tierTxt = document.createElement("span");
  tierTxt.textContent = `Tier ${tier} — ${tierNames[tier - 1]}`;
  tierBadge.append(tierDot, tierTxt);
  dash.appendChild(tierBadge);

  // ── Score + rank ──
  const rank = stats ? _hviRank(p.hvi) : null;
  const scoreRow = document.createElement("div"); scoreRow.className = "hvi-score-row";
  const scoreBig = document.createElement("div"); scoreBig.className = "hvi-score-big";
  scoreBig.innerHTML = `<span class="hvi-score-num">${Math.round(p.hvi * 100)}</span><span class="hvi-score-denom">/100</span>`;
  const rankEl = document.createElement("div"); rankEl.className = "hvi-rank";
  if (rank && stats) rankEl.innerHTML = `<span class="hvi-rank-num">#${rank}</span> ${isNL ? "van" : "of"} ${stats.total}`;
  scoreRow.append(scoreBig, rankEl);
  dash.appendChild(scoreRow);
  dash.appendChild(_makeBar(p.hvi, color, null));

  // ── Key findings ──
  const centroid = _featureCentroid(feature);
  const nearest  = _nearestKoelteplek(centroid);
  const driver   = stats ? _dominantDriver(p, stats, isNL) : null;
  const findings = [];
  if (driver) findings.push({ icon: "⚠", text: (isNL ? "Belangrijkste factor: " : "Main driver: ") + driver });
  if (nearest) findings.push({ icon: "📍", text: (isNL ? "Dichtstbijzijnde koelteplek: " : "Nearest cooling spot: ") + nearest.name + " — " + fmtDist(nearest.dist) });
  if (p.lisa_cluster && !["Not significant","Not computed"].includes(p.lisa_cluster))
    findings.push({ icon: "🔴", text: "LISA: " + p.lisa_cluster });

  if (findings.length) {
    const findSec = document.createElement("div"); findSec.className = "hvi-section";
    const findTitle = document.createElement("div"); findTitle.className = "hvi-section-title";
    findTitle.textContent = isNL ? "Kernbevindingen" : "Key findings";
    findSec.appendChild(findTitle);
    findings.forEach(f => {
      const row = document.createElement("div"); row.className = "hvi-finding";
      row.innerHTML = `<span class="hvi-finding-icon">${f.icon}</span><span>${f.text}</span>`;
      findSec.appendChild(row);
    });
    if (p.quadrant) {
      const qdiv = document.createElement("div"); qdiv.className = "hvi-quadrant";
      qdiv.textContent = p.quadrant;
      findSec.appendChild(qdiv);
    }
    dash.appendChild(findSec);
  }

  // ── Charts (only rendered if city-wide stats are available) ──
  let radarId, distId;
  if (stats) {
    const radarSec = document.createElement("div"); radarSec.className = "hvi-section";
    const radarTitle = document.createElement("div"); radarTitle.className = "hvi-section-title";
    radarTitle.textContent = isNL ? "Componentenprofiel" : "Component profile";
    radarId = "hvi-radar-" + Date.now();
    const radarCanvas = document.createElement("canvas");
    radarCanvas.id = radarId; radarCanvas.className = "hvi-chart-canvas";
    radarSec.append(radarTitle, radarCanvas);
    dash.appendChild(radarSec);

    const distSec = document.createElement("div"); distSec.className = "hvi-section";
    const distTitle = document.createElement("div"); distTitle.className = "hvi-section-title";
    distTitle.textContent = isNL ? "Verdeling over de stad (rood = deze buurt)" : "City distribution (red = this buurt)";
    distId = "hvi-dist-" + Date.now();
    const distCanvas = document.createElement("canvas");
    distCanvas.id = distId; distCanvas.className = "hvi-chart-canvas hvi-chart-dist";
    distSec.append(distTitle, distCanvas);
    dash.appendChild(distSec);
  }

  // ── What-if analysis ──
  if (stats) {
    const whatIf = _whatIf(p, stats);
    const wiSec = document.createElement("div"); wiSec.className = "hvi-section";
    const wiTitle = document.createElement("div"); wiTitle.className = "hvi-section-title";
    wiTitle.textContent = isNL ? "Wat als...? (interventie-effect)" : "What if...? (intervention impact)";
    wiSec.appendChild(wiTitle);
    whatIf.forEach(s => {
      const row = document.createElement("div"); row.className = "hvi-wi-row";
      const lbl = document.createElement("span"); lbl.className = "hvi-wi-label";
      lbl.textContent = isNL ? s.label_nl : s.label_en;
      const right = document.createElement("div"); right.className = "hvi-wi-right";
      const pts = document.createElement("span");
      pts.className = "hvi-wi-pts hvi-wi-pts--" + (s.delta <= 0 ? "better" : "worse");
      pts.textContent = (s.delta <= 0 ? "−" : "+") + Math.abs(s.delta) + " pts";
      right.appendChild(pts);
      if (s.newTier < s.curTier) {
        const tierChg = document.createElement("span"); tierChg.className = "hvi-wi-tier";
        tierChg.textContent = `Tier ${s.curTier} → ${s.newTier}`;
        right.appendChild(tierChg);
      }
      row.append(lbl, right);
      wiSec.appendChild(row);
    });
    dash.appendChild(wiSec);
  }

  // ── Similar buurten ──
  const similar = _similarBuurten(p);
  if (similar.length) {
    const simSec = document.createElement("div"); simSec.className = "hvi-section";
    const simTitle = document.createElement("div"); simTitle.className = "hvi-section-title";
    simTitle.textContent = isNL ? "Vergelijkbare buurten" : "Similar neighbourhoods";
    simSec.appendChild(simTitle);
    similar.forEach(s => {
      const row = document.createElement("div"); row.className = "hvi-sim-row";
      const dot = document.createElement("span"); dot.className = "hvi-tier-dot";
      dot.style.cssText = `background:${_hviTierColor(s.hvi_tier)};flex-shrink:0;`;
      const name = document.createElement("span"); name.className = "hvi-sim-name"; name.textContent = s.buurtnaam;
      const score = document.createElement("span"); score.className = "hvi-sim-score";
      score.textContent = Math.round((s.hvi || 0) * 100) + "/100";
      row.append(dot, name, score);
      simSec.appendChild(row);
    });
    dash.appendChild(simSec);
  }

  body.appendChild(dash);
  container.appendChild(body);

  // Render charts after DOM is inserted — only if city stats are available
  if (stats) {
    requestAnimationFrame(() => {
      const buurtVals  = [Math.round((p.hi_norm || 0) * 100), Math.round((p.svi_pca || 0) * 100), Math.round((1 - (p.cooling_access || 0)) * 100)];
      const medianVals = [Math.round(stats.hi_norm * 100), Math.round(stats.svi * 100), Math.round((1 - stats.access) * 100)];
      _renderRadarChart(radarId, buurtVals, medianVals, isNL);
      _renderDistributionChart(distId, stats.allHvi, p.hvi, isNL);
    });
  }
}

function _makeBar(value, color, labelNum) {
  const wrap = document.createElement("div"); wrap.className = "hvi-bar-wrap";
  const track = document.createElement("div"); track.className = "hvi-bar-track";
  const fill = document.createElement("div"); fill.className = "hvi-bar-fill";
  fill.style.width = Math.round((value || 0) * 100) + "%";
  fill.style.background = color;
  track.appendChild(fill); wrap.appendChild(track);
  if (labelNum != null) {
    const num = document.createElement("span"); num.className = "hvi-bar-num";
    num.textContent = labelNum;
    wrap.appendChild(num);
  }
  return wrap;
}

// ── Layer loading ──────────────────────────────────────────────────────────
function loadAllLayers() {
  LAYER_DEFS.forEach(def => {
    setLoading(true);
    if (def.cat === "koelteplekken") {
      _loadKoelteplekkenFromSheets(def)
        .catch(e => console.error("koelteplekken", e))
        .finally(() => setLoading(false));
    } else if (def.cat === "shade") {
      setLoading(false); // loaded on-demand when toggled on
    } else if (def.type === "choropleth") {
      fetch(def.src)
        .then(r => r.json())
        .then(data => buildHviLayer(def, data))
        .catch(e => console.error(def.cat, e))
        .finally(() => setLoading(false));
    } else if (def.type === "temperature") {
        fetch(def.src)
          .then(r => r.json())
          .then(data => buildTemperatureLayer(def, data))
          .catch(e => console.error(def.cat, e))
          .finally(() => setLoading(false));
    } else {
      fetch(def.src)
        .then(r => r.json())
        .then(data => buildStaticLayer(def, data))
        .catch(e => console.error(def.cat, e))
        .finally(() => setLoading(false));
    }
  });
}

// ── Koelteplekken layer ────────────────────────────────────────────────────
function koelteplekPassesFilters(p) {
  if (state.activeCategories.size > 0 && !state.activeCategories.has(p.type)) return false;
  for (const def of AMENITY_DEFS) {
    if (def.filterable && state.filters[def.key] && p[def.key] !== true) return false;
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    if (!(p.name||"").toLowerCase().includes(q) && !(p.neighborhood||"").toLowerCase().includes(q)) return false;
  }
  return true;
}

function buildKoelteplekkenLayer(def, data) {
  const features = data.features || [];
  state.features.koelteplekken = features;
  animateCount("koelteplekken", features.length);
  initAmenities(features);
  _renderKoelteplekkenLayer(def, features);
  refreshListIfActive();
  setupCategoryFilter(); // rebuild chips so dynamically-added types appear
  renderMobileFilterBar();
}

function _renderKoelteplekkenLayer(def, features) {
  _withoutHeatPulse(() => _renderKoelteplekkenLayerInner(def, features));
}
function _renderKoelteplekkenLayerInner(def, features) {
  HC.hide(); // dismiss any lingering hover card before swapping layers
  if (state.layers.koelteplekken) state.map.removeLayer(state.layers.koelteplekken);
  const filtered = features.filter(f => koelteplekPassesFilters(f.properties||{}));
  const fc = { type:"FeatureCollection", features: filtered };
  state.layers.koelteplekken = L.geoJSON(fc, {
    pointToLayer: (_f, ll) => {
      const isActive = _f.properties?.active !== false;
      const typeColor = getCategoryColor(_f.properties?.type);
      const col = isActive ? typeColor : "#9CA3AF";
      const cls = isActive ? "koelte-marker" : "koelte-marker koelte-marker--inactive";
      const icon = L.divIcon({
        className: "",
        html: `<div class="${cls}" style="--mc:${col}"><div class="koelte-marker-dot"><svg class="koelte-marker-icon" width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><line x1="7" y1="1" x2="7" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="7" x2="13" y2="7" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="2.9" y1="2.9" x2="11.1" y2="11.1" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="11.1" y1="2.9" x2="2.9" y2="11.1" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div></div>`,
        iconSize:    [28, 28],
        iconAnchor:  [14, 14],
        popupAnchor: [0, -14],
      });
      return L.marker(ll, { icon });
    },
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const isActive = p.active !== false;
      const col = isActive ? getCategoryColor(p.type) : "#9CA3AF";
      const sub = [p.neighborhood, p.district].filter(Boolean).join(" · ");
      // Hover card: skip entirely on touch devices — only show for true mouse hover
      if (!IS_TOUCH_DEVICE) {
        l.on("mouseover", e => HC.show(e.originalEvent.clientX, e.originalEvent.clientY, p.name, sub, col));
        l.on("mouseout",  () => HC.hide());
        l.on("mousemove", e => HC.move(e.originalEvent.clientX, e.originalEvent.clientY));
      }
      l.on("click", e => {
        HC.hide(); // always dismiss hover card on click (handles touch-tap case)
        L.DomEvent.stopPropagation(e);
        showKoelteplaatsDetail(f);
      });
    },
  });
  if (state.on.koelteplekken) state.layers.koelteplekken.addTo(state.map);
  const countEl = document.getElementById("cnt-koelteplekken");
  if (countEl) countEl.textContent = filtered.length.toLocaleString();
}

function rebuildKoelteplekkenLayer() {
  const def = LAYER_DEFS.find(d => d.cat === "koelteplekken");
  _renderKoelteplekkenLayer(def, state.features.koelteplekken);
  refreshListIfActive();
}

function tapDisplayName(p) {
  const raw = p?.display_name || p?.["Dichtstbijzijnde adres binnen 100 meter"] || "";
  const value = String(raw).trim();

  const badNames = new Set([
    "",
    "None",
    "null",
    "Geen adres binnen 100 m.",
  ]);

  if (badNames.has(value)) {
    return state.lang === "nl" ? "Drinkwaterkraan" : "Water fountain";
  }

  return value;
}


// ── Static layers ──────────────────────────────────────────────────────────
function buildStaticLayer(def, data) {
  const features = data.features || [];
  state.features[def.cat] = features;
  animateCount(def.cat, features.length);

  // Swimming pools get their own render path (sub-type filter chips + layer)
  if (def.cat === "swimming_pools") {
    rebuildSwimmingPoolChips();
    _renderSwimmingPoolsLayer(def, features);
    refreshListIfActive();
    return;
  }

  // Shade overlay gets its own time-aware renderer
  if (def.cat === "shade") {
    _renderShadeLayer();
    return;
  }

  const fc = { type:"FeatureCollection", features };
  if (def.type === "polygon") {
    const parkGroups = {};
    state.layers[def.cat] = L.geoJSON(fc, {
      pane: "parksPane",
      style: { color:def.color, weight:1.5, opacity:0.85, fillColor:def.color, fillOpacity:0.12 },
      onEachFeature: (f,l) => {
        const name=f.properties?.Naam||"Park", sub=(f.properties?.Stadsdeel||"")+" · Park";
        if (!parkGroups[name]) parkGroups[name]=[];
        parkGroups[name].push(l);
        l.on("mouseover",e=>{parkGroups[name].forEach(pl=>pl.setStyle({fillOpacity:0.28,weight:2.5}));HC.show(e.originalEvent.clientX,e.originalEvent.clientY,name,sub,def.color);});
        l.on("mouseout",()=>{parkGroups[name].forEach(pl=>pl.setStyle({fillOpacity:0.12,weight:1.5}));HC.hide();});
        l.on("mousemove",e=>HC.move(e.originalEvent.clientX,e.originalEvent.clientY));
        l.on("click",e=>{L.DomEvent.stopPropagation(e);showParkDetail(f);});
      },
    });
  } else {
    state.layers[def.cat] = L.geoJSON(fc, {
      pane: "pointsPane",
      pointToLayer: (_f,ll) => L.circleMarker(ll,{radius:def.radius,fillColor:def.color,color:"#fff",weight:2,opacity:1,fillOpacity:0.88}),
      onEachFeature: (f,l) => {
        const name = tapDisplayName(f.properties || {});

        const sub=state.lang==="nl"?"Drinkwaterkraan":"Drinking water";
        l.on("mouseover",e=>HC.show(e.originalEvent.clientX,e.originalEvent.clientY,name,sub,def.color));
        l.on("mouseout",()=>HC.hide());
        l.on("mousemove",e=>HC.move(e.originalEvent.clientX,e.originalEvent.clientY));
        l.on("click",e=>{
          L.DomEvent.stopPropagation(e);
          if (def.cat === "swimming_pools") showSwimmingPoolDetail(f);
          else showTapDetail(f);
        });
      },
    });
  }
  if (state.on[def.cat]) state.layers[def.cat].addTo(state.map);
}

// ── Shade overlay — one merged file per time slot, prefetched at load ────────
const SHADE_SLOTS = [
  { key: "1000", hour: 10.00 },
  { key: "1300", hour: 13.00 },
  { key: "1530", hour: 15.50 },
  { key: "1800", hour: 18.00 },
];

function _nearestShadeSlot() {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  let best = SHADE_SLOTS[0], bestDist = Infinity;
  for (const s of SHADE_SLOTS) {
    const d = Math.abs(hour - s.hour);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best.key;
}

function _shadeStyle(feature) {
  const pct = feature.properties?.s ?? 0;
  const t   = Math.min(1, Math.max(0, pct / 100));
  // Dark shadow overlay: opacity proportional to shade coverage.
  // Transparent where there is no shade, dark navy-shadow where fully shaded.
  return {
    fillColor:   "#1a2744",
    fillOpacity: t * 0.60,
    color:       "transparent",
    weight:      0,
  };
}

// Prefetch promise — resolved with the GeoJSON or null on error
const _shadePromise = {};

function _prefetchShade() {
  const key = _nearestShadeSlot();
  if (_shadePromise[key]) return;
  _shadePromise[key] = fetch(`data/shade_${key}.geojson`)
    .then(r => r.json())
    .catch(() => null);
}

async function _renderShadeLayer() {
  if (state.layers.shade) { state.map.removeLayer(state.layers.shade); state.layers.shade = null; }
  if (!state.on.shade) return;

  const key = _nearestShadeSlot();
  _prefetchShade(); // no-op if already started
  const gj = await _shadePromise[key];
  if (!gj || !state.on.shade) return;

  state.layers.shade = L.geoJSON(gj, {
    pane:     "parksPane",
    renderer: L.canvas({ padding: 0.5 }),
    style:    _shadeStyle,
  }).addTo(state.map);
}

// ── Swimming pools layer (filtered by sub-type) ────────────────────────────
function _renderSwimmingPoolsLayer(def, features) {
  _withoutHeatPulse(() => _renderSwimmingPoolsLayerInner(def, features));
}
function _renderSwimmingPoolsLayerInner(def, features) {
  HC.hide();
  if (state.layers.swimming_pools) state.map.removeLayer(state.layers.swimming_pools);

  const filtered = features.filter(f => swimmingPoolPassesFilters(f.properties || {}));
  const fc = { type: "FeatureCollection", features: filtered };

  state.layers.swimming_pools = L.geoJSON(fc, {
    pane: "pointsPane",
    pointToLayer: (f, ll) => {
  const swimType = getSwimTypeDef(swimCategory(f.properties || {}));

  return L.marker(ll, {
    icon: makeSwimmingSquareIcon(swimType.color),
    keyboard: false,
  });
},

    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const swimType = getSwimTypeDef(swimCategory(p));
      const name = p.name || p.Naam_locatie || p.Naam || "Zwemplek";
      const sub = state.lang === "nl" ? swimType.label_nl : swimType.label_en;
      if (!IS_TOUCH_DEVICE) {
        l.on("mouseover", e => HC.show(e.originalEvent.clientX, e.originalEvent.clientY, name, sub, swimType.color));
        l.on("mouseout", () => HC.hide());
        l.on("mousemove", e => HC.move(e.originalEvent.clientX, e.originalEvent.clientY));
      }
      l.on("click", e => { HC.hide(); L.DomEvent.stopPropagation(e); showSwimmingPoolDetail(f); });
    },
  });

  if (state.on.swimming_pools) state.layers.swimming_pools.addTo(state.map);
  const countEl = document.getElementById("cnt-swimming_pools");
  if (countEl) countEl.textContent = filtered.length.toLocaleString();
}

function makeSwimmingSquareIcon(color = "#00b4c8") {
  return L.divIcon({
    className: "swim-icon-marker",
    html: `<div style="width:22px;height:22px;background:${color};border:2.5px solid rgba(255,255,255,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 5px rgba(0,0,0,0.28);box-sizing:border-box;"><svg width="11" height="9" viewBox="0 0 20 14" fill="none" aria-hidden="true"><path d="M1 4c2.4-2.8 5-2.8 7.5 0s5 2.8 7.5 0" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M1 10c2.4-2.8 5-2.8 7.5 0s5 2.8 7.5 0" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg></div>`,
    iconSize:    [22, 22],
    iconAnchor:  [11, 11],
    popupAnchor: [0, -11],
  });
}



function rebuildSwimmingPoolsLayer() {
  const def = LAYER_DEFS.find(d => d.cat === "swimming_pools");
  if (!def || !state.features.swimming_pools) return;
  _renderSwimmingPoolsLayer(def, state.features.swimming_pools);
  refreshListIfActive();
}

function rebuildSwimmingPoolChips() {
  const row = document.querySelector('.layer-row[data-cat="swimming_pools"]');
  if (!row) return;

  let container = document.getElementById("swimming-filter-chips");
  if (!container) {
    container = document.createElement("div");
    container.id = "swimming-filter-chips";
    container.className = "filter-chips swimming-filter-chips";
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Filter swimming spot types");
    row.insertAdjacentElement("afterend", container);
  }
  container.innerHTML = "";

  SWIM_TYPE_DEFS.forEach(def => {
    const btn = document.createElement("button");
    const isOn = !!state.swimTypes[def.key];
    btn.className = "filter-chip swim-filter-chip" + (isOn ? " active" : "");
    btn.dataset.swimType = def.key;
    btn.setAttribute("aria-pressed", String(isOn));
    btn.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
    btn.addEventListener("click", e => {
      e.stopPropagation();
      state.swimTypes[def.key] = !state.swimTypes[def.key];
      rebuildSwimmingPoolChips();
      rebuildSwimmingPoolsLayer();
      renderMobileFilterBar();
    });
    container.appendChild(btn);
  });
}

function setupRightPanelToggle() {
  const btn     = document.getElementById("right-panel-toggle");
  const section = document.getElementById("map-section");
  if (!btn || !section) return;

  btn.addEventListener("click", () => {
    const collapsed = section.classList.toggle("right-panel-collapsed");

    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.setAttribute(
      "aria-label",
      collapsed ? "Locatiepaneel uitklappen" : "Locatiepaneel inklappen"
    );

    // Redraw map tiles once the CSS transition has finished
    setTimeout(() => {
      if (state.map) state.map.invalidateSize();
    }, 260);
  });
}



// ── Count-up animation ─────────────────────────────────────────────────────
function animateCount(cat, target) {
  // Update sidebar count AND the hero landing stat (li-count-*)
  const heroId = cat === "koelteplekken" ? "li-count-koelte"
               : cat === "water_taps"    ? "li-count-water"
               : null;
  const els = [
    document.getElementById("cnt-" + cat),
    heroId ? document.getElementById(heroId) : null,
  ].filter(Boolean);
  if (!els.length) return;
  const duration = 900, start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const val = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString();
    els.forEach(el => el.textContent = val);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Mode toggle ────────────────────────────────────────────────────────────
function setupModeToggle() {
  document.body.classList.add("mode-user");
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.body.classList.toggle("mode-user", btn.dataset.mode==="user");
    });
  });
}

// ── Layer toggles ──────────────────────────────────────────────────────────
function setupToggles() {
  document.querySelectorAll(".layer-row[data-cat]").forEach(row => {
    row.addEventListener("click", () => {
      const cat=row.dataset.cat, on=row.classList.toggle("on");
      row.setAttribute("aria-checked",String(on));
      state.on[cat]=on;
      refreshListIfActive();
      if (cat === "shade") {
        const shadeLegend = document.getElementById("shade-legend");
        if (shadeLegend) shadeLegend.hidden = !on;
        if (on) _renderShadeLayer();
        else if (state.layers.shade) state.map.removeLayer(state.layers.shade);
        return;
      }
      if (cat === "hvi") {
        const legend = document.getElementById("hvi-legend");
        if (legend) legend.hidden = !on;
        if (!state.layers.hvi) return;
        if (on) state.map.addLayer(state.layers.hvi);
        else state.map.removeLayer(state.layers.hvi);
        return;
      }
      if (!state.layers[cat]) return;
      if (on) state.map.addLayer(state.layers[cat]);
      else    state.map.removeLayer(state.layers[cat]);
    });
  });
}

// ── Category filter ────────────────────────────────────────────────────────
function setupCategoryFilter() {
  const container = document.getElementById("category-chips");
  if (!container) return;
  container.innerHTML = "";
  CATEGORY_DEFS.forEach(def => {
    const btn = document.createElement("button");
    const isActive = def.key === null ? state.activeCategories.size === 0 : state.activeCategories.has(def.key);
    btn.className = "cat-chip" + (isActive ? " active" : "");
    btn.dataset.cat = String(def.key);
    btn.setAttribute("aria-pressed", String(isActive));
    if (def.key !== null) {
      const dot = document.createElement("span"); dot.className="cat-chip-dot";
      dot.style.background = getCategoryColor(def.key);
      btn.appendChild(dot);
    }
    const label = document.createElement("span");
    label.textContent = state.lang==="nl" ? def.label_nl : def.label_en;
    btn.appendChild(label);
    if (def.key !== null) btn.style.setProperty("--cat-color", getCategoryColor(def.key));
    btn.addEventListener("click", () => {
      if (def.key === null) {
        state.activeCategories.clear();
      } else {
        if (state.activeCategories.has(def.key)) state.activeCategories.delete(def.key);
        else state.activeCategories.add(def.key);
      }
      container.querySelectorAll(".cat-chip").forEach(c => {
        const k = c.dataset.cat === "null" ? null : c.dataset.cat;
        const on = k === null ? state.activeCategories.size === 0 : state.activeCategories.has(k);
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      rebuildKoelteplekkenLayer();
      renderMobileFilterBar();
    });
    container.appendChild(btn);
  });
}

// ── Amenity filter chips ───────────────────────────────────────────────────
function rebuildFilterChips() {
  const container = document.getElementById("filter-chips");
  if (!container) return;
  container.innerHTML = "";
  AMENITY_DEFS.filter(d => d.filterable).forEach(def => {
    const btn = document.createElement("button");
    btn.className = "filter-chip" + (state.filters[def.key] ? " active" : "");
    btn.dataset.filter = def.key;
    btn.setAttribute("aria-pressed", String(!!state.filters[def.key]));
    btn.textContent = state.lang==="nl" ? def.label_nl : def.label_en;
    btn.addEventListener("click", () => toggleFilter(def.key, btn));
    container.appendChild(btn);
  });
}

function setupFilters() {
  rebuildFilterChips();
}

function toggleFilter(key, btn) {
  state.filters[key] = !state.filters[key];
  document.querySelectorAll(`.filter-chip[data-filter="${key}"]`).forEach(c => {
    c.classList.toggle("active", state.filters[key]);
    c.setAttribute("aria-pressed", String(state.filters[key]));
  });
  rebuildKoelteplekkenLayer();
}

// ── Mobile filter bar ─────────────────────────────────────────────────────
// Compact single-row: "Filters" button + scrollable strip of active chips
function renderMobileFilterBar() {
  const stripEl = document.getElementById("mfb-active-strip");
  const fabCount = document.getElementById("fab-active-count");

  // Count active filters: active categories + active amenities + off-layers
  let count = 0;
  count += state.activeCategories.size;
  count += Object.values(state.filters).filter(Boolean).length;
  count += LAYER_DEFS.filter(d => state.on[d.cat] === false).length;

  // Update the floating FAB badge
  if (fabCount) {
    if (count > 0) {
      fabCount.textContent = count;
      fabCount.removeAttribute("hidden");
    } else {
      fabCount.setAttribute("hidden", "");
    }
  }

  if (!stripEl) return;
  stripEl.innerHTML = "";

  // Active category chips in strip
  state.activeCategories.forEach(catKey => {
    const def = CATEGORY_DEFS.find(d => d.key === catKey);
    if (!def) return;
    const chip = document.createElement("button");
    chip.className = "mfb-strip-chip mfb-strip-chip--active";
    chip.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
    chip.addEventListener("click", () => {
      state.activeCategories.delete(catKey);
      const container = document.getElementById("category-chips");
      if (container) container.querySelectorAll(".cat-chip").forEach(c => {
        const k = c.dataset.cat === "null" ? null : c.dataset.cat;
        const on = k === null ? state.activeCategories.size === 0 : state.activeCategories.has(k);
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      rebuildKoelteplekkenLayer();
      renderMobileFilterBar();
    });
    stripEl.appendChild(chip);
  });

  // Active amenity chips in strip
  AMENITY_DEFS.filter(d => d.filterable && state.filters[d.key]).forEach(def => {
    const chip = document.createElement("button");
    chip.className = "mfb-strip-chip mfb-strip-chip--active";
    chip.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
    chip.addEventListener("click", () => { toggleFilter(def.key, chip); renderMobileFilterBar(); });
    stripEl.appendChild(chip);
  });

  // Off-layers in strip
  LAYER_DEFS.filter(d => state.on[d.cat] === false).forEach(def => {
    const chip = document.createElement("button");
    chip.className = "mfb-strip-chip";
    chip.style.opacity = "0.6";
    const layerKey = def.cat === "koelteplekken"  ? "koelteplekken_label"
                   : def.cat === "water_taps"    ? "water_label"
                   : def.cat === "parks"         ? "parks_label"
                   : def.cat === "swimming_pools" ? "swimming_pools_label"
                   : def.cat === "shade"          ? "shade_label" : def.cat;
    chip.textContent = "✕ " + t(layerKey);
    chip.addEventListener("click", () => {
      state.on[def.cat] = true;
      const row = document.querySelector(`.layer-row[data-cat="${def.cat}"]`);
      if (row) { row.classList.add("on"); row.setAttribute("aria-checked","true"); }
      if (state.layers[def.cat]) state.map.addLayer(state.layers[def.cat]);
      refreshListIfActive();
      renderMobileFilterBar();
    });
    stripEl.appendChild(chip);
  });
}

// ── Mobile filter bar collapse — no longer needed (sidebar bottom-sheet used instead)
function setupMobileFilterCollapse() { /* noop — see setupSidebarToggle */ }

// ── Desktop sidebar collapse tab ──────────────────────────────────────────
function setupSidebarCollapseDesktop() {
  const btn     = document.getElementById("sidebar-collapse-btn");
  const section = document.getElementById("map-section");
  if (!btn || !section) return;

  btn.addEventListener("click", () => {
    const collapsed = section.classList.toggle("sidebar-collapsed");
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.setAttribute("aria-label",
      collapsed ? "Filter zijbalk uitklappen" : "Filter zijbalk inklappen");
    // Redraw map tiles once the CSS transition has finished
    setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 260);
  });
}

// ── Mobile sidebar ─────────────────────────────────────────────────────────
function openSidebarMobile() {
  document.body.classList.add("sidebar-open");
  const fab = document.getElementById("btn-filter-fab");
  if (fab) fab.setAttribute("aria-expanded", "true");
}
function closeSidebarMobile() {
  document.body.classList.remove("sidebar-open");
  const sheetBtn = document.getElementById("btn-filter-sheet");
  if (sheetBtn) sheetBtn.setAttribute("aria-expanded", "false");
  const fab = document.getElementById("btn-filter-fab");
  if (fab) fab.setAttribute("aria-expanded", "false");
}
function setupSidebarToggle() {
  const fab       = document.getElementById("btn-filter-fab");
  const sheetBtn  = document.getElementById("btn-filter-sheet");
  const backdrop  = document.getElementById("sidebar-backdrop");
  const closeBtn  = document.querySelector(".sidebar-mobile-close");
  const sidebar   = document.getElementById("sidebar");
  if (sheetBtn) sheetBtn.addEventListener("click", e => { e.stopPropagation(); openSidebarMobile(); });
  if (fab)      fab.addEventListener("click",      e => { e.stopPropagation(); openSidebarMobile(); });
  if (backdrop) backdrop.addEventListener("click",  closeSidebarMobile);
  if (closeBtn) closeBtn.addEventListener("click",  closeSidebarMobile);
  // Prevent clicks inside the sidebar from bubbling up to the backdrop
  if (sidebar)  sidebar.addEventListener("click",   e => e.stopPropagation());
}

// ── User location + Near me ────────────────────────────────────────────────
function clearNearMe() {
  if (state.userMarker) { state.userMarker.remove(); state.userMarker = null; }
  clearRings();
  state.userPos = null;
  const btn = document.getElementById("btn-near");
  if (btn) btn.classList.remove("active");
  refreshListIfActive();
}

function setupNearBtn() {
  document.getElementById("btn-near").addEventListener("click", () => {
    if (state.userPos) {
      // Second click: clear location mode
      clearNearMe();
      return;
    }
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLoading(false);
        placeUserMarker(pos.coords.latitude, pos.coords.longitude);
        state.map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        document.getElementById("btn-near").classList.add("active");
        // Scroll into the map area so the user sees their location
        const mapSection = document.getElementById("map-section");
        if (mapSection) mapSection.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 300);
        // Exit detail mode so the list is shown sorted by distance
        if (state.panelMode === "detail") exitDetailMode();
        else refreshListIfActive();
      },
      () => { setLoading(false); alert("Could not retrieve your location. Check browser permissions."); }
    );
  });
}

function placeUserMarker(lat, lon) {
  if (state.userMarker) state.userMarker.remove();
  clearRings();
  state.userPos = { lat, lon };
  state.userMarker = L.marker([lat,lon],{
    icon: L.divIcon({className:"user-marker-icon",html:'<div class="user-dot"></div><div class="user-pulse"></div>',iconSize:[28,28],iconAnchor:[14,14]}),
    interactive:false, zIndexOffset:1000,
  }).addTo(state.map);
  placeDistanceRings(lat,lon);
}
function clearRings() { state.rings.forEach(r=>r.remove()); state.rings=[]; }
function placeDistanceRings(lat, lon) {
  // Single dashed circle — 1 km radius with a subtle navy tint inside
  const r = L.circle([lat, lon], {
    radius: 1000,
    color: "#004699",
    weight: 2,
    opacity: 0.65,
    fillColor: "#004699",
    fillOpacity: 0.08,
    dashArray: "8 10",
    interactive: false,
  }).addTo(state.map);
  state.rings.push(r);
}

// ── Panel navigation ───────────────────────────────────────────────────────
function updatePanelTitle() {
  const titleEl = document.getElementById("panel-hdr-title");
  if (titleEl && state.panelMode === "list") {
    titleEl.textContent = state.userPos ? t("near_you") : t("lv_title");
  }
}

function enterDetailMode(feature, renderFn, backTo) {

  state.panelMode  = "detail";
  state.currentDetailFeature = feature;
  state.currentDetailRenderFn = renderFn || renderKoelteDetailContent;

  const mapSection = document.getElementById("map-section");
  if (mapSection && isDesktop()) mapSection.classList.add("detail-open");

  state.detailBackTo = backTo !== undefined ? backTo
                     : (isDesktop() ? "list" : state.mobileView);

  const listEl  = document.getElementById("list-view");
  const hdrList = document.getElementById("panel-hdr-list");
  const hdrBack = document.getElementById("panel-hdr-back");

  if (!isDesktop()) {
    // Show the panel full-screen on mobile
    if (listEl) listEl.hidden = false;
    document.body.classList.add("mobile-panel-open");
  }

  if (hdrList) hdrList.hidden = true;
  if (hdrBack) hdrBack.hidden = false;

  const inner = document.getElementById("list-view-inner");
  if (!inner) return;
  inner.innerHTML = "";
  inner.scrollTop = 0;
  if (renderFn) renderFn(feature, inner);
  else          renderKoelteDetailContent(feature, inner);

  closeSidebarMobile();
}

function exitDetailMode() {
  state.panelMode = "list";
  state.currentDetailFeature = null;
  state.currentDetailRenderFn = null;

  const mapSection = document.getElementById("map-section");
  if (mapSection) mapSection.classList.remove("detail-open");

  const hdrList = document.getElementById("panel-hdr-list");
  const hdrBack = document.getElementById("panel-hdr-back");
  if (hdrList) hdrList.hidden = false;
  if (hdrBack) hdrBack.hidden = true;

  if (!isDesktop()) {
    if (state.detailBackTo === "map") {
      // Return to map — hide the panel, restore FAB
      const listEl = document.getElementById("list-view");
      if (listEl) listEl.hidden = true;
      document.body.classList.remove("mobile-panel-open");
      state.mobileView = "map";
      document.querySelectorAll(".view-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.view === "map");
        b.setAttribute("aria-pressed", b.dataset.view === "map" ? "true" : "false");
      });
      requestAnimationFrame(() => { if (state.map) state.map.invalidateSize(); });
      return;
    }
    // Return to list — panel stays open, keep mobile-panel-open
    document.body.classList.add("mobile-panel-open");
  }

  renderListView();
}

function rerenderCurrentDetailPanel() {
  if (state.panelMode !== "detail") return;
  if (!state.currentDetailFeature || !state.currentDetailRenderFn) return;

  const inner = document.getElementById("list-view-inner");
  if (!inner) return;

  inner.innerHTML = "";
  inner.scrollTop = 0;
  state.currentDetailRenderFn(state.currentDetailFeature, inner);
}


// ── Generic helper: open any feature in the detail panel ──────────────────
function openDetailPanel(feature, renderFn) {
  const backTo = isDesktop() ? "list" : (state.mobileView === "list" ? "list" : "map");
  enterDetailMode(feature, renderFn, backTo);
}

// ── Koelteplek detail — right panel (desktop) ──────────────────────────────
function renderKoelteDetailContent(feature, container) {
  const p = feature.properties || {};
  const col = getCategoryColor(p.type);
  const typeLabels = state.lang === "nl" ? TYPE_DISPLAY_NL : TYPE_DISPLAY_EN;
  const catLabel = typeLabels[p.type] || p.type || "Koelteplek";
  const locationLabel = [p.neighborhood, p.district].filter(Boolean).join(" · ");

  const body = document.createElement("div"); body.className = "detail-panel-body";

  // ── Full-width 16:9 photo ──
  if (p.photo_url) {
    const photoWrap = document.createElement("div"); photoWrap.className = "detail-img-full";
    const img = document.createElement("img");
    img.src = p.photo_url; img.alt = p.name || ""; img.loading = "lazy";
    img.onerror = () => {
      // Image failed (e.g. Drive file not publicly shared) — show a fallback link
      photoWrap.innerHTML = "";
      const link = document.createElement("a");
      link.href = p.photo_url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.className = "detail-photo-fallback";
      link.textContent = state.lang === "nl" ? "Foto bekijken ↗" : "View photo ↗";
      photoWrap.appendChild(link);
    };
    photoWrap.appendChild(img);
    body.appendChild(photoWrap);
  }

  // ── Info section (padded) ──
  const info = document.createElement("div"); info.className = "detail-panel-info";
  body.appendChild(info);

  if (p.active === false) {
    const notice = document.createElement("div"); notice.className = "inactive-notice";
    notice.textContent = state.lang === "nl" ? "⚠ Tijdelijk gesloten" : "⚠ Temporarily unavailable";
    info.appendChild(notice);
  }

  const catLbl = document.createElement("div"); catLbl.className = "dp-cat";
  catLbl.textContent = [catLabel, locationLabel].filter(Boolean).join(" · ");

  const nameEl = document.createElement("div"); nameEl.className = "detail-panel-name";
  nameEl.textContent = p.name || "Koelteplek";

  // Decide which hours to show (heatplan hours override normal hours when plan is active)
  const useHeat = state.heatPlanActive && p.hours_heat;
  const hoursToShow = useHeat ? p.hours_heat : p.hours;

  // Inline open/closed status tag
  const openStatus = getOpenStatus(hoursToShow);
  const statusTag = document.createElement("span");
  if (openStatus.status === "open") {
    statusTag.className = "tag tag--open"; statusTag.style.marginTop = "5px";
    statusTag.textContent = t("open_now") + (openStatus.closesAt ? ` – ${t("closes_at")} ${openStatus.closesAt}` : "");
  } else if (openStatus.status === "closed") {
    statusTag.className = "tag tag--closed"; statusTag.style.marginTop = "5px";
    let txt = t("closed_now");
    if (openStatus.opensAt) txt += ` – ${t("opens_at")} ${openStatus.opensAt}`;
    statusTag.textContent = txt;
  }

  info.append(catLbl, nameEl);
  if (statusTag.className) info.appendChild(statusTag);

  // ── Heat plan hours note (when heatplan hours are being shown) ──
  if (useHeat) {
    const heatNote = document.createElement("div"); heatNote.className = "detail-heat-hours-note";
    heatNote.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="4" x2="7" y2="7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="7" cy="10" r="0.7" fill="currentColor"/></svg>${state.lang === "nl" ? "Hitteplan-openingstijden worden getoond" : "Heat plan opening hours shown"}`;
    info.appendChild(heatNote);
  }

  // ── Hours block ──
  const hoursBlock = renderHoursBlock(hoursToShow);
  // Hide the status row — shown inline above
  const statusRow = hoursBlock.querySelector(".hours-status");
  if (statusRow) statusRow.style.display = "none";
  info.appendChild(hoursBlock);

  if (p.hours_note) {
    const noteEl = document.createElement("div"); noteEl.className = "hours-note";
    noteEl.textContent = p.hours_note;
    info.appendChild(noteEl);
  }

  // ── Amenity chips — ALL amenities; present=green, absent=gray with "No" prefix ──
  if (AMENITY_DEFS.length) {
    const chipsWrap = document.createElement("div"); chipsWrap.className = "filter-chips detail-chips";
    AMENITY_DEFS.filter(d => d.filterable).forEach(def => {
      const label = state.lang === "nl" ? def.label_nl : def.label_en;
      const hasIt = p[def.key] === true;
      const notHaveIt = p[def.key] === false;
      if (!hasIt && !notHaveIt) return; // skip nulls (data not specified)
      const chip = document.createElement(hasIt ? "button" : "span");
      if (hasIt) {
        chip.className = "filter-chip on" + (state.filters[def.key] ? " active" : "");
        chip.textContent = label;
        chip.setAttribute("aria-pressed", String(!!state.filters[def.key]));
        chip.addEventListener("click", () => toggleFilter(def.key, chip));
      } else {
        chip.className = "filter-chip off";
        chip.textContent = (state.lang === "nl" ? "Geen " : "No ") + label.toLowerCase();
      }
      chipsWrap.appendChild(chip);
    });
    if (chipsWrap.children.length) info.appendChild(chipsWrap);
  }

  if (p.notes) {
    const notesBox = document.createElement("div"); notesBox.className = "detail-notes";
    notesBox.textContent = p.notes;
    info.appendChild(notesBox);
  }

  // ── Action buttons ──
  const actions = document.createElement("div"); actions.className = "detail-actions";
  if (p.website_url) {
    const a = document.createElement("a");
    a.className = "btn-website"; a.href = p.website_url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5.5" stroke="white" stroke-width="1.5"/><path d="M6.5 1S4.5 3 4.5 6.5 6.5 12 6.5 12" stroke="white" stroke-width="1.2"/><path d="M6.5 1S8.5 3 8.5 6.5 6.5 12 6.5 12" stroke="white" stroke-width="1.2"/><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="white" stroke-width="1.2"/></svg>${t("website_hours")}`;
    actions.appendChild(a);
  }
  const [lon, lat] = feature.geometry.coordinates;
  actions.appendChild(makeDirectionsBtn(lat, lon));
  info.appendChild(actions);
  container.appendChild(body);
}

function cell(label, value, full=false) {
  const d=document.createElement("div"); d.className="prop-cell"+(full?" full":"");
  const l=document.createElement("div"); l.className="prop-label"; l.textContent=label;
  const v=document.createElement("div"); v.className="prop-value"; v.textContent=value||"—";
  d.append(l,v); return d;
}

function showKoelteplaatsDetail(feature) {
  openDetailPanel(feature, renderKoelteDetailContent);
}

function translateTapStatus(value) {
  if (!value) return value;

  const v = String(value).trim().toLowerCase();

  const map = {
    "in bedrijf": {
      nl: "In bedrijf",
      en: "In service",
    },
    "verwijderd": {
      nl: "Verwijderd",
      en: "Removed",
    },
    "afgesneden (vervallen of uitgehaald)": {
      nl: "Afgesneden (vervallen of uitgehaald)",
      en: "Disconnected / removed from service",
    },
  };

  return map[v]?.[state.lang] || value;
}

function translateTapType(value) {
  if (!value) {
    return state.lang === "nl" ? "Onbekend" : "Unknown";
  }

  const v = String(value).trim().toLowerCase();

  const map = {
    "delta tappunt": {
      nl: "Delta tappunt",
      en: "Delta tap point",
    },
    "drinkfontein": {
      nl: "Drinkfontein",
      en: "Drinking fountain",
    },
    "happertje": {
      nl: "Happertje",
      en: "Small drinking fountain",
    },
    "drinkfontein met drukknop": {
      nl: "Drinkfontein met drukknop",
      en: "Drinking fountain with push button",
    },
    "model vondelpark": {
      nl: "Model Vondelpark",
      en: "Vondelpark model drinking fountain",
    },
  };

  return map[v]?.[state.lang] || value;
}

function tapDisplayName(p) {
  const raw = p?.display_name || p?.["Dichtstbijzijnde adres binnen 100 meter"] || "";
  const value = String(raw).trim();

  const badNames = new Set([
    "",
    "None",
    "null",
    "Geen adres binnen 100 m.",
  ]);

  if (badNames.has(value)) {
    return state.lang === "nl" ? "Drinkwaterkraan" : "Water fountain";
  }

  return value;
}


function renderTapDetailContent(feature, container) {
  const p = feature.properties || {}, col = "#009de6";
  const body = document.createElement("div"); body.className = "detail-panel-body";

  const accent = document.createElement("div"); accent.className = "detail-panel-accent"; accent.style.background = col;
  body.appendChild(accent);

  const info = document.createElement("div"); info.className = "detail-panel-info";

  const hdrRow = document.createElement("div"); hdrRow.className = "detail-header-row";
  const hdrInfo = document.createElement("div"); hdrInfo.className = "detail-header-info";
  const catLbl = document.createElement("div"); catLbl.className = "dp-cat"; catLbl.textContent = t("water_label");
  const nameEl = document.createElement("div"); nameEl.className = "detail-panel-name"; nameEl.textContent = tapDisplayName(p);
  const iconBadge = document.createElement("div"); iconBadge.className = "detail-icon-badge";
  iconBadge.style.cssText = `background:${col}1a;border-color:${col}33;`;
  iconBadge.innerHTML = `<svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true" style="color:${col}"><path d="M7 1C7 1 1 8 1 11a6 6 0 0 0 12 0C13 8 7 1 7 1Z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="17" cy="6" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="17" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  hdrInfo.append(catLbl, nameEl);
  hdrRow.append(hdrInfo, iconBadge);
  info.appendChild(hdrRow);

  const grid = document.createElement("div"); grid.className = "prop-grid";
  grid.append(
    cell(t("status"),     translateTapStatus(p.Status)),
    cell(t("type_label"), translateTapType(p["Subtype afnamepunt"])),
    cell(t("district"),   p.District),
  );
  if (p.Aanlegjaar) grid.appendChild(cell(t("installed"), String(p.Aanlegjaar).replace(".0", "")));
  info.appendChild(grid);

  if (feature.geometry?.type === "Point") {
    const [lon, lat] = feature.geometry.coordinates;
    const actions = document.createElement("div"); actions.className = "detail-actions";
    actions.appendChild(makeDirectionsBtn(lat, lon));
    info.appendChild(actions);
  }

  body.appendChild(info);
  container.appendChild(body);
}

function renderParkDetailContent(feature, container) {
  const p = feature.properties || {}, col = "#00893c";
  const body = document.createElement("div"); body.className = "detail-panel-body";

  const accent = document.createElement("div"); accent.className = "detail-panel-accent"; accent.style.background = col;
  body.appendChild(accent);

  const info = document.createElement("div"); info.className = "detail-panel-info";

  const hdrRow = document.createElement("div"); hdrRow.className = "detail-header-row";
  const hdrInfo = document.createElement("div"); hdrInfo.className = "detail-header-info";
  const catLbl = document.createElement("div"); catLbl.className = "dp-cat"; catLbl.textContent = t("parks_label");
  const nameEl = document.createElement("div"); nameEl.className = "detail-panel-name"; nameEl.textContent = p.Naam || "Park";
  const iconBadge = document.createElement("div"); iconBadge.className = "detail-icon-badge";
  iconBadge.style.cssText = `background:${col}1a;border-color:${col}33;`;
  iconBadge.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="color:${col}"><path d="M12 3C9 3 6 6 6 9c0 4 6 12 6 12s6-8 6-12c0-3-3-6-6-6Z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
  hdrInfo.append(catLbl, nameEl);
  hdrRow.append(hdrInfo, iconBadge);
  info.appendChild(hdrRow);

  const grid = document.createElement("div"); grid.className = "prop-grid";
  const area = p.Oppervlakte_m2
    ? (p.Oppervlakte_m2 >= 10000 ? (p.Oppervlakte_m2 / 10000).toFixed(1) + " ha" : p.Oppervlakte_m2.toLocaleString() + " m²")
    : null;
  grid.append(cell(t("district"), p.Stadsdeel), cell(t("area"), area), cell(t("city_park"), p.Stadspark === "J" ? t("yes") : t("no")));
  info.appendChild(grid);

  body.appendChild(info);
  container.appendChild(body);
}


function showTapDetail(feature)  { openDetailPanel(feature, renderTapDetailContent);  }
function showParkDetail(feature) { openDetailPanel(feature, renderParkDetailContent); }

function renderSwimmingPoolDetailContent(feature, container) {
  const p = feature.properties || {};
  const swimType = getSwimTypeDef(swimCategory(p));
  const col = "#00b4c8";

  const body = document.createElement("div"); body.className = "detail-panel-body";

  const accent = document.createElement("div"); accent.className = "detail-panel-accent"; accent.style.background = col;
  body.appendChild(accent);

  const info = document.createElement("div"); info.className = "detail-panel-info";

  const hdrRow = document.createElement("div"); hdrRow.className = "detail-header-row";
  const hdrInfo = document.createElement("div"); hdrInfo.className = "detail-header-info";
  const catLbl = document.createElement("div"); catLbl.className = "dp-cat";
  catLbl.textContent = state.lang === "nl" ? swimType.label_nl : swimType.label_en;
  const nameEl = document.createElement("div"); nameEl.className = "detail-panel-name";
  nameEl.textContent = p.name || p.Naam_locatie || p.Naam || "Zwemplek";
  const iconBadge = document.createElement("div"); iconBadge.className = "detail-icon-badge";
  iconBadge.style.cssText = `background:${col}1a;border-color:${col}33;`;
  iconBadge.innerHTML = `<svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true" style="color:${col}"><path d="M1 6c2.4-3.2 5-3.2 7.5 0s5 3.2 7.5 0 5-3.2 7.5 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><path d="M1 13c2.4-3.2 5-3.2 7.5 0s5 3.2 7.5 0 5-3.2 7.5 0" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;
  hdrInfo.append(catLbl, nameEl);
  hdrRow.append(hdrInfo, iconBadge);
  info.appendChild(hdrRow);

  const grid = document.createElement("div"); grid.className = "prop-grid";
  grid.append(cell(t("type_label"), state.lang === "nl" ? swimType.label_nl : swimType.label_en));
  if (p.id) grid.appendChild(cell("ID", String(p.id)));
  info.appendChild(grid);

  if (feature.geometry?.type === "Point") {
    const [lon, lat] = feature.geometry.coordinates;
    const actions = document.createElement("div"); actions.className = "detail-actions";
    actions.appendChild(makeDirectionsBtn(lat, lon));
    info.appendChild(actions);
  }

  body.appendChild(info);
  container.appendChild(body);
}

function showSwimmingPoolDetail(feature) { openDetailPanel(feature, renderSwimmingPoolDetailContent); }

function makeDirectionsBtn(lat, lon) {
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const href=isIOS?`maps://?daddr=${lat},${lon}`:`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const a=document.createElement("a");
  a.className="btn-directions"; a.href=href; a.target="_blank"; a.rel="noopener noreferrer";
  a.innerHTML=`<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 11.5L11.5 1.5M11.5 1.5H4.5M11.5 1.5V8.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${t("get_directions")}`;
  return a;
}

// ── Search ─────────────────────────────────────────────────────────────────
function setupSearch() {
  const input=document.getElementById("search-input"), results=document.getElementById("search-results");
  if (!input) return;
  input.placeholder=t("search_placeholder");
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q=input.value.trim();
    if (q.length<2){results.setAttribute("hidden","");return;}
    timer=setTimeout(()=>doSearch(q),320);
  });
  input.addEventListener("keydown",e=>{if(e.key==="Escape"){results.setAttribute("hidden","");input.blur();}});
  document.addEventListener("click",e=>{if(!e.target.closest("#search-wrap"))results.setAttribute("hidden","");});
}

async function doSearch(query) {
  const results = document.getElementById("search-results");
  if (!results) return;

  results.innerHTML = "";
  const q = query.trim();
  const qLower = q.toLowerCase();

  // Local koelteplekken matches first
  const localMatches = state.features.koelteplekken
    .filter(f => {
      const p = f.properties || {};
      return (
        (p.name || "").toLowerCase().includes(qLower) ||
        (p.neighborhood || "").toLowerCase().includes(qLower) ||
        (p.address || "").toLowerCase().includes(qLower)
      );
    })
    .slice(0, 3);

  localMatches.forEach(f => {
    const p = f.properties || {};
    const el = document.createElement("div");
    el.className = "sr-item sr-item--local";
    el.innerHTML = `
      <div class="sr-name">${p.name || "Koelteplek"}</div>
      <div class="sr-sub">${[p.neighborhood, p.district].filter(Boolean).join(" · ")} · Koelteplek</div>
    `;
    el.addEventListener("click", () => {
      state.map.setView([f.geometry.coordinates[1], f.geometry.coordinates[0]], 17);
      results.setAttribute("hidden", "");
      document.getElementById("search-input").value = p.name || "";
      showKoelteplaatsDetail(f);
      closeSidebarMobile();
      const ms = document.getElementById("map-section");
      if (ms) ms.scrollIntoView({ behavior: "smooth" });
    });
    results.appendChild(el);
  });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + " Amsterdam")}&format=json&countrycodes=nl&limit=6&viewbox=4.72,52.48,5.08,52.26&bounded=1`;
    const response = await fetch(url, { headers: { "Accept-Language": state.lang === "nl" ? "nl" : "en" } });
    if (!response.ok) throw new Error("Search request failed");
    const items = await response.json();

    items.forEach(item => {
      const parts = item.display_name.split(", ");
      const el = document.createElement("div");
      el.className = "sr-item";
      el.innerHTML = `<div class="sr-name">${parts[0]}</div><div class="sr-sub">${parts.slice(1, 3).join(", ")}</div>`;
      el.addEventListener("click", () => {
        state.map.setView([parseFloat(item.lat), parseFloat(item.lon)], 16);
        results.setAttribute("hidden", "");
        document.getElementById("search-input").value = parts[0];
        closeSidebarMobile();
        const ms = document.getElementById("map-section");
        if (ms) ms.scrollIntoView({ behavior: "smooth" });
      });
      results.appendChild(el);
    });
  } catch (e) {
    console.error("search:", e);
  }

  if (!results.children.length) {
    const el = document.createElement("div");
    el.className = "sr-item";
    el.innerHTML = `<div class="sr-name">${t("no_search_results")}</div>`;
    results.appendChild(el);
  }

  results.removeAttribute("hidden");
}


// ── Tips / Contact ─────────────────────────────────────────────────────────
function setupTipsBtn() {
  const btnContact=document.getElementById("btn-contact");
  if (btnContact) btnContact.addEventListener("click",e=>{e.stopPropagation();showContactPage();});
  const contactBack=document.getElementById("contact-back");
  if (contactBack) contactBack.addEventListener("click",closeContactPage);
}
function showContactPage()  { renderContactPage(); document.getElementById("contact-page").classList.add("open"); closeSidebarMobile(); }
function closeContactPage() { document.getElementById("contact-page").classList.remove("open"); }

function renderContactPage() {
  const body=document.getElementById("contact-page-body"); body.innerHTML="";
  const hero=document.createElement("div"); hero.className="tp-hero";
  const heroTitle=document.createElement("div"); heroTitle.className="tp-hero-title"; heroTitle.textContent=t("contact_page_title");
  const heroSub=document.createElement("div"); heroSub.className="tp-hero-sub"; heroSub.textContent=t("contact_page_hero_sub");
  hero.append(heroTitle,heroSub); body.appendChild(hero);
  const ggdCard=document.createElement("div"); ggdCard.className="cp-card";
  const ggdHeading=document.createElement("div"); ggdHeading.className="cp-card-heading";
  const ggdTitle=document.createElement("span"); ggdTitle.className="cp-card-title"; ggdTitle.textContent=t("contact_ggd_title");
  ggdHeading.append(ggdTitle); ggdCard.appendChild(ggdHeading);
  const phoneRow=_cpRow(t("contact_ggd_phone_label"));
  const phoneLink=document.createElement("a"); phoneLink.href="tel:+31205555405"; phoneLink.className="cp-link"; phoneLink.textContent=t("contact_ggd_phone");
  const phoneHours=document.createElement("span"); phoneHours.className="cp-sub"; phoneHours.textContent=t("contact_ggd_phone_hours");
  phoneRow.valueEl.appendChild(phoneLink); phoneRow.valueEl.appendChild(phoneHours); ggdCard.appendChild(phoneRow.el);
  const postLabel=t("contact_ggd_post_label"); const postVal=t("contact_ggd_post");
  if (postLabel && postVal) { const postRow=_cpRow(postLabel); const postLink=document.createElement("a"); postLink.href="mailto:"+postVal; postLink.className="cp-link"; postLink.textContent=postVal; postRow.valueEl.appendChild(postLink); ggdCard.appendChild(postRow.el); }
  body.appendChild(ggdCard);
  const submitCard=document.createElement("div"); submitCard.className="cp-card cp-card--highlight";
  const submitHeading=document.createElement("div"); submitHeading.className="cp-card-heading";
  const submitTitle=document.createElement("span"); submitTitle.className="cp-card-title"; submitTitle.textContent=t("contact_submit_title");
  submitHeading.append(submitTitle); submitCard.appendChild(submitHeading);
  const submitBody=document.createElement("p"); submitBody.className="cp-card-body"; submitBody.textContent=t("contact_submit_body"); submitCard.appendChild(submitBody);
  const sPhoneRow=_cpRow(t("contact_submit_phone_label"));
  const sPhoneLink=document.createElement("a"); sPhoneLink.href="tel:+31611738325"; sPhoneLink.className="cp-link"; sPhoneLink.textContent=t("contact_submit_phone");
  sPhoneRow.valueEl.appendChild(sPhoneLink); submitCard.appendChild(sPhoneRow.el);
  const sEmailRow=_cpRow(t("contact_submit_email_label"));
  const sEmailLink=document.createElement("a"); sEmailLink.href="mailto:pratischa.koirala@amsterdam.nl"; sEmailLink.className="cp-link"; sEmailLink.textContent=t("contact_submit_email");
  sEmailRow.valueEl.appendChild(sEmailLink); submitCard.appendChild(sEmailRow.el);
  body.appendChild(submitCard);
}
function _cpRow(label) {
  const el=document.createElement("div"); el.className="cp-row";
  const labelEl=document.createElement("div"); labelEl.className="cp-row-label";
  const labelText=document.createElement("span"); labelText.textContent=label;
  labelEl.append(labelText);
  const valueEl=document.createElement("div"); valueEl.className="cp-row-value";
  el.append(labelEl,valueEl);
  return {el,valueEl};
}

function renderTipsPage() {
  const body=document.getElementById("tips-page-body");
  if (!body) return;
  body.innerHTML="";
  const hero=document.createElement("div"); hero.className="tp-hero";
  const heroTitle=document.createElement("div"); heroTitle.className="tp-hero-title"; heroTitle.textContent=t("tips_page_title");
  const heroSub=document.createElement("div"); heroSub.className="tp-hero-sub"; heroSub.textContent=t("tips_page_subtitle");
  hero.append(heroTitle,heroSub); body.appendChild(hero);
  const hpBox=document.createElement("div"); hpBox.className="tp-heatplan-box";
  const hpTitle=document.createElement("div"); hpTitle.className="tp-heatplan-title"; hpTitle.textContent=t("heat_plan_what_title");
  const hpBody=document.createElement("div"); hpBody.className="tp-heatplan-body"; hpBody.textContent=t("heat_plan_what_body");
  hpBox.append(hpTitle,hpBody); body.appendChild(hpBox);
  const grid=document.createElement("div"); grid.className="tp-grid";
  for (let i=1;i<=6;i++){const card=document.createElement("div");card.className="tp-card";const title=document.createElement("div");title.className="tp-card-title";title.textContent=t(`tip${i}_title`);const bodyTxt=document.createElement("div");bodyTxt.className="tp-card-body";bodyTxt.textContent=t(`tip${i}_body`);card.append(title,bodyTxt);grid.appendChild(card);}
  body.appendChild(grid);
  const emergency=document.createElement("div"); emergency.className="tp-emergency";
  const eTitle=document.createElement("div"); eTitle.className="tp-emergency-title"; eTitle.textContent=t("tip_emergency_title");
  const eBody=document.createElement("div"); eBody.className="tp-emergency-body"; eBody.textContent=t("tip_emergency_body");
  emergency.append(eTitle,eBody); body.appendChild(emergency);
  const disc=document.createElement("div"); disc.className="tp-disclaimer"; disc.textContent=t("tips_disclaimer"); body.appendChild(disc);
}

// ── List view ──────────────────────────────────────────────────────────────
function getListItems() {
  // Koelteplekken only (water taps excluded from list); hide inactive locations
  let items = state.features.koelteplekken
    .filter(f => (f.properties || {}).active !== false)
    .filter(f => koelteplekPassesFilters(f.properties || {}))
    .map(f => ({ feature: f, cat: "koelteplekken" }));

  if (state.userPos) {
    // Sort by distance
    items.sort((a, b) => {
      const getD = f => {
        const [lo, la] = f.geometry.coordinates;
        return haversine(state.userPos.lat, state.userPos.lon, la, lo);
      };
      return getD(a.feature) - getD(b.feature);
    });
  } else {
    // Sort by open status
    const ord = { open: 0, unknown: 1, closed: 2 };
    items.sort((a, b) => {
      const getOrd = f => {
        if (f.properties?.active === false) return 2;
        return ord[getOpenStatus(f.properties?.hours).status] ?? 1;
      };
      return getOrd(a.feature) - getOrd(b.feature);
    });
  }
  return items;
}

function buildListItem(feature) {
  const p = feature.properties || {};
  const color = getCategoryColor(p.type);
  const typeLabels = state.lang === "nl" ? TYPE_DISPLAY_NL : TYPE_DISPLAY_EN;
  const typeLabel = typeLabels[p.type] || p.type || "";

  const li = document.createElement("li");
  li.className = "lv-item";
  li.setAttribute("role", "button");
  li.setAttribute("tabindex", "0");
  li.setAttribute("aria-label", `${p.name || "Koelteplek"}, ${[typeLabel, p.neighborhood].filter(Boolean).join(", ")}`);

  // Photo thumbnail
  const photoEl = document.createElement("div"); photoEl.className = "lv-photo";
  if (p.photo_url) {
    const img = document.createElement("img");
    img.src = p.photo_url; img.alt = ""; img.loading = "lazy";
    photoEl.appendChild(img);
  } else {
    photoEl.classList.add("lv-photo--placeholder");
    photoEl.style.background = color + "14";
    photoEl.style.borderColor = color + "28";
    const initial = document.createElement("span");
    initial.textContent = (typeLabel || "K")[0].toUpperCase();
    initial.style.color = color;
    photoEl.appendChild(initial);
  }

  const content = document.createElement("div"); content.className = "lv-content";

  // Name + status badge
  const topRow = document.createElement("div"); topRow.className = "lv-top-row";
  const nameEl = document.createElement("span"); nameEl.className = "lv-name";
  nameEl.textContent = p.name || "Koelteplek";
  const badge = document.createElement("span"); badge.className = "lv-status-badge";
  const s = getOpenStatus(p.hours);
  if (s.status === "open") {
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const minsLeft = parseMinutes(s.closesAt) - nowM;
    if (minsLeft > 0 && minsLeft <= 60) {
      badge.textContent = t("closes_soon"); badge.classList.add("lv-status-badge--closing");
    } else {
      badge.textContent = t("open_now"); badge.classList.add("lv-status-badge--open");
    }
  } else if (s.status === "closed") {
    badge.textContent = t("closed_now"); badge.classList.add("lv-status-badge--closed");
  } else {
    badge.textContent = t("lv_unknown"); badge.classList.add("lv-status-badge--unknown");
  }
  topRow.append(nameEl, badge);

  // Meta: type + neighbourhood
  const meta = document.createElement("div"); meta.className = "lv-meta";
  meta.textContent = [typeLabel, p.neighborhood].filter(Boolean).join(" · ");

  // Footer: distance (if near-me) + amenity pills
  const footer = document.createElement("div"); footer.className = "lv-footer";
  if (state.userPos && feature.geometry?.type === "Point") {
    const [lo, la] = feature.geometry.coordinates;
    const dist = haversine(state.userPos.lat, state.userPos.lon, la, lo);
    const distEl = document.createElement("span"); distEl.className = "lv-dist";
    distEl.textContent = fmtDist(dist);
    footer.appendChild(distEl);
  }
  const trueAmenities = AMENITY_DEFS.filter(d => p[d.key] === true);
  trueAmenities.slice(0, 3).forEach(def => {
    const pill = document.createElement("span"); pill.className = "lv-amenity";
    pill.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
    footer.appendChild(pill);
  });
  if (trueAmenities.length > 3) {
    const more = document.createElement("span"); more.className = "lv-amenity lv-amenity--more";
    more.textContent = `+${trueAmenities.length - 3}`;
    footer.appendChild(more);
  }

  content.append(topRow, meta, footer);
  li.append(photoEl, content);
  li.addEventListener("click", () => showKoelteplaatsDetail(feature));
  li.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); li.click(); } });
  return li;
}

function renderListView() {
  const inner = document.getElementById("list-view-inner");
  if (!inner) return;
  inner.innerHTML = "";

  const items = getListItems();

  // Pre-calculate near/far so panel header shows accurate near count
  const NEAR_KM = 1;
  let nearItems = [], farItems = [];
  if (state.userPos) {
    nearItems = items.filter(({ feature }) => {
      if (feature.geometry?.type !== "Point") return false;
      const [lo, la] = feature.geometry.coordinates;
      return haversine(state.userPos.lat, state.userPos.lon, la, lo) <= NEAR_KM;
    });
    farItems = items.filter(({ feature }) => {
      if (feature.geometry?.type !== "Point") return true;
      const [lo, la] = feature.geometry.coordinates;
      return haversine(state.userPos.lat, state.userPos.lon, la, lo) > NEAR_KM;
    });
  }

  // Update panel header
  const titleEl = document.getElementById("panel-hdr-title");
  const countEl = document.getElementById("panel-hdr-count");
  if (titleEl) titleEl.textContent = state.userPos ? t("near_you") : t("lv_title");
  if (countEl) countEl.textContent = `${state.userPos ? nearItems.length : items.length} ${t("lv_found")}`;

  const statusEl = document.getElementById("a11y-status");
  if (statusEl) statusEl.textContent = `${items.length} ${t("lv_found")}`;

  if (items.length === 0) {
    const empty = document.createElement("div"); empty.className = "lv-empty";
    const et = document.createElement("div"); et.className = "lv-empty-title"; et.textContent = t("lv_no_results");
    const es = document.createElement("div"); es.className = "lv-empty-sub"; es.textContent = t("lv_no_results_sub");
    empty.append(et, es); inner.appendChild(empty);
    return;
  }

  // Helper: append a labelled section of items
  function appendSection(sectionItems, label) {
    if (!sectionItems.length) return;
    if (label) {
      const hdr = document.createElement("div"); hdr.className = "lv-section-hdr";
      const labelSpan = document.createElement("span"); labelSpan.textContent = label;
      const countBadge = document.createElement("span"); countBadge.className = "lv-section-hdr-count";
      countBadge.textContent = sectionItems.length;
      hdr.append(labelSpan, countBadge);
      inner.appendChild(hdr);
    }
    const list = document.createElement("ul"); list.className = "lv-list";
    sectionItems.forEach(({ feature }) => list.appendChild(buildListItem(feature)));
    inner.appendChild(list);
  }

  if (state.userPos) {
    // Near items directly (panel header IS the "In jouw buurt" label)
    if (nearItems.length) {
      const list = document.createElement("ul"); list.className = "lv-list";
      nearItems.forEach(({ feature }) => list.appendChild(buildListItem(feature)));
      inner.appendChild(list);
    }
    // Other locations: same-style header as panel header, then its items
    if (farItems.length) {
      const div = document.createElement("div"); div.className = "lv-other-hdr";
      const hdrList = document.createElement("div"); hdrList.className = "lv-other-hdr-list";
      const title = document.createElement("div"); title.className = "lv-other-hdr-title";
      title.textContent = t("other_locations");
      const count = document.createElement("div"); count.className = "lv-other-hdr-count";
      count.textContent = `${farItems.length} ${t("lv_found")}`;
      hdrList.append(title, count);
      div.appendChild(hdrList);
      inner.appendChild(div);
      const list = document.createElement("ul"); list.className = "lv-list";
      farItems.forEach(({ feature }) => list.appendChild(buildListItem(feature)));
      inner.appendChild(list);
    }
  } else {
    appendSection(items, null);
  }
}

function isListViewActive() {
  if (isDesktop()) return state.panelMode === "list";
  const el = document.getElementById("list-view");
  return el && !el.hidden;
}
function refreshListIfActive() { if (isListViewActive()) renderListView(); }

// ── View toggle (mobile only) ──────────────────────────────────────────────
function setupViewToggle() {
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach(b => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      if (isDesktop()) return; // right panel always visible on desktop
      const listEl = document.getElementById("list-view");
      if (btn.dataset.view === "list") {
        state.mobileView = "list";
        listEl.hidden = false;
        document.body.classList.add("mobile-panel-open");
        // If coming back from detail, reset to list panel mode
        if (state.panelMode === "detail") {
          state.panelMode = "list";
          const hdrList = document.getElementById("panel-hdr-list");
          const hdrBack = document.getElementById("panel-hdr-back");
          if (hdrList) hdrList.hidden = false;
          if (hdrBack) hdrBack.hidden = true;
        }
        renderListView();
      } else {
        state.mobileView = "map";
        listEl.hidden = true;
        document.body.classList.remove("mobile-panel-open");
        requestAnimationFrame(() => {
          if (state.map) state.map.invalidateSize();
          setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 300);
        });
      }
    });
  });
}

function setupSkipLink() {
  const skip = document.querySelector(".skip-link");
  if (!skip) return;
  skip.addEventListener("click", event => {
    event.preventDefault();
    const mapEl=document.getElementById("map"), listEl=document.getElementById("list-view"), listInner=document.getElementById("list-view-inner");
    document.querySelectorAll(".view-btn").forEach(btn=>{const isList=btn.dataset.view==="list";btn.classList.toggle("active",isList);btn.setAttribute("aria-pressed",isList?"true":"false");});
    if (listEl) listEl.hidden=false;
    renderListView();
    if (listInner){listInner.focus();listInner.scrollIntoView({behavior:"smooth",block:"start"});}
  });
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeContactPage(); closeSidebarMobile();
      if (state.panelMode === "detail") exitDetailMode();
    }
  });
}


// ── Landing intro ───────────────────────────────────────────────────────────
function setupLandingIntro() {
  document.querySelectorAll(".btn-li-enter").forEach(btn => {
    btn.addEventListener("click", () => {
      const mapSection=document.getElementById("map-section");
      if (mapSection) mapSection.scrollIntoView({behavior:"smooth"});
      setTimeout(()=>{ if(state.map) state.map.invalidateSize(); },250);
      setTimeout(()=>{ if(state.map) state.map.invalidateSize(); },800);
    });
  });
  const obs=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&state.map){setTimeout(()=>state.map.invalidateSize(),100);setTimeout(()=>state.map.invalidateSize(),500);}},{threshold:0.1});
  const ms=document.getElementById("map-section"); if(ms) obs.observe(ms);
}

// ── Live weather strip ─────────────────────────────────────────────────────
function formatDutchNumber(value, decimals=1) {
  const number=Number(String(value).replace(",","."));
  if (!Number.isFinite(number)) return "--";
  return number.toLocaleString("nl-NL",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}

async function loadWeatherBar() {
  const strip=document.getElementById("weather-strip");
  if (!strip) return;
  try {
    // Call Open-Meteo directly — free, no API key, CORS-friendly
    const params = new URLSearchParams({
      latitude:  "52.3676",
      longitude: "4.9041",
      current:   "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code",
      timezone:  "Europe/Amsterdam",
    });
    const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
    const payload=await response.json();
    const current=payload.current||{};
    const data={
      temperature: current.temperature_2m,
      feels_like:  current.apparent_temperature,
      humidity:    current.relative_humidity_2m,
      source:      "Open-Meteo",
      source_url:  "https://open-meteo.com/",
    };
    const tempEl=document.getElementById("weather-temp"), humidityEl=document.getElementById("weather-humidity"), feelsEl=document.getElementById("weather-feels"), sourceEl=document.getElementById("weather-source");
    if (sourceEl){sourceEl.textContent=data.source;sourceEl.href=data.source_url;sourceEl.target="_blank";sourceEl.rel="noopener noreferrer";}
    if (tempEl){const value=`${formatDutchNumber(data.temperature,1)}°`;tempEl.textContent=value;tempEl.setAttribute("aria-label",`${t("weather_temp_label")}: ${value}`);}
    if (humidityEl){const humidity=Number(String(data.humidity).replace(",","."));const value=Number.isFinite(humidity)?`${Math.round(humidity)}%`:"--%";humidityEl.textContent=value;humidityEl.setAttribute("aria-label",`${t("weather_humidity_label")}: ${value}`);}
    if (feelsEl){const value=`${formatDutchNumber(data.feels_like,0)}°`;feelsEl.textContent=value;feelsEl.setAttribute("aria-label",`${t("weather_feels_label")}: ${value}`);}
  } catch(error) {
    console.warn("Could not load weather data:",error);
    const tempEl=document.getElementById("weather-temp"), humidityEl=document.getElementById("weather-humidity"), feelsEl=document.getElementById("weather-feels");
    if(tempEl) tempEl.textContent="--°";
    if(humidityEl) humidityEl.textContent="--%";
    if(feelsEl) feelsEl.textContent="--°";
  }
}

// ── Info blocks: force all open on desktop, accordion on mobile ──────────
function initInfoBlocks() {
  const blocks = document.querySelectorAll(".info-col-item details.info-block");
  function syncOpen() {
    if (window.innerWidth > 640) {
      blocks.forEach(d => d.setAttribute("open", ""));
    } else {
      blocks.forEach((d, i) => {
        if (i === 0) d.setAttribute("open", "");
        else         d.removeAttribute("open");
      });
    }
  }
  syncOpen();
  window.addEventListener("resize", syncOpen, { passive: true });
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  HC.init();
  initInfoBlocks();
  setupLandingIntro();
  initMap();
  loadAllLayers();
  _prefetchShade(); // start download in background before user toggles it
  setupBanner();
  setupLang();
  setupModeToggle();
  setupToggles();
  setupCategoryFilter();
  setupFilters();
  setupNearBtn();
  setupTipsBtn();
  setupSearch();
  setupSidebarToggle();
  setupSidebarCollapseDesktop();
  setupMobileFilterCollapse();
  setupKeyboard();
  setupViewToggle();
  setupSkipLink();
  applyLanguage();
  applyHeatPlanToMap();
  loadWeatherBar();
  setupRightPanelToggle();
  setInterval(loadWeatherBar, 10 * 60 * 1000);

  // Panel back button
  const panelBack = document.getElementById("panel-hdr-back");
  if (panelBack) panelBack.addEventListener("click", exitDetailMode);

  // Mobile contact bar toggle
  const csToggle = document.getElementById("cs-toggle");
  if (csToggle) {
    csToggle.addEventListener("click", () => {
      const footer = document.getElementById("contact-footer");
      if (footer) {
        const expanded = footer.classList.toggle("cs-expanded");
        csToggle.setAttribute("aria-expanded", String(expanded));
      }
    });
  }

  // Mobile scroll handle — tapping scrolls the page back up to the landing section
  const scrollHandle = document.getElementById("map-scroll-up");
  if (scrollHandle) {
    scrollHandle.addEventListener("click", () => {
      document.getElementById("landing-intro")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // On desktop, show right panel immediately with empty state (will fill when data loads)
  if (isDesktop()) {
    document.getElementById("list-view").removeAttribute("hidden");
    renderListView();
  }

  // When the window crosses the mobile/desktop breakpoint, reset panel state
  let _prevDesktop = isDesktop();
  window.addEventListener("resize", () => {
    const nowDesktop = isDesktop();
    if (nowDesktop === _prevDesktop) return;
    _prevDesktop = nowDesktop;
    const listEl = document.getElementById("list-view");
    if (nowDesktop) {
      // Switched to desktop: always show list panel, clean up mobile state
      document.body.classList.remove("mobile-panel-open", "sidebar-open");
      state.mobileView = "map";
      listEl.removeAttribute("hidden");
      renderListView();
    } else {
      // Switched to mobile: hide list, reset toggle to "map" active
      document.body.classList.remove("mobile-panel-open", "sidebar-open");
      state.mobileView = "map";
      listEl.hidden = true;
      document.querySelectorAll(".view-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.view === "map");
        b.setAttribute("aria-pressed", b.dataset.view === "map" ? "true" : "false");
      });
      requestAnimationFrame(() => { if (state.map) state.map.invalidateSize(); });
    }
  }, { passive: true });
});
