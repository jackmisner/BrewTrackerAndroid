import React from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ApiService from "@services/api/apiService";
import { FermentationEntry } from "@src/types";
import {
  BaseContextMenu,
  BaseAction,
} from "@src/components/ui/ContextMenu/BaseContextMenu";

interface FermentationEntryContextMenuProps {
  visible: boolean;
  entry: FermentationEntry | null;
  entryIndex: number | undefined;
  brewSessionId: string | undefined;
  onClose: () => void;
  position?: { x: number; y: number };
}

export const FermentationEntryContextMenu: React.FC<
  FermentationEntryContextMenuProps
> = ({ visible, entry, entryIndex, brewSessionId, onClose, position }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (contextData: {
      brewSessionId: string;
      index: number;
      entry: FermentationEntry;
    }) => {
      const { brewSessionId: sessionId, index } = contextData;
      return ApiService.brewSessions.deleteFermentationEntry(sessionId, index);
    },
    onSuccess: (_, contextData) => {
      queryClient.invalidateQueries({
        queryKey: ["brewSession", contextData.brewSessionId],
      });
    },
    onError: error => {
      console.error("Failed to delete fermentation entry:", error);
      Alert.alert(
        "Delete Failed",
        "Failed to delete fermentation entry. Please try again.",
        [{ text: "OK" }]
      );
    },
  });

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return "Unknown Date";
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return date.toLocaleDateString();
  };

  const handleEdit = (contextData: {
    entry: FermentationEntry;
    index: number;
    brewSessionId: string;
  }) => {
    const { brewSessionId: sessionId, index } = contextData;
    if (!sessionId || index === undefined) {
      return;
    }
    router.push(
      `/(modals)/(brewSessions)/editFermentationEntry?brewSessionId=${sessionId}&entryIndex=${index}`
    );
  };

  const handleDelete = (contextData: {
    entry: FermentationEntry;
    index: number;
    brewSessionId: string;
  }) => {
    const { brewSessionId: sessionId, index, entry } = contextData;
    if (!sessionId || index === undefined) {
      Alert.alert(
        "Error",
        "Cannot delete entry: Missing required information",
        [{ text: "OK" }]
      );
      return;
    }

    deleteMutation.mutate({ brewSessionId: sessionId, index, entry });
  };

  const handleViewDetails = (contextData: {
    entry: FermentationEntry;
    index: number;
    brewSessionId: string;
  }) => {
    // For now, just show an alert with entry details
    // In the future, this could open a detailed view modal
    const { entry } = contextData;
    if (!entry) {
      return;
    }

    const details = [
      `Date: ${formatDate(entry.entry_date || entry.date)}`,
      `Gravity: ${entry.gravity ? entry.gravity.toFixed(3) : "N/A"}`,
      `Temperature: ${entry.temperature ? `${entry.temperature}°` : "N/A"}`,
      `pH: ${entry.ph ? entry.ph.toFixed(2) : "N/A"}`,
      entry.notes ? `Notes: ${entry.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    Alert.alert("Entry Details", details, [{ text: "OK" }]);
  };

  const actions: BaseAction<{
    entry: FermentationEntry;
    index: number;
    brewSessionId: string;
  }>[] = [
    {
      id: "view",
      title: "View Details",
      icon: "visibility",
      onPress: handleViewDetails,
    },
    {
      id: "edit",
      title: "Edit Entry",
      icon: "edit",
      onPress: handleEdit,
      disabled: contextData =>
        !contextData.brewSessionId || contextData.index === undefined,
    },
    {
      id: "delete",
      title: "Delete Entry",
      icon: "delete",
      onPress: handleDelete,
      destructive: true,
      disabled: contextData =>
        !contextData.brewSessionId || contextData.index === undefined,
    },
  ];

  if (!entry || entryIndex === undefined || !brewSessionId) {
    return null;
  }

  const contextData = { entry, index: entryIndex, brewSessionId };

  return (
    <BaseContextMenu
      visible={visible}
      item={contextData}
      actions={actions}
      onClose={onClose}
      position={position}
      title="Fermentation Entry"
      subtitle={formatDate(entry.entry_date || entry.date)}
    />
  );
};
