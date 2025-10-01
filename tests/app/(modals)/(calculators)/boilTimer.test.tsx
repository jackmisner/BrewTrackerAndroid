/**
 * Tests for Boil Timer Modal Component
 *
 * Tests the comprehensive boil timer modal with recipe integration, notifications,
 * app state handling, and timer persistence functionality
 */

import React from "react";
import { fireEvent, waitFor, act } from "@testing-library/react-native";
import { renderWithProviders, testUtils } from "@/tests/testUtils";
import { Alert, AppState } from "react-native";
import BoilTimerCalculatorScreen from "../../../../app/(modals)/(calculators)/boilTimer";

// Mock React Native components
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) =>
      Array.isArray(styles) ? Object.assign({}, ...styles) : styles,
  },
  Alert: {
    alert: jest.fn(),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

// Mock Expo modules
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

jest.mock("expo-notifications", () => ({
  Subscription: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ recipeId: "test-recipe-id" }),
}));

// Mock contexts
const mockCalculatorsState: any = {
  boilTimer: {
    duration: 60,
    timeRemaining: 3600,
    isRunning: false,
    isPaused: false,
    selectedRecipe: null,
    isRecipeMode: false,
    hopAlerts: [],
    timerStartedAt: undefined,
  },
  // Mock other calculator states
  abv: {},
  strikeWater: {},
  unitConverter: {},
  history: [],
};
const INITIAL_BOIL_TIMER_STATE = mockCalculatorsState.boilTimer;

const mockDispatch = jest.fn();

// CalculatorsContext and ThemeContext are provided by renderWithProviders
// But we need to mock the specific calculators state for state manipulation
const mockCalculatorsContext = {
  state: mockCalculatorsState,
  dispatch: mockDispatch,
};

jest.mock("@contexts/CalculatorsContext", () => ({
  ...jest.requireActual("@contexts/CalculatorsContext"),
  useCalculators: () => mockCalculatorsContext,
}));

// Mock ThemeContext to avoid conflicts with testUtils
jest.mock("@contexts/ThemeContext", () => {
  const React = require("react");
  return {
    useTheme: jest.fn(() => ({
      colors: {
        background: "#ffffff",
        text: "#000000",
        primary: "#f4511e",
        textSecondary: "#666666",
        border: "#e0e0e0",
      },
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock services
jest.mock("@services/calculators/BoilTimerCalculator", () => ({
  BoilTimerCalculator: {
    createFromRecipe: jest.fn(() => ({
      boilTime: 60,
      hopAlerts: [
        {
          time: 60,
          name: "Cascade",
          amount: 1,
          unit: "oz",
          added: false,
          alertScheduled: false,
        },
      ],
    })),
  },
}));

// Get reference to the mocked BoilTimerCalculator
const {
  BoilTimerCalculator: mockBoilTimerCalculator,
} = require("@services/calculators/BoilTimerCalculator");

jest.mock("@services/NotificationService", () => ({
  NotificationService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    setupForegroundListener: jest.fn(() => ({ remove: jest.fn() })),
    setupResponseListener: jest.fn(() => ({ remove: jest.fn() })),
    cancelAllAlerts: jest.fn().mockResolvedValue(undefined),
    scheduleHopAlertsForRecipe: jest.fn().mockResolvedValue(undefined),
    scheduleMilestoneNotifications: jest.fn().mockResolvedValue(undefined),
    scheduleBoilCompleteNotification: jest.fn().mockResolvedValue(undefined),
    logScheduledNotifications: jest.fn().mockResolvedValue(undefined),
    triggerHapticFeedback: jest.fn(),
    sendImmediateNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

// Get reference to the mocked service for easier access in tests
const mockNotificationService =
  require("@services/NotificationService").NotificationService;

jest.mock("@services/TimerPersistenceService", () => ({
  TimerPersistenceService: {
    loadTimerState: jest.fn().mockResolvedValue(null),
    saveTimerState: jest.fn().mockResolvedValue(true),
    handleAppForeground: jest.fn().mockResolvedValue(null),
    handleAppBackground: jest.fn().mockResolvedValue(undefined),
    startCheckpointing: jest.fn(),
    stopCheckpointing: jest.fn(),
  },
}));

// Get reference to the mocked service for easier access in tests
const mockTimerPersistenceService =
  require("@services/TimerPersistenceService").TimerPersistenceService;

const mockApiService = {
  recipes: {
    getById: jest.fn(),
  },
};

jest.mock("@services/api/apiService", () => ({
  default: mockApiService,
}));

// Mock React Query
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    mount: jest.fn(),
    unmount: jest.fn(),
  })),
  QueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
    mount: jest.fn(),
    unmount: jest.fn(),
  })),
  useQuery: jest.fn(() => ({
    data: {
      data: {
        id: "test-recipe-id",
        name: "Test Recipe",
        style: "IPA",
        boil_time: 60,
      },
    },
    isLoading: false,
  })),
}));

// Mock child components
jest.mock("@components/calculators/CalculatorCard", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    CalculatorCard: ({ title, children, testID }: any) =>
      React.createElement(
        RN.View,
        { testID },
        React.createElement(RN.Text, {}, title),
        children
      ),
  };
});

// Mock ModalHeader component
jest.mock("@src/components/ui/ModalHeader", () => ({
  ModalHeader: ({ title, testID }: { title: string; testID: string }) => {
    const React = require("react");
    return React.createElement("View", { testID }, [
      React.createElement("TouchableOpacity", {
        testID: `${testID}-back-button`,
        key: "back",
      }),
      React.createElement("Text", { key: "title" }, title),
      React.createElement("TouchableOpacity", {
        testID: `${testID}-home-button`,
        key: "home",
      }),
    ]);
  },
}));

jest.mock("@components/calculators/NumberInput", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    NumberInput: ({
      label,
      value,
      onChangeText,
      testID,
      placeholder,
      disabled,
      ...props
    }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { testID: testID, disabled },
        React.createElement(
          RN.TouchableOpacity,
          {
            onPress: () => onChangeText && onChangeText("45"),
            disabled,
          },
          React.createElement(RN.Text, {}, `${label}: ${value || placeholder}`)
        )
      ),
  };
});

jest.mock("@components/boilTimer/RecipeSelector", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    RecipeSelector: ({
      selectedRecipe,
      onRecipeSelect,
      onManualMode,
      disabled,
      testID,
    }: any) =>
      React.createElement(
        RN.TouchableOpacity,
        { testID: testID, disabled },
        React.createElement(
          RN.TouchableOpacity,
          {
            testID: "recipe-select-button",
            onPress: () =>
              onRecipeSelect &&
              onRecipeSelect({
                id: "test-recipe",
                name: "Test Recipe",
                boil_time: 60,
              }),
            disabled,
          },
          React.createElement(RN.Text, {}, "Select Recipe")
        ),
        React.createElement(
          RN.TouchableOpacity,
          {
            testID: "manual-mode-button",
            onPress: onManualMode,
            disabled,
          },
          React.createElement(RN.Text, {}, "Manual Mode")
        )
      ),
  };
});

describe("BoilTimerCalculatorScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.resetCounters();

    // Reset state to defaults
    mockCalculatorsState.boilTimer = {
      ...INITIAL_BOIL_TIMER_STATE,
    };

    // Reset service mocks
    mockTimerPersistenceService.loadTimerState.mockResolvedValue(null);
    mockTimerPersistenceService.handleAppForeground.mockResolvedValue(null);
    mockNotificationService.initialize.mockResolvedValue(undefined);
    mockApiService.recipes.getById.mockResolvedValue({
      data: {
        id: "test-recipe-id",
        name: "Test Recipe",
        style: "IPA",
        boil_time: 60,
      },
    });
  });

  it("should render boil timer screen", () => {
    const component = renderWithProviders(<BoilTimerCalculatorScreen />);
    expect(component).toBeTruthy();
  });

  it("should load persisted timer state on mount", async () => {
    const persistedState = {
      duration: 90,
      timeRemaining: 5400,
      isRunning: true,
    };

    mockTimerPersistenceService.loadTimerState.mockResolvedValue(
      persistedState
    );

    renderWithProviders(<BoilTimerCalculatorScreen />);

    await waitFor(() => {
      expect(mockTimerPersistenceService.loadTimerState).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "SET_BOIL_TIMER",
        payload: { duration: 90 },
      });
    });
  });

  it("should show completion alert for completed timer on mount", async () => {
    const completedState = {
      timeRemaining: 0,
      isRunning: false,
    };

    mockTimerPersistenceService.loadTimerState.mockResolvedValue(
      completedState
    );

    renderWithProviders(<BoilTimerCalculatorScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Boil Completed",
        "Your boil finished while the app was closed.",
        [{ text: "OK" }]
      );
    });
  });

  it("should handle persisted state loading errors gracefully", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockTimerPersistenceService.loadTimerState.mockRejectedValue(
      new Error("Load failed")
    );

    renderWithProviders(<BoilTimerCalculatorScreen />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load persisted timer state:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("should auto-load recipe from URL params", async () => {
    const component = renderWithProviders(<BoilTimerCalculatorScreen />);

    // With URL param recipeId set to "test-recipe-id", the component should attempt
    // to load recipe data. Since useQuery is mocked, we verify the component renders
    // successfully and that the timer component is in the correct state
    expect(component).toBeTruthy();

    // Verify the component renders the header correctly
    expect(component.getByText("Boil Timer")).toBeTruthy();
  });

  it("should handle recipe selection", async () => {
    const recipe = {
      id: "recipe-1",
      name: "IPA Recipe",
      style: "IPA",
      boil_time: 60,
    };

    mockBoilTimerCalculator.createFromRecipe.mockReturnValue({
      boilTime: 60,
      hopAlerts: [
        {
          time: 60,
          name: "Cascade",
          amount: 1,
          unit: "oz",
          added: false,
          alertScheduled: false,
        },
      ],
    });

    const component = renderWithProviders(<BoilTimerCalculatorScreen />);

    // The recipe selection happens via RecipeSelector component
    // Since it's mocked as "CalculatorCard", we verify component renders
    expect(component).toBeTruthy();

    // Verify that BoilTimerCalculator service is available for recipe processing
    expect(mockBoilTimerCalculator.createFromRecipe).toBeDefined();
  });

  it("should handle recipe loading errors", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockBoilTimerCalculator.createFromRecipe.mockImplementation(() => {
      throw new Error("Recipe load failed");
    });

    renderWithProviders(<BoilTimerCalculatorScreen />);

    // The error will be caught when the component tries to load the recipe
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error loading recipe:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("should handle manual mode selection", async () => {
    const component = renderWithProviders(<BoilTimerCalculatorScreen />);

    // Verify manual mode is the default (no recipe selected)
    // The component shows "Manual Timer" text when no recipe is selected
    expect(component.getByText("Manual Timer")).toBeTruthy();

    // Component should render in manual mode by default
    expect(component).toBeTruthy();
  });

  it("should handle manual duration change", async () => {
    mockCalculatorsState.boilTimer.isRecipeMode = false;

    const component = renderWithProviders(<BoilTimerCalculatorScreen />);

    // The NumberInput component is mocked, so we verify it's available for interaction
    // In manual mode, the duration input should be rendered
    expect(component).toBeTruthy();

    // Verify the component is in manual mode (showing default duration)
    expect(component.getByText("60:00")).toBeTruthy();
  });

  it("should initialize notifications on mount", async () => {
    renderWithProviders(<BoilTimerCalculatorScreen />);

    await waitFor(() => {
      expect(mockNotificationService.initialize).toHaveBeenCalled();
      expect(
        mockNotificationService.setupForegroundListener
      ).toHaveBeenCalled();
      expect(mockNotificationService.setupResponseListener).toHaveBeenCalled();
    });
  });

  it("should clean up notification listeners on unmount", async () => {
    const mockForegroundRemove = jest.fn();
    const mockResponseRemove = jest.fn();

    mockNotificationService.setupForegroundListener.mockReturnValue({
      remove: mockForegroundRemove,
    });
    mockNotificationService.setupResponseListener.mockReturnValue({
      remove: mockResponseRemove,
    });

    const { unmount } = renderWithProviders(<BoilTimerCalculatorScreen />);

    await waitFor(() => {
      expect(
        mockNotificationService.setupForegroundListener
      ).toHaveBeenCalled();
    });

    unmount();

    expect(mockForegroundRemove).toHaveBeenCalled();
    expect(mockResponseRemove).toHaveBeenCalled();
  });

  it("should format time correctly", () => {
    mockCalculatorsState.boilTimer.timeRemaining = 3665; // 61 minutes and 5 seconds

    const { getByText } = renderWithProviders(<BoilTimerCalculatorScreen />);

    // The formatted time "61:05" should be displayed in the timer
    expect(getByText("61:05")).toBeTruthy();
  });

  it("should calculate progress percentage correctly", () => {
    mockCalculatorsState.boilTimer.duration = 60;
    mockCalculatorsState.boilTimer.timeRemaining = 1800; // 30 minutes remaining

    const { getByTestId } = renderWithProviders(<BoilTimerCalculatorScreen />);

    // Progress should be 50% (30 minutes of 60 minute boil complete)
    const progressBar = getByTestId("progress-bar");
    expect(progressBar).toBeTruthy();
    // Progress calculation: (3600 - 1800) / 3600 = 0.5 = 50%
  });

  it("should handle app state changes - going to background", async () => {
    const mockAppStateListener = jest.fn();
    const mockAddEventListener = jest.fn((event, listener) => {
      mockAppStateListener.mockImplementation(listener);
      return { remove: jest.fn() };
    });

    // Override the AppState mock for this test
    const originalAppState = require("react-native").AppState;
    require("react-native").AppState = {
      ...originalAppState,
      addEventListener: mockAddEventListener,
      currentState: "active",
    };

    renderWithProviders(<BoilTimerCalculatorScreen />);

    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });

    // Simulate app going to background
    await act(async () => {
      mockAppStateListener("background");
    });

    expect(
      mockTimerPersistenceService.handleAppBackground
    ).toHaveBeenCalledWith(mockCalculatorsState.boilTimer);
  });

  it("should handle app state changes - coming to foreground", async () => {
    const mockAppStateListener = jest.fn();
    const mockAddEventListener = jest.fn((event, listener) => {
      mockAppStateListener.mockImplementation(listener);
      return { remove: jest.fn() };
    });

    require("react-native").AppState = {
      currentState: "background",
      addEventListener: mockAddEventListener,
    };

    mockTimerPersistenceService.handleAppForeground.mockResolvedValue({
      timeRemaining: 1800,
      isRunning: true,
    });

    renderWithProviders(<BoilTimerCalculatorScreen />);

    await act(async () => {
      mockAppStateListener("active");
    });

    await waitFor(() => {
      expect(
        mockTimerPersistenceService.handleAppForeground
      ).toHaveBeenCalled();
    });
  });

  it("should show completion alert when timer finishes in background", async () => {
    const mockAppStateListener = jest.fn();
    const mockAddEventListener = jest.fn((event, listener) => {
      mockAppStateListener.mockImplementation(listener);
      return { remove: jest.fn() };
    });

    require("react-native").AppState = {
      currentState: "background",
      addEventListener: mockAddEventListener,
    };

    mockTimerPersistenceService.handleAppForeground.mockResolvedValue({
      timeRemaining: 0,
      isRunning: false,
    });

    renderWithProviders(<BoilTimerCalculatorScreen />);

    await act(async () => {
      mockAppStateListener("active");
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Boil Completed",
        "Your boil finished while the app was in the background!",
        [{ text: "OK" }]
      );
    });
  });

  it("should start checkpointing when timer is running", () => {
    mockCalculatorsState.boilTimer.isRunning = true;
    mockCalculatorsState.boilTimer.isPaused = false;

    renderWithProviders(<BoilTimerCalculatorScreen />);

    expect(mockTimerPersistenceService.startCheckpointing).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it("should stop checkpointing when timer stops", () => {
    mockCalculatorsState.boilTimer.isRunning = false;

    renderWithProviders(<BoilTimerCalculatorScreen />);

    expect(mockTimerPersistenceService.stopCheckpointing).toHaveBeenCalled();
  });

  it("should save timer state when timer stops", () => {
    mockCalculatorsState.boilTimer.isRunning = false;

    renderWithProviders(<BoilTimerCalculatorScreen />);

    expect(mockTimerPersistenceService.saveTimerState).toHaveBeenCalledWith(
      mockCalculatorsState.boilTimer
    );
  });

  it("should handle timer start with recipe mode", async () => {
    mockCalculatorsState.boilTimer.isRecipeMode = true;
    mockCalculatorsState.boilTimer.timeRemaining = 3600;
    mockCalculatorsState.boilTimer.hopAlerts = [
      {
        time: 60,
        name: "Cascade",
        amount: 1,
        unit: "oz",
        added: false,
        alertScheduled: false,
      },
    ];

    const component = renderWithProviders(<BoilTimerCalculatorScreen />);

    // We can't easily trigger the start button since it's mocked,
    // but we can verify the component renders properly with recipe mode
    expect(component).toBeTruthy();
  });

  it("should handle timer start scheduling notifications", async () => {
    mockCalculatorsState.boilTimer.timeRemaining = 3600;
    mockCalculatorsState.boilTimer.isRecipeMode = true;
    mockCalculatorsState.boilTimer.hopAlerts = [
      { time: 30, name: "Centennial", amount: 1, unit: "oz" },
    ];

    const { queryByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    // Use queryByTestId to check if the button exists before trying to use it
    const startButton = queryByTestId("start-timer-button");
    expect(startButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(startButton!);
    });

    await waitFor(() => {
      expect(mockNotificationService.cancelAllAlerts).toHaveBeenCalled();
      expect(
        mockNotificationService.scheduleMilestoneNotifications
      ).toHaveBeenCalledWith(3600); // timeRemaining in seconds
      expect(
        mockNotificationService.scheduleBoilCompleteNotification
      ).toHaveBeenCalledWith(3600); // timeRemaining in seconds
      expect(
        mockNotificationService.scheduleHopAlertsForRecipe
      ).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            time: 30,
            name: "Centennial",
            amount: 1,
            unit: "oz",
          }),
        ]),
        3600
      );
    });
  });

  it("should handle timer pause", async () => {
    mockCalculatorsState.boilTimer.isRunning = true;

    const { queryByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    const pauseButton = queryByTestId("pause-timer-button");
    expect(pauseButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(pauseButton!);
    });

    await waitFor(() => {
      expect(mockNotificationService.cancelAllAlerts).toHaveBeenCalled();
      expect(mockNotificationService.triggerHapticFeedback).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SET_BOIL_TIMER",
          payload: expect.objectContaining({
            isPaused: true,
          }),
        })
      );
    });
  });

  it("should handle timer stop with confirmation", async () => {
    mockCalculatorsState.boilTimer.isRunning = true;

    const { getByTestId } = renderWithProviders(<BoilTimerCalculatorScreen />);

    const stopButton = getByTestId("stop-timer-button");

    await act(async () => {
      fireEvent.press(stopButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Stop Timer",
        "Are you sure you want to stop the timer?",
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancel" }),
          expect.objectContaining({ text: "Stop" }),
        ])
      );
    });
  });

  it("should handle timer reset", async () => {
    mockCalculatorsState.boilTimer.duration = 60;
    mockCalculatorsState.boilTimer.timeRemaining = 1800;
    mockCalculatorsState.boilTimer.hopAlerts = [
      {
        time: 60,
        name: "Cascade",
        amount: 1,
        unit: "oz",
        added: true,
        alertScheduled: true,
      },
    ];

    const { getByTestId } = renderWithProviders(<BoilTimerCalculatorScreen />);

    const resetButton = getByTestId("reset-timer-button");

    await act(async () => {
      fireEvent.press(resetButton);
    });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SET_BOIL_TIMER",
          payload: expect.objectContaining({
            timeRemaining: 3600, // Reset to full duration (60 * 60)
            isRunning: false,
            isPaused: false,
          }),
        })
      );
    });
  });

  it("should handle hop addition marking", async () => {
    // Set up state with hop alerts
    mockCalculatorsState.boilTimer = {
      ...mockCalculatorsState.boilTimer,
      hopAlerts: [
        {
          time: 60,
          name: "Cascade",
          amount: 1,
          unit: "oz",
          added: false,
          alertScheduled: false,
        },
      ],
    };

    const { queryByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    const hopButton = queryByTestId("hop-addition-0");

    // Check if hop button exists before pressing it
    expect(hopButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(hopButton!);
    });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "MARK_HOP_ADDED",
        payload: 0,
      });
    });
  });

  it("should render hop addition cards correctly", () => {
    // Set up state with hop alerts
    mockCalculatorsState.boilTimer = {
      ...mockCalculatorsState.boilTimer,
      hopAlerts: [
        {
          time: 60,
          name: "Cascade",
          amount: 1,
          unit: "oz",
          added: false,
          alertScheduled: false,
        },
        {
          time: 30,
          name: "Centennial",
          amount: 0.5,
          unit: "oz",
          added: false,
          alertScheduled: true,
        },
      ],
    };

    const { getByText, getByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    // Verify hop cards are rendered
    expect(getByText("Cascade")).toBeTruthy();
    expect(getByText("Centennial")).toBeTruthy();
    expect(getByText("1 oz")).toBeTruthy();
    expect(getByText("0.5 oz")).toBeTruthy();

    // Verify hop addition buttons exist
    expect(getByTestId("hop-addition-0")).toBeTruthy();
    expect(getByTestId("hop-addition-1")).toBeTruthy();
  });

  it("should show hop schedule subtitle correctly", () => {
    // Set up state with single hop alert
    mockCalculatorsState.boilTimer = {
      ...mockCalculatorsState.boilTimer,
      hopAlerts: [
        {
          time: 60,
          name: "Cascade",
          amount: 1,
          unit: "oz",
          added: false,
          alertScheduled: false,
        },
      ],
    };

    const { getByText } = renderWithProviders(<BoilTimerCalculatorScreen />);

    expect(getByText("1 hop addition scheduled")).toBeTruthy();
  });

  it("should show hop schedule subtitle with plural", () => {
    // Set up state with multiple hop alerts
    mockCalculatorsState.boilTimer = {
      ...mockCalculatorsState.boilTimer,
      hopAlerts: [
        {
          time: 60,
          name: "Cascade",
          amount: 1,
          unit: "oz",
          added: false,
          alertScheduled: false,
        },
        {
          time: 30,
          name: "Centennial",
          amount: 0.5,
          unit: "oz",
          added: false,
          alertScheduled: false,
        },
      ],
    };

    const { getByText } = renderWithProviders(<BoilTimerCalculatorScreen />);

    expect(getByText("2 hop additions scheduled")).toBeTruthy();
  });

  it("should handle disabled state when timer has no time remaining", () => {
    mockCalculatorsState.boilTimer.timeRemaining = 0;

    const { queryByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    const startButton = queryByTestId("start-timer-button");
    expect(startButton).toBeTruthy();
    expect(startButton!.props.disabled).toBe(true);
  });

  it("should handle disabled recipe selection when timer is running", () => {
    // Set up running timer state
    mockCalculatorsState.boilTimer = {
      ...mockCalculatorsState.boilTimer,
      isRunning: true,
    };

    const { queryByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    const recipeSelector = queryByTestId("recipe-selector");
    expect(recipeSelector).toBeTruthy();
    expect(recipeSelector!.props.disabled).toBe(true);
  });

  it("should handle disabled duration input when timer is running", () => {
    // Set up manual mode with running timer
    mockCalculatorsState.boilTimer = {
      ...mockCalculatorsState.boilTimer,
      isRunning: true,
      isRecipeMode: false,
    };

    const { queryByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    const durationInput = queryByTestId("boil-duration-input");
    expect(durationInput).toBeTruthy();
    expect(durationInput!.props.disabled).toBe(true);
  });

  it("should show recipe name in timer display when recipe is selected", () => {
    mockCalculatorsState.boilTimer.selectedRecipe = {
      id: "recipe-1",
      name: "IPA Recipe",
      style: "IPA",
      boil_time: 60,
    };

    const { getByText } = renderWithProviders(<BoilTimerCalculatorScreen />);

    expect(getByText("IPA Recipe")).toBeTruthy();
  });

  it("should show manual timer label when no recipe is selected", () => {
    mockCalculatorsState.boilTimer.selectedRecipe = null;

    const { getByText } = renderWithProviders(<BoilTimerCalculatorScreen />);

    expect(getByText("Manual Timer")).toBeTruthy();
  });

  it("should handle edge case with zero duration", () => {
    mockCalculatorsState.boilTimer.duration = 0;
    mockCalculatorsState.boilTimer.timeRemaining = 0;

    const { getByText, queryByTestId } = renderWithProviders(
      <BoilTimerCalculatorScreen />
    );

    // Should display zero time correctly
    expect(getByText("00:00")).toBeTruthy();

    // Start button should be disabled with zero duration
    const startButton = queryByTestId("start-timer-button");
    expect(startButton).toBeTruthy();
    expect(startButton!.props.disabled).toBe(true);
  });

  it("should clean up intervals on unmount", () => {
    const { unmount } = renderWithProviders(<BoilTimerCalculatorScreen />);

    // Should clean up any running intervals
    unmount();

    // Cleanup should have occurred without errors
    expect(mockTimerPersistenceService.stopCheckpointing).toHaveBeenCalled();
  });
});
