import React from "react";
import ResponsiveNavigation from "../navigation/ResponsiveNavigation";

/**
 * HomeScreen
 *
 * The main entry point for the application, which loads the responsive navigation system.
 * This component automatically adapts the UI based on the device size:
 * - On phones: Shows map with a bottom sheet for toilet listing
 * - On tablets: Shows map with a permanent side panel for toilet listing
 */
export default function HomeScreen() {
  return <ResponsiveNavigation />;
}
