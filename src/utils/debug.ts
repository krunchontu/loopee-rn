import { Platform } from "react-native";

class Debug {
  private static instance: Debug;
  private isEnabled: boolean = __DEV__;
  private startTimes: Map<string, number> = new Map();
  private isVerbose: boolean = false; // Add verbose mode flag

  private constructor() {}

  static getInstance(): Debug {
    if (!Debug.instance) {
      Debug.instance = new Debug();
    }
    return Debug.instance;
  }

  /**
   * Log a message with category and optional data
   */
  log(category: string, message: string, data?: any) {
    if (!this.isEnabled) return;
    console.log(`[${category}] ${message}`, data || "");
  }

  /**
   * Log a warning with category and optional data
   */
  warn(category: string, message: string, data?: any) {
    if (!this.isEnabled) return;
    console.warn(`[${category}] ${message}`, data || "");
  }

  /**
   * Log an error with category and optional data
   */
  error(category: string, message: string, error?: any) {
    if (!this.isEnabled) return;
    console.error(`[${category}] ${message}`, error || "");
  }

  /**
   * Start timing an operation
   */
  startTimer(label: string) {
    if (!this.isEnabled) return;
    this.startTimes.set(label, Date.now());
  }

  /**
   * End timing an operation and log the duration
   */
  endTimer(label: string) {
    if (!this.isEnabled) return;
    const startTime = this.startTimes.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.log("Performance", `${label}: ${duration.toFixed(2)}ms`);
      this.startTimes.delete(label);
    }
  }

  /**
   * Log component lifecycle events
   */
  logLifecycle(componentName: string, event: string) {
    if (!this.isEnabled) return;
    this.log("Lifecycle", `${componentName} - ${event}`);
  }

  /**
   * Log network requests
   */
  logNetwork(method: string, url: string, data?: any) {
    if (!this.isEnabled) return;
    this.log("Network", `${method} ${url}`, data);
  }

  /**
   * Log navigation events
   */
  logNavigation(routeName: string, params?: any) {
    if (!this.isEnabled) return;
    this.log("Navigation", `Navigating to: ${routeName}`, params);
  }

  /**
   * Log state changes
   */
  logState(component: string, stateName: string, value: any) {
    if (!this.isEnabled) return;
    this.log("State", `${component} - ${stateName}:`, value);
  }

  /**
   * Log device information
   */
  logDeviceInfo() {
    if (!this.isEnabled) return;
    this.log("Device", "Platform", {
      OS: Platform.OS,
      Version: Platform.Version,
      isTV: Platform.isTV,
    });
  }

  /**
   * Enable or disable debugging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled && __DEV__;
  }

  /**
   * Check if debugging is enabled
   */
  isDebugging(): boolean {
    return this.isEnabled;
  }

  /**
   * Enable verbose logging mode
   */
  enableVerboseLogging() {
    this.isVerbose = true;
    this.log("Debug", "Verbose logging enabled");
  }

  /**
   * Log visual component information - useful for troubleshooting layout issues
   */
  logComponentLayout(
    component: string,
    layout: { x: number; y: number; width: number; height: number }
  ) {
    if (!this.isEnabled || !this.isVerbose) return;
    this.log("Layout", `${component} dimensions:`, layout);
  }

  /**
   * Log component visibility state
   */
  logVisibility(component: string, isVisible: boolean, extraInfo?: any) {
    if (!this.isEnabled || !this.isVerbose) return;
    this.log(
      "Visibility",
      `${component} is ${isVisible ? "visible" : "hidden"}`,
      extraInfo
    );
  }

  /**
   * Log z-index and positioning information
   */
  logZIndex(
    component: string,
    zIndex: number,
    position: string,
    extraStyles?: any
  ) {
    if (!this.isEnabled || !this.isVerbose) return;
    this.log(
      "ZIndex",
      `${component} has z-index ${zIndex}, position: ${position}`,
      extraStyles
    );
  }

  /**
   * Get verbose mode status
   */
  isVerboseLogging(): boolean {
    return this.isVerbose;
  }
}

export const debug = Debug.getInstance();
