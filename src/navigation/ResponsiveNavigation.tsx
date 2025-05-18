import React from "react";
import { useWindowDimensions } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Toilet } from "../types/toilet";

// Import screens
import MapScreen from "../app/(guest)/map";
import ToiletListScreen from "../components/toilet/ToiletListScreen";
import ToiletDetailView from "../components/toilet/ToiletDetailView";
import MapWithBottomSheet from "../components/map/MapWithBottomSheet";

// Define navigation params
type DrawerParamList = {
  Map: undefined;
  ToiletList: undefined;
  ToiletDetails: { toilet: Toilet };
};

type StackParamList = {
  Map: undefined;
  ToiletDetails: { toilet: Toilet };
};

// Create navigators
const Drawer = createDrawerNavigator<DrawerParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

// Tablet breakpoint - matches your responsive.ts
const TABLET_BREAKPOINT = 768;

/**
 * ResponsiveNavigation
 *
 * Handles device-adaptive navigation with different UIs for phones and tablets:
 * - Phone: Stack navigator with bottom sheet and full-screen details
 * - Tablet: Drawer navigator with permanent side panel containing list/details
 *
 * Note: This component does not wrap with NavigationContainer since Expo Router
 * already provides one at the app root level.
 */
export default function ResponsiveNavigation() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  return isTablet ?
      // Tablet layout with permanent drawer
      <TabletNavigation />
      // Phone layout with bottom sheet and full-screen details
    : <PhoneNavigation />;
}

/**
 * TabletNavigation
 *
 * Side panel approach for tablets using Drawer Navigator:
 * - Permanent side panel showing toilet list
 * - Map remains visible while browsing toilets
 * - Detail view replaces list in the same panel when a toilet is selected
 */
function TabletNavigation() {
  return (
    <Drawer.Navigator
      initialRouteName="Map"
      defaultStatus="open"
      screenOptions={{
        drawerType: "permanent",
        drawerStyle: { width: "35%" },
      }}
    >
      <Drawer.Screen
        name="Map"
        component={MapScreen}
        options={{
          headerShown: false,
          drawerLabel: () => null, // Hide from drawer list
        }}
      />
      <Drawer.Screen
        name="ToiletList"
        component={ToiletListScreen}
        options={{
          title: "Nearby Toilets",
        }}
      />
      <Drawer.Screen
        name="ToiletDetails"
        component={ToiletDetailView}
        options={({ route }) => ({
          title: route.params?.toilet?.name || "Toilet Details",
        })}
      />
    </Drawer.Navigator>
  );
}

/**
 * PhoneNavigation
 *
 * Stack-based navigation for phones:
 * - MapWithBottomSheet serves as the main screen with Modalize sheet for the list
 * - Full screen modal for detailed toilet information
 */
function PhoneNavigation() {
  return (
    <Stack.Navigator initialRouteName="Map">
      <Stack.Screen
        name="Map"
        component={MapWithBottomSheet}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ToiletDetails"
        component={ToiletDetailView}
        options={({ route }) => ({
          title: route.params?.toilet?.name || "Toilet Details",
        })}
      />
    </Stack.Navigator>
  );
}
