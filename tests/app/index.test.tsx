/**
 * Index Route Tests
 */

import React from "react";
import { render } from "@testing-library/react-native";
import Index from "../../app/index";

// Mock external dependencies
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