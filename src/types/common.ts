// Common types shared across the application
export type ID = string;

// API Response wrapper
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: "success" | "error";
}

// Paginated response wrapper
export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
    has_prev: boolean;
    has_next: boolean;
    prev_num?: number;
    next_num?: number;
  };
}

// Unit system types
export type UnitSystem = "metric" | "imperial";

export type MeasurementType =
  | "weight"
  | "hop_weight"
  | "yeast"
  | "other"
  | "volume"
  | "temperature";

export interface UnitConversion {
  value: number;
  unit: string;
}

// Generic filter interface
export interface FilterOptions {
  [key: string]: any;
}

// Sort options
export interface SortOption {
  field: string;
  direction: "asc" | "desc";
  label: string;
}

// Generic search filters
export interface SearchFilters {
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  [key: string]: any;
}
