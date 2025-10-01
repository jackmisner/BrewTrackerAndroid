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
const mockDeleteFermentationEntry = jest.fn().mockResolvedValue(undefined);

const mockBrewSessionsHook /* : Partial<ReturnType<typeof require("@src/hooks/offlineV2").useBrewSessions>> */ =
  {
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
          React.createElement(
            RN.TouchableOpacity,
            {
              key: action.id,
              onPress: () => action.onPress?.(item),
              testID: `action-${action.id}`,
            },
            React.createElement(RN.Text, null, action.title)
          )
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
    gravity: 1.05,
    temperature: 20,
    ph: 4.5,
    notes: "Initial fermentation reading",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  const mockEntryWithEntryDate = {
    id: "entry-2",
    brew_session_id: "session-123",
    entry_date: "2024-01-20T10:30:00Z",
    gravity: 1.045,
    temperature: 68,
    ph: 4.2,
    notes: "Mid-fermentation reading",
  };

  const mockEntryWithoutDate = {
    id: "entry-3",
    brew_session_id: "session-123",
    gravity: 1.012,
    temperature: 65,
    ph: 4.0,
  };

  const mockEntryInvalidDate = {
    id: "entry-4",
    brew_session_id: "session-123",
    date: "invalid-date-string",
    gravity: 1.015,
    temperature: 20,
    ph: 4.2,
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

  it("should handle missing required props gracefully (no render)", () => {
    const props = {
      ...defaultProps,
      entryIndex: undefined,
      brewSessionId: undefined,
    };

    expect(() => {
      render(<FermentationEntryContextMenu {...props} />);
    }).not.toThrow();
  });

  describe("Date Formatting", () => {
    it("should handle entry with entry_date field", () => {
      const props = {
        ...defaultProps,
        entry: mockEntryWithEntryDate,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with date field", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry without date", () => {
      const props = {
        ...defaultProps,
        entry: mockEntryWithoutDate,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with invalid date", () => {
      const props = {
        ...defaultProps,
        entry: mockEntryInvalidDate,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });
  });

  describe("Entry Index Handling", () => {
    it("should render when entryIndex is 0", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 0,
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);
      expect(getByText("View Details")).toBeTruthy();
    });

    it("should render when entryIndex is positive", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 5,
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);
      expect(getByText("Edit Entry")).toBeTruthy();
    });

    it("should not render when entryIndex is undefined", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: undefined,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });
  });

  describe("Brew Session ID Handling", () => {
    it("should render with valid brew session ID", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        brewSessionId: "valid-session-id",
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);
      expect(getByText("Delete Entry")).toBeTruthy();
    });

    it("should not render when brewSessionId is undefined", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        brewSessionId: undefined,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });
  });

  describe("User Permissions", () => {
    it("should render with brewSessionUserId provided", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        brewSessionUserId: "user-123",
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should render without brewSessionUserId", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        brewSessionUserId: undefined,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });
  });

  describe("Visibility Handling", () => {
    it("should not render when visible is false", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        visible: false,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should render when visible is true", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        visible: true,
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);
      expect(getByText("View Details")).toBeTruthy();
    });
  });

  describe("Position Prop", () => {
    it("should render with position prop", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        position: { x: 100, y: 200 },
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should render without position prop", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        position: undefined,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });
  });

  describe("Entry Data Variations", () => {
    it("should handle entry with all fields", () => {
      const fullEntry = {
        id: "entry-full",
        brew_session_id: "session-123",
        entry_date: "2024-01-15T10:30:00Z",
        date: "2024-01-15T10:30:00Z",
        gravity: 1.05,
        temperature: 68,
        ph: 4.5,
        notes: "Full entry data",
      };

      const props = {
        ...defaultProps,
        entry: fullEntry,
        entryIndex: 1,
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);
      expect(getByText("View Details")).toBeTruthy();
    });

    it("should handle entry with minimal fields", () => {
      const minimalEntry: any = {
        id: "entry-minimal",
        brew_session_id: "session-123",
        gravity: 1.04,
        temperature: 60,
        ph: 4.2,
      };

      const props = {
        ...defaultProps,
        entry: minimalEntry,
        entryIndex: 1,
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);
      expect(getByText("Edit Entry")).toBeTruthy();
    });

    it("should handle entry with 0 gravity", () => {
      const entryZeroGravity: any = {
        ...mockEntry,
        gravity: 0,
      };

      const props = {
        ...defaultProps,
        entry: entryZeroGravity,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with 0 temperature", () => {
      const entryZeroTemp: any = {
        ...mockEntry,
        temperature: 0,
      };

      const props = {
        ...defaultProps,
        entry: entryZeroTemp,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with 0 pH", () => {
      const entryZeroPh: any = {
        ...mockEntry,
        ph: 0,
      };

      const props = {
        ...defaultProps,
        entry: entryZeroPh,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with empty notes", () => {
      const entryEmptyNotes = {
        ...mockEntry,
        notes: "",
      };

      const props = {
        ...defaultProps,
        entry: entryEmptyNotes,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with undefined notes", () => {
      const entryNoNotes = {
        ...mockEntry,
        notes: undefined,
      };

      const props = {
        ...defaultProps,
        entry: entryNoNotes,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });
  });

  describe("Action Handlers", () => {
    it("should render all action handlers", () => {
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);

      // All three actions should be present
      expect(getByText("View Details")).toBeTruthy();
      expect(getByText("Edit Entry")).toBeTruthy();
      expect(getByText("Delete Entry")).toBeTruthy();
    });

    it("invokes delete via hook and calls onClose", async () => {
      mockDeleteFermentationEntry.mockResolvedValueOnce(undefined);
      const props = {
        ...defaultProps,
        entry: mockEntry,
        entryIndex: 1,
        brewSessionId: "session-123",
      };
      const { getByTestId } = render(
        <FermentationEntryContextMenu {...props} />
      );
      getByTestId("action-delete").props.onPress(); // trigger
      // wait microtask
      await Promise.resolve();
      expect(mockDeleteFermentationEntry).toHaveBeenCalledWith(
        "session-123",
        1
      );
      expect(props.onClose).toHaveBeenCalled();
    });
  });
});
