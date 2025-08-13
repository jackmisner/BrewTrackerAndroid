import { Dimensions } from "react-native";
import {
  calculateMenuPosition,
  calculateMenuHeight,
  getTouchPosition,
  debounceLongPress,
  MENU_DIMENSIONS,
  Position,
  MenuDimensions,
} from "@src/components/ui/ContextMenu/contextMenuUtils";

// Mock React Native Dimensions
jest.mock("react-native", () => ({
  Dimensions: {
    get: jest.fn(),
  },
}));

const mockDimensions = Dimensions as jest.Mocked<typeof Dimensions>;

describe("contextMenuUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default screen dimensions for testing
    mockDimensions.get.mockReturnValue({
      width: 375,
      height: 667,
      scale: 2,
      fontScale: 1,
    });
  });

  describe("calculateMenuPosition", () => {
    const menuDimensions: MenuDimensions = { width: 200, height: 300 };
    const defaultPadding = 20;

    it("should center menu horizontally around touch point by default", () => {
      const touchPosition: Position = { x: 200, y: 300 };
      const result = calculateMenuPosition(touchPosition, menuDimensions);

      expect(result.x).toBe(100); // 200 - 200/2 = 100
      expect(result.y).toBe(200); // 300 - 100 = 200
    });

    it("should position menu above touch point by default", () => {
      const touchPosition: Position = { x: 200, y: 300 };
      const result = calculateMenuPosition(touchPosition, menuDimensions);

      expect(result.y).toBe(200); // touchY - 100
    });

    it("should adjust horizontal position when too close to left edge", () => {
      const touchPosition: Position = { x: 10, y: 300 }; // Very close to left edge
      const result = calculateMenuPosition(touchPosition, menuDimensions, defaultPadding);

      expect(result.x).toBe(defaultPadding); // Should be pushed to padding distance
    });

    it("should adjust horizontal position when too close to right edge", () => {
      const touchPosition: Position = { x: 350, y: 300 }; // Close to right edge (screen width 375)
      const result = calculateMenuPosition(touchPosition, menuDimensions, defaultPadding);

      expect(result.x).toBe(155); // 375 - 200 - 20 = 155
    });

    it("should adjust vertical position when too close to top edge", () => {
      const touchPosition: Position = { x: 200, y: 10 }; // Very close to top
      const result = calculateMenuPosition(touchPosition, menuDimensions, defaultPadding);

      expect(result.y).toBe(30); // touchY + 20 (position below touch point)
    });

    it("should adjust vertical position when too close to bottom edge", () => {
      const touchPosition: Position = { x: 200, y: 600 }; // Close to bottom (screen height 667)
      const result = calculateMenuPosition(touchPosition, menuDimensions, defaultPadding);

      expect(result.y).toBe(347); // 667 - 300 - 20 = 347
    });

    it("should handle corner cases - top-left corner", () => {
      const touchPosition: Position = { x: 10, y: 10 };
      const result = calculateMenuPosition(touchPosition, menuDimensions, defaultPadding);

      expect(result.x).toBe(defaultPadding); // Pushed right
      expect(result.y).toBe(30); // Positioned below touch point
    });

    it("should handle corner cases - bottom-right corner", () => {
      const touchPosition: Position = { x: 350, y: 600 };
      const result = calculateMenuPosition(touchPosition, menuDimensions, defaultPadding);

      expect(result.x).toBe(155); // 375 - 200 - 20
      expect(result.y).toBe(347); // 667 - 300 - 20
    });

    it("should use custom padding", () => {
      const customPadding = 50;
      const touchPosition: Position = { x: 10, y: 300 };
      const result = calculateMenuPosition(touchPosition, menuDimensions, customPadding);

      expect(result.x).toBe(customPadding);
    });

    it("should handle zero padding", () => {
      const touchPosition: Position = { x: 10, y: 300 };
      const result = calculateMenuPosition(touchPosition, menuDimensions, 0);

      expect(result.x).toBe(0); // Should be at screen edge
    });

    it("should work with different screen dimensions", () => {
      mockDimensions.get.mockReturnValue({
        width: 800,
        height: 1200,
        scale: 2,
        fontScale: 1,
      });

      const touchPosition: Position = { x: 400, y: 600 };
      const result = calculateMenuPosition(touchPosition, menuDimensions);

      expect(result.x).toBe(300); // 400 - 200/2
      expect(result.y).toBe(500); // 600 - 100
    });

    it("should handle very small menu dimensions", () => {
      const smallMenu: MenuDimensions = { width: 50, height: 100 };
      const touchPosition: Position = { x: 200, y: 300 };
      const result = calculateMenuPosition(touchPosition, smallMenu);

      expect(result.x).toBe(175); // 200 - 50/2
      expect(result.y).toBe(200); // 300 - 100
    });

    it("should handle very large menu dimensions", () => {
      const largeMenu: MenuDimensions = { width: 400, height: 700 };
      const touchPosition: Position = { x: 200, y: 300 };
      const result = calculateMenuPosition(touchPosition, largeMenu, defaultPadding);

      // The function should still respect the padding constraint
      // x would be: max(padding, screenWidth - menuWidth - padding) = max(20, 375-400-20) = max(20, -45) = 20
      expect(result.x).toBe(20); // constrained by padding
      expect(result.y).toBe(-53); // 667 - 700 - 20 = -53 (calculated but may go negative)
    });
  });

  describe("calculateMenuHeight", () => {
    it("should calculate height with header and actions", () => {
      const actionCount = 3;
      const result = calculateMenuHeight(actionCount, true);

      // headerHeight(80) + actions(3*48) + cancelButton(48) + padding(16) = 288
      expect(result).toBe(288);
    });

    it("should calculate height without header", () => {
      const actionCount = 3;
      const result = calculateMenuHeight(actionCount, false);

      // actions(3*48) + cancelButton(48) + padding(16) = 208
      expect(result).toBe(208);
    });

    it("should handle zero actions", () => {
      const result = calculateMenuHeight(0, true);

      // headerHeight(80) + cancelButton(48) + padding(16) = 144
      expect(result).toBe(144);
    });

    it("should handle zero actions without header", () => {
      const result = calculateMenuHeight(0, false);

      // cancelButton(48) + padding(16) = 64
      expect(result).toBe(64);
    });

    it("should handle many actions", () => {
      const actionCount = 10;
      const result = calculateMenuHeight(actionCount, true);

      // headerHeight(80) + actions(10*48) + cancelButton(48) + padding(16) = 624
      expect(result).toBe(624);
    });

    it("should default to having header when not specified", () => {
      const actionCount = 2;
      const resultWithDefault = calculateMenuHeight(actionCount);
      const resultExplicit = calculateMenuHeight(actionCount, true);

      expect(resultWithDefault).toBe(resultExplicit);
    });
  });

  describe("getTouchPosition", () => {
    it("should extract position from pageX/pageY when available", () => {
      const mockEvent = {
        nativeEvent: {
          pageX: 150,
          pageY: 250,
          locationX: 100,
          locationY: 200,
        },
      };

      const result = getTouchPosition(mockEvent);

      expect(result).toEqual({ x: 150, y: 250 });
    });

    it("should fallback to locationX/locationY when pageX/pageY unavailable", () => {
      const mockEvent = {
        nativeEvent: {
          locationX: 100,
          locationY: 200,
        },
      };

      const result = getTouchPosition(mockEvent);

      expect(result).toEqual({ x: 100, y: 200 });
    });

    it("should handle missing location coordinates", () => {
      const mockEvent = {
        nativeEvent: {},
      };

      const result = getTouchPosition(mockEvent);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should handle undefined pageX but defined pageY", () => {
      const mockEvent = {
        nativeEvent: {
          pageY: 250,
          locationX: 100,
          locationY: 200,
        },
      };

      const result = getTouchPosition(mockEvent);

      // Should fallback to location coordinates since pageX is undefined
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it("should handle zero coordinates", () => {
      const mockEvent = {
        nativeEvent: {
          pageX: 0,
          pageY: 0,
        },
      };

      const result = getTouchPosition(mockEvent);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should handle partial location coordinates", () => {
      const mockEvent = {
        nativeEvent: {
          locationX: 100,
          // locationY missing
        },
      };

      const result = getTouchPosition(mockEvent);

      expect(result).toEqual({ x: 100, y: 0 });
    });
  });

  describe("debounceLongPress", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("should debounce function calls", () => {
      const callback = jest.fn();
      const debouncedFn = debounceLongPress(callback, 500);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should not have been called yet
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(500);

      // Should have been called once
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should reset timer on subsequent calls", () => {
      const callback = jest.fn();
      const debouncedFn = debounceLongPress(callback, 500);

      debouncedFn();
      jest.advanceTimersByTime(300); // Advance but not enough to trigger

      debouncedFn(); // This should reset the timer
      jest.advanceTimersByTime(300); // Still not enough

      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(200); // Now it should trigger
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should pass arguments to the callback", () => {
      const callback = jest.fn();
      const debouncedFn = debounceLongPress(callback, 500);

      debouncedFn("arg1", 123, { key: "value" });

      jest.advanceTimersByTime(500);

      expect(callback).toHaveBeenCalledWith("arg1", 123, { key: "value" });
    });

    it("should use default delay when not specified", () => {
      const callback = jest.fn();
      const debouncedFn = debounceLongPress(callback); // No delay specified

      debouncedFn();

      jest.advanceTimersByTime(499);
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1); // 500ms total
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle different delay values", () => {
      const callback = jest.fn();
      const debouncedFn = debounceLongPress(callback, 1000);

      debouncedFn();

      jest.advanceTimersByTime(999);
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle zero delay", () => {
      const callback = jest.fn();
      const debouncedFn = debounceLongPress(callback, 0);

      debouncedFn();

      jest.advanceTimersByTime(0);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should clear timeout when function is called again", () => {
      const callback = jest.fn();
      const debouncedFn = debounceLongPress(callback, 500);

      debouncedFn();
      jest.advanceTimersByTime(200);

      debouncedFn(); // This should clear the previous timeout

      jest.advanceTimersByTime(400); // Original would have triggered at 500ms
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100); // Now 500ms from second call
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("MENU_DIMENSIONS", () => {
    it("should export standard menu dimensions", () => {
      expect(MENU_DIMENSIONS).toEqual({
        width: 200,
        height: 300,
      });
    });

    it("should have the expected properties", () => {
      expect(MENU_DIMENSIONS).toHaveProperty("width");
      expect(MENU_DIMENSIONS).toHaveProperty("height");
      expect(typeof MENU_DIMENSIONS.width).toBe("number");
      expect(typeof MENU_DIMENSIONS.height).toBe("number");
    });
  });

  describe("integration scenarios", () => {
    it("should work together for a complete menu positioning flow", () => {
      const touchEvent = {
        nativeEvent: {
          pageX: 100,
          pageY: 200,
        },
      };

      const touchPosition = getTouchPosition(touchEvent);
      const menuHeight = calculateMenuHeight(3, true);
      const menuDimensions = { width: MENU_DIMENSIONS.width, height: menuHeight };
      const position = calculateMenuPosition(touchPosition, menuDimensions);

      expect(touchPosition).toEqual({ x: 100, y: 200 });
      expect(menuHeight).toBe(288);
      expect(position.x).toBe(20); // constrained by padding (100 - 200/2 = 0, but min is padding 20)
      expect(position.y).toBe(100); // 200 - 100
    });

    it("should handle edge case with very large menu near screen edge", () => {
      const touchPosition: Position = { x: 370, y: 650 };
      const actionCount = 8; // Large menu
      const menuHeight = calculateMenuHeight(actionCount, true);
      const menuDimensions = { width: 300, height: menuHeight };
      const position = calculateMenuPosition(touchPosition, menuDimensions);

      // Should be positioned to fit within screen bounds
      expect(position.x).toBe(55); // 375 - 300 - 20
      expect(position.y).toBe(119); // 667 - 528 - 20 (where 528 is calculated menu height)
    });
  });
});