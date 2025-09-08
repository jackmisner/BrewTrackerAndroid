import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const boilTimerStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  timerDisplay: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  timerHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  timerStyle: {
    fontSize: 14,
    marginTop: 4,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 16,
  },
  progressBar: {
    width: width - 80,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
  },
  timerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  timerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
