module.exports = function (api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === "test";

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
      // Skip react-native-dotenv in test environment — Jest's moduleNameMapper
      // handles @env via __mocks__/env.js, and the plugin crashes without .env.local
      ...(isTest
        ? []
        : [
            [
              "module:react-native-dotenv",
              {
                moduleName: "@env",
                path: ".env.local",
                safe: true,
                allowUndefined: false,
              },
            ],
          ]),
    ],
  };
};
