const { withPlugins } = require("@expo/config-plugins");

/**
 * Custom Expo config plugin to conditionally apply network security configuration
 * based on the environment. Only allows cleartext traffic for development/preview builds.
 *
 * This ensures production builds never include development network overrides.
 */
const withConditionalNetworkSecurity = config => {
  // Get the environment from process env
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || "development";

  console.log(
    `🔒 Configuring network security for environment: ${environment}`
  );

  return withPlugins(config, [
    // Apply expo-build-properties with conditional configuration
    [
      "expo-build-properties",
      {
        android: (() => {
          if (environment !== "production") {
            console.log(
              "🚨 Development mode: Allowing cleartext traffic for local development"
            );
            return {
              usesCleartextTraffic: true,
              networkSecurityConfig: "./android/network_security_config.xml",
            };
          } else {
            console.log(
              "🔒 Production mode: Cleartext traffic disabled for security"
            );
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
