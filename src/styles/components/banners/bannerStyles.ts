/**
 * Shared Banner Styles
 *
 * Common styling for all banner components (Network, StaleData, Auth, etc.)
 * Provides consistent visual design across different banner types.
 */

import { StyleSheet } from "react-native";

/**
 * Base banner styles shared across all banner types
 */
export const bannerStyles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  subText: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
});

/**
 * Compact indicator styles for status bar usage
 */
export const indicatorStyles = StyleSheet.create({
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  indicatorText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
});

export default bannerStyles;
