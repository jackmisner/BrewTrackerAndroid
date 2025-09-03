import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import {
  ScreenDimensionsProvider,
  useScreenDimensions,
} from "@src/contexts/ScreenDimensionsContext";

// Mock React Native modules
jest.mock("react-native", () => ({
  useWindowDimensions: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaFrame: jest.fn(),
}));

// Import mocked modules
const { useWindowDimensions } = require("react-native");
const { useSafeAreaFrame } = require("react-native-safe-area-context");

describe("ScreenDimensionsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    useWindowDimensions.mockReturnValue({
      width: 400,
      height: 800,
      scale: 2,
      fontScale: 1,
    });
    useSafeAreaFrame.mockReturnValue({ width: 400, height: 800 });
  });

  const createWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(ScreenDimensionsProvider, { children });

  describe("useScreenDimensions hook", () => {
    it("should throw error when used outside provider", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useScreenDimensions());
      }).toThrow(
        "useScreenDimensions must be used within a ScreenDimensionsProvider"
      );

      consoleSpy.mockRestore();
    });

    it("should provide screen dimensions context when used within provider", () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.dimensions).toBeDefined();
      expect(typeof result.current.dimensions.width).toBe("number");
      expect(typeof result.current.dimensions.height).toBe("number");
      expect(typeof result.current.dimensions.isSmallScreen).toBe("boolean");
      expect(typeof result.current.dimensions.isLandscape).toBe("boolean");
      expect(typeof result.current.refreshDimensions).toBe("function");
    });
  });

  describe("ScreenDimensionsProvider", () => {
    it("should use safeAreaFrame as primary source", () => {
      useSafeAreaFrame.mockReturnValue({ width: 500, height: 900 });
      useWindowDimensions.mockReturnValue({
        width: 400,
        height: 800,
        scale: 2,
        fontScale: 1,
      });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(500);
      expect(result.current.dimensions.height).toBe(900);
    });

    it("should fallback to useWindowDimensions when safeAreaFrame is unavailable", () => {
      useSafeAreaFrame.mockReturnValue(null);
      useWindowDimensions.mockReturnValue({
        width: 450,
        height: 850,
        scale: 2,
        fontScale: 1,
      });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(450);
      expect(result.current.dimensions.height).toBe(850);
    });

    it("should fallback to default dimensions when both sources fail", () => {
      useSafeAreaFrame.mockReturnValue(null);
      useWindowDimensions.mockReturnValue(null as any);

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(400);
      expect(result.current.dimensions.height).toBe(800);
    });

    it("should fallback when safeAreaFrame has incomplete data", () => {
      useSafeAreaFrame.mockReturnValue({ width: 500 } as any); // Missing height
      useWindowDimensions.mockReturnValue({
        width: 400,
        height: 800,
        scale: 2,
        fontScale: 1,
      });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(400);
      expect(result.current.dimensions.height).toBe(800);
    });
  });

  describe("dimension calculations", () => {
    it("should correctly identify small screen (width < 400)", () => {
      useSafeAreaFrame.mockReturnValue({ width: 350, height: 700 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.isSmallScreen).toBe(true);
      expect(result.current.dimensions.width).toBe(350);
    });

    it("should correctly identify normal screen (width >= 400)", () => {
      useSafeAreaFrame.mockReturnValue({ width: 400, height: 800 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.width).toBe(400);
    });

    it("should correctly identify landscape orientation (width > height)", () => {
      useSafeAreaFrame.mockReturnValue({ width: 900, height: 500 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.isLandscape).toBe(true);
      expect(result.current.dimensions.width).toBe(900);
      expect(result.current.dimensions.height).toBe(500);
    });

    it("should correctly identify portrait orientation (width <= height)", () => {
      useSafeAreaFrame.mockReturnValue({ width: 400, height: 800 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.isLandscape).toBe(false);
      expect(result.current.dimensions.width).toBe(400);
      expect(result.current.dimensions.height).toBe(800);
    });

    it("should handle square screen (width === height)", () => {
      useSafeAreaFrame.mockReturnValue({ width: 600, height: 600 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.isLandscape).toBe(false);
      expect(result.current.dimensions.width).toBe(600);
      expect(result.current.dimensions.height).toBe(600);
    });
  });

  describe("foldable device scenarios", () => {
    it("should handle Samsung Z Fold unfolded dimensions", () => {
      // Samsung Z Fold 5 unfolded approximate dimensions
      useSafeAreaFrame.mockReturnValue({ width: 1812, height: 2176 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(1812);
      expect(result.current.dimensions.height).toBe(2176);
      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.isLandscape).toBe(false);
    });

    it("should handle Samsung Z Fold folded dimensions", () => {
      // Samsung Z Fold 5 folded approximate dimensions
      useSafeAreaFrame.mockReturnValue({ width: 904, height: 2176 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(904);
      expect(result.current.dimensions.height).toBe(2176);
      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.isLandscape).toBe(false);
    });

    it("should handle dimension changes from folding/unfolding", () => {
      const wrapper = createWrapper;
      const { result, rerender } = renderHook(() => useScreenDimensions(), {
        wrapper,
      });

      // Start folded
      useSafeAreaFrame.mockReturnValue({ width: 904, height: 2176 });
      rerender({});

      expect(result.current.dimensions.width).toBe(904);

      // Unfold device
      useSafeAreaFrame.mockReturnValue({ width: 1812, height: 2176 });
      rerender({});

      expect(result.current.dimensions.width).toBe(1812);
    });
  });

  describe("edge cases", () => {
    it("should handle zero dimensions from safeAreaFrame", () => {
      useSafeAreaFrame.mockReturnValue({ width: 0, height: 0 });
      useWindowDimensions.mockReturnValue({
        width: 400,
        height: 800,
        scale: 2,
        fontScale: 1,
      });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      // Should fallback to useWindowDimensions
      expect(result.current.dimensions.width).toBe(400);
      expect(result.current.dimensions.height).toBe(800);
    });

    it("should handle negative dimensions gracefully", () => {
      useSafeAreaFrame.mockReturnValue({ width: -100, height: -200 });
      useWindowDimensions.mockReturnValue({
        width: 400,
        height: 800,
        scale: 2,
        fontScale: 1,
      });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      // Context uses safeAreaFrame values even if negative (actual behavior)
      expect(result.current.dimensions.width).toBe(-100);
      expect(result.current.dimensions.height).toBe(-200);
      expect(result.current.dimensions.isSmallScreen).toBe(true); // width < 400
      expect(result.current.dimensions.isLandscape).toBe(true); // width > height
    });

    it("should handle very large dimensions", () => {
      useSafeAreaFrame.mockReturnValue({ width: 5000, height: 8000 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(5000);
      expect(result.current.dimensions.height).toBe(8000);
      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.isLandscape).toBe(false);
    });

    it("should handle minimum small screen threshold", () => {
      // Test exactly at threshold
      useSafeAreaFrame.mockReturnValue({ width: 400, height: 800 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.isSmallScreen).toBe(false); // width === 400 is not small

      // Test just below threshold
      useSafeAreaFrame.mockReturnValue({ width: 399, height: 800 });
      const { result: result2 } = renderHook(() => useScreenDimensions(), {
        wrapper,
      });

      expect(result2.current.dimensions.isSmallScreen).toBe(true); // width < 400 is small
    });
  });

  describe("refreshDimensions function", () => {
    it("should provide refreshDimensions function", () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(typeof result.current.refreshDimensions).toBe("function");
    });

    it("should be callable without errors", () => {
      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(() => {
        result.current.refreshDimensions();
      }).not.toThrow();
    });

    it("should maintain stable reference", () => {
      const wrapper = createWrapper;
      const { result, rerender } = renderHook(() => useScreenDimensions(), {
        wrapper,
      });

      const firstRefresh = result.current.refreshDimensions;
      rerender({});
      const secondRefresh = result.current.refreshDimensions;

      expect(firstRefresh).toBe(secondRefresh);
    });
  });

  describe("context value memoization", () => {
    it("should maintain stable context value when dimensions unchanged", () => {
      useSafeAreaFrame.mockReturnValue({ width: 400, height: 800 });

      const wrapper = createWrapper;
      const { result, rerender } = renderHook(() => useScreenDimensions(), {
        wrapper,
      });

      const firstValue = result.current;
      rerender({});
      const secondValue = result.current;

      expect(firstValue).toBe(secondValue);
    });

    it("should create new context value when dimensions change", () => {
      const wrapper = createWrapper;
      const { result, rerender } = renderHook(() => useScreenDimensions(), {
        wrapper,
      });

      useSafeAreaFrame.mockReturnValue({ width: 400, height: 800 });
      rerender({});
      const firstValue = result.current;

      useSafeAreaFrame.mockReturnValue({ width: 500, height: 900 });
      rerender({});
      const secondValue = result.current;

      expect(firstValue).not.toBe(secondValue);
      expect(secondValue.dimensions.width).toBe(500);
    });
  });

  describe("common device scenarios", () => {
    it("should handle iPhone dimensions", () => {
      // iPhone 14 Pro approximate dimensions
      useSafeAreaFrame.mockReturnValue({ width: 393, height: 852 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(393);
      expect(result.current.dimensions.height).toBe(852);
      expect(result.current.dimensions.isSmallScreen).toBe(true); // < 400
      expect(result.current.dimensions.isLandscape).toBe(false);
    });

    it("should handle tablet dimensions", () => {
      // iPad approximate dimensions
      useSafeAreaFrame.mockReturnValue({ width: 820, height: 1180 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(820);
      expect(result.current.dimensions.height).toBe(1180);
      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.isLandscape).toBe(false);
    });

    it("should handle tablet landscape dimensions", () => {
      // iPad landscape
      useSafeAreaFrame.mockReturnValue({ width: 1180, height: 820 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(1180);
      expect(result.current.dimensions.height).toBe(820);
      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.isLandscape).toBe(true);
    });

    it("should handle phone landscape dimensions", () => {
      useSafeAreaFrame.mockReturnValue({ width: 852, height: 393 });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(852);
      expect(result.current.dimensions.height).toBe(393);
      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.isLandscape).toBe(true);
    });
  });

  describe("fallback behavior", () => {
    it("should use useWindowDimensions when safeAreaFrame returns undefined", () => {
      useSafeAreaFrame.mockReturnValue(undefined);
      useWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1,
      });

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(375);
      expect(result.current.dimensions.height).toBe(812);
    });

    it("should use default dimensions when all sources fail", () => {
      useSafeAreaFrame.mockReturnValue(undefined);
      useWindowDimensions.mockReturnValue(undefined as any);

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(400);
      expect(result.current.dimensions.height).toBe(800);
      expect(result.current.dimensions.isSmallScreen).toBe(false);
      expect(result.current.dimensions.isLandscape).toBe(false);
    });

    it("should use default dimensions when useWindowDimensions returns null", () => {
      useSafeAreaFrame.mockReturnValue(null);
      useWindowDimensions.mockReturnValue(null as any);

      const wrapper = createWrapper;
      const { result } = renderHook(() => useScreenDimensions(), { wrapper });

      expect(result.current.dimensions.width).toBe(400);
      expect(result.current.dimensions.height).toBe(800);
    });
  });

  describe("computed properties accuracy", () => {
    it("should correctly calculate isSmallScreen for various widths", () => {
      const testCases = [
        { width: 300, height: 600, expectedSmall: true },
        { width: 399, height: 700, expectedSmall: true },
        { width: 400, height: 800, expectedSmall: false },
        { width: 500, height: 900, expectedSmall: false },
      ];

      testCases.forEach(({ width, height, expectedSmall }) => {
        useSafeAreaFrame.mockReturnValue({ width, height });

        const wrapper = createWrapper;
        const { result } = renderHook(() => useScreenDimensions(), { wrapper });

        expect(result.current.dimensions.isSmallScreen).toBe(expectedSmall);
      });
    });

    it("should correctly calculate isLandscape for various orientations", () => {
      const testCases = [
        { width: 400, height: 800, expectedLandscape: false }, // Portrait
        { width: 800, height: 400, expectedLandscape: true }, // Landscape
        { width: 600, height: 600, expectedLandscape: false }, // Square (treated as portrait)
        { width: 1000, height: 999, expectedLandscape: true }, // Barely landscape
      ];

      testCases.forEach(({ width, height, expectedLandscape }) => {
        useSafeAreaFrame.mockReturnValue({ width, height });

        const wrapper = createWrapper;
        const { result } = renderHook(() => useScreenDimensions(), { wrapper });

        expect(result.current.dimensions.isLandscape).toBe(expectedLandscape);
      });
    });
  });

  describe("memoization behavior", () => {
    it("should memoize dimensions when useWindowDimensions returns same values", () => {
      useSafeAreaFrame.mockReturnValue(null);
      useWindowDimensions.mockReturnValue({
        width: 450,
        height: 850,
        scale: 2,
        fontScale: 1,
      });

      const wrapper = createWrapper;
      const { result, rerender } = renderHook(() => useScreenDimensions(), {
        wrapper,
      });

      const firstDimensions = result.current.dimensions;
      rerender({});
      const secondDimensions = result.current.dimensions;

      // Should be the same due to memoization when window dimensions don't change
      expect(firstDimensions).toBe(secondDimensions);
    });

    it("should recalculate when safeAreaFrame changes", () => {
      const wrapper = createWrapper;
      const { result, rerender } = renderHook(() => useScreenDimensions(), {
        wrapper,
      });

      // Initial dimensions
      useSafeAreaFrame.mockReturnValue({ width: 400, height: 800 });
      rerender({});
      const firstDimensions = result.current.dimensions;

      // Changed dimensions
      useSafeAreaFrame.mockReturnValue({ width: 500, height: 900 });
      rerender({});
      const secondDimensions = result.current.dimensions;

      expect(firstDimensions).not.toBe(secondDimensions);
      expect(secondDimensions.width).toBe(500);
      expect(secondDimensions.height).toBe(900);
    });
  });
});
