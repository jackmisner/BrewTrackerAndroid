import {
  HOP_USAGE_OPTIONS,
  HOP_TIME_PRESETS,
  HopUsageValue,
} from "@src/constants/hopConstants";
import { RecipeIngredient } from "@src/types";

/**
 * Formats hop time for display based on usage type
 * @param timeInMinutes - Time in minutes (as stored in database)
 * @param usage - Hop usage type (boil, whirlpool, dry-hop)
 * @returns Formatted time string with appropriate unit
 */
export const formatHopTime = (
  timeInMinutes: number | null | undefined,
  usage: string
): string => {
  if (timeInMinutes === null || timeInMinutes === undefined) {
    return "N/A";
  }

  if (usage === "dry-hop") {
    const days = Math.round((timeInMinutes / 1440) * 10) / 10;
    return days === 1 ? "1 day" : `${days} days`;
  }

  return timeInMinutes === 1 ? "1 min" : `${timeInMinutes} mins`;
};

/**
 * Formats hop usage for display
 * @param usage - Hop usage value from database
 * @returns Human-readable usage string
 */
export const formatHopUsage = (usage: string | undefined): string => {
  const usageOption = HOP_USAGE_OPTIONS.find(opt => opt.value === usage);
  return usageOption?.display || usage || "Unknown";
};

/**
 * Gets hop time placeholder text based on usage
 * @param usage - Hop usage type
 * @param timeUnit - Display unit (minutes or days)
 * @returns Placeholder text for time input
 */
export const getHopTimePlaceholder = (
  usage: string,
  timeUnit: "minutes" | "days"
): string => {
  const usageOption = HOP_USAGE_OPTIONS.find(opt => opt.value === usage);
  if (!usageOption) return "60";

  if (timeUnit === "days") {
    return String(usageOption.defaultTime / 1440); // Convert minutes to days
  }
  return String(usageOption.defaultTime);
};

/**
 * Converts hop time between minutes and days
 * @param time - Time value to convert
 * @param fromUnit - Current unit
 * @param toUnit - Target unit
 * @returns Converted time value
 */
export const convertHopTime = (
  time: number,
  fromUnit: "minutes" | "days",
  toUnit: "minutes" | "days"
): number => {
  if (fromUnit === toUnit) return time;

  if (fromUnit === "days" && toUnit === "minutes") {
    return time * 1440;
  } else if (fromUnit === "minutes" && toUnit === "days") {
    return Math.round((time / 1440) * 10) / 10;
  }

  return time;
};

/**
 * Formats ingredient amount with appropriate precision
 * @param amount - Amount value
 * @param unit - Unit of measurement
 * @returns Formatted amount string
 */
export const formatIngredientAmount = (
  amount: number | null | undefined,
  unit: string
): string => {
  if (amount === null || amount === undefined) {
    return "0";
  }

  // Use appropriate decimal places based on unit and amount
  if (unit === "pkg" || unit === "tsp" || unit === "tbsp" || unit === "cup") {
    // Whole numbers for packages and large volume units
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
  } else if (amount < 1) {
    // More precision for small amounts
    return amount.toFixed(2);
  } else if (amount < 10) {
    // One decimal for medium amounts
    return amount.toFixed(1);
  } else {
    // Whole numbers for large amounts
    return Math.round(amount).toString();
  }
};

/**
 * Formats batch size with unit
 * @param size - Batch size value
 * @param unit - Unit (gal or L)
 * @returns Formatted batch size string
 */
export const formatBatchSize = (size: number, unit: string): string => {
  const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1);
  return `${formattedSize} ${unit}`;
};

/**
 * Formats percentage values
 * @param value - Percentage value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number | null | undefined,
  decimals: number = 1
): string => {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formats gravity values (OG, FG)
 * @param gravity - Gravity value
 * @returns Formatted gravity string
 */
export const formatGravity = (gravity: number | null | undefined): string => {
  if (gravity === null || gravity === undefined) {
    return "N/A";
  }
  return gravity.toFixed(3);
};

/**
 * Formats color values (SRM/EBC)
 * @param color - Color value
 * @param unit - Color unit (SRM or EBC)
 * @returns Formatted color string
 */
export const formatColor = (
  color: number | null | undefined,
  unit: string = "SRM"
): string => {
  if (color === null || color === undefined) {
    return "N/A";
  }
  return `${Math.round(color)} ${unit}`;
};

/**
 * Formats SRM values specifically for brewing metrics display
 * @param srm - SRM value
 * @returns Formatted SRM string with one decimal place
 */
export const formatSRM = (srm: number | null | undefined): string => {
  if (srm === null || srm === undefined) {
    return "N/A";
  }
  return srm.toFixed(1);
};

/**
 * Get hex color for SRM value (beer color visualization)
 * @param srm - SRM value
 * @returns Hex color string for the given SRM value
 */
export const getSrmColor = (
  srm: number | string | null | undefined
): string => {
  if (!srm) return "#FFE699";
  const numSrm = parseFloat(srm.toString());
  if (isNaN(numSrm) || numSrm < 0) return "#FFE699";

  // Round to nearest integer for lookup
  const roundedSrm = Math.round(numSrm);

  // Colors for SRM 0-40, anything above 40 returns black
  if (roundedSrm > 40) return "#000000";

  const srmColors: string[] = [
    "#FFE699", // SRM 0
    "#FFE699", // SRM 1
    "#FFE699", // SRM 2
    "#FFCA5A", // SRM 3
    "#FFBF42", // SRM 4
    "#FFC232", // SRM 5
    "#FBB123", // SRM 6
    "#F8A615", // SRM 7
    "#F39C00", // SRM 8
    "#F09100", // SRM 9
    "#E58500", // SRM 10
    "#E07A00", // SRM 11
    "#DB6F00", // SRM 12
    "#CF6900", // SRM 13
    "#CA5E00", // SRM 14
    "#C45400", // SRM 15
    "#BE4A00", // SRM 16
    "#BB5100", // SRM 17
    "#B04600", // SRM 18
    "#A63C00", // SRM 19
    "#A13700", // SRM 20
    "#9B3200", // SRM 21
    "#962E00", // SRM 22
    "#912A00", // SRM 23
    "#8E2900", // SRM 24
    "#862400", // SRM 25
    "#7E1F00", // SRM 26
    "#761B00", // SRM 27
    "#6E1700", // SRM 28
    "#701400", // SRM 29
    "#6A1200", // SRM 30
    "#651000", // SRM 31
    "#600E00", // SRM 32
    "#5B0C00", // SRM 33
    "#560A01", // SRM 34
    "#600903", // SRM 35
    "#550802", // SRM 36
    "#4A0702", // SRM 37
    "#420601", // SRM 38
    "#3D0601", // SRM 39
    "#3D0708", // SRM 40
  ];

  return srmColors[roundedSrm];
};

/**
 * Formats IBU values
 * @param ibu - IBU value
 * @returns Formatted IBU string
 */
export const formatIBU = (ibu: number | null | undefined): string => {
  if (ibu === null || ibu === undefined) {
    return "N/A";
  }
  return Math.round(ibu).toString();
};

/**
 * Formats ABV values
 * @param abv - ABV value
 * @returns Formatted ABV string
 */
export const formatABV = (abv: number | null | undefined): string => {
  if (abv === null || abv === undefined) {
    return "N/A";
  }
  return `${abv.toFixed(1)}%`;
};

/**
 * Formats attenuation values
 * @param attenuation - Attenuation percentage
 * @returns Formatted attenuation string
 */
export const formatAttenuation = (
  attenuation: number | null | undefined
): string => {
  return formatPercentage(attenuation);
};

/**
 * Formats alpha acid values
 * @param alphaAcid - Alpha acid percentage
 * @returns Formatted alpha acid string
 */
export const formatAlphaAcid = (
  alphaAcid: number | null | undefined
): string => {
  return formatPercentage(alphaAcid);
};

/**
 * Formats potential extract values (PPG/CGDB)
 * @param potential - Potential extract value
 * @param unit - Unit (PPG or CGDB)
 * @returns Formatted potential string
 */
export const formatPotential = (
  potential: number | null | undefined,
  unit: string = "PPG"
): string => {
  if (potential === null || potential === undefined) {
    return "N/A";
  }
  return `${Math.round(potential)} ${unit}`;
};

/**
 * Formats ingredient details for display in lists
 * @param ingredient - Recipe ingredient object
 * @returns Formatted ingredient details string
 */
export const formatIngredientDetails = (
  ingredient: RecipeIngredient
): string => {
  const details: string[] = [];

  if (ingredient.type === "hop") {
    if (ingredient.use) {
      details.push(formatHopUsage(ingredient.use));
    }
    if (ingredient.time !== null && ingredient.time !== undefined) {
      details.push(formatHopTime(ingredient.time, ingredient.use || "boil"));
    }
    if (ingredient.alpha_acid) {
      details.push(formatAlphaAcid(ingredient.alpha_acid));
    }
  } else if (ingredient.type === "grain") {
    if (ingredient.color) {
      details.push(formatColor(ingredient.color, "°L"));
    }
    if (ingredient.potential) {
      details.push(formatPotential(ingredient.potential));
    }
  } else if (ingredient.type === "yeast") {
    if (ingredient.attenuation) {
      details.push(`${formatAttenuation(ingredient.attenuation)} Att.`);
    }
    if (ingredient.manufacturer) {
      details.push(ingredient.manufacturer);
    }
  }

  return details.join(" • ");
};
