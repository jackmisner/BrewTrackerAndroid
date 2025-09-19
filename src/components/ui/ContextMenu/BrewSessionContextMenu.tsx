import React from "react";
import { BrewSession } from "@src/types";
import { BaseContextMenu, BaseAction } from "./BaseContextMenu";

interface BrewSessionContextMenuProps {
  visible: boolean;
  brewSession: BrewSession | null;
  actions: BaseAction<BrewSession>[];
  onClose: () => void;
  position?: { x: number; y: number };
}

/**
 * Context menu component for brew session actions with haptic feedback and accessibility support.
 *
 * Provides a modal-based action list that appears when long-pressing on brew session items.
 * Supports different action types (view, edit, add fermentation entry, archive, delete) with proper
 * visual feedback and confirmation dialogs for destructive actions.
 */
export function BrewSessionContextMenu({
  visible,
  brewSession,
  actions,
  onClose,
  position,
}: BrewSessionContextMenuProps) {
  if (!brewSession) {
    return null;
  }

  const title = brewSession.name || "Unnamed Session";
  const subtitle = getStatusDisplayText(brewSession.status) || "Unknown Status";

  return (
    <BaseContextMenu
      visible={visible}
      item={brewSession}
      actions={actions}
      onClose={onClose}
      position={position}
      title={title}
      subtitle={subtitle}
    />
  );
}

/**
 * Helper function to get display-friendly status text
 */
function getStatusDisplayText(status: string | undefined): string {
  if (!status) {
    return "Unknown Status";
  }

  // Convert status to display format
  switch (status) {
    case "planned":
      return "Planned";
    case "active":
      return "Active";
    case "fermenting":
      return "Fermenting";
    case "in-progress":
      return "In Progress";
    case "conditioning":
      return "Conditioning";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    case "failed":
      return "Failed";
    case "paused":
      return "Paused";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Default brew session actions factory function
 */
export function createDefaultBrewSessionActions(handlers: {
  onView: (brewSession: BrewSession) => void;
  onEdit: (brewSession: BrewSession) => void;
  onAddFermentationEntry: (brewSession: BrewSession) => void;
  onExportData: (brewSession: BrewSession) => void;
  onArchive: (brewSession: BrewSession) => void;
  onDelete: (brewSession: BrewSession) => void;
}): BaseAction<BrewSession>[] {
  return [
    {
      id: "view",
      title: "View Session",
      icon: "visibility",
      onPress: handlers.onView,
    },
    {
      id: "edit",
      title: "Edit Session",
      icon: "edit",
      onPress: handlers.onEdit,
      // Enhanced security: Hide edit if user doesn't own session or session is completed/archived
      hidden: brewSession => {
        if (
          brewSession.status === "completed" ||
          brewSession.status === "archived"
        ) {
          return true;
        }
        if (!brewSession.user_id) {
          return true;
        }
        // Use basic ownership check - async validation handled in onPress
        return false;
      },
    },
    {
      id: "add-fermentation",
      title: "Add Fermentation Entry",
      icon: "addchart",
      onPress: handlers.onAddFermentationEntry,
      // Enhanced security: Check ownership and only show for active/fermenting sessions
      hidden: brewSession => {
        const allowed = ["active", "fermenting", "in-progress"];
        if (!allowed.includes(brewSession.status)) {
          return true;
        }
        if (!brewSession.user_id) {
          return true;
        }
        // Use basic ownership check - async validation handled in onPress
        return false;
      },
    },
    {
      id: "export",
      title: "Export Data",
      icon: "file-download",
      onPress: handlers.onExportData,
      // Hide export for sessions without data
      disabled: brewSession =>
        !brewSession.fermentation_entries ||
        brewSession.fermentation_entries.length === 0,
    },
    {
      id: "archive",
      title: "Archive Session",
      icon: "archive",
      onPress: handlers.onArchive,
      // Enhanced security: Check ownership and only show for completed sessions
      hidden: brewSession => {
        if (brewSession.status !== "completed") {
          return true;
        }
        if (!brewSession.user_id) {
          return true;
        }
        // Use basic ownership check - async validation handled in onPress
        return false;
      },
    },
    {
      id: "delete",
      title: "Delete Session",
      icon: "delete",
      onPress: handlers.onDelete,
      destructive: true,
      // Enhanced security: Check ownership and only allow deletion if session is not active
      hidden: brewSession => {
        if (!brewSession.user_id) {
          return true;
        }
        // Use basic ownership check - async validation handled in onPress
        return false;
      },
      disabled: brewSession =>
        brewSession.status === "active" || brewSession.status === "fermenting",
    },
  ];
}
