/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/
 *
 * @format
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Get the default Metro config
const defaultConfig = getDefaultConfig(__dirname);

// Support for expo-router file system based routing
defaultConfig.watchFolders = [
  ...(defaultConfig.watchFolders || []),
  path.resolve(__dirname, "./src/app"),
];

// Destructure needed properties
const {
  resolver: { sourceExts, assetExts },
} = defaultConfig;

module.exports = {
  ...defaultConfig,
  transformer: {
    ...defaultConfig.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
    minifierConfig: {
      // Faster development builds
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        // Don't mangle React components
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  },
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [...sourceExts, "mjs"],
    assetExts: assetExts.filter((ext) => ext !== "svg"),
    // Provide necessary polyfills for dependencies
    extraNodeModules: {
      fs: require.resolve("react-native-fs"),
      net: require.resolve("react-native-tcp"),
      tls: require.resolve("react-native-tcp"),
      http: require.resolve("@tradle/react-native-http"),
      https: require.resolve("https-browserify"),
      stream: require.resolve("stream-browserify"),
      events: require.resolve("events"),
      crypto: require.resolve("react-native-crypto"),
      buffer: require.resolve("buffer"),
      url: require.resolve("url"),
      zlib: require.resolve("browserify-zlib"),
      assert: require.resolve("assert"),
    },
  },
  // Optimize cache
  resetCache: false,
  maxWorkers: 4,
};
