/**
 * Central type definitions export for BrewTracker Android
 *
 * This file serves as the main entry point for all TypeScript type definitions
 * used throughout the BrewTracker mobile application. Types are organized by
 * functional area and re-exported here for convenient importing.
 *
 * Type Categories:
 * - API: Request/response types for all backend endpoints
 * - Brew Sessions: Fermentation tracking and brew session management
 * - Common: Shared types and utilities used across the app
 * - Recipe: Recipe data structures, ingredients, and metrics
 * - User: User profiles, authentication, and settings
 *
 * @example
 * ```typescript
 * import { Recipe, User, CreateRecipeRequest } from '@src/types';
 *
 * const user: User = { id: '1', username: 'brewer', ... };
 * const recipe: Recipe = { id: '1', name: 'IPA', ... };
 * ```
 */

export * from "./common";
export * from "./user";
export * from "./recipe";
export * from "./brewSession";
export * from "./api";
