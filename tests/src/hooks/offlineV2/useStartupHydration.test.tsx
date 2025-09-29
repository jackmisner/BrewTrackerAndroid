/**
 * Tests for useStartupHydration Hook
 *
 * Tests the React hook that manages automatic cache hydration on app startup.
 * Covers different authentication states, network conditions, and error scenarios.
 */

import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useStartupHydration } from "@hooks/offlineV2/useStartupHydration";

// Mock dependencies
jest.mock("@contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@contexts/NetworkContext", () => ({
  useNetwork: jest.fn(),
}));

jest.mock("@contexts/UnitContext", () => ({
  useUnits: jest.fn(),
}));

jest.mock("@services/offlineV2/StartupHydrationService", () => ({
  StartupHydrationService: {
    hydrateOnStartup: jest.fn(),
    resetHydrationState: jest.fn(),
  },
}));

// Import mocked dependencies
import { useAuth } from "@contexts/AuthContext";
import { useNetwork } from "@contexts/NetworkContext";
import { useUnits } from "@contexts/UnitContext";
import { StartupHydrationService } from "@services/offlineV2/StartupHydrationService";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;
const mockUseUnits = useUnits as jest.MockedFunction<typeof useUnits>;
const mockHydrateOnStartup =
  StartupHydrationService.hydrateOnStartup as jest.MockedFunction<
    typeof StartupHydrationService.hydrateOnStartup
  >;
const mockResetHydrationState =
  StartupHydrationService.resetHydrationState as jest.MockedFunction<
    typeof StartupHydrationService.resetHydrationState
  >;

describe("useStartupHydration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock values
    mockUseAuth.mockReturnValue({
      user: { id: "user123" },
      isAuthenticated: true,
    } as any);

    mockUseNetwork.mockReturnValue({
      isConnected: true,
    } as any);

    mockUseUnits.mockReturnValue({
      unitSystem: "imperial",
    } as any);

    mockHydrateOnStartup.mockResolvedValue(undefined);
  });

  it("should start hydrating when user is authenticated and online", async () => {
    const { result } = renderHook(() => useStartupHydration());

    // Hook should start hydrating immediately when conditions are met
    expect(result.current.isHydrating).toBe(true);
    expect(result.current.hasHydrated).toBe(false);
    expect(result.current.error).toBeNull();

    // Wait for hydration to complete
    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true);
    });

    expect(result.current.isHydrating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should not hydrate when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useStartupHydration());

    expect(result.current.isHydrating).toBe(false);
    expect(result.current.hasHydrated).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockHydrateOnStartup).not.toHaveBeenCalled();
  });

  it("should not hydrate when user is authenticated but offline", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
    } as any);

    const { result } = renderHook(() => useStartupHydration());

    expect(result.current.isHydrating).toBe(false);
    expect(result.current.hasHydrated).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockHydrateOnStartup).not.toHaveBeenCalled();
  });

  it("should handle hydration errors gracefully", async () => {
    const hydrationError = new Error("Network failure");
    mockHydrateOnStartup.mockRejectedValue(hydrationError);

    const { result } = renderHook(() => useStartupHydration());

    // Initially should be hydrating
    expect(result.current.isHydrating).toBe(true);

    // Wait for error handling to complete
    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    expect(result.current.hasHydrated).toBe(false);
    expect(result.current.error).toBe("Network failure");
  });

  it("should complete hydration successfully and set hasHydrated to true", async () => {
    mockHydrateOnStartup.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStartupHydration());

    // Initially should be hydrating
    expect(result.current.isHydrating).toBe(true);

    // Wait for successful hydration to complete
    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true);
    });

    expect(result.current.isHydrating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockHydrateOnStartup).toHaveBeenCalledWith("user123", "imperial");
  });

  it("should hydrate again when user changes", async () => {
    // First hydration with user123
    mockUseAuth.mockReturnValue({
      user: { id: "user123" },
      isAuthenticated: true,
    } as any);

    const { result, rerender } = renderHook(() => useStartupHydration());

    // Wait for initial hydration to complete
    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true);
    });

    expect(mockHydrateOnStartup).toHaveBeenCalledWith("user123", "imperial");

    // Clear the mock call count
    mockHydrateOnStartup.mockClear();

    // Change to different user
    mockUseAuth.mockReturnValue({
      user: { id: "user456" },
      isAuthenticated: true,
    } as any);

    // Re-render with new user
    rerender(undefined);

    // Should trigger hydration again for new user
    await waitFor(() => {
      expect(mockHydrateOnStartup).toHaveBeenCalledWith("user456", "imperial");
    });
  });

  it("should not hydrate again for the same user when already hydrated", async () => {
    // First hydration
    mockHydrateOnStartup.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(() => useStartupHydration());

    // Wait for initial hydration to complete
    await waitFor(() => {
      expect(result.current.hasHydrated).toBe(true);
    });

    // Clear the mock call count
    mockHydrateOnStartup.mockClear();

    // Force a re-render (simulates component re-render with same user)
    rerender(undefined);

    // Should not call hydration again since already hydrated for this user
    expect(result.current.hasHydrated).toBe(true);
    expect(result.current.isHydrating).toBe(false);
    expect(mockHydrateOnStartup).not.toHaveBeenCalled();
  });
});
