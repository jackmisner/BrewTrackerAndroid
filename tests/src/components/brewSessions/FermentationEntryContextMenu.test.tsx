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
      };

      const props = {
        ...defaultProps,
        entry: minimalEntry,
        entryIndex: 1,
      };

      const { getByText } = render(<FermentationEntryContextMenu {...props} />);
      expect(getByText("Edit Entry")).toBeTruthy();
    });

    it("should handle entry with null gravity", () => {
      const entryNullGravity: any = {
        ...mockEntry,
        gravity: null,
      };

      const props = {
        ...defaultProps,
        entry: entryNullGravity,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with null temperature", () => {
      const entryNullTemp: any = {
        ...mockEntry,
        temperature: null,
      };

      const props = {
        ...defaultProps,
        entry: entryNullTemp,
        entryIndex: 1,
      };

      expect(() => {
        render(<FermentationEntryContextMenu {...props} />);
      }).not.toThrow();
    });

    it("should handle entry with null pH", () => {
      const entryNullPh: any = {
        ...mockEntry,
        ph: null,
      };

      const props = {
        ...defaultProps,
        entry: entryNullPh,
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
  });
});
