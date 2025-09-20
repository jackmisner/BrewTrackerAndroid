const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Custom Expo config plugin to set launchMode="singleTask" for MainActivity
 * This is essential for foldable phone support to prevent multiple app instances
 */
const withSingleTaskLaunchMode = config => {
  return withAndroidManifest(config, config => {
    const androidManifest = config.modResults;

    if (!androidManifest?.manifest?.application?.[0]) {
      console.warn(
        "⚠️  Android manifest structure not found, skipping launchMode configuration"
      );
      return config;
    }

    // Find the main activity
    const mainApplication = androidManifest.manifest.application[0];
    if (mainApplication?.activity) {
      const activities = mainApplication.activity;

      // Find MainActivity (the main activity with MAIN action)
      const mainActivity = activities.find(activity => {
        if (activity["intent-filter"]) {
          return activity["intent-filter"].some(filter => {
            return (
              filter.action &&
              filter.action.some(
                action =>
                  action.$["android:name"] === "android.intent.action.MAIN"
              )
            );
          });
        }
        return false;
      });

      if (mainActivity) {
        // Set launchMode to singleTask
        mainActivity.$["android:launchMode"] = "singleTask";
        console.log(
          "✅ Set MainActivity launchMode to singleTask for foldable phone support"
        );
      }
    }

    return config;
  });
};

module.exports = withSingleTaskLaunchMode;
