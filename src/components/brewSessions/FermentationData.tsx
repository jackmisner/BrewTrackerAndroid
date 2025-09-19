import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FermentationEntry } from "@/src/types";
import { useTheme } from "@contexts/ThemeContext";
import { useContextMenu } from "@src/components/ui/ContextMenu/BaseContextMenu";
import { FermentationEntryContextMenu } from "./FermentationEntryContextMenu";

interface FermentationDataProps {
  fermentationData: FermentationEntry[];
  expectedFG: number | undefined;
  actualOG: number | undefined;
  temperatureUnit: string | undefined;
  brewSessionId?: string;
  brewSessionUserId?: string;
}

export const FermentationData: React.FC<FermentationDataProps> = ({
  fermentationData,
  expectedFG: _expectedFG,
  actualOG: _actualOG,
  temperatureUnit,
  brewSessionId,
  brewSessionUserId,
}) => {
  const theme = useTheme();
  const {
    visible: contextMenuVisible,
    selectedItem: selectedEntry,
    position: contextMenuPosition,
    showMenu: showContextMenu,
    hideMenu: hideContextMenu,
  } = useContextMenu<{
    entry: FermentationEntry;
    index: number;
    brewSessionId: string;
  }>();

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

  const formatGravity = (gravity: number | undefined) => {
    if (gravity == null) {
      return "—";
    }
    return gravity.toFixed(3);
  };

  const formatTemperature = (temp: number | undefined) => {
    if (temp == null) {
      return "—";
    }
    return `${temp}°${temperatureUnit || "F"}`;
  };

  const handleLongPress = (
    entry: FermentationEntry,
    index: number,
    event: any
  ) => {
    const { pageX, pageY } = event.nativeEvent;
    showContextMenu(
      { entry, index, brewSessionId: brewSessionId || "" },
      { x: pageX, y: pageY }
    );
  };

  const handleAddEntry = () => {
    if (brewSessionId) {
      router.push(
        `/(modals)/(brewSessions)/addFermentationEntry?brewSessionId=${brewSessionId}`
      );
    }
  };

  const renderEntry = ({
    item,
    index,
  }: {
    item: FermentationEntry;
    index: number;
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.entryRow,
        {
          backgroundColor: pressed
            ? theme.colors.backgroundSecondary
            : theme.colors.background,
        },
      ]}
      onLongPress={event => handleLongPress(item, index, event)}
      delayLongPress={500}
    >
      <View style={styles.entryCell}>
        <Text style={[styles.entryText, { color: theme.colors.text }]}>
          {formatDate(item.entry_date || item.date)}
        </Text>
      </View>
      <View style={styles.entryCell}>
        <Text style={[styles.entryText, { color: theme.colors.text }]}>
          {formatGravity(item.gravity)}
        </Text>
      </View>
      <View style={styles.entryCell}>
        <Text style={[styles.entryText, { color: theme.colors.text }]}>
          {formatTemperature(item.temperature)}
        </Text>
      </View>
      <View style={styles.entryCell}>
        <Text
          style={[styles.entryText, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {item.ph != null ? item.ph.toFixed(2) : "—"}
        </Text>
      </View>
    </Pressable>
  );

  const renderHeader = () => (
    <View
      style={[
        styles.headerRow,
        { backgroundColor: theme.colors.backgroundSecondary },
      ]}
    >
      <View style={styles.headerCell}>
        <Text
          style={[styles.headerText, { color: theme.colors.textSecondary }]}
        >
          Date
        </Text>
      </View>
      <View style={styles.headerCell}>
        <Text
          style={[styles.headerText, { color: theme.colors.textSecondary }]}
        >
          Gravity
        </Text>
      </View>
      <View style={styles.headerCell}>
        <Text
          style={[styles.headerText, { color: theme.colors.textSecondary }]}
        >
          Temp
        </Text>
      </View>
      <View style={styles.headerCell}>
        <Text
          style={[styles.headerText, { color: theme.colors.textSecondary }]}
        >
          pH
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name="science"
        size={48}
        color={theme.colors.textSecondary}
      />
      <Text
        style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}
      >
        No fermentation entries yet
      </Text>
      <Text
        style={[
          styles.emptyStateSubtext,
          { color: theme.colors.textSecondary },
        ]}
      >
        Add your first reading to track fermentation progress
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {fermentationData.length > 0 ? (
        <>
          {renderHeader()}
          <FlatList
            data={fermentationData}
            keyExtractor={(item, index) =>
              `${item.entry_date || item.date || "unknown"}-${index}`
            }
            renderItem={renderEntry}
            scrollEnabled={false}
            style={styles.list}
          />
        </>
      ) : (
        renderEmptyState()
      )}

      {/* Add Entry Button */}
      {brewSessionId ? (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleAddEntry}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="add"
            size={20}
            color={theme.colors.primaryText}
          />
          <Text
            style={[styles.addButtonText, { color: theme.colors.primaryText }]}
          >
            Log Entry
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Context Menu */}
      <FermentationEntryContextMenu
        visible={contextMenuVisible}
        entry={selectedEntry?.entry || null}
        entryIndex={selectedEntry?.index}
        brewSessionId={selectedEntry?.brewSessionId || brewSessionId}
        brewSessionUserId={brewSessionUserId}
        onClose={hideContextMenu}
        position={contextMenuPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  list: {
    flexGrow: 0,
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  entryRow: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    minHeight: 48,
  },
  entryCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  entryText: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
    opacity: 0.7,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    minHeight: 48,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default FermentationData;
