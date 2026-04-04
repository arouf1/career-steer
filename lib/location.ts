import { v } from "convex/values";

export const locationValidator = v.union(
  v.string(),
  v.object({ display: v.string(), canonical: v.string() }),
);

export type LocationValue = string | { display: string; canonical: string };

export function getLocationDisplay(location: LocationValue): string {
  if (typeof location === "string") return location;
  return location.display;
}

/**
 * Returns the SerpAPI-compatible canonical location string.
 * Plain strings (legacy profiles) are NOT valid SerpAPI locations,
 * so we return empty string for those -- the search will run globally.
 */
export function getLocationCanonical(location: LocationValue): string {
  if (typeof location === "string") return "";
  return location.canonical;
}
