module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo", "@babel/preset-typescript"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@src": "./src",
            "@components": "./src/components",
            "@contexts": "./src/contexts",
            "@constants": "./src/constants",
            "@services": "./src/services",
            "@styles": "./src/styles",
            "@types": "./src/types",
            "@utils": "./src/utils",
            "@hooks": "./src/hooks",
            "@assets": "./assets",
          },
        },
      ],
      "react-native-worklets/plugin",
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
