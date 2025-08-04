import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function RecipesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <MaterialIcons name="menu-book" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Recipes Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first recipe to start brewing!
        </Text>
        
        <TouchableOpacity style={styles.createButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Create Recipe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4511e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});