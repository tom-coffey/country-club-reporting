import nameMap from "@/config/name_map.json";

const nameMapping: Record<string, string> = nameMap;

/**
 * Normalize a golfer name to canonical form.
 * Strips diacritics, checks the mapping table, and falls back to the original.
 */
export function normalizeName(name: string): string {
  // Direct lookup first
  if (nameMapping[name]) return nameMapping[name];

  // Strip diacritics and try again
  const stripped = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (nameMapping[stripped]) return nameMapping[stripped];

  // Case-insensitive lookup
  const lower = stripped.toLowerCase();
  for (const [key, value] of Object.entries(nameMapping)) {
    const keyNorm = key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (keyNorm === lower) return value;
  }

  return stripped;
}
