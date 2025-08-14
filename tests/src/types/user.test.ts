import {
  User,
  UserSettings,
  UserProfile,
  UserPreferences,
} from "../../../src/types/user";
import { UnitSystem, ID } from "../../../src/types/common";

describe("User Types", () => {
  describe("User interface", () => {
    const createMockUser = (overrides: Partial<User> = {}): User => ({
      id: "user-123",
      username: "testuser",
      email: "test@example.com",
      email_verified: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      is_active: true,
      ...overrides,
    });

    it("should have required user properties", () => {
      const user = createMockUser();

      expect(user.id).toBe("user-123");
      expect(user.username).toBe("testuser");
      expect(user.email).toBe("test@example.com");
      expect(user.email_verified).toBe(true);
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBe("2024-01-01T00:00:00Z");
      expect(user.updated_at).toBe("2024-01-01T00:00:00Z");
    });

    it("should support optional fields", () => {
      const userWithOptionals = createMockUser({
        last_login: "2024-01-02T10:00:00Z",
        google_linked: true,
        profile_picture: "profile.jpg",
      });

      expect(userWithOptionals.last_login).toBe("2024-01-02T10:00:00Z");
      expect(userWithOptionals.google_linked).toBe(true);
      expect(userWithOptionals.profile_picture).toBe("profile.jpg");
    });

    it("should handle unverified user", () => {
      const unverifiedUser = createMockUser({
        email_verified: false,
        is_active: false,
      });

      expect(unverifiedUser.email_verified).toBe(false);
      expect(unverifiedUser.is_active).toBe(false);
    });

    it("should validate ID type compatibility", () => {
      const user = createMockUser();
      const userId: ID = user.id;

      expect(userId).toBe("user-123");
      expect(typeof userId).toBe("string");
    });

    it("should validate email format", () => {
      const user = createMockUser({
        email: "valid.email+tag@domain.co.uk",
      });

      expect(user.email).toMatch(/@/);
      expect(user.email).toContain(".");
      expect(user.email.length).toBeGreaterThan(5);
    });

    it("should handle timestamp formats", () => {
      const user = createMockUser({
        created_at: "2024-01-01T08:30:45.123Z",
        updated_at: "2024-01-02T15:20:10.456Z",
        last_login: "2024-01-03T12:00:00Z",
      });

      expect(user.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(user.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(user.last_login).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should handle user authentication states", () => {
      const newUser = createMockUser({
        email_verified: false,
        google_linked: false,
        last_login: undefined,
      });

      const verifiedUser = createMockUser({
        email_verified: true,
        last_login: "2024-01-01T12:00:00Z",
      });

      const googleUser = createMockUser({
        email_verified: true,
        google_linked: true,
      });

      expect(newUser.email_verified).toBe(false);
      expect(newUser.last_login).toBeUndefined();
      expect(verifiedUser.email_verified).toBe(true);
      expect(googleUser.google_linked).toBe(true);
    });
  });

  describe("UserSettings interface", () => {
    const createMockUserSettings = (
      overrides: Partial<UserSettings> = {}
    ): UserSettings => ({
      user_id: "user-123",
      preferred_units: "imperial",
      default_batch_size: 5,
      default_batch_size_unit: "gal",
      default_efficiency: 75,
      default_boil_time: 60,
      default_mash_temperature: 152,
      default_mash_temp_unit: "F",
      email_notifications: true,
      privacy_settings: {
        share_recipes: true,
        show_in_leaderboards: true,
        allow_recipe_cloning: true,
      },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      ...overrides,
    });

    it("should have required settings properties", () => {
      const settings = createMockUserSettings();

      expect(settings.user_id).toBe("user-123");
      expect(settings.preferred_units).toBe("imperial");
      expect(settings.default_batch_size).toBe(5);
      expect(settings.default_batch_size_unit).toBe("gal");
      expect(settings.default_efficiency).toBe(75);
      expect(settings.default_boil_time).toBe(60);
      expect(settings.default_mash_temperature).toBe(152);
      expect(settings.default_mash_temp_unit).toBe("F");
      expect(settings.email_notifications).toBe(true);
    });

    it("should support metric unit preferences", () => {
      const metricSettings = createMockUserSettings({
        preferred_units: "metric",
        default_batch_size: 20,
        default_batch_size_unit: "l",
        default_mash_temperature: 67,
        default_mash_temp_unit: "C",
      });

      expect(metricSettings.preferred_units).toBe("metric");
      expect(metricSettings.default_batch_size_unit).toBe("l");
      expect(metricSettings.default_mash_temp_unit).toBe("C");
      expect(metricSettings.default_mash_temperature).toBe(67);
    });

    it("should handle privacy settings", () => {
      const privateSettings = createMockUserSettings({
        privacy_settings: {
          share_recipes: false,
          show_in_leaderboards: false,
          allow_recipe_cloning: false,
        },
      });

      expect(privateSettings.privacy_settings.share_recipes).toBe(false);
      expect(privateSettings.privacy_settings.show_in_leaderboards).toBe(false);
      expect(privateSettings.privacy_settings.allow_recipe_cloning).toBe(false);
    });

    it("should support mobile-specific settings", () => {
      const mobileSettings = createMockUserSettings({
        push_notifications: true,
        theme_preference: "dark",
      });

      expect(mobileSettings.push_notifications).toBe(true);
      expect(mobileSettings.theme_preference).toBe("dark");
    });

    it("should handle all theme preferences", () => {
      const lightTheme = createMockUserSettings({ theme_preference: "light" });
      const darkTheme = createMockUserSettings({ theme_preference: "dark" });
      const autoTheme = createMockUserSettings({ theme_preference: "auto" });

      expect(lightTheme.theme_preference).toBe("light");
      expect(darkTheme.theme_preference).toBe("dark");
      expect(autoTheme.theme_preference).toBe("auto");
    });

    it("should validate unit system compatibility", () => {
      const imperialSettings = createMockUserSettings();
      const metricSettings = createMockUserSettings({
        preferred_units: "metric",
      });

      const imperialSystem: UnitSystem = imperialSettings.preferred_units;
      const metricSystem: UnitSystem = metricSettings.preferred_units;

      expect(imperialSystem).toBe("imperial");
      expect(metricSystem).toBe("metric");
    });

    it("should validate realistic brewing defaults", () => {
      const settings = createMockUserSettings({
        default_efficiency: 72,
        default_boil_time: 90,
        default_batch_size: 10,
      });

      expect(settings.default_efficiency).toBeGreaterThan(0);
      expect(settings.default_efficiency).toBeLessThanOrEqual(100);
      expect(settings.default_boil_time).toBeGreaterThan(0);
      expect(settings.default_batch_size).toBeGreaterThan(0);
    });

    it("should validate notification preferences", () => {
      const notificationSettings = createMockUserSettings({
        email_notifications: false,
        push_notifications: false,
      });

      expect(typeof notificationSettings.email_notifications).toBe("boolean");
      expect(typeof notificationSettings.push_notifications).toBe("boolean");
    });
  });

  describe("UserProfile interface", () => {
    const createMockUserProfile = (
      overrides: Partial<UserProfile> = {}
    ): UserProfile => ({
      id: "user-123",
      username: "brewmaster",
      total_recipes: 25,
      public_recipes: 8,
      total_brews: 45,
      joined_date: "2024-01-01",
      ...overrides,
    });

    it("should have required profile properties", () => {
      const profile = createMockUserProfile();

      expect(profile.id).toBe("user-123");
      expect(profile.username).toBe("brewmaster");
      expect(profile.total_recipes).toBe(25);
      expect(profile.public_recipes).toBe(8);
      expect(profile.total_brews).toBe(45);
      expect(profile.joined_date).toBe("2024-01-01");
    });

    it("should support optional profile fields", () => {
      const profileWithOptionals = createMockUserProfile({
        email: "brewer@example.com",
        profile_picture: "avatar.jpg",
      });

      expect(profileWithOptionals.email).toBe("brewer@example.com");
      expect(profileWithOptionals.profile_picture).toBe("avatar.jpg");
    });

    it("should validate profile statistics", () => {
      const profile = createMockUserProfile({
        total_recipes: 100,
        public_recipes: 25,
        total_brews: 150,
      });

      expect(profile.public_recipes).toBeLessThanOrEqual(profile.total_recipes);
      expect(profile.total_brews).toBeGreaterThanOrEqual(0);
      expect(profile.total_recipes).toBeGreaterThanOrEqual(0);
    });

    it("should handle new user profile", () => {
      const newUserProfile = createMockUserProfile({
        total_recipes: 0,
        public_recipes: 0,
        total_brews: 0,
        joined_date: "2024-01-15",
      });

      expect(newUserProfile.total_recipes).toBe(0);
      expect(newUserProfile.public_recipes).toBe(0);
      expect(newUserProfile.total_brews).toBe(0);
    });

    it("should handle active brewer profile", () => {
      const activeBrewer = createMockUserProfile({
        username: "master_brewer_2024",
        total_recipes: 75,
        public_recipes: 30,
        total_brews: 200,
        profile_picture: "experienced_brewer.jpg",
      });

      expect(activeBrewer.total_recipes).toBeGreaterThan(50);
      expect(activeBrewer.public_recipes).toBeGreaterThan(20);
      expect(activeBrewer.total_brews).toBeGreaterThan(100);
    });

    it("should validate date format", () => {
      const profile = createMockUserProfile({
        joined_date: "2024-03-15",
      });

      expect(profile.joined_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should support privacy-conscious profiles", () => {
      const privateProfile = createMockUserProfile({
        email: undefined,
        profile_picture: undefined,
        public_recipes: 0,
      });

      expect(privateProfile.email).toBeUndefined();
      expect(privateProfile.profile_picture).toBeUndefined();
      expect(privateProfile.public_recipes).toBe(0);
    });
  });

  describe("UserPreferences interface", () => {
    const createMockUserPreferences = (
      overrides: Partial<UserPreferences> = {}
    ): UserPreferences => ({
      theme: "auto",
      notifications_enabled: true,
      offline_mode: false,
      auto_sync: true,
      cache_size_limit: 100,
      ...overrides,
    });

    it("should have required preference properties", () => {
      const preferences = createMockUserPreferences();

      expect(preferences.theme).toBe("auto");
      expect(preferences.notifications_enabled).toBe(true);
      expect(preferences.offline_mode).toBe(false);
      expect(preferences.auto_sync).toBe(true);
      expect(preferences.cache_size_limit).toBe(100);
    });

    it("should support all theme options", () => {
      const lightPrefs = createMockUserPreferences({ theme: "light" });
      const darkPrefs = createMockUserPreferences({ theme: "dark" });
      const autoPrefs = createMockUserPreferences({ theme: "auto" });

      expect(lightPrefs.theme).toBe("light");
      expect(darkPrefs.theme).toBe("dark");
      expect(autoPrefs.theme).toBe("auto");
    });

    it("should handle offline mode preferences", () => {
      const offlinePrefs = createMockUserPreferences({
        offline_mode: true,
        auto_sync: false,
        cache_size_limit: 500,
      });

      expect(offlinePrefs.offline_mode).toBe(true);
      expect(offlinePrefs.auto_sync).toBe(false);
      expect(offlinePrefs.cache_size_limit).toBe(500);
    });

    it("should validate cache size limits", () => {
      const smallCache = createMockUserPreferences({ cache_size_limit: 50 });
      const largeCache = createMockUserPreferences({ cache_size_limit: 1000 });
      const defaultCache = createMockUserPreferences();

      expect(smallCache.cache_size_limit).toBeGreaterThan(0);
      expect(largeCache.cache_size_limit).toBeGreaterThan(100);
      expect(defaultCache.cache_size_limit).toBe(100);
    });

    it("should handle notification preferences", () => {
      const silentPrefs = createMockUserPreferences({
        notifications_enabled: false,
      });

      expect(silentPrefs.notifications_enabled).toBe(false);
      expect(typeof silentPrefs.notifications_enabled).toBe("boolean");
    });

    it("should support sync preferences", () => {
      const manualSyncPrefs = createMockUserPreferences({
        auto_sync: false,
        offline_mode: true,
      });

      const autoSyncPrefs = createMockUserPreferences({
        auto_sync: true,
        offline_mode: false,
      });

      expect(manualSyncPrefs.auto_sync).toBe(false);
      expect(autoSyncPrefs.auto_sync).toBe(true);
    });

    it("should validate boolean preference types", () => {
      const preferences = createMockUserPreferences();

      expect(typeof preferences.notifications_enabled).toBe("boolean");
      expect(typeof preferences.offline_mode).toBe("boolean");
      expect(typeof preferences.auto_sync).toBe("boolean");
    });

    it("should validate numeric preference types", () => {
      const preferences = createMockUserPreferences();

      expect(typeof preferences.cache_size_limit).toBe("number");
      expect(preferences.cache_size_limit).toBeGreaterThan(0);
    });
  });

  describe("Type Integration", () => {
    it("should work together in user management workflow", () => {
      // Create a complete user with settings and profile
      const user: User = {
        id: "integration-user" as ID,
        username: "integration_brewer",
        email: "integration@brewtracker.com",
        email_verified: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T12:00:00Z",
        last_login: "2024-01-01T12:00:00Z",
        google_linked: false,
        profile_picture: "user_avatar.jpg",
        is_active: true,
      };

      const settings: UserSettings = {
        user_id: user.id,
        preferred_units: "imperial",
        default_batch_size: 5,
        default_batch_size_unit: "gal",
        default_efficiency: 75,
        default_boil_time: 60,
        default_mash_temperature: 152,
        default_mash_temp_unit: "F",
        email_notifications: true,
        push_notifications: true,
        theme_preference: "auto",
        privacy_settings: {
          share_recipes: true,
          show_in_leaderboards: true,
          allow_recipe_cloning: true,
        },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const profile: UserProfile = {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture,
        total_recipes: 15,
        public_recipes: 5,
        total_brews: 25,
        joined_date: "2024-01-01",
      };

      const preferences: UserPreferences = {
        theme: settings.theme_preference || "auto",
        notifications_enabled: settings.push_notifications || false,
        offline_mode: false,
        auto_sync: true,
        cache_size_limit: 200,
      };

      expect(settings.user_id).toBe(user.id);
      expect(profile.username).toBe(user.username);
      expect(preferences.theme).toBe(settings.theme_preference);
      expect(preferences.notifications_enabled).toBe(settings.push_notifications);
    });

    it("should support user onboarding flow", () => {
      // New user registration
      const newUser: User = {
        id: "new-user-123" as ID,
        username: "new_brewer",
        email: "newbrewer@example.com",
        email_verified: false,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        is_active: true,
      };

      // Default settings for new user
      const defaultSettings: UserSettings = {
        user_id: newUser.id,
        preferred_units: "imperial",
        default_batch_size: 5,
        default_batch_size_unit: "gal",
        default_efficiency: 75,
        default_boil_time: 60,
        default_mash_temperature: 152,
        default_mash_temp_unit: "F",
        email_notifications: true,
        push_notifications: true,
        theme_preference: "auto",
        privacy_settings: {
          share_recipes: false, // Conservative default
          show_in_leaderboards: false,
          allow_recipe_cloning: true,
        },
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
      };

      // New user profile
      const newProfile: UserProfile = {
        id: newUser.id,
        username: newUser.username,
        total_recipes: 0,
        public_recipes: 0,
        total_brews: 0,
        joined_date: "2024-01-15",
      };

      // Default preferences
      const defaultPreferences: UserPreferences = {
        theme: "auto",
        notifications_enabled: true,
        offline_mode: false,
        auto_sync: true,
        cache_size_limit: 100,
      };

      expect(newUser.email_verified).toBe(false);
      expect(defaultSettings.privacy_settings.share_recipes).toBe(false);
      expect(newProfile.total_recipes).toBe(0);
      expect(defaultPreferences.cache_size_limit).toBe(100);
    });

    it("should support user preference synchronization", () => {
      const user: User = {
        id: "sync-user" as ID,
        username: "sync_user",
        email: "sync@example.com",
        email_verified: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        is_active: true,
      };

      // Settings with specific theme preference
      const userSettings: UserSettings = {
        user_id: user.id,
        preferred_units: "metric",
        default_batch_size: 20,
        default_batch_size_unit: "l",
        default_efficiency: 72,
        default_boil_time: 90,
        default_mash_temperature: 65,
        default_mash_temp_unit: "C",
        email_notifications: false,
        push_notifications: false,
        theme_preference: "dark",
        privacy_settings: {
          share_recipes: true,
          show_in_leaderboards: false,
          allow_recipe_cloning: true,
        },
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      // Client preferences should sync with server settings
      const syncedPreferences: UserPreferences = {
        theme: userSettings.theme_preference ?? "auto",
        notifications_enabled: userSettings.push_notifications ?? false,
        offline_mode: false,
        auto_sync: true,
        cache_size_limit: 150,
      };

      expect(syncedPreferences.theme).toBe("dark");
      expect(syncedPreferences.notifications_enabled).toBe(false);
      expect(userSettings.preferred_units).toBe("metric");
    });
  });
});