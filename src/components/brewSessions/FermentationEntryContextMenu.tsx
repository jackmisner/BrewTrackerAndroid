import React, { useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useBrewSessions } from "@src/hooks/offlineV2";
import { FermentationEntry } from "@src/types";
import { useUserValidation } from "@utils/userValidation";
import {
  BaseContextMenu,
  BaseAction,
} from "@src/components/ui/ContextMenu/BaseContextMenu";

interface FermentationEntryContextMenuProps {
  visible: boolean;
  entry: FermentationEntry | null;
  entryIndex: number | undefined;
  brewSessionId: string | undefined;
  brewSessionUserId?: string;
  onClose: () => void;
  position?: { x: number; y: number };
}

export const FermentationEntryContextMenu: React.FC<
  FermentationEntryContextMenuProps
> = ({
  visible,
  entry,
  entryIndex,
  brewSessionId,
  brewSessionUserId,
  onClose,
  position,
}) => {
  const brewSessionsHook = useBrewSessions();
  const userValidation = useUserValidation();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEdit = async (contextData: {
    entry: FermentationEntry;
    index: number;
    brewSessionId: string;
  }) => {
    const { brewSessionId: sessionId, index } = contextData;
    if (!sessionId || index === undefined) {
      return;
    }

    // Validate user permissions for fermentation entry editing
    if (brewSessionUserId) {
      try {
        const canModify = await userValidation.canUserModifyResource({
          user_id: brewSessionUserId,
        });

        if (!canModify) {
          Alert.alert(
            "Access Denied",
            "You don't have permission to edit fermentation entries for this brew session"
          );
          return;
        }
      } catch (error) {
        console.error(
          "❌ User validation error during fermentation entry edit:",
          error
        );
        Alert.alert(
          "Validation Error",
          "Unable to verify permissions. Please try again."
        );
        return;
      }
    }

    router.push(
      `/(modals)/(brewSessions)/editFermentationEntry?brewSessionId=${sessionId}&entryIndex=${index}`
    );
  };

  const handleDelete = async (contextData: {
    entry: FermentationEntry;
    index: number;
    brewSessionId: string;
  }) => {
    const { brewSessionId: sessionId, index } = contextData;
    if (!sessionId || index === undefined) {
      Alert.alert(
        "Error",
        "Cannot delete entry: Missing required information",
        [{ text: "OK" }]
      );
      return;
    }

    // Block re-entrancy
    if (isDeleting) {
      return;
    }

    // Validate user permissions for fermentation entry deletion
    if (brewSessionUserId) {
      try {
        const canModify = await userValidation.canUserModifyResource({
          user_id: brewSessionUserId,
        });

        if (!canModify) {
          Alert.alert(
            "Access Denied",
            "You don't have permission to delete fermentation entries for this brew session"
          );
          return;
        }
      } catch (error) {
        console.error(
          "❌ User validation error during fermentation entry deletion:",
          error
        );
        Alert.alert(
          "Validation Error",
          "Unable to verify permissions. Please try again."
        );
        return;
      }
    }

    try {
      setIsDeleting(true);
      await brewSessionsHook.deleteFermentationEntry!(sessionId, index);
      onClose();
    } catch (error) {
      console.error("Failed to delete fermentation entry:", error);
      Alert.alert(
        "Delete Failed",
        "Failed to delete fermentation entry. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsDeleting(false);
    }
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
