import { StyleSheet } from "react-native";

export const fermentationChartStyles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    minWidth: 32,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    marginBottom: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  stat: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chartContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    paddingRight: 20, // Extra padding on right for secondary Y-axis
    overflow: "visible", // Allow secondary axis to be visible
    alignItems: "center", // Center chart horizontally
  },
  chartSection: {
    marginBottom: 20,
    paddingHorizontal: 8, // Add horizontal padding to prevent title truncation
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12, // Increase bottom margin
    textAlign: "center",
    paddingHorizontal: 16, // Add padding to prevent text truncation
    lineHeight: 18, // Ensure proper line height
  },
  chart: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4, // Add small top margin for better spacing
    overflow: "visible", // Allow secondary axis to be visible
    paddingRight: 15, // Extra padding for secondary axis labels
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal styles for data point details
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: "90%",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalCloseButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
