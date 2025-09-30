/**
 * FermentationEntryContextMenu Component Test Suite
 */

import React from "react";
import { render } from "@testing-library/react-native";

// Mock external dependencies BEFORE component import
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock useBrewSessions hook
const mockDeleteFermentationEntry = jest.fn();

const mockBrewSessionsHook = {
  data: null,
  isLoading: false,
  error: null,
  pendingCount: 0,
  conflictCount: 0,
  lastSync: null,
  getById: jest.fn(),
  deleteFermentationEntry: mockDeleteFermentationEntry,
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  clone: jest.fn(),
  sync: jest.fn(),
  refresh: jest.fn(),
};

jest.mock("@src/hooks/offlineV2", () => ({
  useBrewSessions: jest.fn(() => mockBrewSessionsHook),
}));

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    QueryClient: jest.fn().mockImplementation(() => ({
      invalidateQueries: jest.fn(),
      clear: jest.fn(),
    })),
    useMutation: jest.fn(() => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      error: null,
    })),
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(),
    })),
  };
});

jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    brewSessions: {
      deleteFermentationEntry: jest.fn(),
    },
  },
}));

// Mock user validation
jest.mock("@utils/userValidation", () => ({
  useUserValidation: () => ({
    canUserModifyResource: jest.fn().mockResolvedValue(true),
    validateUserOwnership: jest.fn().mockResolvedValue({ isValid: true }),
  }),
}));

jest.mock("@src/components/ui/ContextMenu/BaseContextMenu", () => {
  const React = require("react");
  const RN = require("react-native");
  return {
    BaseContextMenu: ({ visible, actions, item }: any) => {
      if (!visible || !item) {
        return null;
      }
      return React.createElement(
        RN.View,
        {},
        actions.map((action: any) =>
          React.createElement(RN.Text, { key: action.id }, action.title)
        )
      );
    },
  };
});

// Import component AFTER all mocks are defined
import { FermentationEntryContextMenu } from "@src/components/brewSessions/FermentationEntryContextMenu";

describe("FermentationEntryContextMenu", () => {
  const defaultProps = {
    visible: true,
    entry: null,
    entryIndex: 0,
    brewSessionId: "session-123",
    onClose: jest.fn(),
  };

  const mockEntry = {
    id: "entry-1",
    brew_session_id: "session-123",
    date: "2024-01-15T10:30:00Z",
    specific_gravity: 1.05,
    temperature_c: 20,
    ph: 4.5,
    notes: "Initial fermentation reading",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render menu options when entry is provided", () => {
    const props = {
      ...defaultProps,
      entry: mockEntry,
      entryIndex: 1,
    };

    const { getByText } = render(<FermentationEntryContextMenu {...props} />);

    expect(getByText("View Details")).toBeTruthy();
    expect(getByText("Edit Entry")).toBeTruthy();
    expect(getByText("Delete Entry")).toBeTruthy();
  });

  it("should render with entry data", () => {
    const props = {
      ...defaultProps,
      entry: mockEntry,
      entryIndex: 1,
    };

    expect(() => {
      render(<FermentationEntryContextMenu {...props} />);
    }).not.toThrow();
  });

  it("should handle missing entry data gracefully", () => {
    const props = {
      ...defaultProps,
      entry: null,
      entryIndex: undefined,
      brewSessionId: undefined,
    };

    expect(() => {
      render(<FermentationEntryContextMenu {...props} />);
    }).not.toThrow();
  });
});
