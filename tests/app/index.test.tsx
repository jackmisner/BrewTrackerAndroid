/**
 * Index Route Tests
 *
 * Simple index component test
 */

import React from "react";
import { render } from "@testing-library/react-native";
import Index from "../../app/index";

// Mock dependencies following our established patterns
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
  }),
}));

describe("Index", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(<Index />);
    }).not.toThrow();
  });
});
