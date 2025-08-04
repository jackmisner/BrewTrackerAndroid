import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back, {user?.username}!
        </Text>
        <Text style={styles.subtitle}>
          Ready to brew something amazing?
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="menu-book" size={32} color="#f4511e" />
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </View>
        
        <View style={styles.statCard}>
          <MaterialIcons name="science" size={32} color="#f4511e" />
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Active Brews</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionCard}>
          <MaterialIcons name="add" size={24} color="#f4511e" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Create New Recipe</Text>
            <Text style={styles.actionSubtitle}>Start building your next brew</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <MaterialIcons name="play-arrow" size={24} color="#f4511e" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Start Brew Session</Text>
            <Text style={styles.actionSubtitle}>Begin tracking a new brew</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <MaterialIcons name="public" size={24} color="#f4511e" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Browse Public Recipes</Text>
            <Text style={styles.actionSubtitle}>Discover community favorites</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyState}>
          <MaterialIcons name="local-bar" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No recent activity</Text>
          <Text style={styles.emptySubtext}>Your brewing journey starts here!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 12,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
});