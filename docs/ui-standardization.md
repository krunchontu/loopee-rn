# UI Standardization: Toilet Card Components

## Overview

This document outlines the standardization of toilet card components across the Loopee app. We've migrated from using multiple card implementations to a single, consistent approach using `PaperToiletCard` for all device sizes.

## Key Changes

1. **Standardized on PaperToiletCard**
   - `ModalizeToiletSheet` now uses `PaperToiletCard` instead of `ToiletCard`
   - Added responsive icon sizing to `PaperToiletCard` for better scaling
   - Implemented screen size detection for automatic compact mode on small screens

2. **Enhanced Responsiveness**
   - Icon sizes now scale based on screen width using `getResponsiveFontSize`
   - Small phones (< 375px width) automatically use compact mode
   - Text components scale with system font settings for better accessibility

3. **Improved Documentation**
   - Updated JSDoc comments with detailed parameter explanations
   - Documented responsive features and behavior

## Benefits

- **Consistency**: Same card component used across phone and tablet interfaces
- **Maintainability**: Single source of truth for toilet card UI
- **Accessibility**: Better support for system font scaling and readability
- **Performance**: Simplified component hierarchy
- **Responsiveness**: Better adaptation to different screen sizes

## Implementation Details

### Screen Size Detection

The `ModalizeToiletSheet` component now detects screen size and applies compact mode automatically:

```tsx
const renderItem = useCallback(
  ({ item }: ListRenderItemInfo<Toilet>) => {
    // Determine if compact mode should be used based on screen width
    const { width } = Dimensions.get("window");
    const useCompact = width < breakpoints.sm; // Small phones use compact mode
    
    return (
      <PaperToiletCard
        toilet={item}
        onPress={() => handleToiletPress(item)}
        compact={useCompact}
      />
    );
  },
  [handleToiletPress]
);
```

### Responsive Icon Sizing

Icons now scale appropriately based on screen size:

```tsx
distanceIcon: {
  fontSize: getResponsiveFontSize(12, SCREEN_WIDTH),
},
metaIcon: {
  fontSize: getResponsiveFontSize(12, SCREEN_WIDTH),
},
```

## Future Improvements

- Consider implementing a complete design token system for icon sizes
- Add dark mode support to PaperToiletCard
- Introduce a configurable density property for more granular control
- Further optimize animations and transitions for smoother performance

## Related Components

- `PaperToiletCard`: The standardized card component
- `ModalizeToiletSheet`: Bottom sheet used on phones
- `ToiletList`: Used in tablet mode for the drawer panel

## Changelog

**May 18, 2025**
- Standardized on PaperToiletCard across all device sizes
- Removed dependency on ToiletCard
- Enhanced responsiveness of icons and text
- Implemented automatic compact mode detection for small screens
