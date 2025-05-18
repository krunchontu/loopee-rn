# Bottom Sheet Troubleshooting Guide

## Background

The app uses `@gorhom/bottom-sheet` to show toilet details when a marker is clicked on the map. However, we've experienced an issue where the bottom sheet doesn't appear and an error is shown:

```
Invariant Violation: 'index' was provided but out of the provided snap points range! expected value to be between -1, 0, js engine: hermes
```

## Implemented Solutions

We've added several debugging mechanisms and fallbacks to help isolate and fix the issue:

### 1. Fallback Modal Solution

A Modal-based fallback has been implemented that will show even if the bottom sheet fails. This ensures users can still see toilet details when they tap a marker.

### 2. Visual Debug Indicator

The app now includes a visual debug indicator that shows exactly where the bottom sheet should appear. This helps diagnose positioning and z-index issues.

### 3. Enhanced Logging

Verbose logging has been added to trace issues with the bottom sheet initialization and interactions. You can see these logs in the console.

## How to Fix the Issue

Based on the error message, the problem appears to be that the bottom sheet is trying to snap to an index that doesn't exist in the snapPoints array. Here are potential fixes:

### Fix 1: Check Snap Points Configuration

The error suggests the expected range is between -1 and 0, which indicates there may only be one valid snap point defined. Ensure your snapPoints array has at least two values:

```javascript
// Ensure this has at least two values
const snapPoints = useMemo(() => [300, height - 100], [height]);
```

### Fix 2: Update Bottom Sheet Library

Update the @gorhom/bottom-sheet library to the latest version, as this might be a known issue that has been fixed:

```
npm install @gorhom/bottom-sheet@latest
```

### Fix 3: Use Positions Instead of Indices

Instead of using snapToIndex, try using snapToPosition:

```javascript
// Instead of
bottomSheetRef.current.snapToIndex(1);

// Try using
bottomSheetRef.current.snapToPosition('50%');
```

### Fix 4: Remove and Replace Bottom Sheet Library

If the issues persist, consider replacing @gorhom/bottom-sheet with a different solution:

1. React Native's built-in Modal component
2. React Native Reanimated Bottom Sheet
3. A custom implementation using Animated or Reanimated

## Clearing Cache

If you've made changes but still see issues, try clearing the app and Expo cache:

1. Close Expo Go
2. On device: Settings → Apps → Expo Go → Storage → Clear Cache
3. Restart with cache clearing:
   ```
   npx expo start -c
   ```

## Identifying the Root Cause

To further debug this issue:

1. Check if the snapPoints array is correctly initialized
2. Ensure there are no duplicate or conflicting bottom sheet implementations
3. Verify all indexes used with snapToIndex are within bounds of the snapPoints array
4. Check if the error happens consistently or only in specific user flows

## Navigation Container Error

Another issue we've encountered and fixed is related to nested NavigationContainer components:

```
Error: Looks like you have nested a 'NavigationContainer' inside another. Normally you need only one container at the root of the app, so this was probably an error. If this was intentional, wrap the container in 'NavigationIndependentTree' explicitly.
```

### Root Cause

This error occurs because:

1. Our app uses Expo Router, which already provides a NavigationContainer at the root through `<ExpoRoot context={ctx} />` in App.js
2. Our `ResponsiveNavigation` component was also wrapping its contents with another NavigationContainer

### Implemented Solution

We resolved this by:

1. Removing the NavigationContainer import and wrapper from ResponsiveNavigation.tsx
2. Directly returning the appropriate navigation component (TabletNavigation or PhoneNavigation)
3. Adding documentation in the component to clarify that we're relying on Expo Router's NavigationContainer

### Preventing This Issue

When using Expo Router:

1. Never add your own NavigationContainer component
2. Use the existing navigation context provided by Expo Router
3. If you need nested navigators, add them without wrapping in a NavigationContainer
4. If you truly need separate navigation trees, use NavigationIndependentTree as suggested in the error message
