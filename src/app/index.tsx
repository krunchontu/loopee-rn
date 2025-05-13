import { useRouter } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/colors";
import { debug } from "../utils/debug";

export default function HomeScreen() {
  const router = useRouter();

  const navigateToMap = () => {
    debug.log("Navigation", "Navigating to map screen");
    router.push("/(guest)/map");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Welcome to Loopee</Text>
      <Text style={styles.subtitle}>Find your perfect toilet nearby</Text>

      <Pressable style={styles.button} onPress={navigateToMap}>
        <Text style={styles.buttonText}>Find Toilets</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 30,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
});
