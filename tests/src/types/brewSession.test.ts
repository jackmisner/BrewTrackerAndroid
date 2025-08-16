import {
  BrewSessionStatus,
  FermentationStage,
  TemperatureUnit,
  GravityReading,
  FermentationEntry,
  BrewSession,
  CreateBrewSessionRequest,
  UpdateBrewSessionRequest,
  CreateFermentationEntryRequest,
  FermentationStats,
  BrewSessionSummary,
} from "../../../src/types/brewSession";
import { ID } from "../../../src/types/common";
import { Recipe } from "../../../src/types/recipe";

describe("Brew Session Types", () => {
  describe("BrewSessionStatus enum", () => {
    it("should include all brew session statuses", () => {
      const planned: BrewSessionStatus = "planned";
      const active: BrewSessionStatus = "active";
      const fermenting: BrewSessionStatus = "fermenting";
      const inProgress: BrewSessionStatus = "in-progress";
      const conditioning: BrewSessionStatus = "conditioning";
      const completed: BrewSessionStatus = "completed";
      const archived: BrewSessionStatus = "archived";
      const failed: BrewSessionStatus = "failed";
      const paused: BrewSessionStatus = "paused";

      expect(planned).toBe("planned");
      expect(active).toBe("active");
      expect(fermenting).toBe("fermenting");
      expect(inProgress).toBe("in-progress");
      expect(conditioning).toBe("conditioning");
      expect(completed).toBe("completed");
      expect(archived).toBe("archived");
      expect(failed).toBe("failed");
      expect(paused).toBe("paused");
    });

    it("should represent brewing workflow progression", () => {
      const workflowOrder = [
        "planned",
        "active",
        "fermenting",
        "conditioning",
        "completed",
      ];

      workflowOrder.forEach(status => {
        const brewStatus: BrewSessionStatus = status as BrewSessionStatus;
        expect(typeof brewStatus).toBe("string");
      });
    });

    it("should include API-specific statuses", () => {
      const apiStatus: BrewSessionStatus = "in-progress";
      expect(apiStatus).toBe("in-progress");
    });

    it("should support error and pause states", () => {
      const errorStates: BrewSessionStatus[] = ["failed", "paused"];

      errorStates.forEach(status => {
        expect(typeof status).toBe("string");
      });
    });
  });

  describe("FermentationStage enum", () => {
    it("should include all fermentation stages", () => {
      const primary: FermentationStage = "primary";
      const secondary: FermentationStage = "secondary";
      const tertiary: FermentationStage = "tertiary";
      const bottled: FermentationStage = "bottled";
      const kegged: FermentationStage = "kegged";

      expect(primary).toBe("primary");
      expect(secondary).toBe("secondary");
      expect(tertiary).toBe("tertiary");
      expect(bottled).toBe("bottled");
      expect(kegged).toBe("kegged");
    });

    it("should represent typical fermentation progression", () => {
      const progressionOrder = ["primary", "secondary", "tertiary"];
      const packagingOptions = ["bottled", "kegged"];

      progressionOrder.forEach(stage => {
        const fermentationStage: FermentationStage = stage as FermentationStage;
        expect(typeof fermentationStage).toBe("string");
      });

      packagingOptions.forEach(packaging => {
        const packagingStage: FermentationStage =
          packaging as FermentationStage;
        expect(typeof packagingStage).toBe("string");
      });
    });
  });

  describe("TemperatureUnit type", () => {
    it("should support Fahrenheit and Celsius", () => {
      const fahrenheit: TemperatureUnit = "F";
      const celsius: TemperatureUnit = "C";

      expect(fahrenheit).toBe("F");
      expect(celsius).toBe("C");
    });

    it("should be used in temperature-related functions", () => {
      const convertTemperature = (
        temp: number,
        unit: TemperatureUnit
      ): number => {
        return unit === "F" ? ((temp - 32) * 5) / 9 : (temp * 9) / 5 + 32;
      };

      expect(convertTemperature(32, "F")).toBeCloseTo(0, 1); // 32°F to °C
      expect(convertTemperature(0, "C")).toBeCloseTo(32, 1); // 0°C to °F
    });
  });

  describe("GravityReading interface", () => {
    const createMockGravityReading = (
      overrides: Partial<GravityReading> = {}
    ): GravityReading => ({
      id: "gravity-123",
      specific_gravity: 1.05,
      temperature: 68,
      temperature_unit: "F",
      date_recorded: "2024-01-01T12:00:00Z",
      ...overrides,
    });

    it("should have required gravity reading properties", () => {
      const reading = createMockGravityReading();

      expect(reading.id).toBe("gravity-123");
      expect(reading.specific_gravity).toBe(1.05);
      expect(reading.temperature).toBe(68);
      expect(reading.temperature_unit).toBe("F");
      expect(reading.date_recorded).toBe("2024-01-01T12:00:00Z");
    });

    it("should support temperature correction", () => {
      const reading = createMockGravityReading({
        specific_gravity: 1.052,
        temperature: 80,
        corrected_gravity: 1.05,
      });

      expect(reading.corrected_gravity).toBe(1.05);
      expect(reading.corrected_gravity).toBeLessThan(reading.specific_gravity);
    });

    it("should support optional notes", () => {
      const reading = createMockGravityReading({
        notes: "First gravity reading after pitch",
      });

      expect(reading.notes).toBe("First gravity reading after pitch");
    });

    it("should validate realistic gravity values", () => {
      const lightBeer = createMockGravityReading({ specific_gravity: 1.035 });
      const strongBeer = createMockGravityReading({ specific_gravity: 1.09 });

      expect(lightBeer.specific_gravity).toBeGreaterThan(1.0);
      expect(strongBeer.specific_gravity).toBeGreaterThan(
        lightBeer.specific_gravity
      );
    });
  });

  describe("FermentationEntry interface", () => {
    it("should support API field names", () => {
      const apiEntry: FermentationEntry = {
        entry_date: "2024-01-01",
        temperature: 68,
        gravity: 1.02,
        ph: 4.2,
        notes: "Fermentation progressing well",
      };

      expect(apiEntry.entry_date).toBe("2024-01-01");
      expect(apiEntry.temperature).toBe(68);
      expect(apiEntry.gravity).toBe(1.02);
      expect(apiEntry.ph).toBe(4.2);
    });

    it("should support legacy field names", () => {
      const legacyEntry: FermentationEntry = {
        date: "2024-01-01",
        temperature: 70,
        gravity: 1.015,
      };

      expect(legacyEntry.date).toBe("2024-01-01");
      expect(legacyEntry.temperature).toBe(70);
      expect(legacyEntry.gravity).toBe(1.015);
    });

    it("should handle all optional properties", () => {
      const minimalEntry: FermentationEntry = {};
      const fullEntry: FermentationEntry = {
        entry_date: "2024-01-01",
        date: "2024-01-01", // Legacy compatibility
        temperature: 67,
        gravity: 1.018,
        ph: 4.3,
        notes: "Active fermentation, lots of bubbling",
      };

      expect(Object.keys(minimalEntry)).toHaveLength(0);
      expect(fullEntry.ph).toBe(4.3);
      expect(fullEntry.notes).toContain("bubbling");
    });

    it("should validate realistic fermentation values", () => {
      const entry: FermentationEntry = {
        temperature: 68,
        gravity: 1.015,
        ph: 4.2,
      };

      expect(entry.temperature).toBeGreaterThan(50); // Above freezing
      expect(entry.temperature).toBeLessThan(100); // Below boiling
      expect(entry.gravity).toBeGreaterThan(1.0);
      expect(entry.gravity).toBeLessThan(1.1);
      expect(entry.ph).toBeGreaterThan(3);
      expect(entry.ph).toBeLessThan(7);
    });
  });

  describe("BrewSession interface", () => {
    const mockRecipe: Recipe = {
      id: "recipe-123",
      name: "Test IPA",
      style: "American IPA",
      description: "Test recipe",
      batch_size: 5,
      batch_size_unit: "gal",
      unit_system: "imperial",
      boil_time: 60,
      efficiency: 75,
      mash_temperature: 152,
      mash_temp_unit: "F",
      is_public: false,
      notes: "",
      ingredients: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const createMockBrewSession = (
      overrides: Partial<BrewSession> = {}
    ): BrewSession => ({
      id: "brew-session-123",
      recipe_id: "recipe-123",
      name: "Test Brew Session",
      status: "active",
      batch_size: 5,
      batch_size_unit: "gal",
      brew_date: "2024-01-01",
      notes: "",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      user_id: "user-123",
      ...overrides,
    });

    it("should have required brew session properties", () => {
      const session = createMockBrewSession();

      expect(session.id).toBe("brew-session-123");
      expect(session.recipe_id).toBe("recipe-123");
      expect(session.name).toBe("Test Brew Session");
      expect(session.status).toBe("active");
      expect(session.batch_size).toBe(5);
      expect(session.batch_size_unit).toBe("gal");
      expect(session.brew_date).toBe("2024-01-01");
      expect(session.user_id).toBe("user-123");
    });

    it("should support optional recipe reference", () => {
      const sessionWithRecipe = createMockBrewSession({
        recipe: mockRecipe,
      });

      expect(sessionWithRecipe.recipe).toEqual(mockRecipe);
    });

    it("should track brewing timeline", () => {
      const session = createMockBrewSession({
        brew_date: "2024-01-01",
        fermentation_start_date: "2024-01-02",
        fermentation_end_date: "2024-01-15",
        packaging_date: "2024-01-16",
        expected_completion_date: "2024-01-30",
        actual_completion_date: "2024-01-28",
      });

      expect(session.brew_date).toBe("2024-01-01");
      expect(session.fermentation_start_date).toBe("2024-01-02");
      expect(session.fermentation_end_date).toBe("2024-01-15");
      expect(session.packaging_date).toBe("2024-01-16");
      expect(session.expected_completion_date).toBe("2024-01-30");
      expect(session.actual_completion_date).toBe("2024-01-28");
    });

    it("should track gravity readings", () => {
      const session = createMockBrewSession({
        original_gravity: 1.055,
        actual_og: 1.054,
        target_og: 1.055,
        target_fg: 1.012,
        final_gravity: 1.01,
        actual_fg: 1.01,
        actual_abv: 5.8,
      });

      expect(session.original_gravity).toBe(1.055);
      expect(session.actual_og).toBe(1.054);
      expect(session.target_fg).toBe(1.012);
      expect(session.final_gravity).toBe(1.01);
      expect(session.actual_abv).toBe(5.8);
    });

    it("should track fermentation progress", () => {
      const session = createMockBrewSession({
        current_stage: "primary",
        days_fermenting: 7,
        fermentation_entries: [
          {
            entry_date: "2024-01-03",
            temperature: 68,
            gravity: 1.025,
          },
          {
            entry_date: "2024-01-07",
            temperature: 67,
            gravity: 1.012,
          },
        ],
      });

      expect(session.current_stage).toBe("primary");
      expect(session.days_fermenting).toBe(7);
      expect(session.fermentation_entries).toHaveLength(2);
      expect(session.fermentation_entries?.[0].gravity).toBe(1.025);
    });

    it("should track quality metrics", () => {
      const session = createMockBrewSession({
        efficiency: 75,
        actual_efficiency: 72,
        attenuation: 80,
        batch_rating: 4.5,
      });

      expect(session.efficiency).toBe(75);
      expect(session.actual_efficiency).toBe(72);
      expect(session.attenuation).toBe(80);
      expect(session.batch_rating).toBe(4.5);
      expect(session.batch_rating).toBeGreaterThanOrEqual(0);
      expect(session.batch_rating).toBeLessThanOrEqual(5);
    });

    it("should support various note types", () => {
      const session = createMockBrewSession({
        notes: "General session notes",
        brew_notes: "Mash temp was slightly high",
        tasting_notes: "Hoppy with citrus notes, good balance",
      });

      expect(session.notes).toBe("General session notes");
      expect(session.brew_notes).toBe("Mash temp was slightly high");
      expect(session.tasting_notes).toBe(
        "Hoppy with citrus notes, good balance"
      );
    });

    it("should support photo tracking", () => {
      const session = createMockBrewSession({
        photo_urls: ["photo1.jpg", "photo2.jpg"],
        photos_url: "album/photos",
      });

      expect(session.photo_urls).toHaveLength(2);
      expect(session.photos_url).toBe("album/photos");
    });
  });

  describe("CreateBrewSessionRequest", () => {
    it("should have required fields for creating brew session", () => {
      const request: CreateBrewSessionRequest = {
        recipe_id: "recipe-456",
        name: "New Brew Session",
        brew_date: "2024-01-15",
        status: "planned",
      };

      expect(request.recipe_id).toBe("recipe-456");
      expect(request.name).toBe("New Brew Session");
      expect(request.brew_date).toBe("2024-01-15");
      expect(request.status).toBe("planned");
    });

    it("should support optional notes", () => {
      const request: CreateBrewSessionRequest = {
        recipe_id: "recipe-789",
        name: "Weekend Brew",
        brew_date: "2024-01-20",
        status: "planned",
        notes: "First attempt at this recipe",
      };

      expect(request.notes).toBe("First attempt at this recipe");
    });

    it("should validate proper date format", () => {
      const request: CreateBrewSessionRequest = {
        recipe_id: "recipe-123",
        name: "Date Test Brew",
        brew_date: "2024-01-01",
        status: "planned",
      };

      expect(request.brew_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("UpdateBrewSessionRequest", () => {
    it("should support partial updates", () => {
      const updateStatus: UpdateBrewSessionRequest = {
        status: "fermenting",
      };

      const updateMetrics: UpdateBrewSessionRequest = {
        actual_og: 1.052,
        actual_fg: 1.012,
        actual_abv: 5.2,
      };

      expect(updateStatus.status).toBe("fermenting");
      expect(updateMetrics.actual_og).toBe(1.052);
      expect(updateMetrics.actual_abv).toBe(5.2);
    });

    it("should support comprehensive updates", () => {
      const fullUpdate: UpdateBrewSessionRequest = {
        name: "Updated Session Name",
        status: "completed",
        current_stage: "bottled",
        final_gravity: 1.01,
        actual_completion_date: "2024-01-20",
        notes: "Updated notes",
        brew_notes: "Brewing went smoothly",
        tasting_notes: "Excellent flavor balance",
        efficiency: 78,
        batch_rating: 4.8,
      };

      expect(fullUpdate.name).toBe("Updated Session Name");
      expect(fullUpdate.current_stage).toBe("bottled");
      expect(fullUpdate.batch_rating).toBe(4.8);
    });
  });

  describe("CreateFermentationEntryRequest", () => {
    it("should have required fermentation entry fields", () => {
      const request: CreateFermentationEntryRequest = {
        entry_date: "2024-01-05T12:00:00Z",
        temperature: 68,
        gravity: 1.05,
        notes: "Active fermentation",
      };

      expect(request.entry_date).toBe("2024-01-05T12:00:00Z");
      expect(request.temperature).toBe(68);
      expect(request.gravity).toBe(1.05);
      expect(request.notes).toBe("Active fermentation");
    });

    it("should support optional fields", () => {
      const request: CreateFermentationEntryRequest = {
        entry_date: "2024-01-07T12:00:00Z",
        temperature: 67,
        gravity: 1.02,
        ph: 4.3,
        notes: "Gravity dropping nicely",
      };

      expect(request.gravity).toBe(1.02);
      expect(request.ph).toBe(4.3);
    });
  });

  describe("FermentationStats", () => {
    it("should provide comprehensive fermentation analytics", () => {
      const stats: FermentationStats = {
        avg_temperature: 68,
        min_temperature: 65,
        max_temperature: 72,
        temperature_unit: "F",
        gravity_trend: "falling",
        estimated_completion_days: 5,
        current_attenuation: 75,
        expected_final_gravity: 1.012,
        fermentation_health: "excellent",
      };

      expect(stats.avg_temperature).toBe(68);
      expect(stats.min_temperature).toBeLessThan(stats.avg_temperature);
      expect(stats.max_temperature).toBeGreaterThan(stats.avg_temperature);
      expect(stats.gravity_trend).toBe("falling");
      expect(stats.fermentation_health).toBe("excellent");
    });

    it("should validate temperature ranges", () => {
      const stats: FermentationStats = {
        avg_temperature: 20,
        min_temperature: 18,
        max_temperature: 24,
        temperature_unit: "C",
        gravity_trend: "stable",
        estimated_completion_days: 3,
        current_attenuation: 80,
        expected_final_gravity: 1.01,
        fermentation_health: "good",
      };

      expect(stats.min_temperature).toBeLessThanOrEqual(stats.avg_temperature);
      expect(stats.max_temperature).toBeGreaterThanOrEqual(
        stats.avg_temperature
      );
      expect(stats.current_attenuation).toBeGreaterThanOrEqual(0);
      expect(stats.current_attenuation).toBeLessThanOrEqual(100);
    });

    it("should support all gravity trends and health levels", () => {
      const trends: FermentationStats["gravity_trend"][] = [
        "falling",
        "stable",
        "rising",
      ];
      const healthLevels: FermentationStats["fermentation_health"][] = [
        "excellent",
        "good",
        "concerning",
        "poor",
      ];

      trends.forEach(trend => {
        expect(typeof trend).toBe("string");
      });

      healthLevels.forEach(health => {
        expect(typeof health).toBe("string");
      });
    });
  });

  describe("BrewSessionSummary", () => {
    it("should provide dashboard summary metrics", () => {
      const summary: BrewSessionSummary = {
        total_sessions: 25,
        active_sessions: 3,
        completed_sessions: 22,
        avg_brew_time: 21, // days
        success_rate: 88, // percentage
        most_brewed_style: "American IPA",
      };

      expect(summary.total_sessions).toBe(25);
      expect(summary.active_sessions).toBe(3);
      expect(summary.completed_sessions).toBe(22);
      expect(summary.avg_brew_time).toBe(21);
      expect(summary.success_rate).toBe(88);
      expect(summary.most_brewed_style).toBe("American IPA");
    });

    it("should validate summary metrics relationships", () => {
      const summary: BrewSessionSummary = {
        total_sessions: 50,
        active_sessions: 5,
        completed_sessions: 45,
        avg_brew_time: 28,
        success_rate: 90,
        most_brewed_style: "Stout",
      };

      expect(summary.total_sessions).toBeGreaterThanOrEqual(
        summary.active_sessions + summary.completed_sessions
      );
      expect(summary.success_rate).toBeGreaterThanOrEqual(0);
      expect(summary.success_rate).toBeLessThanOrEqual(100);
      expect(summary.avg_brew_time).toBeGreaterThan(0);
    });
  });

  describe("Type Integration", () => {
    it("should work together in brewing workflow", () => {
      // Create a complete brew session with fermentation tracking
      const session: BrewSession = {
        id: "integration-brew" as ID,
        recipe_id: "recipe-integration" as ID,
        name: "Integration Test Brew",
        status: "fermenting",
        batch_size: 5,
        batch_size_unit: "gal",
        brew_date: "2024-01-01",
        fermentation_start_date: "2024-01-02",
        current_stage: "primary",
        original_gravity: 1.055,
        target_fg: 1.012,
        fermentation_entries: [
          {
            entry_date: "2024-01-03",
            temperature: 68,
            gravity: 1.04,
            notes: "Active fermentation started",
          },
          {
            entry_date: "2024-01-07",
            temperature: 67,
            gravity: 1.02,
            notes: "Fermentation progressing well",
          },
        ],
        notes: "First brew of the year",
        created_at: "2024-01-01T08:00:00Z",
        updated_at: "2024-01-07T18:00:00Z",
        user_id: "user-integration" as ID,
      };

      expect(session.status).toBe("fermenting");
      expect(session.current_stage).toBe("primary");
      expect(session.fermentation_entries).toHaveLength(2);
      expect(session.fermentation_entries?.[0].gravity).toBeGreaterThan(
        session.fermentation_entries?.[1].gravity || 0
      );
    });

    it("should support complete fermentation workflow", () => {
      const createRequest: CreateBrewSessionRequest = {
        recipe_id: "recipe-workflow" as ID,
        name: "Workflow Test Session",
        brew_date: "2024-01-01",
        status: "planned",
        notes: "Testing complete workflow",
      };

      const updateToActive: UpdateBrewSessionRequest = {
        status: "active",
        actual_og: 1.052,
      };

      const updateToFermenting: UpdateBrewSessionRequest = {
        status: "fermenting",
        fermentation_start_date: "2024-01-02",
        current_stage: "primary",
      };

      const fermentationEntry: CreateFermentationEntryRequest = {
        entry_date: "2024-01-05T12:00:00Z",
        temperature: 68,
        gravity: 1.025,
        notes: "Halfway through fermentation",
      };

      expect(createRequest.status).toBe("planned");
      expect(updateToActive.status).toBe("active");
      expect(updateToFermenting.status).toBe("fermenting");
      expect(fermentationEntry.gravity).toBe(1.025);
    });
  });
});
