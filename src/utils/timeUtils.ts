/**
 * Time conversion and formatting utilities for hop timing
 *
 * Follows the same patterns as BrewTracker web frontend:
 * - All hop times stored in minutes in database for consistency
 * - Dry hops displayed in days for better UX
 * - Regular hops displayed in minutes
 */

// Normalize hop use strings and centralize dry-hop detection
const MINUTES_PER_DAY = 1440;
const normalizeHopUse = (u: string) =>
  u
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
const isDryHop = (u: string) => normalizeHopUse(u) === "dry-hop";

/**
 * Convert days to minutes for database storage
 * @param days Number of days
 * @returns Number of minutes (1440 minutes per day)
 */
export function convertDaysToMinutes(days: number): number {
  return Math.round(days * MINUTES_PER_DAY);
}

/**
 * Convert minutes to days for display
 * @param minutes Number of minutes
 * @returns Number of days (rounded to 1 decimal place)
 */
export function convertMinutesToDays(minutes: number): number {
  return Math.round((minutes / MINUTES_PER_DAY) * 10) / 10;
}

/**
 * Format hop time for display based on usage type
 * @param timeInMinutes Time stored in database (always minutes)
 * @param hopUse Hop usage type ('dry hop', 'boil', etc.)
 * @returns Formatted time string with appropriate unit
 */
export function formatHopTime(
  timeInMinutes: number | string | null | undefined,
  hopUse: string
): string {
  if (timeInMinutes === null || timeInMinutes === undefined) {
    return "—";
  }

  const numTime =
    typeof timeInMinutes === "number"
      ? timeInMinutes
      : parseFloat(timeInMinutes.toString());

  if (isNaN(numTime) || numTime < 0) {
    return "—";
  }

  // Dry hops should be displayed in days
  if (isDryHop(hopUse)) {
    const days = convertMinutesToDays(numTime);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  // All other hops displayed in minutes
  return `${Math.round(numTime)} min`;
}

/**
 * Get the appropriate default time value for hop usage type
 * @param hopUse Hop usage type
 * @param inMinutes Whether to return in minutes (for storage) or display units
 * @returns Default time value
 */
export function getDefaultHopTime(
  hopUse: string,
  inMinutes: boolean = false
): number {
  const defaultTimes = {
    Boil: 60, // minutes
    "Dry Hop": 3, // days (display) or 4320 minutes (storage)
    Whirlpool: 15, // minutes
    "First Wort": 60, // minutes
    Mash: 60, // minutes
  };

  let defaultTime = defaultTimes[hopUse as keyof typeof defaultTimes] ?? 0;
  // Support alternative labels (e.g., "dry-hop")
  if (defaultTime === 0 && isDryHop(hopUse)) defaultTime = 3;

  // If it's dry hop and we need minutes for storage, convert
  if (isDryHop(hopUse) && inMinutes) {
    return convertDaysToMinutes(defaultTime);
  }

  return defaultTime;
}

/**
 * Get the display unit for hop usage type
 * @param hopUse Hop usage type
 * @returns Unit string ("days" for dry hop, "minutes" for others)
 */
export function getHopTimeUnit(hopUse: string): string {
  return isDryHop(hopUse) ? "days" : "minutes";
}

/**
 * Convert hop time from input format to storage format
 * For dry hops: days -> minutes
 * For others: minutes -> minutes (no conversion)
 */
export function convertHopTimeForStorage(
  inputTime: number,
  hopUse: string
): number {
  if (isDryHop(hopUse)) {
    return convertDaysToMinutes(inputTime);
  }
  return inputTime;
}

/**
 * Convert hop time from storage format to display format
 * For dry hops: minutes -> days
 * For others: minutes -> minutes (no conversion)
 */
export function convertHopTimeForDisplay(
  storedTime: number,
  hopUse: string
): number {
  if (isDryHop(hopUse)) {
    return convertMinutesToDays(storedTime);
  }
  return storedTime;
}
