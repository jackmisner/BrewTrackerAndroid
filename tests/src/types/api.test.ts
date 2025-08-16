import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ValidateUsernameRequest,
  ValidateUsernameResponse,
  GoogleAuthRequest,
  GoogleAuthResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationResponse,
  VerificationStatusResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  DeleteAccountRequest,
  UserSettingsResponse,
  UpdateSettingsRequest,
  UpdateProfileRequest,
  RecipeResponse,
  RecipesListResponse,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  CloneRecipeResponse,
  ClonePublicRecipeRequest,
  ClonePublicRecipeResponse,
  RecipeMetricsResponse,
  CalculateMetricsPreviewRequest,
  CalculateMetricsPreviewResponse,
  RecipeVersionHistoryResponse,
  PublicRecipesResponse,
  RecipeSearchRequest,
  RecipeSearchResponse,
  PaginationParams,
  SearchParams,
  ApiError,
  ValidationError,
  HttpMethod,
  ApiEndpoint,
  ApiCallOptions,
  DashboardData,
  DashboardResponse,
} from "../../../src/types/api";
import { User } from "../../../src/types/user";
import { Recipe } from "../../../src/types/recipe";
import { BrewSessionSummary } from "../../../src/types/brewSession";

// Shared test fixtures
const mockUser: User = {
  id: "user-123",
  username: "testuser",
  email: "test@example.com",
  email_verified: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  is_active: true,
};

const mockRecipe: Recipe = {
  id: "recipe-123",
  name: "Test Recipe",
  style: "IPA",
  description: "Test description",
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

describe("API Types", () => {
  describe("Authentication Types", () => {
    describe("LoginRequest", () => {
      it("should have required login credentials", () => {
        const loginRequest: LoginRequest = {
          username: "testuser",
          password: "testpassword123",
        };

        expect(loginRequest.username).toBe("testuser");
        expect(loginRequest.password).toBe("testpassword123");
      });

      it("should validate credential fields", () => {
        const request: LoginRequest = {
          username: "user@example.com",
          password: "securepassword",
        };

        expect(typeof request.username).toBe("string");
        expect(typeof request.password).toBe("string");
        expect(request.username.length).toBeGreaterThan(0);
        expect(request.password.length).toBeGreaterThan(0);
      });
    });

    describe("LoginResponse", () => {
      it("should contain access token and user data", () => {
        const response: LoginResponse = {
          access_token: "jwt.token.here",
          user: mockUser,
        };

        expect(response.access_token).toBe("jwt.token.here");
        expect(response.user).toEqual(mockUser);
      });

      it("should have valid JWT token format", () => {
        const response: LoginResponse = {
          access_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
          user: mockUser,
        };

        expect(response.access_token).toMatch(
          /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
        );
      });
    });

    describe("RegisterRequest", () => {
      it("should have required registration fields", () => {
        const request: RegisterRequest = {
          username: "newuser",
          email: "new@example.com",
          password: "newpassword123",
        };

        expect(request.username).toBe("newuser");
        expect(request.email).toBe("new@example.com");
        expect(request.password).toBe("newpassword123");
      });

      it("should validate email format", () => {
        const request: RegisterRequest = {
          username: "testuser",
          email: "valid@email.com",
          password: "password",
        };

        expect(request.email).toMatch(/@/);
        expect(request.email).toContain(".");
      });
    });

    describe("RegisterResponse", () => {
      it("should contain message and optional user data", () => {
        const response: RegisterResponse = {
          message: "Registration successful",
          user: {
            id: "user-456",
            username: "newuser",
            email: "new@example.com",
            email_verified: false,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            is_active: true,
          },
          verification_email_sent: true,
        };

        expect(response.message).toBe("Registration successful");
        expect(response.user?.email_verified).toBe(false);
        expect(response.verification_email_sent).toBe(true);
      });

      it("should handle registration without auto-login", () => {
        const response: RegisterResponse = {
          message: "Please verify your email",
          verification_email_sent: true,
        };

        expect(response.message).toContain("verify");
        expect(response.user).toBeUndefined();
      });
    });

    describe("ValidateUsernameRequest and Response", () => {
      it("should validate username availability", () => {
        const request: ValidateUsernameRequest = {
          username: "proposed_username",
        };

        const validResponse: ValidateUsernameResponse = {
          valid: true,
        };

        const invalidResponse: ValidateUsernameResponse = {
          valid: false,
          error: "Username already exists",
          suggestions: ["proposed_username1", "proposed_username2024"],
        };

        expect(request.username).toBe("proposed_username");
        expect(validResponse.valid).toBe(true);
        expect(invalidResponse.valid).toBe(false);
        expect(invalidResponse.suggestions).toContain("proposed_username1");
      });
    });

    describe("GoogleAuthRequest and Response", () => {
      it("should handle Google OAuth flow", () => {
        const request: GoogleAuthRequest = {
          token: "google.oauth.token",
        };

        const response: GoogleAuthResponse = {
          access_token: "jwt.token.here",
          user: {
            id: "user-google",
            username: "googleuser",
            email: "google@example.com",
            email_verified: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            is_active: true,
          },
          message: "Google authentication successful",
        };

        expect(request.token).toBe("google.oauth.token");
        expect(response.message).toContain("Google");
        expect(response.user.email_verified).toBe(true);
      });
    });
  });

  describe("Email Verification Types", () => {
    it("should handle email verification flow", () => {
      const request: VerifyEmailRequest = {
        token: "verification.token.123",
      };

      const responseWithLogin: VerifyEmailResponse = {
        message: "Email verified successfully",
        access_token: "jwt.token.here",
        user: {
          id: "user-verified",
          email_verified: true,
        },
      };

      const responseWithoutLogin: VerifyEmailResponse = {
        message: "Email verified",
      };

      expect(request.token).toBe("verification.token.123");
      expect(responseWithLogin.access_token).toBeDefined();
      expect(responseWithoutLogin.access_token).toBeUndefined();
    });

    it("should handle verification status check", () => {
      const status: VerificationStatusResponse = {
        email_verified: false,
        email: "test@example.com",
        verification_sent_at: "2024-01-01T10:00:00Z",
      };

      expect(status.email_verified).toBe(false);
      expect(status.email).toBe("test@example.com");
      expect(status.verification_sent_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("Password Reset Types", () => {
    it("should handle forgot password request", () => {
      const request: ForgotPasswordRequest = {
        email: "forgot@example.com",
      };

      const response: ForgotPasswordResponse = {
        message: "Password reset email sent",
      };

      expect(request.email).toMatch(/@/);
      expect(response.message).toContain("reset");
    });

    it("should handle password reset request", () => {
      const request: ResetPasswordRequest = {
        token: "reset.token.456",
        new_password: "newsecurepassword",
      };

      const response: ResetPasswordResponse = {
        message: "Password reset successful",
      };

      expect(request.token).toBe("reset.token.456");
      expect(request.new_password).toBe("newsecurepassword");
      expect(response.message).toContain("successful");
    });
  });

  describe("User Management Types", () => {
    it("should handle password change", () => {
      const request: ChangePasswordRequest = {
        current_password: "currentpass",
        new_password: "newpassword",
      };

      expect(request.current_password).toBe("currentpass");
      expect(request.new_password).toBe("newpassword");
      expect(request.current_password).not.toBe(request.new_password);
    });

    it("should handle account deletion", () => {
      const request: DeleteAccountRequest = {
        password: "userpassword",
        confirmation: "DELETE",
        preserve_public_recipes: true,
      };

      expect(request.confirmation).toBe("DELETE");
      expect(request.preserve_public_recipes).toBe(true);
    });

    it("should handle profile updates", () => {
      const request: UpdateProfileRequest = {
        username: "newusername",
        email: "newemail@example.com",
      };

      expect(request.username).toBe("newusername");
      expect(request.email).toMatch(/@/);
    });
  });

  describe("Recipe API Types", () => {
    describe("RecipesListResponse", () => {
      it("should contain recipes array and pagination", () => {
        const response: RecipesListResponse = {
          recipes: [mockRecipe],
          pagination: {
            page: 1,
            pages: 3,
            per_page: 10,
            total: 25,
            has_prev: false,
            has_next: true,
            next_num: 2,
          },
        };

        expect(response.recipes).toHaveLength(1);
        expect(response.pagination.page).toBe(1);
        expect(response.pagination.has_next).toBe(true);
      });
    });

    describe("CloneRecipeResponse", () => {
      it("should return cloned recipe data", () => {
        const response: CloneRecipeResponse = {
          message: "Recipe cloned successfully",
          recipe: mockRecipe,
          recipe_id: "cloned-recipe-456",
        };

        expect(response.message).toContain("cloned");
        expect(response.recipe).toEqual(mockRecipe);
        expect(response.recipe_id).toBe("cloned-recipe-456");
      });
    });

    describe("ClonePublicRecipeRequest", () => {
      it("should specify original author", () => {
        const request: ClonePublicRecipeRequest = {
          originalAuthor: "original_brewer",
        };

        expect(request.originalAuthor).toBe("original_brewer");
      });
    });

    describe("RecipeMetricsResponse", () => {
      it("should contain optional brewing metrics", () => {
        const response: RecipeMetricsResponse = {
          og: 1.055,
          avg_og: 1.052,
          fg: 1.012,
          avg_fg: 1.01,
          abv: 5.6,
          avg_abv: 5.4,
          ibu: 45,
          srm: 8,
        };

        expect(response.og).toBe(1.055);
        expect(response.avg_og).toBe(1.052);
        expect(response.ibu).toBe(45);
      });

      it("should handle partial metrics", () => {
        const response: RecipeMetricsResponse = {
          og: 1.048,
          abv: 4.8,
        };

        expect(response.og).toBe(1.048);
        expect(response.fg).toBeUndefined();
        expect(response.ibu).toBeUndefined();
      });
    });

    describe("CalculateMetricsPreviewRequest", () => {
      it("should contain recipe calculation parameters", () => {
        const request: CalculateMetricsPreviewRequest = {
          batch_size: 5,
          batch_size_unit: "gal",
          efficiency: 75,
          boil_time: 60,
          ingredients: [
            {
              id: "grain-1",
              name: "Pale Ale Malt",
              type: "grain",
              amount: 9,
              unit: "lb",
              potential: 1.036,
              color: 2,
            },
          ],
          mash_temperature: 152,
          mash_temp_unit: "F",
        };

        expect(request.batch_size).toBe(5);
        expect(request.efficiency).toBe(75);
        expect(request.ingredients).toHaveLength(1);
        expect(request.mash_temperature).toBe(152);
      });
    });
  });

  describe("Search API Types", () => {
    describe("RecipeSearchRequest", () => {
      it("should extend search filters with pagination", () => {
        const request: RecipeSearchRequest = {
          q: "hoppy IPA",
          style: "American IPA",
          min_abv: 5.0,
          max_abv: 7.0,
          is_public: true,
          page: 1,
          per_page: 20,
        };

        expect(request.q).toBe("hoppy IPA");
        expect(request.style).toBe("American IPA");
        expect(request.page).toBe(1);
        expect(request.per_page).toBe(20);
      });
    });

    describe("SearchParams", () => {
      it("should support search with pagination", () => {
        const params: SearchParams = {
          q: "search term",
          page: 2,
          per_page: 15,
        };

        expect(params.q).toBe("search term");
        expect(params.page).toBe(2);
        expect(params.per_page).toBe(15);
      });
    });
  });

  describe("Error Types", () => {
    describe("ApiError", () => {
      it("should contain error information", () => {
        const error: ApiError = {
          error: "NOT_FOUND",
          message: "Recipe not found",
          details: {
            recipe_id: "invalid-123",
            timestamp: "2024-01-01T12:00:00Z",
          },
        };

        expect(error.error).toBe("NOT_FOUND");
        expect(error.message).toBe("Recipe not found");
        expect(error.details?.recipe_id).toBe("invalid-123");
      });
    });

    describe("ValidationError", () => {
      it("should extend ApiError with field validation", () => {
        const error: ValidationError = {
          error: "VALIDATION_ERROR",
          message: "Invalid input data",
          field_errors: {
            name: ["Recipe name is required"],
            batch_size: ["Batch size must be positive"],
            ingredients: ["At least one ingredient is required"],
          },
        };

        expect(error.error).toBe("VALIDATION_ERROR");
        expect(error.field_errors?.name).toContain("Recipe name is required");
        expect(error.field_errors?.batch_size).toContain(
          "Batch size must be positive"
        );
      });
    });
  });

  describe("HTTP and API Configuration Types", () => {
    describe("HttpMethod", () => {
      it("should include all HTTP methods", () => {
        const get: HttpMethod = "GET";
        const post: HttpMethod = "POST";
        const put: HttpMethod = "PUT";
        const deleteMethod: HttpMethod = "DELETE";
        const patch: HttpMethod = "PATCH";

        expect(get).toBe("GET");
        expect(post).toBe("POST");
        expect(put).toBe("PUT");
        expect(deleteMethod).toBe("DELETE");
        expect(patch).toBe("PATCH");
      });
    });

    describe("ApiEndpoint", () => {
      it("should define API endpoint configuration", () => {
        const endpoint: ApiEndpoint = {
          method: "POST",
          url: "/api/recipes",
          requiresAuth: true,
        };

        expect(endpoint.method).toBe("POST");
        expect(endpoint.url).toBe("/api/recipes");
        expect(endpoint.requiresAuth).toBe(true);
      });

      it("should handle public endpoints", () => {
        const publicEndpoint: ApiEndpoint = {
          method: "GET",
          url: "/api/public/recipes",
        };

        expect(publicEndpoint.requiresAuth).toBeUndefined();
      });
    });

    describe("ApiCallOptions", () => {
      it("should provide optional request configuration", () => {
        const options: ApiCallOptions = {
          timeout: 5000,
          retries: 3,
          signal: new AbortController().signal,
        };

        expect(options.timeout).toBe(5000);
        expect(options.retries).toBe(3);
        expect(options.signal).toBeInstanceOf(AbortSignal);
      });
    });
  });

  describe("Dashboard Types", () => {
    describe("DashboardData", () => {
      it("should contain comprehensive dashboard information", () => {
        const dashboardData: DashboardData = {
          user_stats: {
            total_recipes: 25,
            public_recipes: 5,
            total_brew_sessions: 30,
            active_brew_sessions: 3,
          },
          recent_recipes: [mockRecipe],
          active_brew_sessions: [],
          brew_session_summary: {
            total_sessions: 30,
            active_sessions: 5,
            completed_sessions: 25,
            avg_brew_time: 240,
            success_rate: 0.85,
            most_brewed_style: "IPA",
          } as BrewSessionSummary,
        };

        expect(dashboardData.user_stats.total_recipes).toBe(25);
        expect(dashboardData.user_stats.active_brew_sessions).toBe(3);
        expect(dashboardData.recent_recipes).toHaveLength(1);
      });
    });

    describe("DashboardResponse", () => {
      it("should wrap dashboard data in API response format", () => {
        const response: DashboardResponse = {
          data: {
            user_stats: {
              total_recipes: 10,
              public_recipes: 2,
              total_brew_sessions: 15,
              active_brew_sessions: 1,
            },
            recent_recipes: [],
            active_brew_sessions: [],
            brew_session_summary: {
              total_sessions: 0,
              active_sessions: 0,
              completed_sessions: 0,
              avg_brew_time: 0,
              success_rate: 0,
              most_brewed_style: "",
            } as BrewSessionSummary,
          },
          message: "Dashboard data retrieved successfully",
          status: "success",
        };

        expect(response.data.user_stats.total_recipes).toBe(10);
        expect(response.status).toBe("success");
      });
    });
  });

  describe("Type Integration", () => {
    it("should work together in realistic API scenarios", () => {
      // Simulate a complete recipe creation flow
      const createRequest: CreateRecipeRequest = {
        name: "New IPA Recipe",
        style: "American IPA",
        description: "A hoppy American IPA",
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
      };

      const createResponse: RecipeResponse = {
        ...createRequest,
        id: "recipe-new-123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      expect(createResponse.name).toBe(createRequest.name);
      expect(createResponse.id).toBe("recipe-new-123");
      expect(createResponse.created_at).toBeDefined();
    });

    it("should handle paginated search responses", () => {
      const searchRequest: RecipeSearchRequest = {
        q: "IPA",
        style: "American IPA",
        is_public: true,
        page: 1,
        per_page: 10,
      };

      const mockSearchRecipe: Recipe = {
        id: "search-recipe-123",
        name: "Search IPA",
        style: "American IPA",
        description: "Search result recipe",
        batch_size: 5,
        batch_size_unit: "gal",
        unit_system: "imperial",
        boil_time: 60,
        efficiency: 75,
        mash_temperature: 152,
        mash_temp_unit: "F",
        is_public: true,
        notes: "",
        ingredients: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const searchResponse: RecipeSearchResponse = {
        recipes: [mockSearchRecipe],
        pagination: {
          page: 1,
          pages: 1,
          per_page: 10,
          has_prev: false,
          has_next: false,
          total: 1,
        },
      };

      expect(searchResponse.recipes).toHaveLength(1);
      expect(searchResponse.pagination.page).toBe(searchRequest.page);
      expect(searchResponse.pagination.per_page).toBe(searchRequest.per_page);
    });
  });
});
