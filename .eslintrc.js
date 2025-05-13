/**
 * ESLint configuration for Loopee React Native app
 *
 * Rules prioritize TypeScript strict checking, React best practices,
 * and performance considerations.
 */
module.exports = {
  root: true,
  // Extend the recommended rule sets
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react-native/all",
  ],
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "react-native",
    "import",
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    // For large projects with lots of files, increase memory
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      // For TS files, enable type-aware rules
      files: ["**/*.ts", "**/*.tsx"],
      parserOptions: {
        project: "./tsconfig.json",
      },
      rules: {
        "@typescript-eslint/no-floating-promises": "warn", // Downgraded to warning for now
        "@typescript-eslint/no-misused-promises": "warn", // Downgraded to warning for now
        "@typescript-eslint/no-unsafe-assignment": "warn", // Downgraded to warning
        "@typescript-eslint/no-unsafe-member-access": "warn",
        "@typescript-eslint/no-unsafe-call": "warn",
        "@typescript-eslint/no-unsafe-argument": "warn",
        "@typescript-eslint/restrict-template-expressions": "warn",
      },
    },
  ],
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json",
      },
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
  rules: {
    // React rules
    "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
    "react/prop-types": "off", // We use TypeScript for prop type checking
    "react-hooks/rules-of-hooks": "error", // Enforce Rules of Hooks
    "react-hooks/exhaustive-deps": "warn", // Check effect dependencies
    "react/jsx-no-bind": [
      "warn",
      {
        // Avoid inline function definitions in props
        allowArrowFunctions: true,
      },
    ],
    "react/display-name": "off", // Using function names provides better stack traces

    // TypeScript rules
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn", // Discourage any types
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        // Clean up import types
        prefer: "type-imports",
      },
    ],
    "@typescript-eslint/no-floating-promises": [
      "error",
      {
        // Prevent unhandled promises
        ignoreIIFE: true,
        ignoreVoid: true,
      },
    ],

    // General rules
    "no-console": ["error", { allow: ["warn", "error"] }],
    "import/order": [
      "warn",
      {
        // Organize imports
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
        ],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],

    // Performance rules
    "react-native/no-inline-styles": "warn", // Prefer StyleSheet for better performance
    "react-native/no-raw-text": "off", // Too restrictive for our app
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
    "react-native/react-native": true,
  },
  // Ignore build artifacts and config files
  ignorePatterns: [
    "node_modules/",
    "android/",
    "ios/",
    "*.config.js",
    "babel.config.js",
    ".eslintrc.js",
    "App.js",
    "index.js",
  ],
};
