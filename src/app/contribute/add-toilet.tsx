/**
 * @file Add Toilet Route
 *
 * Route component for the Add Toilet screen, which allows users to submit new toilets.
 * This serves as a wrapper around the AddToiletScreen component.
 */

import { Stack } from "expo-router";
import React from "react";

import AddToiletScreen from "../../screens/contribute/AddToiletScreen";

/**
 * Route component for adding a new toilet
 * Renders the multi-step form for toilet submissions
 */
export default function AddToiletRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false, // Hide header since AddToiletScreen has its own header
        }}
      />
      <AddToiletScreen />
    </>
  );
}
