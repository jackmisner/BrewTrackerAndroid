import {
  ID,
  ApiResponse,
  PaginatedResponse,
  UnitSystem,
  MeasurementType,
  UnitConversion,
  FilterOptions,
  SortOption,
  SearchFilters,
} from "@src/types/common";

describe("Common Types", () => {
  describe("ID type", () => {
    it("should accept string values", () => {
      const id: ID = "test-id-123";
      expect(typeof id).toBe("string");
      expect(id).toBe("test-id-123");
    });

    it("should accept UUID format strings", () => {
      const uuid: ID = "550e8400-e29b-41d4-a716-446655440000";
      expect(typeof uuid).toBe("string");
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("should accept short ID strings", () => {
      const shortId: ID = "abc123";
      expect(typeof shortId).toBe("string");
      expect(shortId).toBe("abc123");
    });
  });

  describe("ApiResponse interface", () => {
    it("should have required data property", () => {
      const response: ApiResponse<string> = {
        data: "test-data",
      };

      expect(response).toHaveProperty("data");
      expect(response.data).toBe("test-data");
    });

    it("should have optional message and status properties", () => {
      const fullResponse: ApiResponse<number> = {
        data: 42,
        message: "Success",
        status: "success",
      };

      expect(fullResponse.data).toBe(42);
      expect(fullResponse.message).toBe("Success");
      expect(fullResponse.status).toBe("success");
    });

    it("should work with complex data types", () => {
      interface User {
        id: string;
        name: string;
        active: boolean;
      }

      const userResponse: ApiResponse<User> = {
        data: {
          id: "user-123",
          name: "Test User",
          active: true,
        },
        status: "success",
      };

      expect(userResponse.data.id).toBe("user-123");
      expect(userResponse.data.name).toBe("Test User");
      expect(userResponse.data.active).toBe(true);
    });

    it("should accept error status", () => {
      const errorResponse: ApiResponse<null> = {
        data: null,
        message: "Something went wrong",
        status: "error",
      };

      expect(errorResponse.data).toBeNull();
      expect(errorResponse.status).toBe("error");
      expect(errorResponse.message).toBe("Something went wrong");
    });

    it("should work with array data", () => {
      const arrayResponse: ApiResponse<string[]> = {
        data: ["item1", "item2", "item3"],
        status: "success",
      };

      expect(Array.isArray(arrayResponse.data)).toBe(true);
      expect(arrayResponse.data).toHaveLength(3);
      expect(arrayResponse.data[0]).toBe("item1");
    });
  });

  describe("PaginatedResponse interface", () => {
    it("should have required data and pagination properties", () => {
      const response: PaginatedResponse<string> = {
        data: ["item1", "item2"],
        pagination: {
          page: 1,
          pages: 5,
          per_page: 10,
          total: 50,
          has_prev: false,
          has_next: true,
        },
      };

      expect(Array.isArray(response.data)).toBe(true);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.total).toBe(50);
    });

    it("should have correct pagination structure", () => {
      const response: PaginatedResponse<number> = {
        data: [1, 2, 3],
        pagination: {
          page: 2,
          pages: 3,
          per_page: 3,
          total: 9,
          has_prev: true,
          has_next: true,
          prev_num: 1,
          next_num: 3,
        },
      };

      expect(response.pagination.has_prev).toBe(true);
      expect(response.pagination.has_next).toBe(true);
      expect(response.pagination.prev_num).toBe(1);
      expect(response.pagination.next_num).toBe(3);
    });

    it("should handle first page pagination", () => {
      const firstPageResponse: PaginatedResponse<string> = {
        data: ["a", "b", "c"],
        pagination: {
          page: 1,
          pages: 5,
          per_page: 3,
          total: 15,
          has_prev: false,
          has_next: true,
          next_num: 2,
        },
      };

      expect(firstPageResponse.pagination.has_prev).toBe(false);
      expect(firstPageResponse.pagination.prev_num).toBeUndefined();
      expect(firstPageResponse.pagination.next_num).toBe(2);
    });

    it("should handle last page pagination", () => {
      const lastPageResponse: PaginatedResponse<string> = {
        data: ["x", "y"],
        pagination: {
          page: 3,
          pages: 3,
          per_page: 5,
          total: 12,
          has_prev: true,
          has_next: false,
          prev_num: 2,
        },
      };

      expect(lastPageResponse.pagination.has_next).toBe(false);
      expect(lastPageResponse.pagination.next_num).toBeUndefined();
      expect(lastPageResponse.pagination.prev_num).toBe(2);
    });
  });

  describe("UnitSystem type", () => {
    it("should accept 'metric' value", () => {
      const system: UnitSystem = "metric";
      expect(system).toBe("metric");
    });

    it("should accept 'imperial' value", () => {
      const system: UnitSystem = "imperial";
      expect(system).toBe("imperial");
    });

    it("should be used in functions", () => {
      const getUnitLabel = (system: UnitSystem): string => {
        return system === "metric" ? "kg" : "lb";
      };

      expect(getUnitLabel("metric")).toBe("kg");
      expect(getUnitLabel("imperial")).toBe("lb");
    });
  });

  describe("MeasurementType enum", () => {
    it("should include all brewing measurement types", () => {
      const weight: MeasurementType = "weight";
      const hopWeight: MeasurementType = "hop_weight";
      const yeast: MeasurementType = "yeast";
      const other: MeasurementType = "other";
      const volume: MeasurementType = "volume";
      const temperature: MeasurementType = "temperature";

      expect(weight).toBe("weight");
      expect(hopWeight).toBe("hop_weight");
      expect(yeast).toBe("yeast");
      expect(other).toBe("other");
      expect(volume).toBe("volume");
      expect(temperature).toBe("temperature");
    });

    it("should be used in brewing contexts", () => {
      const getMeasurementUnit = (
        type: MeasurementType,
        system: UnitSystem
      ): string => {
        switch (type) {
          case "weight":
            return system === "metric" ? "kg" : "lb";
          case "hop_weight":
            return system === "metric" ? "g" : "oz";
          case "volume":
            return system === "metric" ? "L" : "gal";
          case "temperature":
            return system === "metric" ? "°C" : "°F";
          case "yeast":
            return "pkg";
          case "other":
            return "unit";
          default:
            return "unknown";
        }
      };

      expect(getMeasurementUnit("weight", "metric")).toBe("kg");
      expect(getMeasurementUnit("hop_weight", "imperial")).toBe("oz");
      expect(getMeasurementUnit("volume", "metric")).toBe("L");
      expect(getMeasurementUnit("temperature", "imperial")).toBe("°F");
    });
  });

  describe("UnitConversion interface", () => {
    it("should have value and unit properties", () => {
      const conversion: UnitConversion = {
        value: 2.5,
        unit: "kg",
      };

      expect(conversion.value).toBe(2.5);
      expect(conversion.unit).toBe("kg");
    });

    it("should work with various units", () => {
      const weightConversion: UnitConversion = { value: 5.5, unit: "lb" };
      const volumeConversion: UnitConversion = { value: 20, unit: "L" };
      const tempConversion: UnitConversion = { value: 65, unit: "°C" };

      expect(weightConversion.unit).toBe("lb");
      expect(volumeConversion.value).toBe(20);
      expect(tempConversion.unit).toBe("°C");
    });

    it("should handle decimal values", () => {
      const preciseConversion: UnitConversion = {
        value: 1.2345,
        unit: "oz",
      };

      expect(preciseConversion.value).toBeCloseTo(1.2345);
      expect(typeof preciseConversion.value).toBe("number");
    });
  });

  describe("FilterOptions interface", () => {
    it("should accept any key-value pairs", () => {
      const filters: FilterOptions = {
        name: "test",
        active: true,
        count: 42,
      };

      expect(filters.name).toBe("test");
      expect(filters.active).toBe(true);
      expect(filters.count).toBe(42);
    });

    it("should be flexible for different filter types", () => {
      const recipeFilters: FilterOptions = {
        style: "IPA",
        minAbv: 5.0,
        maxAbv: 7.0,
        public: true,
        tags: ["hoppy", "citrus"],
      };

      expect(recipeFilters.style).toBe("IPA");
      expect(Array.isArray(recipeFilters.tags)).toBe(true);
      expect(recipeFilters.minAbv).toBe(5.0);
    });

    it("should accept nested objects", () => {
      const complexFilters: FilterOptions = {
        user: {
          id: "123",
          verified: true,
        },
        dateRange: {
          start: "2024-01-01",
          end: "2024-12-31",
        },
      };

      expect(complexFilters.user.id).toBe("123");
      expect(complexFilters.dateRange.start).toBe("2024-01-01");
    });
  });

  describe("SortOption interface", () => {
    it("should have required properties", () => {
      const sortOption: SortOption = {
        field: "created_at",
        direction: "desc",
        label: "Newest First",
      };

      expect(sortOption.field).toBe("created_at");
      expect(sortOption.direction).toBe("desc");
      expect(sortOption.label).toBe("Newest First");
    });

    it("should accept ascending direction", () => {
      const ascSort: SortOption = {
        field: "name",
        direction: "asc",
        label: "Name A-Z",
      };

      expect(ascSort.direction).toBe("asc");
    });

    it("should work with various field names", () => {
      const options: SortOption[] = [
        { field: "name", direction: "asc", label: "Name" },
        { field: "created_at", direction: "desc", label: "Date" },
        { field: "abv", direction: "desc", label: "Alcohol Content" },
        { field: "difficulty", direction: "asc", label: "Difficulty" },
      ];

      expect(options).toHaveLength(4);
      expect(options[0].field).toBe("name");
      expect(options[2].field).toBe("abv");
    });
  });

  describe("SearchFilters interface", () => {
    it("should have optional common filter properties", () => {
      const filters: SearchFilters = {
        query: "IPA",
        sortBy: "created_at",
        sortDirection: "desc",
      };

      expect(filters.query).toBe("IPA");
      expect(filters.sortBy).toBe("created_at");
      expect(filters.sortDirection).toBe("desc");
    });

    it("should accept custom properties", () => {
      const customFilters: SearchFilters = {
        query: "hoppy",
        sortBy: "name",
        sortDirection: "asc",
        category: "beer",
        minRating: 4,
        tags: ["craft", "local"],
      };

      expect(customFilters.category).toBe("beer");
      expect(customFilters.minRating).toBe(4);
      expect(Array.isArray(customFilters.tags)).toBe(true);
    });

    it("should work with minimal properties", () => {
      const minimalFilters: SearchFilters = {
        query: "search term",
      };

      expect(minimalFilters.query).toBe("search term");
      expect(minimalFilters.sortBy).toBeUndefined();
    });

    it("should handle empty search", () => {
      const emptyFilters: SearchFilters = {};

      expect(emptyFilters.query).toBeUndefined();
      expect(Object.keys(emptyFilters)).toHaveLength(0);
    });

    it("should validate sort direction values", () => {
      const ascFilters: SearchFilters = {
        sortDirection: "asc",
      };
      const descFilters: SearchFilters = {
        sortDirection: "desc",
      };

      expect(ascFilters.sortDirection).toBe("asc");
      expect(descFilters.sortDirection).toBe("desc");
    });
  });

  describe("Type integration", () => {
    it("should work together in realistic scenarios", () => {
      // Simulate a paginated recipe search response
      interface Recipe {
        id: ID;
        name: string;
        style: string;
        abv: number;
      }

      const searchFilters: SearchFilters = {
        query: "IPA",
        sortBy: "created_at",
        sortDirection: "desc",
        style: "American IPA",
        minAbv: 5.0,
      };

      const recipes: Recipe[] = [
        { id: "recipe-1", name: "Hoppy IPA", style: "American IPA", abv: 6.2 },
        { id: "recipe-2", name: "Citrus IPA", style: "American IPA", abv: 5.8 },
      ];

      const searchResponse: PaginatedResponse<Recipe> = {
        data: recipes,
        pagination: {
          page: 1,
          pages: 1,
          per_page: 10,
          total: 2,
          has_prev: false,
          has_next: false,
        },
      };

      // Verify the complete flow works
      expect(searchFilters.query).toBe("IPA");
      expect(searchResponse.data).toHaveLength(2);
      expect(searchResponse.data[0].id).toBe("recipe-1");
      expect(searchResponse.pagination.total).toBe(2);
    });

    it("should support unit conversions in brewing context", () => {
      const grainWeight: UnitConversion = { value: 5, unit: "lb" };
      const hopWeight: UnitConversion = { value: 28, unit: "g" };
      const batchVolume: UnitConversion = { value: 20, unit: "L" };

      const recipe = {
        id: "recipe-123" as ID,
        grainWeight,
        hopWeight,
        batchVolume,
        unitSystem: "metric" as UnitSystem,
      };

      expect(recipe.grainWeight.value).toBe(5);
      expect(recipe.hopWeight.unit).toBe("g");
      expect(recipe.unitSystem).toBe("metric");
    });
  });
});
