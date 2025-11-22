import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useRouter } from "expo-router";
import React from "react";
import { useWindowDimensions, View } from "react-native";

import MapScreen from "../app/(guest)/map";
import MapWithBottomSheet from "../components/map/MapWithBottomSheet";
import ToiletDetailView from "../components/toilet/ToiletDetailView";
import ToiletListScreen from "../components/toilet/ToiletListScreen";
import type { Toilet } from "../types/toilet";

// Import screens

// Define navigation params
type DrawerParamList = {
  Map: undefined;
  ToiletList: undefined;
  ToiletDetails: { toilet: Toilet };
  Profile: undefined;
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
 * Empty component used for navigation redirect items
 */
const EmptyRedirectComponent = () => <View />;

/**
 * TabletNavigation
 *
 * Side panel approach for tablets using Drawer Navigator:
 * - Permanent side panel showing toilet list
 * - Map remains visible while browsing toilets
 * - Detail view replaces list in the same panel when a toilet is selected
 * - Profile option to navigate to user profile
 */
function TabletNavigation() {
  const router = useRouter();
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
      <Drawer.Screen
        name="Profile"
        component={EmptyRedirectComponent}
        options={{
          title: "My Profile",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle"
              size={size}
              color={color}
            />
          ),
        }}
        listeners={{
          focus: () => {
            // Navigate to profile page using expo-router
            router.push("/profile");
            return false;
          },
        }}
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
 * - Profile access is through the AppHeader component in MapWithBottomSheet
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
