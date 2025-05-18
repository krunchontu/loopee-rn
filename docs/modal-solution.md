# Modal-Based Solution for Toilet Details

## Overview

This document explains the implementation of a more reliable modal-based solution for displaying toilet details, replacing the problematic bottom sheet approach.

## Why We Changed the Implementation

The original implementation using `@gorhom/bottom-sheet` was encountering the following error when clicking on toilet markers:

```
Invariant Violation: 'index' was provided but out of the provided snap points range! expected value to be between -1, 0, js engine: hermes
```

This error occurred for several reasons:
1. The snap points array was not properly configured for our use case
2. The bottom sheet library has known compatibility issues with specific React Native versions
3. There were z-index conflicts affecting bottom sheet visibility
4. Gesture handling conflicts between the map and bottom sheet

## The New Solution

We replaced the bottom sheet with a pure React Native Modal-based solution that:

1. **Uses built-in components**: Relies on React Native's core `Modal` component rather than third-party libraries
2. **Has custom animations**: Implements smooth slide-up and fade-in animations using Animated API
3. **Handles platform differences**: Accounts for Android and iOS specific behaviors
4. **Provides better debugging**: Enhanced logging for troubleshooting
5. **Has robust error handling**: Better recovery from edge cases

The key advantages of this approach are:
- No external library dependencies (reduced bundle size)
- Simpler maintenance (uses only React Native core components)
- More consistent behavior across devices
- Easier to debug and extend

## Implementation Details

### Key Components

1. **ModalToiletSheet**: A pure React Native implementation that replaces the bottom sheet
   - Found in `src/components/toilet/ModalToiletSheet.tsx`
   - Uses React Native's Modal, Animated, and other core components

2. **MapScreen**: Updated to use the new modal solution
   - Found in `src/app/(guest)/map.tsx`
   - Handles marker interactions and modal visibility

### Animation System

The modal uses React Native's Animated API to provide smooth transitions:

```typescript
// Animation setup
const slideAnim = useRef(new Animated.Value(0)).current;
const fadeAnim = useRef(new Animated.Value(0)).current;

// Run animations when visible changes
useEffect(() => {
  if (visible) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  } else {
    slideAnim.setValue(0);
    fadeAnim.setValue(0);
  }
}, [visible, slideAnim, fadeAnim]);
```

### Cross-Platform Compatibility

The implementation accounts for platform differences:

1. **Android**: 
   - Uses `android_ripple` for touch feedback
   - Handles Android's back button with `BackHandler`
   - Sets `android_disableSound` for better tap behavior

2. **iOS**:
   - Uses safe area for proper insets
   - Manages keyboard behavior

### Enhanced Error Handling

The solution includes robust error handling:

1. **Verbose logging mode** for capturing events and state changes
2. **Fallback UI states** to show when data isn't available
3. **Clear error reporting** for easier debugging

### Testing Utilities

Development testing is simplified with:

1. **Auto-show functionality** (commented by default)
2. **Verbose console logging** for interaction tracking
3. **Animation controls** for troubleshooting timing issues

## How to Use

### Basic Usage

To show toilet details when a marker is pressed:

```typescript
const handleMapMarkerPress = (toilet: Toilet) => {
  // First handle the toilet selection
  selectToilet(toilet);

  // Open the modal
  setIsModalVisible(true);
};
```

### Testing Mode

For testing, you can uncomment the auto-show functionality in `MapScreen`:

```typescript
useEffect(() => {
  // Auto-show modal with slight delay for testing if needed
  if (toilets.length > 0) {
    const timer = setTimeout(() => {
      setIsModalVisible(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}, [toilets.length]);
```

## Troubleshooting

If the modal doesn't appear when clicking a toilet marker:

1. Check console logs for error messages
2. Verify that `setIsModalVisible(true)` is being called
3. Check if the toilet data is properly loaded
4. Review any z-index conflicts with other UI elements

For visual debugging, the modal includes animation logging that prints values to the console during transitions.
