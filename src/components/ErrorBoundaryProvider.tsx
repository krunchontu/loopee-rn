import React from "react";

import { CustomMapView } from "./map/MapView";
import { BottomSheet } from "./shared/BottomSheet";
import { ErrorBoundary, withErrorBoundary } from "./shared/ErrorBoundary";
import { ErrorState } from "./shared/ErrorState";
import { ToiletList } from "./toilet/ToiletList";
import { debug } from "../utils/debug";

// Wrap key components with error boundaries
export const SafeMapView = withErrorBoundary(CustomMapView, {
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    // TODO: Add error reporting service integration
    debug.error("MapView", "Map Error", { error, errorInfo });
  },
});

export const SafeToiletList = withErrorBoundary(ToiletList, {
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    debug.error("ToiletList", "ToiletList Error", { error, errorInfo });
  },
});

export const SafeBottomSheet = withErrorBoundary(BottomSheet, {
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    debug.error("BottomSheet", "BottomSheet Error", { error, errorInfo });
  },
});

interface ErrorBoundaryProviderProps {
  children: React.ReactNode;
}

export function ErrorBoundaryProvider({
  children,
}: ErrorBoundaryProviderProps) {
  const handleAppError = (error: Error, errorInfo: React.ErrorInfo) => {
    // TODO: Add error reporting service integration
    debug.error("App", "App Error", { error, errorInfo });
  };

  return (
    <ErrorBoundary
      onError={handleAppError}
      fallback={
        <ErrorState
          error="The app encountered a critical error"
          message="Please restart the app"
          fullScreen
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}
