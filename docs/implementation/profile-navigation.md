# Profile Navigation Implementation

## Overview

This document outlines the implementation of navigation to the user profile screen in both phone and tablet layouts of the Loopee app.

## Implementation Details

### 1. Shared AppHeader Component

A reusable `AppHeader` component has been created to provide consistent navigation across the app. This component:

- Displays the app title
- Shows a profile button in the top-right corner
- Navigates to the profile screen when the profile button is tapped
- Supports optional back button functionality

**Location:** `src/components/shared/AppHeader.tsx`

```typescript
import { useRouter } from "expo-router";
import { Appbar } from "react-native-paper";

export function AppHeader({ title = "Loopee", showBackButton = false }) {
  const router = useRouter();
  
  return (
    <Appbar.Header>
      {showBackButton && <Appbar.BackAction />}
      <Appbar.Content title={title} />
      <Appbar.Action 
        icon="account-circle" 
        onPress={() => router.push("/profile")} 
      />
    </Appbar.Header>
  );
}
```

### 2. Phone Layout Implementation

For phone layouts, the profile navigation is implemented through:

- Adding the `AppHeader` component to the `MapWithBottomSheet` screen
- Positioning the header with proper z-index to overlay the map
- Using SafeAreaView to respect device notches and system UI elements

**Location:** `src/components/map/MapWithBottomSheet.tsx`

```jsx
<View style={styles.container}>
  <SafeAreaView style={styles.headerContainer}>
    <AppHeader />
  </SafeAreaView>
  <CustomMapView style={styles.map} />
  {/* ... other components ... */}
</View>
```

### 3. Tablet Layout Implementation

For tablet layouts, the profile navigation is implemented through:

- Adding a "My Profile" item to the permanent drawer navigation
- Using MaterialCommunityIcons for consistent iconography
- Implementing a redirect to the profile screen using expo-router

**Location:** `src/navigation/ResponsiveNavigation.tsx`

```jsx
<Drawer.Screen
  name="Profile"
  component={EmptyRedirectComponent}
  options={{
    title: "My Profile",
    drawerIcon: ({ color, size }) => (
      <MaterialCommunityIcons name="account-circle" size={size} color={color} />
    ),
  }}
  listeners={{
    focus: () => {
      router.push("/profile");
      return false;
    },
  }}
/>
```

## User Guide

### Accessing Profile on Phone Devices

On phone-sized devices:
1. Open the Loopee app
2. Look for the profile icon (circle with person silhouette) in the top-right corner of the screen
3. Tap the profile icon
4. The app will navigate to your profile screen

### Accessing Profile on Tablet Devices

On tablet-sized devices:
1. Open the Loopee app
2. In the permanent drawer on the left side, find the "My Profile" option
3. Tap "My Profile"
4. The app will navigate to your profile screen

Additionally, tablets also show the profile icon in the top-right corner of the screen, which provides an alternative way to access the profile.

## Technical Considerations

### 1. Navigation Architecture

The implementation leverages Expo Router for profile navigation, which offers several benefits:

- Maintains consistent navigation patterns across the app
- Preserves the auth protection implemented in `src/app/_layout.tsx`
- Works harmoniously with both stack-based and drawer-based navigation

### 2. UI Consistency

To maintain visual consistency:

- The same profile icon is used in both layouts
- The Material Design icon system is used throughout
- The header styling is consistent with the rest of the app

### 3. Accessibility

The implementation includes accessibility considerations:

- The profile button has an accessibility label "Go to profile"
- Touch targets meet the recommended minimum size of 44x44 points
- The UI is responsive and adapts to different screen sizes

## Future Improvements

Potential enhancements to consider:

1. **Dynamic Avatar**: Replace the generic profile icon with the user's actual profile picture when available
2. **Badge Notifications**: Add notification indicators on the profile icon to show unread messages or updates
3. **Bottom Tab Navigation**: Consider implementing a bottom tab bar for phone layouts with Home, Map, and Profile tabs
4. **Custom Transitions**: Add custom transitions when navigating to the profile screen for a more polished experience

## Related Components

- `src/app/profile/index.tsx` - Main profile screen
- `src/app/profile/edit.tsx` - Profile editing screen  
- `src/app/profile/settings.tsx` - Settings screen
- `src/components/profile/ProfileHeader.tsx` - Profile header component with user information
