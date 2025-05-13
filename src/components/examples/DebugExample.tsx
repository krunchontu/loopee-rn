import React, { useEffect, useState } from "react";
import { View, Text, Button } from "react-native";
import { debug } from "../../utils/debug";

export const DebugExample = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Log component lifecycle
    debug.logLifecycle("DebugExample", "mounted");
    debug.logDeviceInfo();

    return () => {
      debug.logLifecycle("DebugExample", "unmounted");
    };
  }, []);

  useEffect(() => {
    // Log state changes
    debug.logState("DebugExample", "count", count);
  }, [count]);

  const handlePress = async () => {
    // Example of timing an operation
    debug.startTimer("increment");

    // Simulate some async work
    await new Promise((resolve) => setTimeout(resolve, 100));

    setCount((prev) => prev + 1);

    // Log the time taken
    debug.endTimer("increment");

    // Example of network logging
    debug.logNetwork("GET", "https://api.example.com/data", {
      params: { id: count },
    });
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Debug Example Component</Text>
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={handlePress} />
    </View>
  );
};
