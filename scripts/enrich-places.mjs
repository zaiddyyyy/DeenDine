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
  { id: "ghareeb-nawaz", name: "Ghareeb Nawaz", address: "Devon Ave, Chicago, IL 60659" },
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
  { id: "mdakhan", name: "M'daKhan", address: "Bridgeview, IL" },
  { id: "holy-buckets", name: "Holy Buckets Halal Chicken & Pizza", address: "7331 W 87th St, Bridgeview, IL" },
  { id: "alasala", name: "Alasala", address: "Bridgeview, IL" },
  { id: "semsem-mediterranean", name: "SemSem Mediterranean", address: "Orland Park, IL" },
  { id: "brooklyn-halal", name: "Brooklyn Halal Grilled Chicken & Pizza", address: "Tinley Park, IL" },
  { id: "nazs-halal-food", name: "Naz's Halal Food", address: "Tinley Park, IL" },
  { id: "hakuna-matata", name: "Hakuna Matata", address: "Orland Park, IL" },
  { id: "wow-halal-grill", name: "Wow Halal Grill & Pizza", address: "Tinley Park, IL" },
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
