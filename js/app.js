/**
 * Koeltekaart Amsterdam — Main Application
 *
 * A fully client-side map showing cooling spots, parks, drinking water taps,
 * and swimming locations across Amsterdam. Location data is pulled live from
 * a published Google Sheet; no server-side code is required.
 *
 * Key external dependencies (bundled in libs/):
 *   Leaflet 1.x   — interactive map
 *
 * Key external services (loaded at runtime):
 *   Google Sheets  — location data and heat-plan status
 *   Open-Meteo     — current weather data
 *   CartoDB tiles  — base map tiles
 */
"use strict";

// ── Amsterdam Design System icon helper ───────────────────────────────────
const ADS_ICON_PATHS = {
  Search:          'M16.1585 14.7266C17.1537 13.4471 17.7325 11.8528 17.7325 10.1162C17.7325 5.91208 14.3204 2.5 10.1162 2.5C5.91208 2.5 2.5 5.91208 2.5 10.1162C2.5 14.3204 5.91208 17.7325 10.1162 17.7325C11.8528 17.7325 13.4471 17.1537 14.7266 16.1585L20.058 21.5L21.5 20.058L16.1585 14.7266ZM10.1162 15.7015C7.03928 15.7015 4.531 13.1932 4.531 10.1162C4.531 7.03928 7.03928 4.531 10.1162 4.531C13.1932 4.531 15.7015 7.03928 15.7015 10.1162C15.7015 11.2942 15.3359 12.3808 14.7165 13.2745C14.3306 13.8431 13.8431 14.3306 13.2745 14.7165C12.3808 15.3359 11.2942 15.7015 10.1162 15.7015Z',
  Filter:          'M14.8294 12.8384L21.4795 4.5V2.5H2.47949V4.5L9.12939 12.8382V21.5H10.9258L14.8294 19.4314V12.8384ZM12.9294 18.288V12.8384L13.344 11.6538L19.129 4.4H4.82999L10.6148 11.6535L11.0294 12.8382V19.2948L12.9294 18.288Z',
  CrossHair:       'M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM10.8422 23V20.9262C6.79754 20.4068 3.59325 17.2025 3.07379 13.1578H1V11.1578H3.03888C3.42796 6.96519 6.69287 3.60669 10.8422 3.07379V1H12.8422V3.03888C17.1406 3.43777 20.5622 6.85942 20.9611 11.1578H23V13.1578H20.9262C20.3933 17.3071 17.0348 20.572 12.8422 20.9611V23H10.8422ZM12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19Z',
  ArrowBackward:   'M10.6581 6.67326L9.23752 5.25L2.5 12L9.23752 18.75L10.6581 17.3267L6.34583 13.0064L21.5 13.0064V10.9937L6.34574 10.9937L10.6581 6.67326Z',
  ChevronDown:     'M2.5 7.91148L12 17.5L21.5 7.91148L20.1016 6.5L12 14.677L3.89845 6.5L2.5 7.91148Z',
  ChevronForward:  'M7.91148 2.5L17.5 12L7.91148 21.5L6.5 20.1016L14.677 12L6.5 3.89845L7.91148 2.5Z',
  ChevronBackward: 'M16.0885 2.5L6.5 12L16.0885 21.5L17.5 20.1016L9.32296 12L17.5 3.89845L16.0885 2.5Z',
  Close:           'M21 4.58663L19.5704 3L12.0052 10.4954L4.42957 3L3 4.58663L10.4817 12.0055L3 19.4134L4.42957 21L12.0052 13.5046L19.5704 21L21 19.4134L13.5183 12.0055L21 4.58663Z',
  Menu:            'M23 5H1V7H23V5ZM23 11H1V13H23V11ZM1 17H23V19H1V17Z',
  Mail:            'M1 4V20H23V4H1ZM19.62 6L12.03 12.94L4.52 6H19.62ZM3 7.32L8.05 11.98L3 16.36V7.32ZM4.17 18L9.56 13.37L10.68 14.41C11.07 14.78 11.58 14.97 12.08 14.97C12.58 14.97 13.08 14.78 13.48 14.41L14.63 13.35L20 18H4.17ZM21 16.22L16.11 11.98L21 7.46V16.22Z',
  Phone:           'M3.03586 11.3483C2.67862 10.1912 2.5 8.9761 2.5 8.10197C2.5 5.86118 3.67374 2.5 6.60811 2.5L10.2027 10.3428L6.73353 14.0609C7.59841 15.4308 8.70912 16.6104 10.1095 17.563L13.6572 14.3109L21.5 17.9055C21.5 20.4731 18.1388 21.5001 15.898 21.5001C14.2404 21.5001 11.3564 20.938 9.9677 19.814C6.74935 17.8801 4.10371 15.0917 3.03586 11.3483ZM5.54285 4.97594L7.8263 9.95802L5.62605 12.3162C5.49571 12.1112 5.35887 11.8502 5.2249 11.5305C4.74213 10.3784 4.5 8.9609 4.5 8.10197C4.5 7.27014 4.72971 6.23468 5.17674 5.47607C5.29513 5.27517 5.41675 5.1098 5.54285 4.97594ZM13.1143 19.0844C14.114 19.3605 15.1832 19.5001 15.898 19.5001C16.7713 19.5001 17.8433 19.2899 18.6227 18.888C18.6581 18.8698 18.6921 18.8516 18.7248 18.8336L14.0304 16.682L11.9398 18.5983C12.3151 18.7732 12.7064 18.9353 13.1143 19.0844Z',
  MapMarkerOnMap:  'M12 12C13.6716 12 15.0268 10.6569 15.0268 9C15.0268 7.34315 13.6716 6 12 6C10.3283 6 8.97314 7.34315 8.97314 9C8.97314 10.6569 10.3283 12 12 12ZM12 10C12.5572 10 13.0089 9.55228 13.0089 9C13.0089 8.44772 12.5572 8 12 8C11.4427 8 10.991 8.44772 10.991 9C10.991 9.55228 11.4427 10 12 10ZM5.03735 9C5.03735 13 9.64577 16.6667 12 18C14.3542 16.6667 18.9626 13 18.9626 9C18.9626 6.5 17.4492 2.5 12 2.5C6.45077 2.5 5.03735 6.5 5.03735 9ZM12 15.6362C11.0839 15.0128 10.0041 14.1502 9.07009 13.145C7.72041 11.6927 7.05524 10.2479 7.05524 9C7.05524 8.09491 7.33947 6.94831 8.05611 6.0709C8.70862 5.272 9.77404 4.5 12 4.5C14.2259 4.5 15.2913 5.272 15.9438 6.0709C16.6605 6.94831 16.9447 8.09491 16.9447 9C16.9447 10.2479 16.2795 11.6927 14.9299 13.145C13.9958 14.1502 12.916 15.0128 12 15.6362ZM7.15081 16.2408C7.57013 16.6002 7.61869 17.2315 7.25927 17.6508L5.67423 19.5H18.91L17.325 17.6508C16.9655 17.2315 17.0141 16.6002 17.4334 16.2408C17.8527 15.8813 18.484 15.9299 18.8435 16.3492L21.136 19.0238C21.97 19.9968 21.2786 21.5 19.9971 21.5H3.50001C3.10948 21.5 2.75469 21.2727 2.5915 20.9179C2.42832 20.5631 2.4866 20.1457 2.74076 19.8492L5.74076 16.3492C6.10018 15.9299 6.73148 15.8813 7.15081 16.2408Z',
  Building:        'M8 5H11V8H8V5ZM11 10H8V13H11V10ZM8 15H11V18H8V15ZM16 5H13V8H16V5ZM13 10H16V13H13V10ZM16 15H13V18H16V15ZM20 1V23H4V1H20ZM18 3H6V21H18V3Z',
  PersonSwimming:  'M15.8109 6.1899L12.6311 2.14539L6.4093 7.26881L7.41108 12.7786L5.28035 14.587L4.97079 14.8595C4.61294 14.963 4.26719 15.1216 3.94638 15.3351L2.44415 16.3351L3.55241 18L5.05464 17C5.62891 16.6177 6.37658 16.6177 6.95085 17C8.1964 17.8291 9.81804 17.8291 11.0636 17C11.6371 16.6182 12.3865 16.6184 12.9615 17.0011C14.2043 17.8284 15.8249 17.8305 17.0691 17.0022C17.6435 16.6199 18.3917 16.6215 18.9645 17.0062L20.4407 17.9977L21.5559 16.3374L20.0796 15.3459C18.8349 14.5099 17.209 14.5065 15.9609 15.3374C15.9233 15.3624 15.8849 15.3858 15.8458 15.4076L15.8665 15.3902L12.5283 11.416L12.1171 9.3667L15.8109 6.1899ZM12.7484 14.7877L10.668 12.3109L9.92604 8.61318L13.0558 5.92148L12.3232 4.98973L8.58709 8.06631L9.5853 13.5565L7.72381 15.1364C7.83812 15.1963 7.95006 15.2626 8.05911 15.3351C8.63338 15.7174 9.38105 15.7174 9.95532 15.3351C10.7925 14.7778 11.7999 14.5958 12.7484 14.7877ZM16.3192 11.9171C16.7563 12.404 17.5054 12.4443 17.9923 12.0072C18.4792 11.57 18.5195 10.8209 18.0823 10.334C17.6452 9.84714 16.8961 9.80682 16.4092 10.244C15.9223 10.6811 15.882 11.4302 16.3192 11.9171ZM14.831 13.2533C16.0061 14.5621 18.0197 14.6704 19.3285 13.4953C20.6372 12.3202 20.7456 10.3067 19.5705 8.99787C18.3954 7.68908 16.3818 7.5807 15.073 8.7558C13.7643 9.9309 13.6559 11.9445 14.831 13.2533ZM6.95085 20.5C6.37658 20.1177 5.62891 20.1177 5.05464 20.5L3.55241 21.5L2.44415 19.8351L3.94638 18.8351C5.19193 18.006 6.81357 18.006 8.05911 18.8351C8.63338 19.2174 9.38105 19.2174 9.95532 18.8351C11.2016 18.0055 12.8249 18.0076 14.0697 18.8363C14.6427 19.2177 15.3894 19.2178 15.9609 18.8374C17.209 18.0065 18.8349 18.0099 20.0796 18.8459L21.5559 19.8374L20.4407 21.4977L18.9645 20.5062C18.3917 20.1215 17.6435 20.1199 17.0691 20.5022C15.8249 21.3305 14.2043 21.3284 12.9615 20.5011C12.3865 20.1184 11.6371 20.1182 11.0636 20.5C9.81804 21.3291 8.1964 21.3291 6.95085 20.5Z',
  WaterLadder:     'M10.1478 2.1676C8.5304 2.1676 7.21923 3.47877 7.21923 5.09617V14.9182C6.13977 14.5437 4.92661 14.6827 3.94638 15.3352L2.44415 16.3352L3.55241 18L5.05464 17C5.62891 16.6178 6.37658 16.6178 6.95085 17C8.1964 17.8292 9.81804 17.8292 11.0636 17C11.6371 16.6182 12.3865 16.6184 12.9615 17.0012C14.2043 17.8284 15.8249 17.8305 17.0691 17.0023C17.6435 16.6199 18.3917 16.6215 18.9645 17.0062L20.4407 17.9977L21.5559 16.3375L20.0796 15.3459C19.1394 14.7144 17.9816 14.558 16.9335 14.8774V5.09617C16.9335 4.58334 17.3492 4.1676 17.8621 4.1676C18.3749 4.1676 18.7906 4.58334 18.7906 5.09617V5.73903H20.7906V5.09617C20.7906 3.47877 19.4795 2.1676 17.8621 2.1676C16.2447 2.1676 14.9335 3.47877 14.9335 5.09617V7.1676H9.21923V5.09617C9.21923 4.58334 9.63496 4.1676 10.1478 4.1676C10.6606 4.1676 11.0764 4.58334 11.0764 5.09617V5.73903H13.0764V5.09617C13.0764 3.47877 11.7652 2.1676 10.1478 2.1676ZM9.95532 15.3352C9.72971 15.4854 9.47734 15.5765 9.21923 15.6087V13.1676H14.9335V15.6205C14.6315 15.6058 14.3323 15.5111 14.0697 15.3363C12.8249 14.5076 11.2016 14.5056 9.95532 15.3352ZM14.9335 11.1676V9.1676H9.21923V11.1676H14.9335ZM6.95085 20.5C6.37658 20.1178 5.62891 20.1178 5.05464 20.5L3.55241 21.5L2.44415 19.8352L3.94638 18.8352C5.19193 18.006 6.81357 18.006 8.05911 18.8352C8.63338 19.2174 9.38105 19.2174 9.95532 18.8352C11.2016 18.0056 12.8249 18.0076 14.0697 18.8363C14.6427 19.2177 15.3894 19.2179 15.9609 18.8374C17.209 18.0066 18.8349 18.0099 20.0796 18.8459L21.5559 19.8375L20.4407 21.4977L18.9645 20.5062C18.3917 20.1215 17.6435 20.1199 17.0691 20.5023C15.8249 21.3305 14.2043 21.3284 12.9615 20.5012C12.3865 20.1184 11.6371 20.1182 11.0636 20.5C9.81804 21.3292 8.1964 21.3292 6.95085 20.5Z',
  Park:            'M18.7873 7.85723L19.1561 6.8933C19.2928 6.53616 19.3684 6.14708 19.3684 5.73684C19.3684 3.94918 17.9192 2.5 16.1316 2.5C14.3439 2.5 12.8947 3.94918 12.8947 5.73684C12.8947 6.14708 12.9703 6.53616 13.107 6.8933L13.4759 7.85722L12.7075 8.54623C11.6572 9.4879 11 10.8504 11 12.3684C11 14.9019 12.836 17.0066 15.25 17.4246V16.4246L13.1141 15.1431L13.8859 13.8569L15.25 14.6754V10H16.75V12.6893L17.9697 11.4697L19.0303 12.5303L16.75 14.8107V17.4631C19.2925 17.1577 21.2632 14.9932 21.2632 12.3684C21.2632 10.8504 20.6059 9.4879 19.5557 8.54623L18.7873 7.85723ZM16.75 18.9715C20.1226 18.6597 22.7632 15.8224 22.7632 12.3684C22.7632 10.4065 21.9112 8.64359 20.5571 7.42943C20.7582 6.90381 20.8684 6.33319 20.8684 5.73684C20.8684 3.12076 18.7477 1 16.1316 1C13.5155 1 11.3947 3.12076 11.3947 5.73684C11.3947 6.33319 11.5049 6.9038 11.7061 7.42942C10.352 8.64359 9.5 10.4065 9.5 12.3684C9.5 15.7321 12.0042 18.5108 15.25 18.9419V21H9.85848L9.47245 19.75H11.0588V18.25H9.04146L8.66646 16.75H9.38235V15.25H2.67647V16.75H3.39236L3.01736 18.25H1V19.75H2.58637L2.20034 21H1V23L23 23V21L16.75 21V18.9715ZM5.08274 16.75H6.97608L7.43931 18.25H4.61951L5.08274 16.75ZM4.15627 19.75H7.90255L8.28858 21H3.77024L4.15627 19.75Z',
  Leaf:            'M6.5286 15.0223C5.43862 13.1344 4.59575 9.57403 7.77616 6.37004C11.3825 2.73693 18.3911 2.31333 21.4446 2.55567C21.6859 4.89723 21.2639 10.5819 17.6446 14.5882C14.5625 17.9999 10.4757 17.3422 8.06459 16.2669C6.97232 17.5199 5.91146 18.9674 4.10517 21.5L2.5 20.3488C4.27211 17.8641 5.37888 16.3483 6.5286 15.0223ZM9.17098 7.76113C10.5738 6.34788 12.781 5.44398 15.2014 4.94791C16.7428 4.63199 18.2605 4.50392 19.5089 4.48202C19.3852 6.92601 18.6062 10.5854 16.1853 13.2652C14.8287 14.7669 13.2708 15.1984 11.7953 15.1507C10.9795 15.1243 10.1976 14.9484 9.52588 14.7151C10.4613 13.7889 11.6023 12.7597 13.2694 11.2746L11.9588 9.79515C10.2042 11.3582 8.98803 12.4545 7.96617 13.4797C7.74539 12.9686 7.56734 12.3454 7.52891 11.6687C7.46441 10.533 7.78206 9.16035 9.17098 7.76113Z',
  CheckMark:       'M8.64233 17.0316L20.0136 4L21.5 5.30419L8.67655 20L2.5 13.2434L3.95594 11.9051L8.64233 17.0316Z',
  List:            'M2 7C2.55228 7 3 6.55228 3 6C3 5.44772 2.55228 5 2 5C1.44772 5 1 5.44772 1 6C1 6.55228 1.44772 7 2 7ZM5 7H23V5H5V7ZM23 13H5V11H23V13ZM2 13C2.55228 13 3 12.5523 3 12C3 11.4477 2.55228 11 2 11C1.44772 11 1 11.4477 1 12C1 12.5523 1.44772 13 2 13ZM23 19H5V17H23V19ZM2 19C2.55228 19 3 18.5523 3 18C3 17.4477 2.55228 17 2 17C1.44772 17 1 17.4477 1 18C1 18.5523 1.44772 19 2 19Z',
  Grid:            'M5.5 21.5C3.84314 21.5 2.5 20.1569 2.5 18.5V5.5C2.5 3.84315 3.84315 2.5 5.5 2.5H18.5C20.1569 2.5 21.5 3.84315 21.5 5.5V18.5C21.5 20.1569 20.1569 21.5 18.5 21.5H5.5ZM15.7632 19.5V15.9605H19.5V18.5C19.5 19.0523 19.0523 19.5 18.5 19.5H15.7632ZM19.5 5.5C19.5 4.94772 19.0523 4.5 18.5 4.5H15.7632V8.43421H19.5V5.5ZM15.7632 13.9605V10.4342H19.5V13.9605H15.7632ZM13.7632 10.4342H10.2368V13.9605H13.7632V10.4342ZM13.7632 4.5H10.2368V8.43421H13.7632V4.5ZM13.7632 15.9605H10.2368V19.5H13.7632V15.9605ZM8.23681 13.9605H4.5V10.4342H8.23681V13.9605ZM8.23681 8.43421H4.5V5.5C4.5 4.94772 4.94772 4.5 5.5 4.5H8.23681V8.43421ZM8.23681 19.5H5.5C4.94772 19.5 4.5 19.0523 4.5 18.5V15.9605H8.23681V19.5Z',
  Map:             'M8.5 15.7679L4.5 18.0536V8.0919L8.5 5.52047V15.7679ZM10.5 15.7388L13.5 18.1388V7.74131L10.5 5.64131V15.7388ZM14.5 6L21.5 2.5V17L14.5 21.5L9.5 17.5L2.5 21.5V7L9.5 2.5L14.5 6ZM15.5 18.4795L19.5 15.9081V5.73607L15.5 7.73607V18.4795Z',
  Plus:            'M11 13V21.5H13V13H21.5V11H13V2.5H11V11H2.5V13H11Z',
  WaterDrop:       'M12 2.5C9 7 4.5 12 4.5 16.5a7.5 7.5 0 0 0 15 0C19.5 12 15 7 12 2.5Z',
};

/**
 * Render an Amsterdam Design System SVG icon as an HTML string.
 * @param {string} key - Icon name matching a key in ADS_ICON_PATHS.
 * @param {{size?: number, fill?: string, cls?: string}} [opts]
 * @returns {string} Inline `<svg>` HTML, or empty string for unknown keys.
 */
function adsIcon(key, { size = 16, fill = "currentColor", cls = "" } = {}) {
  const d = ADS_ICON_PATHS[key];
  if (!d) return "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" aria-hidden="true"${cls ? ` class="${cls}"` : ""}><path d="${d}"/></svg>`;
}

// ── Layer definitions ──────────────────────────────────────────────────────
const LAYER_DEFS = [
  { cat: "koelteplekken",  label: "Koelteplekken",   color: "#004699",   type: "geojson", radius: 8 },
  { cat: "water_taps",     label: "Water fountains",  color: "#009de6",   src: "data/layers/water-taps.geojson",  type: "geojson", radius: 4 },
  { cat: "parks",          label: "Parks",            color: "#00893c",   src: "data/layers/parks.json",          type: "polygon" },
  { cat: "swimming_pools", label: "Swimming spots",   color: "#009de6",   src: "data/layers/swimming-spots.geojson",   type: "geojson", radius: 6 },
  { cat: "shade",          label: "Sidewalk shade",   color: "#004699",   type: "shade" },
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
  theater:          "#e50082",  // Amsterdam magenta
  default:          "#004699",  // Amsterdam dark blue
};

// Amsterdam brand palette used for auto-assigning colors to new/unknown categories
const AMSTERDAM_PALETTE = [
  "#004699", "#a00078", "#00893c", "#bed200", "#ff9100",
  "#e50082", "#009de6", "#ffe600", "#ec0000", "#202020",
];
let _paletteIndex = Object.keys(CATEGORY_COLORS).filter(k => k !== "default").length;

/** Return the color for a given location type. Auto-assigns from Amsterdam palette for unknown types. */
/**
 * Return the brand colour for a koelteplaats category.
 * Unknown categories are auto-assigned from the Amsterdam palette and cached.
 * @param {string|null} type - Category key (e.g. "library", "church").
 * @returns {string} Hex colour string.
 */
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
    search_placeholder_short: "Zoeken…",
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
    website_hours: "Website",
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
    search_placeholder_short: "Search…",
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
    website_hours: "Website",
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
  on: { koelteplekken: true, water_taps: true, parks: true, swimming_pools: true, shade: false },
  features: { koelteplekken: [], water_taps: [], parks: [], swimming_pools: [] },
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
  if (hlAccent) {
    if (state.lang === "nl") {
      hlAccent.innerHTML = '<span class="li-hl-u">Vind verkoelin</span>g.';
    } else {
      hlAccent.innerHTML = '<span class="li-hl-u">Find relief</span>.';
    }
  }
  document.querySelectorAll("[data-tooltip-i18n]").forEach(el => {
    const key = el.dataset.tooltipI18n;
    if (key) { el.setAttribute("data-tooltip", t(key)); el.setAttribute("aria-label", t(key)); }
  });
  updateSearchPlaceholder();
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

/**
 * Initialise the heat-plan status banner and start polling Google Sheets
 * every 5 minutes for live updates to heat_plan_active and label overrides.
 */
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

/**
 * Determine whether a location is currently open, closed, or has unknown hours.
 * @param {string[]|null} hours - 7-element array of "HH:MM-HH:MM" slots indexed
 *   Mon=0…Sun=6, or null/undefined if hours are unknown.
 * @returns {{status: "open"|"closed"|"unknown", closesAt?: string, opensAt?: string, nextDay?: number}}
 */
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

/**
 * Build a DOM element displaying a weekly opening-hours table plus a
 * current open/closed status badge.
 * @param {string[]|null} hours - Same format as accepted by getOpenStatus.
 * @returns {HTMLElement} A `<div class="hours-wrap">` ready to insert into the DOM.
 */
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

  // Custom panes: parks < points
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
/**
 * Parse a CSV string into an array of row objects keyed by header names.
 * Handles quoted fields, embedded commas, and Windows/Unix line endings.
 * Strips a leading UTF-8 BOM if present.
 * @param {string} text - Raw CSV text.
 * @returns {Object[]} Array of row objects.
 */
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
/**
 * Convert one Google Sheet CSV row into a GeoJSON Feature.
 * Normalises field names, parses opening hours, resolves Google Drive photo
 * URLs, and booleanises amenity columns.
 * @param {Object} row - A parsed CSV row object.
 * @returns {Object|null} GeoJSON Feature, or null if lat/lon are missing.
 */
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
      const col = isActive ? typeColor : "#767676";
      const cls = isActive ? "koelte-marker" : "koelte-marker koelte-marker--inactive";
      const icon = L.divIcon({
        className: "",
        html: `<div class="${cls}" style="--mc:${col}"></div>`,
        iconSize:    [26, 26],
        iconAnchor:  [13, 13],
        popupAnchor: [0, -13],
      });
      return L.marker(ll, { icon });
    },
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const isActive = p.active !== false;
      const col = isActive ? getCategoryColor(p.type) : "#767676";
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
  const t = Math.min(1, Math.max(0, pct / 100));
  if (t >= 0.5) {
    // In shade — dark navy overlay, opacity proportional to shade
    return { fillColor: "#004699", fillOpacity: (t - 0.5) * 2 * 0.65, color: "transparent", weight: 0 };
  } else {
    // In full sun — warm yellow overlay, opacity proportional to sunlight
    return { fillColor: "#ffe600", fillOpacity: (0.5 - t) * 2 * 0.30, color: "transparent", weight: 0 };
  }
}

// Prefetch promise — resolved with the GeoJSON or null on error
const _shadePromise = {};

function _prefetchShade() {
  const key = _nearestShadeSlot();
  if (_shadePromise[key]) return;
  _shadePromise[key] = fetch(`data/shade-${key}.geojson`)
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

function makeSwimmingSquareIcon(color = "#009de6") {
  return L.divIcon({
    className: "swim-icon-marker",
    html: `<div style="width:22px;height:22px;background:${color};border:2.5px solid rgba(255,255,255,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 5px rgba(0,0,0,0.28);box-sizing:border-box;">${adsIcon("PersonSwimming", { size: 12, fill: "white" })}</div>`,
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
/**
 * Recompute the floating filter badge count and refresh the active-filter
 * chip strip shown on mobile. Called after any filter state change.
 * Badge counts: active category chips + active amenity filters +
 *   active swim-type filters + default-ON layers that were turned off.
 */
function renderMobileFilterBar() {
  const stripEl = document.getElementById("mfb-active-strip");
  const fabCount = document.getElementById("fab-active-count");

  // Count active filters: active categories + active amenities + active swim types + off-layers
  let count = 0;
  count += state.activeCategories.size;
  count += Object.values(state.filters).filter(Boolean).length;
  count += Object.values(state.swimTypes || {}).filter(Boolean).length;
  const DEFAULT_ON_CATS = new Set(["koelteplekken", "water_taps", "parks", "swimming_pools"]);
  count += LAYER_DEFS.filter(d => DEFAULT_ON_CATS.has(d.cat) && state.on[d.cat] === false).length;

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

  // Off-layers in strip (only show default-on layers that were turned off)
  const _DEFAULT_ON_CATS = new Set(["koelteplekken", "water_taps", "parks", "swimming_pools"]);
  LAYER_DEFS.filter(d => _DEFAULT_ON_CATS.has(d.cat) && state.on[d.cat] === false).forEach(def => {
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

  updateClearFiltersBtn();
}

// ── Mobile filter bar collapse — no longer needed (sidebar bottom-sheet used instead)
/** Show/hide both clear-filter controls based on whether any filters are active. */
function updateClearFiltersBtn() {
  const hasActiveFilters =
    state.activeCategories.size > 0 ||
    Object.values(state.filters).some(Boolean) ||
    Object.values(state.swimTypes || {}).some(Boolean) ||
    LAYER_DEFS.some(d => ["koelteplekken","water_taps","parks","swimming_pools"].includes(d.cat) && !state.on[d.cat]);
  const headerBtn = document.getElementById("btn-clear-filters");
  if (headerBtn) headerBtn.hidden = !hasActiveFilters;
  const row = document.getElementById("filter-clear-row");
  if (row) row.hidden = !hasActiveFilters;
}

function clearAllFilters() {
  // Reset all category, amenity, and swim-type filters
  state.activeCategories.clear();
  Object.keys(state.filters).forEach(k => { state.filters[k] = false; });
  Object.keys(state.swimTypes || {}).forEach(k => { state.swimTypes[k] = false; });

  // Restore all default-ON layers if they were turned off
  ["koelteplekken","water_taps","parks","swimming_pools"].forEach(cat => {
    if (!state.on[cat]) {
      state.on[cat] = true;
      const row = document.querySelector(`.layer-row[data-cat="${cat}"]`);
      if (row) { row.classList.add("on"); row.setAttribute("aria-checked","true"); }
      if (state.layers[cat]) state.map.addLayer(state.layers[cat]);
    }
  });

  // Re-sync chip UI states
  setupCategoryFilter();
  rebuildFilterChips();
  rebuildSwimmingPoolChips();
  rebuildKoelteplekkenLayer();
  rebuildSwimmingPoolsLayer();
  renderMobileFilterBar();
  updateClearFiltersBtn();
  refreshListIfActive();
}

function setupClearFilters() {
  // Two triggers: the mobile header pill and the desktop sidebar text link
  ["btn-clear-filters", "btn-clear-filters-desktop"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", clearAllFilters);
  });
}

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
    // Show the panel full-screen on mobile; mark as detail view to hide FAB
    if (listEl) listEl.hidden = false;
    document.body.classList.add("mobile-panel-open", "mobile-detail-open");
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
      document.body.classList.remove("mobile-panel-open", "mobile-detail-open");
      state.mobileView = "map";
      document.querySelectorAll(".view-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.view === "map");
        b.setAttribute("aria-pressed", b.dataset.view === "map" ? "true" : "false");
      });
      requestAnimationFrame(() => { if (state.map) state.map.invalidateSize(); });
      return;
    }
    // Return to list — panel stays open but clear detail-specific class
    document.body.classList.remove("mobile-detail-open");
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
/**
 * Open the right-side detail panel for the given GeoJSON feature.
 * On desktop, auto-expands the panel if it was collapsed.
 * On mobile, switches to the panel view.
 * @param {Object} feature - GeoJSON Feature to display.
 * @param {Function} renderFn - Function(feature, containerEl) that populates the panel.
 */
function openDetailPanel(feature, renderFn) {
  // Auto-expand right panel if collapsed
  const section = document.getElementById("map-section");
  if (section && isDesktop() && section.classList.contains("right-panel-collapsed")) {
    section.classList.remove("right-panel-collapsed");
    const btn = document.getElementById("right-panel-toggle");
    if (btn) { btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Locatiepaneel inklappen"); }
    setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 260);
  }
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
    a.innerHTML = `${adsIcon("MapMarkerOnMap", { size: 13, fill: "white" })}${t("website_hours")}`;
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
  iconBadge.innerHTML = adsIcon("WaterDrop", { size: 22, fill: col });
  hdrInfo.append(catLbl, nameEl);
  hdrRow.append(hdrInfo, iconBadge);
  info.appendChild(hdrRow);

  const grid = document.createElement("div"); grid.className = "prop-grid";
  grid.append(
    cell(t("status"),     translateTapStatus(p.Status)),
    cell(t("type_label"), translateTapType(p["Subtype afnamepunt"])),
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
  iconBadge.innerHTML = adsIcon("Park", { size: 22, fill: col });
  hdrInfo.append(catLbl, nameEl);
  hdrRow.append(hdrInfo, iconBadge);
  info.appendChild(hdrRow);

  const grid = document.createElement("div"); grid.className = "prop-grid";
  const area = p.Oppervlakte_m2
    ? (p.Oppervlakte_m2 >= 10000 ? (p.Oppervlakte_m2 / 10000).toFixed(1) + " ha" : p.Oppervlakte_m2.toLocaleString() + " m²")
    : null;
  grid.append(cell(t("district"), p.Stadsdeel), cell(t("area"), area), cell(t("city_park"), p.Stadspark === "J" ? t("yes") : t("no")));
  info.appendChild(grid);

  // Navigation: compute centroid of the polygon for directions
  const geom = feature.geometry;
  if (geom) {
    let lat, lon;
    if (geom.type === "Point") {
      [lon, lat] = geom.coordinates;
    } else {
      const ring = geom.type === "Polygon" ? geom.coordinates[0]
                 : geom.type === "MultiPolygon" ? geom.coordinates[0][0] : null;
      if (ring) {
        lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
        lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      }
    }
    if (lat && lon) {
      const actions = document.createElement("div"); actions.className = "detail-actions";
      actions.appendChild(makeDirectionsBtn(lat, lon));
      info.appendChild(actions);
    }
  }

  body.appendChild(info);
  container.appendChild(body);
}


function showTapDetail(feature)  { openDetailPanel(feature, renderTapDetailContent);  }
function showParkDetail(feature) { openDetailPanel(feature, renderParkDetailContent); }

function renderSwimmingPoolDetailContent(feature, container) {
  const p = feature.properties || {};
  const swimType = getSwimTypeDef(swimCategory(p));
  const col = "#009de6";

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
  iconBadge.innerHTML = adsIcon("PersonSwimming", { size: 22, fill: col });
  hdrInfo.append(catLbl, nameEl);
  hdrRow.append(hdrInfo, iconBadge);
  info.appendChild(hdrRow);

  const grid = document.createElement("div"); grid.className = "prop-grid";
  grid.append(cell(t("type_label"), state.lang === "nl" ? swimType.label_nl : swimType.label_en));
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
  a.innerHTML = `${adsIcon("CrossHair", { size: 13, fill: "white" })}${t("get_directions")}`;
  return a;
}

// ── Search placeholder — short version when input is too narrow ────────────
/**
 * Switch the search input placeholder between the full and short versions
 * based on the current pixel width of the search wrapper.
 * Called by a ResizeObserver so it tracks sidebar-toggle and window-resize.
 */
function updateSearchPlaceholder() {
  const si   = document.getElementById("search-input");
  const wrap = document.getElementById("search-wrap");
  if (!si || !wrap) return;
  const short = wrap.offsetWidth < 180;
  si.placeholder = t(short ? "search_placeholder_short" : "search_placeholder");
}

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

  // Update placeholder when the search wrap resizes (sidebar toggle, window resize)
  if (typeof ResizeObserver !== "undefined") {
    const wrap = document.getElementById("search-wrap");
    if (wrap) new ResizeObserver(updateSearchPlaceholder).observe(wrap);
  }
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
  setupClearFilters();
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
