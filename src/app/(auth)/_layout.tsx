/**
 * @file Auth Layout
 *
 * Layout component for all authentication screens
 * Provides consistent styling and common elements
 */

import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../foundations";

/**
 * Auth layout component
 *
 * Applied to all screens in the (auth) route group.
 * Handles:
 * - Navigation header configuration
 * - SafeArea behavior
 * - Common styling elements
 */
export default function AuthLayout() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.innerContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.background.primary,
            },
            animation: "slide_from_right",
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
});
