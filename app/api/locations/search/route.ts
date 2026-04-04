import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SerpAPI key not configured" },
      { status: 500 },
    );
  }

  const url = new URL("https://serpapi.com/locations.json");
  url.searchParams.set("q", q.trim());
  url.searchParams.set("limit", "5");

  const response = await fetch(url.toString());
  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 502 },
    );
  }

  const data = (await response.json()) as Array<{
    id: string;
    name: string;
    canonical_name: string;
    country_code: string;
    target_type: string;
    reach: number;
    gps?: [number, number];
  }>;

  const seen = new Set<string>();
  const locations: Array<{
    id: string;
    name: string;
    canonicalName: string;
    countryCode: string;
    targetType: string;
  }> = [];

  for (const loc of data) {
    if (loc.target_type !== "City") continue;
    const canonical = loc.canonical_name.replace(/,/g, ", ");
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push({
      id: loc.id,
      name: loc.name,
      canonicalName: canonical,
      countryCode: loc.country_code,
      targetType: loc.target_type,
    });
  }

  return NextResponse.json(locations);
}
