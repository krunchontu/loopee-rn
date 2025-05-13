# React Native Debugging Guide

## Setup and Configuration

1. **Enable Hermes Engine**
   - Hermes is enabled in app.json for both iOS and Android
   - Provides better performance and debugging capabilities
   ```json
   {
     "jsEngine": "hermes"
   }
   ```

2. **Development Environment**
   - Use Expo Go for quick debugging
   - Use Development Build for advanced debugging features

## Debugging Tools

1. **React Native Debugger**
   - Press 'j' in the terminal to open the debugger
   - View console logs, network requests, and component hierarchy
   - Set breakpoints and inspect variables

2. **In-App Developer Menu**
   - Android: Press Cmd+M or Menu button
   - iOS: Press Cmd+D or shake device
   - Options:
     - Reload: Refresh the app
     - Debug Remote JS: Open Chrome DevTools
     - Toggle Inspector: Inspect UI elements
     - Performance Monitor
     - Show Perf Monitor

3. **Console Debugging**
   ```javascript
   console.log('Debug message');
   console.warn('Warning message');
   console.error('Error message');
   ```

4. **Network Debugging**
   ```javascript
   // Enable network inspection
   import { LogBox } from 'react-native';
   LogBox.ignoreLogs(['Require cycle:']);
   ```

5. **Component Debugging**
   ```javascript
   import { useEffect } from 'react';
   
   useEffect(() => {
     console.log('Component mounted');
     return () => console.log('Component unmounted');
   }, []);
   ```

## Common Issues and Solutions

1. **Android Gradle Build Issues**
   - Issue: `serviceOf` unresolved reference in @react-native/gradle-plugin
     - Solution: Downgrade Gradle version in android/gradle/wrapper/gradle-wrapper.properties
     - Solution: Update Android Gradle Plugin version to match Gradle version
     - Solution: Modify the React Native Gradle Plugin to remove incompatible API calls
     - Solution: Temporarily disable New Architecture if not needed (`"newArchEnabled": false` in app.json)

2. **Environment Variables Issues**
   - Issue: "Error: supabaseUrl is required" or similar environment variable errors
     - Solution: Install react-native-dotenv: `npm install react-native-dotenv --save-dev --legacy-peer-deps`
     - Solution: Update babel.config.js to include the dotenv plugin:
       ```javascript
       module.exports = function (api) {
         api.cache(true);
       
         return {
           presets: [
             ["babel-preset-expo", { unstable_transformImportMeta: true }],
           ],
           plugins: [
             ["module:react-native-dotenv", {
               moduleName: "@env",
               path: ".env.local",
               safe: true,
               allowUndefined: false,
             }],
           ],
         };
       };
       ```
     - Solution: Create a TypeScript declaration file (e.g., src/types/env.d.ts):
       ```typescript
       declare module "@env" {
         export const EXPO_PUBLIC_SUPABASE_URL: string;
         export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
         // Add other environment variables as needed
       }
       ```
     - Solution: Update tsconfig.json to include the env types:
       ```json
       "types": ["react-native", "node", "./src/types/env.d.ts"],
       ```
     - Solution: Create a .env.local file (note the leading dot) with your environment variables:
       ```
       EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
       EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
       ```
     - Solution: Import environment variables from @env:
       ```typescript
       import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
       ```
     - Solution: Restart Metro bundler with `npm start -- --clear --reset-cache` after making these changes

3. **Missing Dependencies**
   - Issue: "Unable to resolve [package] from [file]"
     - Solution: Install the missing dependency with `npm install [package-name] --save`
     - Solution: For complex dependency trees, use `--legacy-peer-deps` flag
     - Solution: Check if the dependency is a peer dependency of another library
     - Solution: Clear Metro cache after installing dependencies with `npm start -- --clear`
     - Solution: For gesture-handler issues, ensure proper import in App.js: `import 'react-native-gesture-handler';` at the top
     - Solution: For native module issues, consider using React Native's built-in alternatives (e.g., Animated API instead of reanimated)
   
4. **Metro Bundler Issues**
   - Clear Metro cache: `npm start -- --clear`
   - Reset Metro: Press 'r' in terminal
   - If you see warnings about Metro config needing to extend '@react-native/metro-config', update your metro.config.js

5. **Expo Module Issues**
   - Issue: "Could not compile build file '[module]/android/build.gradle'"
     - Solution: If using Expo, try running with `npx expo start` instead of direct Android build
     - Solution: Install expo-modules-core as dev dependency: `npm install expo-modules-core --save-dev`
     - Solution: Add proper imports for native modules at app entry points
     - Solution: Check for missing Gradle plugins in android/build.gradle
     - Solution: Use standard React Native components as fallback where possible

6. **State Management Issues**
   - Use React DevTools to inspect component state
   - Add console logs in useEffect and state updates
   ```javascript
   const [state, setState] = useState(initialState);
   useEffect(() => {
     console.log('State updated:', state);
   }, [state]);
   ```

7. **Navigation Debugging**
   - Log route params and navigation state
   ```javascript
   useEffect(() => {
     navigation.addListener('state', (e) => {
       console.log('Navigation state:', e.data);
     });
   }, [navigation]);
   ```

8. **Performance Issues**
   - Use Performance Monitor from Dev Menu
   - Profile with Chrome DevTools
   - Check for unnecessary re-renders

9. **Expo Router Initialization Issues**
   - Issue 1: `TypeError: 0, _imperativeApi.createExpoRoot is not a function (it is undefined)`
     - Problem: Using deprecated or unavailable `createExpoRoot` from `expo-router/build/imperative-api`
     - Solution: Update App.js to use the standard Expo Router pattern with `ExpoRoot` component:
       ```javascript
       import { ExpoRoot } from "expo-router";
       
       export default function App() {
         // Define the root app directory and proper context for Expo Router
         const ctx = require.context("./src/app");
         
         return (
           <ErrorBoundaryProvider>
             <ExpoRoot context={ctx} />
           </ErrorBoundaryProvider>
         );
       }
       ```
     
   - Issue 2: `Error: No filename found. This is likely a bug in expo-router`
     - Problem: Expo Router cannot determine file paths for routing
     - Solutions:
       - Add context to ExpoRoot component: `const ctx = require.context("./src/app");`
       - Ensure babel.config.js includes `expo-router/babel` plugin:
       ```javascript
       plugins: [
         // Add expo-router/babel to enable proper file-based routing
         "expo-router/babel",
         // Other plugins...
       ],
       ```
       - Update metro.config.js to include app directory in watchFolders:
       ```javascript
       defaultConfig.watchFolders = [
         ...(defaultConfig.watchFolders || []),
         path.resolve(__dirname, "./src/app"),
       ];
       ```
       - Check file naming conventions and folder structure

   - Note: These are especially important when using Expo Router v5+
     
10. **Expo Doctor Issues**
    - Issue: Unnecessary direct dependencies that should not be installed directly
      - Problem: Packages like `expo-modules-core` and `expo-modules-autolinking` should not be installed directly
      - Solution: Remove these from package.json as they are automatically installed by other Expo packages
      ```bash
      npm uninstall expo-modules-core expo-modules-autolinking
      # Or directly edit package.json to remove them from devDependencies
      ```

   - Issue: App config fields not syncing in non-CNG project
     - Problem: Native project folders are present with config in app.json
     - Solution 1: Run prebuild in your build pipeline to sync app.json to native code
     ```bash
     npx expo prebuild
     ```
     - Solution 2: Move configuration directly to native project files if prebuild isn't part of your workflow
     
   - Issue: Package validation against React Native Directory
     - Problem: Packages with no metadata in the React Native Directory (e.g., 'events')
     - Solution 1: Update to use React Native's built-in APIs where possible
     - Solution 2: Ignore warnings by setting in package.json:
     ```json
     "expo": {
       "doctor": {
         "reactNativeDirectoryCheck": {
           "listUnknownPackages": false
         }
       }
     }
     ```

   - Issue: Outdated package versions
     - Problem: Packages like react-native-gesture-handler or @types/react have incorrect versions
     - Solution: Use `npx expo install --check` to review and upgrade dependencies
     ```bash
     npx expo install --check
     ```

## Best Practices

1. **Error Boundaries**
   ```javascript
   import { ErrorBoundary } from 'react-native-error-boundary';
   
   <ErrorBoundary onError={(error) => console.log(error)}>
     <YourApp />
   </ErrorBoundary>
   ```

2. **Structured Logging**
   ```javascript
   const logEvent = (category, action, data) => {
     console.log(`[${category}] ${action}:`, data);
   };
   ```

3. **Development vs Production**
   ```javascript
   if (__DEV__) {
     console.log('Debug info');
   }
   ```

4. **Regular Project Health Checks**
   - Run `npx expo-doctor` regularly to check for issues
   - Run `npm audit` to check for security vulnerabilities
   - Use ESLint and TypeScript to catch errors early
   ```bash
   npx expo-doctor
   npm audit
   npm run lint
   ```

## Debugging Commands

1. Start in Expo Go mode:
   ```bash
   npm start
   ```

2. Clear cache and restart:
   ```bash
   npm start -- --clear
   ```

3. Open debugger:
   - Press 'j' in terminal

4. Reload app:
   - Press 'r' in terminal
   - Use Dev Menu in app

5. Check project health:
   ```bash
   npx expo-doctor
   npx expo install --check
   ```

## Additional Resources

- [React Native Debugging Documentation](https://reactnative.dev/docs/debugging)
- [Expo Debugging Guide](https://docs.expo.dev/debugging/tools/)
- [Hermes Documentation](https://reactnative.dev/docs/hermes)
- [Expo Doctor Documentation](https://docs.expo.dev/workflow/doctor/)
