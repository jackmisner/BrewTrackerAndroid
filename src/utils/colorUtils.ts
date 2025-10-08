/**
 * Applies alpha transparency to color values
 * Supports both hex (#RRGGBB / #RRGGBBAA) and rgb()/rgba() color formats
 *
 * @param color - Color value in hex or rgb format
 * @param alpha - Alpha value between 0 and 1
 * @returns Color string with applied alpha transparency
 *
 * @example
 * ```typescript
 * withAlpha('#FF0000', 0.5) // Returns '#FF000080'
 * withAlpha('rgb(255, 0, 0)', 0.5) // Returns 'rgba(255, 0, 0, 0.5)'
 * ```
 */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    let rgb: string | null = null;

    if (hex.length === 3 || hex.length === 4) {
      rgb = hex
        .slice(0, 3)
        .split("")
        .map(ch => ch.repeat(2))
        .join("");
    } else if (hex.length === 6 || hex.length === 8) {
      rgb = hex.slice(0, 6);
    }

    if (!rgb) {
      return color;
    }

    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${rgb}${a}`;
  }
  const m = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i
  );
  if (m) {
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    if (r > 255 || g > 255 || b > 255) {
      return color; // fallback for invalid RGB values
    }
    const clampedAlpha = Math.min(1, Math.max(0, alpha));
    return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
  }
  return color; // fallback
}
