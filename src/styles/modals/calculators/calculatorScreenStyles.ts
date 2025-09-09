import { StyleSheet, Dimensions } from "react-native";

// Safe dimension access for testing environments
const getScreenWidth = () => {
  try {
    return Dimensions.get("window").width;
  } catch {
    // Fallback for testing environments where Dimensions may not be available
    return 375; // Default iPhone width
  }
};

const width = getScreenWidth();

export const calculatorScreenStyles = StyleSheet.create({
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
    marginVertical: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: "center",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  hopScheduleSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  hopList: {
    gap: 12,
  },
  hopCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  hopCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hopInfo: {
    flex: 1,
  },
  hopTime: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  hopName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  hopAmount: {
    fontSize: 14,
  },
  addedIndicator: {
    alignItems: "center",
  },
  addedText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
});
