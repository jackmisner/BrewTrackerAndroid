const { withPlugins } = require("@expo/config-plugins");

/**
 * Custom Expo config plugin to conditionally apply network security configuration
 * based on the environment. Only allows cleartext traffic for development/preview builds.
 *
 * This ensures production builds never include development network overrides.
 */
const withConditionalNetworkSecurity = config => {
  // Get the environment from process env with secure default
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || "production";

  // Validate against allowed values
  const allowedEnvironments = ["development", "preview", "production"];
  const validEnvironment = allowedEnvironments.includes(environment)
    ? environment
    : "production";

  if (environment !== validEnvironment) {
    console.warn(
      `⚠️  Unknown EXPO_PUBLIC_ENVIRONMENT value "${environment}", falling back to "production" for security`
    );
  }

  return withPlugins(config, [
    // Apply expo-build-properties with conditional configuration
    [
      "expo-build-properties",
      {
        android: (() => {
          if (validEnvironment !== "production") {
            return {
              usesCleartextTraffic: true,
              networkSecurityConfig: "./android/network_security_config.xml",
            };
          } else {
            return {
              usesCleartextTraffic: false,
              networkSecurityConfig:
                "./android/network_security_config_production.xml",
            };
          }
        })(),
      },
    ],
  ]);
};

module.exports = withConditionalNetworkSecurity;
