/**
 * Hop usage options with display mapping and default times
 * All time values are stored in minutes for consistency with the database
 */
export const HOP_USAGE_OPTIONS = [
  { value: "boil", display: "Boil", defaultTime: 60 },
  { value: "whirlpool", display: "Whirlpool", defaultTime: 15 },
  { value: "dry-hop", display: "Dry Hop", defaultTime: 4320 }, // 3 days in minutes (more typical for dry hopping)
] as const;

/**
 * Preset time options for hops based on usage type (all values in minutes for database storage)
 */
export const HOP_TIME_PRESETS = {
  boil: [
    { label: "90 min", value: 90 },
    { label: "60 min", value: 60 },
    { label: "45 min", value: 45 },
    { label: "30 min", value: 30 },
    { label: "15 min", value: 15 },
    { label: "10 min", value: 10 },
    { label: "5 min", value: 5 },
    { label: "0 min", value: 0 },
  ],
  whirlpool: [
    { label: "30 min", value: 30 },
    { label: "20 min", value: 20 },
    { label: "15 min", value: 15 },
    { label: "10 min", value: 10 },
    { label: "5 min", value: 5 },
    { label: "0 min", value: 0 },
  ],
  "dry-hop": [
    { label: "7 days", value: 7 * 1440 }, // 7 days in minutes
    { label: "5 days", value: 5 * 1440 }, // 5 days in minutes
    { label: "4 days", value: 4 * 1440 }, // 4 days in minutes
    { label: "3 days", value: 3 * 1440 }, // 3 days in minutes
    { label: "2 days", value: 2 * 1440 }, // 2 days in minutes
    { label: "1 day", value: 1 * 1440 }, // 1 day in minutes
  ],
} as const;

/**
 * Type definitions for hop usage and time presets
 */
export type HopUsageValue = (typeof HOP_USAGE_OPTIONS)[number]["value"];
export type HopTimePresetKey = keyof typeof HOP_TIME_PRESETS;
