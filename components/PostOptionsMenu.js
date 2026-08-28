import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

/**
 * The post-card "hidden menu" (3-dot button). Own posts get Edit/Delete;
 * other people's posts get Report/Unfollow/Block. Purely presentational —
 * every action is a callback the caller supplies.
 */
export default function PostOptionsMenu({ visible, onClose, isOwn, authorFirstName, onEdit, onDelete, onBoost, onReport, onUnfollow, onBlock }) {
  function pick(action) {
    onClose();
    action?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {isOwn ? (
            <>
              {onBoost && (
                <TouchableOpacity style={styles.item} onPress={() => pick(onBoost)}>
                  <Ionicons name="megaphone-outline" size={19} color={COLORS.ink} />
                  <Text style={styles.itemText}>Boost this post</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.item} onPress={() => pick(onEdit)}>
                <Ionicons name="create-outline" size={19} color={COLORS.ink} />
                <Text style={styles.itemText}>Edit post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.item} onPress={() => pick(onDelete)}>
                <Ionicons name="trash-outline" size={19} color="#D32F2F" />
                <Text style={[styles.itemText, styles.destructiveText]}>Delete post</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.item} onPress={() => pick(onReport)}>
                <Ionicons name="flag-outline" size={19} color={COLORS.ink} />
                <Text style={styles.itemText}>Report post</Text>
              </TouchableOpacity>
              {onUnfollow && (
                <TouchableOpacity style={styles.item} onPress={() => pick(onUnfollow)}>
                  <Ionicons name="person-remove-outline" size={19} color={COLORS.ink} />
                  <Text style={styles.itemText}>Unfollow {authorFirstName}</Text>
                </TouchableOpacity>
              )}
              {onBlock && (
                <TouchableOpacity style={styles.item} onPress={() => pick(onBlock)}>
                  <Ionicons name="ban-outline" size={19} color="#D32F2F" />
                  <Text style={[styles.itemText, styles.destructiveText]}>Block {authorFirstName}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  card: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 8, paddingBottom: 24 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  itemText: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  destructiveText: { color: "#D32F2F" },
});
