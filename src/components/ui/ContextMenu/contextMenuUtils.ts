import { Dimensions } from "react-native";

export interface Position {
  x: number;
  y: number;
}

export interface MenuDimensions {
  width: number;
  height: number;
}

/**
 * Calculates the optimal position for a context menu to avoid screen edges
 * @param touchPosition - The position where the user touched
 * @param menuDimensions - The dimensions of the context menu
 * @param padding - Minimum padding from screen edges
 * @returns Optimal position for the menu
 */
export function calculateMenuPosition(
  touchPosition: Position,
  menuDimensions: MenuDimensions,
  padding: number = 20
): Position {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  let x = touchPosition.x - menuDimensions.width / 2;
  let y = touchPosition.y - 100; // Position above the touch point by default

  // Adjust horizontal position to avoid screen edges
  if (x < padding) {
    x = padding;
  } else if (x + menuDimensions.width > screenWidth - padding) {
    x = screenWidth - menuDimensions.width - padding;
  }

  // Adjust vertical position to avoid screen edges
  if (y < padding) {
    // Position below the touch point if there's no room above
    y = touchPosition.y + 20;
  } else if (y + menuDimensions.height > screenHeight - padding) {
    // Position above with more space if needed
    y = screenHeight - menuDimensions.height - padding;
  }

  return { x, y };
}

/**
 * Standard menu dimensions for consistent sizing
 */
export const MENU_DIMENSIONS: MenuDimensions = {
  width: 200,
  height: 300, // Approximate, will be adjusted based on actual content
};

/**
 * Calculates menu height based on number of actions
 * @param actionCount - Number of actions in the menu
 * @param hasHeader - Whether the menu has a header section
 * @returns Estimated menu height
 */
export function calculateMenuHeight(
  actionCount: number,
  hasHeader: boolean = true
): number {
  const headerHeight = hasHeader ? 80 : 0;
  const actionHeight = 48; // Standard touch target height
  const cancelButtonHeight = 48;
  const padding = 16;

  return (
    headerHeight + actionCount * actionHeight + cancelButtonHeight + padding
  );
}

/**
 * Extracts touch position from a React Native gesture event
 * @param event - The touch event
 * @returns Position of the touch
 */
export function getTouchPosition(event: any): Position {
  const { locationX, locationY, pageX, pageY } = event.nativeEvent;

  // Use page coordinates if available (more reliable for absolute positioning)
  if (pageX !== undefined && pageY !== undefined) {
    return { x: pageX, y: pageY };
  }

  // Fallback to location coordinates
  return { x: locationX || 0, y: locationY || 0 };
}

/**
 * Debounces long press to prevent accidental triggers
 * @param callback - Function to call after delay
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounceLongPress<T extends any[]>(
  callback: (...args: T) => void,
  delay: number = 500
) {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}
