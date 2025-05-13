module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      // expo-router/babel is now included in babel-preset-expo in SDK 50
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env.local",
          safe: true,
          allowUndefined: false,
        },
      ],
    ],
  };
};
