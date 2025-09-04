/**
 * Environment setup for tests - runs BEFORE module imports
 * This ensures environment variables are available when modules are imported
 */

import dotenv from "dotenv";

// Load environment variables from .env.test file
dotenv.config({ path: ".env.test", quiet: true });

// Force set environment variables for testing
process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";
process.env.NODE_ENV = "test";
