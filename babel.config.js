module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@src": "./src",
            "@contexts": "./src/contexts",
            "@services": "./src/services",
            "@styles": "./src/styles",
            "@hooks": "./src/hooks",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
    env: {
      test: {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          "@babel/preset-react",
          "@babel/preset-typescript",
        ],
      },
    },
  };
};
