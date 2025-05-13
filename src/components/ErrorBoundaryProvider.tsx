import React from "react";
import { ErrorBoundary, withErrorBoundary } from "./shared/ErrorBoundary";
import { CustomMapView } from "./map/MapView";
import { ToiletList } from "./toilet/ToiletList";
import { BottomSheet } from "./shared/BottomSheet";
import { ErrorState } from "./shared/ErrorState";

// Wrap key components with error boundaries
export const SafeMapView = withErrorBoundary(CustomMapView, {
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    // TODO: Add error reporting service integration
    console.error("Map Error:", error, errorInfo);
  },
});

export const SafeToiletList = withErrorBoundary(ToiletList, {
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("ToiletList Error:", error, errorInfo);
  },
});

export const SafeBottomSheet = withErrorBoundary(BottomSheet, {
  onError: (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("BottomSheet Error:", error, errorInfo);
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
    console.error("App Error:", error, errorInfo);
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
