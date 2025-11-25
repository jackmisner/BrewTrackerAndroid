/**
 * Network Status Banner Component Test Suite
 *
 * Testing meaningful functionality:
 * - Network status display logic (online/offline)
 * - Banner visibility based on connection state
 * - Connection type indicators and text
 * - Retry functionality and callbacks
 * - Theme integration and styling
 * - Accessibility features
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import {
  NetworkStatusBanner,
  NetworkStatusIndicator,
} from "@components/banners";

// Mock React Native components
jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: "View",
    Text: "Text",
    TouchableOpacity: "TouchableOpacity",
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (styles: any) => styles,
    },
  };
});

// Mock Expo Vector Icons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: (props: any) => `MaterialIcons-${props.name}`,
}));

// Mock ThemeContext
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      error: "#f44336",
      success: "#4caf50",
      primary: "#007AFF",
    },
  }),
}));

// Mock NetworkContext with controllable state
const mockRefreshNetworkState = jest.fn().mockResolvedValue(undefined);
const mockUseNetwork = jest.fn();

jest.mock("@contexts/NetworkContext", () => ({
  useNetwork: () => mockUseNetwork(),
}));

// Clear the global mock from setupTests.js so we can test the real component
jest.unmock("@components/banners/NetworkStatusBanner");

describe("NetworkStatusBanner", () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset network state to defaults
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });
  });

  it("should not render when connected", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { queryByTestId } = render(
      <NetworkStatusBanner onRetry={mockOnRetry} />
    );

    expect(queryByTestId("network-status-banner")).toBeNull();
  });

  it("should render when disconnected", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByTestId } = render(
      <NetworkStatusBanner onRetry={mockOnRetry} />
    );

    expect(getByTestId("network-status-banner")).toBeTruthy();
  });

  it("should display offline status text when offline", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByText } = render(<NetworkStatusBanner onRetry={mockOnRetry} />);

    expect(getByText("No internet connection")).toBeTruthy();
    expect(getByText("Some features may be unavailable")).toBeTruthy();
  });

  it("should show retry button when onRetry callback is provided", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByTestId } = render(
      <NetworkStatusBanner onRetry={mockOnRetry} />
    );

    expect(getByTestId("retry-connection-button")).toBeTruthy();
  });

  it("should not show retry button when onRetry callback is not provided", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { queryByTestId } = render(<NetworkStatusBanner />);

    expect(queryByTestId("retry-connection-button")).toBeNull();
  });

  it("should call retry callback when retry button is pressed", async () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByTestId } = render(
      <NetworkStatusBanner onRetry={mockOnRetry} />
    );

    fireEvent.press(getByTestId("retry-connection-button"));

    expect(mockRefreshNetworkState).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  it("should display limited connectivity when not offline but disconnected", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: false,
      connectionType: "unknown",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByText } = render(<NetworkStatusBanner onRetry={mockOnRetry} />);

    expect(getByText("Limited connectivity")).toBeTruthy();
  });

  it("should show connection type when showConnectionType is enabled", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: false,
      connectionType: "cellular",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByText } = render(
      <NetworkStatusBanner onRetry={mockOnRetry} showConnectionType={true} />
    );

    expect(getByText("Connected via cellular")).toBeTruthy();
  });

  it("should show limited connectivity for unknown connection type even with showConnectionType enabled", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: false,
      connectionType: "unknown",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByText } = render(
      <NetworkStatusBanner onRetry={mockOnRetry} showConnectionType={true} />
    );

    expect(getByText("Limited connectivity")).toBeTruthy();
  });
});

describe("NetworkStatusIndicator", () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset network state to defaults
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });
  });

  it("should render indicator with online status when connected", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByTestId, getByText } = render(
      <NetworkStatusIndicator showText={true} />
    );

    expect(getByTestId("network-status-indicator")).toBeTruthy();
    expect(getByText("Online")).toBeTruthy();
  });

  it("should render indicator with offline status when disconnected", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: false,
      isOffline: true,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByTestId, getByText } = render(
      <NetworkStatusIndicator showText={true} />
    );

    expect(getByTestId("network-status-indicator")).toBeTruthy();
    expect(getByText("Offline")).toBeTruthy();
  });

  it("should not show text when showText is false", () => {
    mockUseNetwork.mockReturnValue({
      isConnected: true,
      isOffline: false,
      connectionType: "wifi",
      refreshNetworkState: mockRefreshNetworkState,
    });

    const { getByTestId, queryByText } = render(
      <NetworkStatusIndicator showText={false} />
    );

    expect(getByTestId("network-status-indicator")).toBeTruthy();
    expect(queryByText("Online")).toBeNull();
  });
});
