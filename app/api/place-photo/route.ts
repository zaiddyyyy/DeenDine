import { NextRequest } from "next/server";

// Proxies Google Places photo requests server-side so the API key never
// reaches the browser. `name` is the opaque Places photo resource name
// (e.g. "places/<id>/photos/<ref>") stored in lib/google-places-data.json —
// it is not a secret, only the API key used to fetch it is.
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const maxWidth = request.nextUrl.searchParams.get("w") ?? "900";

  if (!name || !name.startsWith("places/")) {
    return new Response("Invalid photo name", { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response("Photo service not configured", { status: 503 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${encodeURIComponent(maxWidth)}&key=${apiKey}`,
    );
  } catch {
    return new Response("Upstream photo service unreachable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Photo not found", { status: 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
