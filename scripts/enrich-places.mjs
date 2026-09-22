// One-time enrichment script: looks up each seed restaurant in the Google
// Places API (New) Text Search endpoint to pull verified ratings, review
// counts, coordinates, addresses, and photo references. Writes the result to
// lib/google-places-data.json, which is safe to commit (place IDs and photo
// resource names are not secrets). The API key itself is read from the
// environment and never written to disk.
//
// Usage: GOOGLE_PLACES_API_KEY=... node scripts/enrich-places.mjs

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "lib", "google-places-data.json");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("Missing GOOGLE_PLACES_API_KEY in environment.");
  process.exit(1);
}

// Mirrors lib/restaurants.ts (id, name, address) — kept as a plain list here
// so this script has no dependency on TypeScript tooling.
const RESTAURANTS = [
  { id: "karachi-chaat-house", name: "Karachi Chaat House", address: "2301 W Devon Ave, Chicago, IL 60659" },
  { id: "usmania-fine-dining", name: "Usmania Fine Dining", address: "2244 W Devon Ave, Chicago, IL 60659" },
  { id: "spinzer-restaurant", name: "Spinzer Restaurant", address: "Devon Ave near Western Ave, Chicago, IL" },
  { id: "ghareeb-nawaz", name: "Ghareeb Nawaz Restaurant", address: "2032 W Devon Ave, Chicago, IL 60659" },
  { id: "new-naan-on-devon", name: "New Naan on Devon", address: "2241 W Devon Ave, Chicago, IL 60659" },
  { id: "sultans-market", name: "Sultan's Market", address: "Milwaukee Ave & North Ave, Chicago, IL" },
  { id: "semiramis", name: "Semiramis", address: "Lincoln Ave, Chicago, IL" },
  { id: "kabul-house", name: "Kabul House", address: "Davis St, Evanston, IL" },
  { id: "jarasa-kabob", name: "Jarasa Kabob", address: "Oakton St area, Skokie, IL" },
  { id: "sheikhs-n-burgers", name: "Sheikhs N Burgers", address: "Skokie, IL" },
  { id: "afghan-kabob-skokie", name: "Afghan Kabob", address: "Dempster St, Skokie, IL" },
  { id: "byrds-hot-chicken", name: "Byrd's Hot Chicken", address: "Skokie, IL" },
  { id: "barakat-restaurant", name: "Barakat Restaurant", address: "Schaumburg, IL" },
  { id: "ali-baba-kabab", name: "Ali Baba Kabab", address: "Roselle Rd, Schaumburg, IL" },
  { id: "curry-naanstop", name: "Curry NaanStop", address: "338 E Rand Rd, Mount Prospect, IL 60004" },
  { id: "uyghur-lagman-house", name: "Uyghur Lagman House", address: "Arlington Heights, IL" },
  { id: "mazmez-grill", name: "MazMez Middle Eastern Grill", address: "Elk Grove Village, IL" },
  { id: "a-thousand-tales", name: "A Thousand Tales", address: "Des Plaines, IL" },
  { id: "jk-kabab", name: "JK Kabab", address: "572 Weston Ridge Dr, Naperville, IL" },
  { id: "habibi-shawarma", name: "Habibi Shawarma", address: "Naperville, IL" },
  { id: "halal-express-villa-park", name: "Halal Express", address: "17W731 Roosevelt Rd, Villa Park, IL" },
  { id: "biryani-pointe", name: "Biryani Pointe", address: "40 W Roosevelt Rd, Lombard, IL" },
  { id: "tapri", name: "Tapri", address: "Naperville, IL" },
  { id: "al-bawadi-grill", name: "Al Bawadi Grill", address: "7216 W 87th St, Bridgeview, IL 60455" },
  { id: "nariman-restaurant", name: "Nariman Restaurant", address: "8312 S Harlem Ave, Bridgeview, IL" },
  { id: "krave-restaurant", name: "Krave Restaurant", address: "Bridgeview, IL" },
  { id: "mdakhan", name: "M'daKhan", address: "9115 S Harlem Ave, Bridgeview, IL 60455" },
  { id: "holy-buckets", name: "Holy Buckets Halal Chicken & Pizza", address: "7331 W 87th St, Bridgeview, IL" },
  { id: "alasala", name: "Alasala", address: "Bridgeview, IL" },
  { id: "semsem-mediterranean", name: "SemSem Mediterranean", address: "Orland Park, IL" },
  { id: "brooklyn-halal", name: "Brooklyn Halal Grilled Chicken & Pizza", address: "Tinley Park, IL" },
  { id: "nazs-halal-food", name: "Naz's Halal Food", address: "Tinley Park, IL" },
  { id: "hakuna-matata", name: "Hakuna Matata", address: "Orland Park, IL" },
  { id: "wow-halal-grill", name: "Wow Halal Grill & Pizza", address: "Tinley Park, IL" },
  { id: "usmania-chinese", name: "Usmania Chinese Restaurant", address: "2253 W Devon Ave, Chicago, IL 60659" },
  { id: "faiza-chicago", name: "Faiza Chicago", address: "3315 W Bryn Mawr Ave, Chicago, IL 60659" },
  { id: "euroasia-restaurant", name: "EuroAsia Restaurant", address: "351 W Oak St, Chicago, IL 60610" },
  { id: "ruman-chai-shai", name: "Ruman Chai Shai & Restaurant", address: "6348 N Artesian Ave, Chicago, IL 60659" },
  { id: "chayhana", name: "Chayhana", address: "1812 W Irving Park Rd, Chicago, IL 60613" },
  { id: "halal-burger-lombard", name: "The Halal Burger", address: "916 E Roosevelt Rd, Lombard, IL 60148" },
  { id: "taste-on-fire", name: "Taste On Fire", address: "4209 Main St, Skokie, IL 60076" },
  { id: "halal-burger-original", name: "The Halal Burger", address: "6234 N California Ave, Chicago, IL 60659" },
  { id: "halal-burger-skokie", name: "The Halal Burger", address: "3457 Dempster St, Skokie, IL 60076" },
  { id: "halal-pizza-point", name: "Halal Pizza Point", address: "5230 Dempster St, Skokie, IL 60077" },
  { id: "slaw-burger-schaumburg", name: "Slaw Burger", address: "1332 N Roselle Rd, Schaumburg, IL 60195" },
  { id: "shahs-halal-food", name: "Shah's Halal Food", address: "9920 S Ridgeland Ave, Chicago Ridge, IL 60415" },
  { id: "salt-burgers-fries", name: "SALT burgers + fries", address: "1920 W North Ave, Chicago, IL 60622" },
  { id: "ghareeb-nawaz-lombard", name: "Ghareeb Nawaz", address: "833 E Roosevelt Rd, Lombard, IL 60148" },
  { id: "ghareeb-nawaz-lincoln-park", name: "Ghareeb Nawaz", address: "2364 N Lincoln Ave, Chicago, IL 60614" },
  { id: "ghareeb-nawaz-uic", name: "Ghareeb Nawaz", address: "807 W Roosevelt Rd, Chicago, IL 60608" },
  { id: "ghareeb-nawaz-ohare", name: "Ghareeb Nawaz", address: "2685 Mannheim Rd, Des Plaines, IL 60018" },
  { id: "tandoor-char-house-lincoln-park", name: "Tandoor Char House", address: "2652 N Halsted St, Chicago, IL 60614" },
  { id: "tandoor-char-house-ukrainian-village", name: "Tandoor Char House", address: "1022 N Western Ave, Chicago, IL 60622" },
  { id: "daves-hot-chicken-melrose-park", name: "Dave's Hot Chicken", address: "2615 W North Ave, Melrose Park, IL 60160" },
  { id: "daves-hot-chicken-schaumburg", name: "Dave's Hot Chicken", address: "1330 E Golf Rd, Schaumburg, IL 60173" },
  { id: "daves-hot-chicken-chicago", name: "Dave's Hot Chicken", address: "3643 N Western Ave, Chicago, IL 60618" },
  { id: "daves-hot-chicken-skokie", name: "Dave's Hot Chicken", address: "5530 W Touhy Ave, Skokie, IL 60077" },
  { id: "daves-hot-chicken-arlington-heights", name: "Dave's Hot Chicken", address: "115 W Rand Rd C, Arlington Heights, IL 60004" },
  { id: "naf-naf-rosemont", name: "Naf Naf Middle Eastern Grill", address: "10433 E Touhy Ave, Rosemont, IL 60018" },
  { id: "naf-naf-oakbrook-terrace", name: "Naf Naf Middle Eastern Grill", address: "17W746 W 22nd St, Oakbrook Terrace, IL 60181" },
  { id: "naf-naf-loop-wabash", name: "Naf Naf Middle Eastern Grill", address: "28 S Wabash Ave, Chicago, IL 60603" },
  { id: "naf-naf-loop-washington", name: "Naf Naf Middle Eastern Grill", address: "309 W Washington St, Chicago, IL 60606" },
  { id: "naf-naf-south-loop", name: "Naf Naf Middle Eastern Grill", address: "1248 S Canal St, Chicago, IL 60607" },
];

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.photos.name",
  "places.photos.widthPx",
  "places.photos.heightPx",
].join(",");

async function lookupPlace(restaurant) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${restaurant.name}, ${restaurant.address}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const place = data.places?.[0];
  if (!place) return null;

  return {
    placeId: place.id,
    matchedName: place.displayName?.text ?? null,
    formattedAddress: place.formattedAddress ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    websiteUri: place.websiteUri ?? null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? null,
    photos: (place.photos ?? []).slice(0, 3).map((photo) => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
    })),
  };
}

async function main() {
  const results = {};
  const misses = [];

  for (const restaurant of RESTAURANTS) {
    process.stdout.write(`Looking up ${restaurant.name}... `);
    try {
      const match = await lookupPlace(restaurant);
      if (!match) {
        console.log("NO MATCH");
        misses.push(restaurant.id);
        continue;
      }
      results[restaurant.id] = match;
      console.log(`OK (${match.matchedName}, ${match.rating}★, ${match.userRatingCount} reviews)`);
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
      misses.push(restaurant.id);
    }
    // Be polite to the API rather than firing 34 requests at once.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2) + "\n", "utf-8");
  console.log(`\nWrote ${Object.keys(results).length} entries to ${OUTPUT_PATH}`);
  if (misses.length) {
    console.log(`No confident match for: ${misses.join(", ")}`);
  }
}

main();
