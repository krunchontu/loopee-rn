// Jest Native matchers are now built into @testing-library/react-native v12.4+
// No need to import them separately

// Define React Native globals
global.__DEV__ = true;

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => "/",
}));

// Mock expo-linking
jest.mock("expo-linking", () => ({
  createURL: jest.fn((path) => `loopee://${path}`),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 37.78825,
        longitude: -122.4324,
        altitude: 0,
        accuracy: 5,
        heading: 0,
        speed: 0,
      },
    })
  ),
  watchPositionAsync: jest.fn(),
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

// Mock react-native-maps
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Callout: View,
  };
});

// Mock @gorhom/bottom-sheet
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef(() => null),
    BottomSheetScrollView: require("react-native").ScrollView,
  };
});

// Mock react-native-paper
jest.mock("react-native-paper", () => {
  const React = require("react");
  const RN = require("react-native");

  const TextInputComponent = React.forwardRef(({ label, value, onChangeText, error, mode, right, secureTextEntry, testID, placeholder, accessibilityLabel, ...props }, ref) =>
    React.createElement(RN.View, { ref },
      React.createElement(RN.TextInput, {
        value,
        onChangeText,
        placeholder: placeholder || label,
        secureTextEntry,
        testID,
        accessibilityLabel: accessibilityLabel || label,
        error,
        mode,
        ...props,
      }),
      right
    )
  );

  TextInputComponent.Icon = ({ icon, onPress, forceTextInputFocus, ...props }) =>
    React.createElement(RN.TouchableOpacity, {
      onPress,
      testID: "password-toggle-icon",
      accessibilityLabel: icon,
      ...props,
    }, React.createElement(RN.Text, {}, icon));

  return {
    Provider: ({ children }) => children,
    DefaultTheme: {},
    DarkTheme: {},
    useTheme: () => ({
      colors: {
        primary: "#6200ee",
        background: "#ffffff",
        surface: "#ffffff",
        error: "#b00020",
        text: "#000000",
        onSurface: "#000000",
        disabled: "#00000061",
        placeholder: "#00000099",
        backdrop: "#00000052",
        notification: "#f50057",
        outline: "#00000042",
      },
      dark: false,
      roundness: 4,
      animation: {
        scale: 1,
      },
    }),
    Button: ({ children, onPress, loading, disabled, testID, mode, accessibilityState, ...props }) =>
      React.createElement(RN.TouchableOpacity, {
        onPress,
        disabled: disabled || loading,
        testID,
        accessibilityState,
        ...props,
      }, React.createElement(RN.Text, {}, children)),
    TextInput: TextInputComponent,
    Surface: ({ children, style, ...props }) =>
      React.createElement(RN.View, { style, ...props }, children),
    Text: ({ children, variant, style, ...props }) =>
      React.createElement(RN.Text, { style, ...props }, children),
    HelperText: ({ children, type, visible, ...props }) =>
      visible !== false ? React.createElement(RN.Text, { testID: type === "error" ? "error-text" : "helper-text", ...props }, children) : null,
  };
});

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
