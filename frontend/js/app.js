"use strict";

// ── Layer definitions ──────────────────────────────────────────────────────
const LAYER_DEFS = [
  { cat: "koelteplekken",  label: "Koelteplekken",   color: "#004699",   type: "geojson", radius: 8 },
  { cat: "water_taps",     label: "Water fountains",  color: "#009de6",   src: "data/raw/water_taps.geojson",  type: "geojson", radius: 4 },
  { cat: "parks",          label: "Parks",            color: "#00893c",   src: "data/raw/parks.json",          type: "polygon" },
  { cat: "swimming_pools", label: "Swimming spots",   color: "#009de6",   src: "data/raw/zwemwater.geojson",   type: "geojson", radius: 6 },
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
  { key: null,           label_en: "All",          label_nl: "Alles" },
  { key: "library",      label_en: "Library",      label_nl: "Bibliotheek" },
  { key: "church",       label_en: "Church",       label_nl: "Kerk" },
  { key: "supermarket",  label_en: "Supermarket",  label_nl: "Supermarkt" },
  { key: "urban_farm",   label_en: "Urban farm",   label_nl: "Stadsboerderij" },
];

const TYPE_DISPLAY_NL = { library: "Bibliotheek", church: "Kerk", supermarket: "Supermarkt", urban_farm: "Stadsboerderij", community_center: "Buurtcentrum", sports: "Sport" };
const TYPE_DISPLAY_EN = { library: "Library", church: "Church", supermarket: "Supermarket", urban_farm: "Urban farm", community_center: "Community centre", sports: "Sports" };

const CATEGORY_COLORS = {
  library:          "#004699",  // Amsterdam dark blue
  church:           "#a00078",  // Amsterdam purple
  supermarket:      "#00893c",  // Amsterdam dark green
  urban_farm:       "#bed200",  // Amsterdam lime green
  community_center: "#ff9100",  // Amsterdam orange
  sports:           "#e50082",  // Amsterdam magenta
  default:          "#004699",  // Amsterdam dark blue
};

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
    title: "Koeltekaart",
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
    filter_fab: "Soorten locaties",
    filter_panel_title: "Soorten locaties",
    view_map: "Kaart",
    view_list: "Lijst",
    lv_title: "Koellocaties",
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
    title: "Cool map Amsterdam",
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
    filter_fab: "Location types",
    filter_panel_title: "Location types",
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
  on: { koelteplekken: true, water_taps: true, parks: true, swimming_pools: true },
  features: { koelteplekken: [], water_taps: [], parks: [], swimming_pools: [] },
  userMarker: null,
  userPos: null,
  rings: [],
  filters: {},
  swimTypes: Object.fromEntries(SWIM_TYPE_DEFS.map(d => [d.key, false])),
  search: "",
  lang: localStorage.getItem("koeltekaart_lang") || "nl",
  activeCategory: null,
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

// ── Heat plan status (read from Google Sheets settings tab) ───────────────
// Settings tab must have columns: key, value
// Add a row:  heat_plan_active, TRUE   (or FALSE)
async function fetchHeatPlanStatus() {
  if (!_sheetsReady()) return;
  try {
    const r = await fetch(_sheetsUrl(SHEETS_CONFIG.settingsGid));
    if (!r.ok) return;
    const rows = parseCsv(await r.text());
    const row  = rows.find(r => (r.key || "").trim().toLowerCase() === "heat_plan_active");
    if (!row) return;
    const was = state.heatPlanActive;
    state.heatPlanActive = csvToBool(row.value) === true;
    if (was !== state.heatPlanActive) updateBannerText();
  } catch (_) { /* sheets may be unreachable */ }
}

function setupBanner() {
  updateBannerText();
  fetchHeatPlanStatus(); // sync state from backend on load
  setInterval(fetchHeatPlanStatus, 5 * 60 * 1000); // poll every 5 min
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

  // Custom panes so park polygons never obscure point markers
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

const _CSV_DAY_COLS = ["hours_mon","hours_tue","hours_wed","hours_thu","hours_fri","hours_sat","hours_sun"];

function _normaliseSlot(raw) {
  const text = (raw || "").trim().replace(/\s/g, "").replace("–", "-");
  const match = text.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!match) return null;
  const pad = p => { const [h, m] = p.split(":"); return `${String(parseInt(h)).padStart(2, "0")}:${m}`; };
  return `${pad(match[1])}-${pad(match[2])}`;
}

function _parseHoursFromRow(row) {
  const slots = _CSV_DAY_COLS.map(col => _normaliseSlot(row[col] || ""));
  return slots.every(s => s === null) ? null : slots;
}

/**
 * Convert a Google Drive sharing URL to a directly embeddable image URL.
 * Partners can paste any of these into the photo_url column:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/uc?id=FILE_ID
 * Other URLs (direct image links, local paths) pass through unchanged.
 */
function _resolvePhotoUrl(url) {
  if (!url) return url;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (fileMatch) return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*[?&]id=([^&]+)/);
  if (ucMatch) return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  return url;
}

/** Convert one CSV row into a GeoJSON Feature (returns null if row is invalid). */
function _rowToFeature(row) {
  const name = (row.name || "").trim();
  if (!name) return null;
  const lat = csvToFloat(row.latitude || row.lat);
  const lon = csvToFloat(row.longitude || row.lon || row.lng);
  if (lat === null || lon === null) return null;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {
      id:               (row.id || "").trim() || csvSlugify(name),
      name,
      type:             (row.type || "").trim(),
      municipality:     (row.municipality || "").trim() || "Amsterdam",
      district:         (row.district   || row.stadsdeel || "").trim(),
      neighborhood:     (row.neighborhood || row.wijk    || "").trim(),
      address:          (row.address    || "").trim(),
      website_url:      (row.website_url || "").trim(),
      photo_url:        _resolvePhotoUrl((row.photo_url || "").trim()),
      hours:            _parseHoursFromRow(row),
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
  const r = await fetch(_sheetsUrl(SHEETS_CONFIG.locationsGid));
  if (!r.ok) throw new Error(`Sheets locations fetch failed: ${r.status}`);
  const features = parseCsv(await r.text()).map(_rowToFeature).filter(Boolean);
  buildKoelteplekkenLayer(def, { type: "FeatureCollection", features });
}

// ── Layer loading ──────────────────────────────────────────────────────────
function loadAllLayers() {
  LAYER_DEFS.forEach(def => {
    setLoading(true);
    if (def.cat === "koelteplekken") {
      _loadKoelteplekkenFromSheets(def)
        .catch(e => console.error("koelteplekken", e))
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
  if (state.activeCategory && p.type !== state.activeCategory) return false;
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
  renderMobileFilterBar(); // add amenity chips once data is available
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
      const typeColor = CATEGORY_COLORS[_f.properties?.type] || def.color;
      const col = isActive ? typeColor : "#9CA3AF";
      const cls = isActive ? "koelte-marker" : "koelte-marker koelte-marker--inactive";
      const icon = L.divIcon({
        className: "",   // suppress Leaflet's default white box
        html: `<div class="${cls}" style="--mc:${col}"><div class="koelte-marker-dot"></div></div>`,
        iconSize:    [28, 28],
        iconAnchor:  [14, 14],
        popupAnchor: [0, -14],
      });
      return L.marker(ll, { icon });
    },
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const isActive = p.active !== false;
      const col = isActive ? (CATEGORY_COLORS[p.type] || def.color) : "#9CA3AF";
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
        const name=f.properties?.["Dichtstbijzijnde adres binnen 100 meter"]||"Drinkwaterkraan";
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
      return L.circleMarker(ll, {
        radius: def.radius,
        fillColor: swimType.color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
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
    btn.className = "cat-chip" + (state.activeCategory===def.key ? " active" : "");
    btn.dataset.cat = String(def.key);
    btn.setAttribute("aria-pressed", String(state.activeCategory===def.key));
    if (def.key !== null) {
      const dot = document.createElement("span"); dot.className="cat-chip-dot";
      dot.style.background = CATEGORY_COLORS[def.key]||CATEGORY_COLORS.default;
      btn.appendChild(dot);
    }
    const label = document.createElement("span");
    label.textContent = state.lang==="nl" ? def.label_nl : def.label_en;
    btn.appendChild(label);
    if (def.key !== null) btn.style.setProperty("--cat-color", CATEGORY_COLORS[def.key]||CATEGORY_COLORS.default);
    btn.addEventListener("click", () => {
      state.activeCategory = def.key;
      container.querySelectorAll(".cat-chip").forEach(c => {
        const isThis = (c.dataset.cat===String(def.key));
        c.classList.toggle("active",isThis);
        c.setAttribute("aria-pressed",String(isThis));
      });
      rebuildKoelteplekkenLayer();
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
// Three-row layout: categories · amenity filters · layer toggles
function renderMobileFilterBar() {
  const catsRow      = document.getElementById("mfb-cats");
  const amenitiesRow = document.getElementById("mfb-amenities");
  const layersRow    = document.getElementById("mfb-layers");
  if (!catsRow || !layersRow) return;
  catsRow.innerHTML    = "";
  if (amenitiesRow) amenitiesRow.innerHTML = "";
  layersRow.innerHTML  = "";

  // ── Row 1: Category filter chips (radio-style)
  CATEGORY_DEFS.forEach(def => {
    const isActive = state.activeCategory === def.key;
    const btn = document.createElement("button");
    btn.className = "mfb-chip" + (isActive ? " mfb-chip--active" : "");
    if (isActive) {
      const col = def.key ? (CATEGORY_COLORS[def.key] || CATEGORY_COLORS.default) : "var(--navy)";
      btn.style.background = col;
      btn.style.borderColor = col;
    }
    btn.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
    btn.addEventListener("click", () => {
      state.activeCategory = def.key;
      document.querySelectorAll(".cat-chip").forEach(c => {
        const isThis = c.dataset.cat === String(def.key);
        c.classList.toggle("active", isThis);
        c.setAttribute("aria-pressed", String(isThis));
      });
      rebuildKoelteplekkenLayer();
      renderMobileFilterBar();
    });
    catsRow.appendChild(btn);
  });

  // ── Row 2: Amenity toggle chips
  if (amenitiesRow && AMENITY_DEFS.length) {
    AMENITY_DEFS.filter(d => d.filterable).forEach(def => {
      const isOn = !!state.filters[def.key];
      const btn = document.createElement("button");
      btn.className = "mfb-amenity" + (isOn ? " mfb-amenity--active" : "");
      btn.setAttribute("aria-pressed", String(isOn));
      // Checkmark icon (shown only when active)
      const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      check.setAttribute("viewBox", "0 0 10 10"); check.setAttribute("fill", "none");
      check.classList.add("mfb-amenity-check");
      const tick = document.createElementNS("http://www.w3.org/2000/svg", "path");
      tick.setAttribute("d", "M1.5 5L4 7.5L8.5 2.5");
      tick.setAttribute("stroke", "white"); tick.setAttribute("stroke-width", "1.6");
      tick.setAttribute("stroke-linecap", "round"); tick.setAttribute("stroke-linejoin", "round");
      check.appendChild(tick);
      const lbl = document.createElement("span");
      lbl.textContent = state.lang === "nl" ? def.label_nl : def.label_en;
      btn.append(check, lbl);
      btn.addEventListener("click", () => {
        toggleFilter(def.key, btn);
        renderMobileFilterBar();
      });
      amenitiesRow.appendChild(btn);
    });
    // Show a placeholder when no amenity data loaded yet
    if (!AMENITY_DEFS.filter(d => d.filterable).length) {
      const ph = document.createElement("span");
      ph.style.cssText = "color:var(--subtle);font-size:11px;padding:0 4px;";
      ph.textContent = "—";
      amenitiesRow.appendChild(ph);
    }
  }

  // ── Row 3: Layer toggle chips
  LAYER_DEFS.forEach(def => {
    const on = state.on[def.cat] !== false;
    const btn = document.createElement("button");
    btn.className = "mfb-layer" + (on ? " on" : "");
    const dot = document.createElement("span"); dot.className = "mfb-dot";
    dot.style.background = on ? def.color : "var(--subtle)";
    const lbl = document.createElement("span");
    lbl.textContent = t(def.cat === "koelteplekken"  ? "koelteplekken_label"
                      : def.cat === "water_taps"    ? "water_label"
                      : def.cat === "parks"         ? "parks_label"
                      : def.cat === "swimming_pools" ? "swimming_pools_label"
                      : def.label);
    btn.append(dot, lbl);
    btn.addEventListener("click", () => {
      const nowOn = !state.on[def.cat];
      state.on[def.cat] = nowOn;
      const row = document.querySelector(`.layer-row[data-cat="${def.cat}"]`);
      if (row) { row.classList.toggle("on", nowOn); row.setAttribute("aria-checked", String(nowOn)); }
      if (state.layers[def.cat]) {
        if (nowOn) state.map.addLayer(state.layers[def.cat]);
        else       state.map.removeLayer(state.layers[def.cat]);
      }
      refreshListIfActive();
      renderMobileFilterBar();
    });
    layersRow.appendChild(btn);
  });

  // Header label is always black — no color state change
}

// ── Mobile filter bar collapse ────────────────────────────────────────────
function setupMobileFilterCollapse() {
  const btn     = document.getElementById("mfb-collapse-btn");
  const section = document.getElementById("map-section");
  if (!btn || !section) return;
  btn.addEventListener("click", () => {
    const collapsed = section.classList.toggle("mfb-collapsed");
    btn.setAttribute("aria-expanded", String(!collapsed));
  });
}

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
function setupSidebarToggle() {
  const fab      = document.getElementById("btn-filter-fab");
  const backdrop = document.getElementById("sidebar-backdrop");
  const closeBtn = document.querySelector(".sidebar-mobile-close");
  const sidebar  = document.getElementById("sidebar");
  if (fab)      fab.addEventListener("click",      e => { e.stopPropagation(); const open = document.body.classList.toggle("sidebar-open"); fab.setAttribute("aria-expanded", String(open)); });
  if (backdrop) backdrop.addEventListener("click",  closeSidebarMobile);
  if (closeBtn) closeBtn.addEventListener("click",  closeSidebarMobile);
  // Prevent clicks inside the sidebar from bubbling up to the backdrop and closing the panel
  if (sidebar)  sidebar.addEventListener("click",   e => e.stopPropagation());
}
function closeSidebarMobile() {
  document.body.classList.remove("sidebar-open");
  const fab = document.getElementById("btn-filter-fab");
  if (fab) fab.setAttribute("aria-expanded", "false");
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
  const col = CATEGORY_COLORS[p.type] || "#004699";
  const typeLabels = state.lang === "nl" ? TYPE_DISPLAY_NL : TYPE_DISPLAY_EN;
  const catLabel = typeLabels[p.type] || p.type || "Koelteplek";
  const locationLabel = [p.neighborhood, p.district].filter(Boolean).join(" · ");

  const body = document.createElement("div"); body.className = "detail-panel-body";

  // ── Compact header row: info on left, thumbnail on right ──
  const headerRow = document.createElement("div"); headerRow.className = "detail-header-row";
  const infoSide  = document.createElement("div"); infoSide.className = "detail-header-info";

  if (p.active === false) {
    const notice = document.createElement("div"); notice.className = "inactive-notice";
    notice.style.marginBottom = "6px";
    notice.textContent = state.lang === "nl" ? "⚠ Tijdelijk gesloten" : "⚠ Temporarily unavailable";
    infoSide.appendChild(notice);
  }

  const catLbl = document.createElement("div"); catLbl.className = "dp-cat";
  catLbl.textContent = [catLabel, locationLabel].filter(Boolean).join(" · ");

  const nameEl = document.createElement("div"); nameEl.className = "detail-panel-name";
  nameEl.textContent = p.name || "Koelteplek";

  // Inline open/closed status tag
  const openStatus = getOpenStatus(p.hours);
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

  infoSide.append(catLbl, nameEl);
  if (statusTag.className) infoSide.appendChild(statusTag);

  if (p.photo_url) {
    const photoWrap = document.createElement("div"); photoWrap.className = "detail-panel-photo";
    const img = document.createElement("img");
    img.src = p.photo_url; img.alt = p.name || ""; img.loading = "lazy";
    photoWrap.appendChild(img);
    headerRow.append(infoSide, photoWrap);
  } else {
    headerRow.appendChild(infoSide);
  }
  body.appendChild(headerRow);

  // ── Hours block (compact via CSS) ──
  const hoursBlock = renderHoursBlock(p.hours);
  // Hide the status row in the hours block — we show it inline above
  const statusRow = hoursBlock.querySelector(".hours-status");
  if (statusRow) statusRow.style.display = "none";
  body.appendChild(hoursBlock);

  if (p.hours_note) {
    const noteEl = document.createElement("div"); noteEl.className = "hours-note";
    noteEl.textContent = p.hours_note;
    body.appendChild(noteEl);
  }

  // ── Amenity chips — only show present amenities ──
  const trueAmenities = AMENITY_DEFS.filter(def =>
    p[def.key] === true && def.filterable
  );
  if (trueAmenities.length) {
    const chipsWrap = document.createElement("div"); chipsWrap.className = "filter-chips detail-chips";
    trueAmenities.forEach(def => {
      const label = state.lang === "nl" ? def.label_nl : def.label_en;
      const chip = document.createElement("button");
      chip.className = "filter-chip on" + (state.filters[def.key] ? " active" : "");
      chip.textContent = label;
      chip.setAttribute("aria-pressed", String(!!state.filters[def.key]));
      chip.addEventListener("click", () => toggleFilter(def.key, chip));
      chipsWrap.appendChild(chip);
    });
    body.appendChild(chipsWrap);
  }

  if (p.notes) {
    const notesBox = document.createElement("div"); notesBox.className = "detail-notes";
    notesBox.textContent = p.notes;
    body.appendChild(notesBox);
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
  body.appendChild(actions);
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



function renderTapDetailContent(feature, container) {
  const p = feature.properties || {}, col = "#009de6";
  const body = document.createElement("div"); body.className = "detail-panel-body";
  const nameSec = document.createElement("div"); nameSec.className = "detail-panel-namesec";
  const catLbl = document.createElement("div"); catLbl.className = "dp-cat"; catLbl.textContent = t("water_label");
  const nameEl = document.createElement("div"); nameEl.className = "sheet-name";
  nameEl.textContent = p["Dichtstbijzijnde adres binnen 100 meter"] || "Drinkwaterkraan";
  nameSec.append(catLbl, nameEl); body.appendChild(nameSec);
  const grid = document.createElement("div"); grid.className = "prop-grid";
  grid.append(
  cell(t("status"),     translateTapStatus(p.Status)),
  cell(t("type_label"), translateTapType(p["Subtype afnamepunt"])),
  cell(t("district"),   p.District),
);

  if (p.Aanlegjaar) grid.appendChild(cell(t("installed"), String(p.Aanlegjaar).replace(".0", "")));
  body.appendChild(grid);
  if (feature.geometry?.type === "Point") {
    const [lon, lat] = feature.geometry.coordinates;
    const actions = document.createElement("div"); actions.className = "detail-actions";
    actions.appendChild(makeDirectionsBtn(lat, lon));
    body.appendChild(actions);
  }
  container.appendChild(body);
}

function renderParkDetailContent(feature, container) {
  const p = feature.properties || {}, col = "#00893c";
  const body = document.createElement("div"); body.className = "detail-panel-body";
  const nameSec = document.createElement("div"); nameSec.className = "detail-panel-namesec";
  const catLbl = document.createElement("div"); catLbl.className = "dp-cat"; catLbl.textContent = p.Stadsdeel || t("parks_label");
  const nameEl = document.createElement("div"); nameEl.className = "sheet-name"; nameEl.textContent = p.Naam || "Park";
  nameSec.append(catLbl, nameEl); body.appendChild(nameSec);
  const grid = document.createElement("div"); grid.className = "prop-grid";
  const area = p.Oppervlakte_m2
    ? (p.Oppervlakte_m2 >= 10000 ? (p.Oppervlakte_m2 / 10000).toFixed(1) + " ha" : p.Oppervlakte_m2.toLocaleString() + " m²")
    : null;
  grid.append(cell(t("district"), p.Stadsdeel), cell(t("area"), area), cell(t("city_park"), p.Stadspark === "J" ? t("yes") : t("no")));
  body.appendChild(grid);
  container.appendChild(body);
}


function showTapDetail(feature)  { openDetailPanel(feature, renderTapDetailContent);  }
function showParkDetail(feature) { openDetailPanel(feature, renderParkDetailContent); }

function renderSwimmingPoolDetailContent(feature, container) {
  const p = feature.properties || {};
  const swimType = getSwimTypeDef(swimCategory(p));

  const body = document.createElement("div");
  body.className = "detail-panel-body";

  const nameSec = document.createElement("div");
  nameSec.className = "detail-panel-namesec";

  const catLbl = document.createElement("div");
  catLbl.className = "dp-cat";
  catLbl.textContent = state.lang === "nl" ? swimType.label_nl : swimType.label_en;

  const nameEl = document.createElement("div");
  nameEl.className = "sheet-name";
  nameEl.textContent = p.name || p.Naam_locatie || p.Naam || "Zwemplek";

  nameSec.append(catLbl, nameEl);
  body.appendChild(nameSec);

  const grid = document.createElement("div");
  grid.className = "prop-grid";
  grid.append(cell(t("type_label"), state.lang === "nl" ? swimType.label_nl : swimType.label_en));
  if (p.id) grid.appendChild(cell("ID", String(p.id)));
  body.appendChild(grid);

  if (feature.geometry?.type === "Point") {
    const [lon, lat] = feature.geometry.coordinates;
    const actions = document.createElement("div");
    actions.className = "detail-actions";
    actions.appendChild(makeDirectionsBtn(lat, lon));
    body.appendChild(actions);
  }

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
  const color = CATEGORY_COLORS[p.type] || CATEGORY_COLORS.default;
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
  if (countEl) {
    if (state.userPos) {
      // Counts are shown in section headers — just show total here
      const nearCount = nearItems.length;
      countEl.textContent = state.lang === "nl"
        ? `${nearCount} dichtbij · ${items.length} totaal`
        : `${nearCount} nearby · ${items.length} total`;
    } else {
      countEl.textContent = `${items.length} ${t("lv_found")}`;
    }
  }

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
    appendSection(nearItems, state.lang === "nl" ? "In uw buurt" : "Near you");
    appendSection(farItems,  state.lang === "nl" ? "Alle koelteplekken" : "All cooling spots");
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
