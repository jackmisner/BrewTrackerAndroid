import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types for calculator states
export interface UnitConverterState {
  fromUnit: string;
  toUnit: string;
  value: string;
  result: number | null;
  category: "weight" | "volume" | "temperature";
}

export interface ABVState {
  originalGravity: string;
  finalGravity: string;
  formula: "simple" | "advanced";
  unitType: "sg" | "plato" | "brix";
  result: number | null;
}

export interface StrikeWaterState {
  grainWeight: string;
  grainWeightUnit: string;
  grainTemp: string;
  targetMashTemp: string;
  tempUnit: "f" | "c";
  waterToGrainRatio: string;
  result: {
    strikeTemp: number;
    waterVolume: number;
  } | null;
}

export interface HydrometerCorrectionState {
  measuredGravity: string;
  wortTemp: string;
  calibrationTemp: string;
  tempUnit: "f" | "c";
  result: number | null;
}

export interface DilutionState {
  currentGravity: string;
  currentVolume: string;
  targetGravity: string;
  volumeUnit: string;
  result: {
    finalVolume: number;
    waterToAdd: number;
  } | null;
}

export interface PrimingSugarState {
  beerVolume: string;
  volumeUnit: string;
  currentCO2: string;
  targetCO2: string;
  sugarType: "corn-sugar" | "table-sugar" | "dme" | "honey";
  result: number | null;
}

export interface YeastPitchRateState {
  originalGravity: string;
  beerVolume: string;
  volumeUnit: string;
  yeastType: "ale" | "lager";
  viability: string;
  result: {
    targetCells: number;
    packetsNeeded: number;
  } | null;
}

export interface EfficiencyState {
  grainBill: Array<{
    weight: string;
    ppg: string;
  }>;
  expectedOG: string;
  actualOG: string;
  batchSize: string;
  volumeUnit: string;
  result: {
    mashEfficiency: number;
    brewhouseEfficiency: number;
  } | null;
}

export interface BoilTimerState {
  duration: number; // minutes
  isRunning: boolean;
  timeRemaining: number; // seconds
  additions: Array<{
    time: number;
    description: string;
    completed: boolean;
  }>;
  recipeId?: string;
  selectedRecipe?: {
    id: string;
    name: string;
    style: string;
    boil_time: number;
  } | null;
  hopAlerts: Array<{
    time: number;
    name: string;
    amount: number;
    unit: string;
    added: boolean;
    alertScheduled: boolean;
  }>;
  isRecipeMode: boolean;
  preTimerCountdown?: number; // seconds before timer starts
  isPaused: boolean;
  timerStartedAt?: number; // timestamp when timer started
}

export interface UserPreferences {
  defaultUnits: "metric" | "imperial";
  temperatureUnit: "f" | "c";
  saveHistory: boolean;
}

export interface CalculationHistory {
  [calculatorType: string]: Array<{
    id: string;
    timestamp: number;
    inputs: any;
    result: any;
  }>;
}

// Main calculator state
export interface CalculatorState {
  unitConverter: UnitConverterState;
  abv: ABVState;
  strikeWater: StrikeWaterState;
  hydrometerCorrection: HydrometerCorrectionState;
  dilution: DilutionState;
  primingSugar: PrimingSugarState;
  yeastPitchRate: YeastPitchRateState;
  efficiency: EfficiencyState;
  boilTimer: BoilTimerState;
  preferences: UserPreferences;
  history: CalculationHistory;
}

// Action types
export type CalculatorAction =
  | { type: "SET_UNIT_CONVERTER"; payload: Partial<UnitConverterState> }
  | { type: "SET_ABV"; payload: Partial<ABVState> }
  | { type: "SET_STRIKE_WATER"; payload: Partial<StrikeWaterState> }
  | {
      type: "SET_HYDROMETER_CORRECTION";
      payload: Partial<HydrometerCorrectionState>;
    }
  | { type: "SET_DILUTION"; payload: Partial<DilutionState> }
  | { type: "SET_PRIMING_SUGAR"; payload: Partial<PrimingSugarState> }
  | { type: "SET_YEAST_PITCH_RATE"; payload: Partial<YeastPitchRateState> }
  | { type: "SET_EFFICIENCY"; payload: Partial<EfficiencyState> }
  | { type: "SET_BOIL_TIMER"; payload: Partial<BoilTimerState> }
  | { type: "UPDATE_BOIL_TIMER_TICK"; payload: number }
  | { type: "MARK_ADDITION_COMPLETED"; payload: number }
  | {
      type: "LOAD_RECIPE_FOR_TIMER";
      payload: { recipeId: string; recipeData: any };
    }
  | {
      type: "START_RECIPE_TIMER";
      payload: { duration: number; hopAlerts: any[] };
    }
  | { type: "MARK_HOP_ADDED"; payload: number }
  | { type: "RESET_TIMER_STATE" }
  | { type: "SET_PREFERENCES"; payload: Partial<UserPreferences> }
  | {
      type: "ADD_TO_HISTORY";
      payload: { calculatorType: string; inputs: any; result: any };
    }
  | { type: "CLEAR_HISTORY"; payload: string }
  | { type: "RESET_CALCULATOR"; payload: string }
  | { type: "LOAD_PERSISTED_STATE"; payload: Partial<CalculatorState> };

// Initial state
const initialState: CalculatorState = {
  unitConverter: {
    fromUnit: "kg",
    toUnit: "lb",
    value: "",
    result: null,
    category: "weight",
  },
  abv: {
    originalGravity: "",
    finalGravity: "",
    formula: "simple",
    unitType: "sg",
    result: null,
  },
  strikeWater: {
    grainWeight: "",
    grainWeightUnit: "lb",
    grainTemp: "",
    targetMashTemp: "",
    tempUnit: "f",
    waterToGrainRatio: "1.25",
    result: null,
  },
  hydrometerCorrection: {
    measuredGravity: "",
    wortTemp: "",
    calibrationTemp: "60",
    tempUnit: "f",
    result: null,
  },
  dilution: {
    currentGravity: "",
    currentVolume: "",
    targetGravity: "",
    volumeUnit: "gal",
    result: null,
  },
  primingSugar: {
    beerVolume: "",
    volumeUnit: "gal",
    currentCO2: "1.0",
    targetCO2: "2.4",
    sugarType: "corn-sugar",
    result: null,
  },
  yeastPitchRate: {
    originalGravity: "",
    beerVolume: "",
    volumeUnit: "gal",
    yeastType: "ale",
    viability: "100",
    result: null,
  },
  efficiency: {
    grainBill: [],
    expectedOG: "",
    actualOG: "",
    batchSize: "",
    volumeUnit: "gal",
    result: null,
  },
  boilTimer: {
    duration: 60,
    isRunning: false,
    timeRemaining: 60 * 60, // seconds
    additions: [],
    recipeId: undefined,
    selectedRecipe: null,
    hopAlerts: [],
    isRecipeMode: false,
    preTimerCountdown: undefined,
    isPaused: false,
    timerStartedAt: undefined,
  },
  preferences: {
    defaultUnits: "imperial",
    temperatureUnit: "f",
    saveHistory: true,
  },
  history: {},
};

// Deep merge helper for LOAD_PERSISTED_STATE
function deepMergePersistedState(
  prevState: CalculatorState,
  persistedState: Partial<CalculatorState>
): CalculatorState {
  return {
    // Merge each nested slice with defaults
    unitConverter: {
      ...prevState.unitConverter,
      ...persistedState.unitConverter,
    },
    abv: { ...prevState.abv, ...persistedState.abv },
    strikeWater: { ...prevState.strikeWater, ...persistedState.strikeWater },
    hydrometerCorrection: {
      ...prevState.hydrometerCorrection,
      ...persistedState.hydrometerCorrection,
    },
    dilution: { ...prevState.dilution, ...persistedState.dilution },
    primingSugar: { ...prevState.primingSugar, ...persistedState.primingSugar },
    yeastPitchRate: {
      ...prevState.yeastPitchRate,
      ...persistedState.yeastPitchRate,
    },
    efficiency: { ...prevState.efficiency, ...persistedState.efficiency },
    preferences: { ...prevState.preferences, ...persistedState.preferences },

    // Special handling for boilTimer: merge fields and sanitize ephemeral flags
    boilTimer: persistedState.boilTimer
      ? {
          ...prevState.boilTimer,
          ...persistedState.boilTimer,
          // Sanitize ephemeral flags
          isRunning: false,
          isPaused: false,
          timerStartedAt: undefined,
          // Normalize hopAlerts to preserve alertScheduled=false
          hopAlerts:
            persistedState.boilTimer.hopAlerts?.map(alert => ({
              ...alert,
              alertScheduled: false,
            })) ?? prevState.boilTimer.hopAlerts,
        }
      : prevState.boilTimer,

    // Keep history as persisted.history ?? prev.history
    history: persistedState.history ?? prevState.history,
  };
}

// Reducer
function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case "SET_UNIT_CONVERTER":
      return {
        ...state,
        unitConverter: { ...state.unitConverter, ...action.payload },
      };
    case "SET_ABV":
      return {
        ...state,
        abv: { ...state.abv, ...action.payload },
      };
    case "SET_STRIKE_WATER":
      return {
        ...state,
        strikeWater: { ...state.strikeWater, ...action.payload },
      };
    case "SET_HYDROMETER_CORRECTION":
      return {
        ...state,
        hydrometerCorrection: {
          ...state.hydrometerCorrection,
          ...action.payload,
        },
      };
    case "SET_DILUTION":
      return {
        ...state,
        dilution: { ...state.dilution, ...action.payload },
      };
    case "SET_PRIMING_SUGAR":
      return {
        ...state,
        primingSugar: { ...state.primingSugar, ...action.payload },
      };
    case "SET_YEAST_PITCH_RATE":
      return {
        ...state,
        yeastPitchRate: { ...state.yeastPitchRate, ...action.payload },
      };
    case "SET_EFFICIENCY":
      return {
        ...state,
        efficiency: { ...state.efficiency, ...action.payload },
      };
    case "SET_BOIL_TIMER":
      return {
        ...state,
        boilTimer: { ...state.boilTimer, ...action.payload },
      };
    case "UPDATE_BOIL_TIMER_TICK":
      return {
        ...state,
        boilTimer: {
          ...state.boilTimer,
          timeRemaining: Math.max(0, action.payload),
        },
      };
    case "MARK_ADDITION_COMPLETED":
      return {
        ...state,
        boilTimer: {
          ...state.boilTimer,
          additions: state.boilTimer.additions.map((addition, index) =>
            index === action.payload
              ? { ...addition, completed: true }
              : addition
          ),
        },
      };
    case "LOAD_RECIPE_FOR_TIMER":
      return {
        ...state,
        boilTimer: {
          ...state.boilTimer,
          recipeId: action.payload.recipeId,
          selectedRecipe: action.payload.recipeData,
          isRecipeMode: true,
        },
      };
    case "START_RECIPE_TIMER":
      return {
        ...state,
        boilTimer: {
          ...state.boilTimer,
          duration: action.payload.duration,
          timeRemaining: action.payload.duration * 60,
          hopAlerts: action.payload.hopAlerts,
          isRunning: false,
          isPaused: false,
          timerStartedAt: undefined,
        },
      };
    case "MARK_HOP_ADDED":
      return {
        ...state,
        boilTimer: {
          ...state.boilTimer,
          hopAlerts: state.boilTimer.hopAlerts.map((hop, index) =>
            index === action.payload ? { ...hop, added: true } : hop
          ),
        },
      };
    case "RESET_TIMER_STATE":
      return {
        ...state,
        boilTimer: {
          ...initialState.boilTimer,
        },
      };
    case "SET_PREFERENCES":
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    case "ADD_TO_HISTORY":
      if (!state.preferences.saveHistory) return state;
      const { calculatorType, inputs, result } = action.payload;
      const historyEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        inputs,
        result,
      };
      return {
        ...state,
        history: {
          ...state.history,
          [calculatorType]: [
            historyEntry,
            ...(state.history[calculatorType] || []).slice(0, 9), // Keep last 10
          ],
        },
      };
    case "CLEAR_HISTORY":
      return {
        ...state,
        history: {
          ...state.history,
          [action.payload]: [],
        },
      };
    case "RESET_CALCULATOR":
      const resetKey = action.payload as keyof CalculatorState;
      if (resetKey in initialState) {
        return {
          ...state,
          [resetKey]: initialState[resetKey],
        };
      }
      return state;
    case "LOAD_PERSISTED_STATE":
      return deepMergePersistedState(state, action.payload);
    default:
      return state;
  }
}

// Context
const CalculatorsContext = createContext<
  | {
      state: CalculatorState;
      dispatch: React.Dispatch<CalculatorAction>;
    }
  | undefined
>(undefined);

// Storage key
const STORAGE_KEY = "calculators_state";

// Helper to get persistable state (excludes hot/ephemeral fields)
function getPersistableState(state: CalculatorState): Partial<CalculatorState> {
  const { boilTimer, history, ...rest } = state;

  // Normalize boilTimer - exclude runtime fields
  const normalizedBoilTimer = {
    ...boilTimer,
    isRunning: false,
    isPaused: false,
    timeRemaining: boilTimer.duration * 60, // Reset to duration
    timerStartedAt: undefined,
    preTimerCountdown: undefined,
  };

  return {
    ...rest,
    boilTimer: normalizedBoilTimer,
    // Only include history if saveHistory is true
    ...(state.preferences.saveHistory && { history }),
  };
}

// Provider
export function CalculatorsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // Load persisted state on mount
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const persistedStateStr = await AsyncStorage.getItem(STORAGE_KEY);
        if (persistedStateStr) {
          const persistedState = JSON.parse(persistedStateStr);
          dispatch({ type: "LOAD_PERSISTED_STATE", payload: persistedState });
        }
      } catch (error) {
        console.warn("Failed to load calculator state:", error);
      } finally {
        // Mark hydration as complete
        setHydrated(true);
      }
    };

    loadPersistedState();
  }, []);

  // Persist state changes (debounced)
  useEffect(() => {
    // Return early if hydration is not complete to avoid overwriting stored data
    if (!hydrated) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const persistableState = getPersistableState(state);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(persistableState)
        );
      } catch (error) {
        console.warn("Failed to persist calculator state:", error);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [state, hydrated]);

  return (
    <CalculatorsContext.Provider value={{ state, dispatch }}>
      {children}
    </CalculatorsContext.Provider>
  );
}

// Hook
export function useCalculators() {
  const context = useContext(CalculatorsContext);
  if (context === undefined) {
    throw new Error("useCalculators must be used within a CalculatorsProvider");
  }
  return context;
}
