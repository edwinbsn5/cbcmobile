import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

export default function TicketDetailScreen({ route, navigation }) {
  const { ticketId } = route.params;
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await client.get(`/support/tickets/${ticketId}`);
    setTicket(data);
    navigation.setOptions({ title: data.subject });
  }, [ticketId, navigation]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  function scrollToEnd() {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleSend() {
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    setSending(true);
    try {
      const { data } = await client.post(`/support/tickets/${ticketId}/messages`, { body });
      setTicket((prev) => ({ ...prev, messages: [...prev.messages, data] }));
      scrollToEnd();
    } catch (e) {
      Alert.alert("Message not sent", e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    Alert.alert("Mark as resolved?", "You can't reply to this ticket after closing it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close ticket",
        onPress: async () => {
          setClosing(true);
          try {
            const { data } = await client.post(`/support/tickets/${ticketId}/close`);
            setTicket((prev) => ({ ...prev, status: data.status, closedAt: data.closedAt }));
          } catch (e) {
            Alert.alert("Couldn't close ticket", e.response?.data?.error || e.message);
          } finally {
            setClosing(false);
          }
        },
      },
    ]);
  }

  if (loading || !ticket) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const isOpen = ticket.status === "open";

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        ref={listRef}
        data={ticket.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={scrollToEnd}
        ListHeaderComponent={<Text style={styles.category}>{ticket.category}</Text>}
        renderItem={({ item }) => {
          const isMine = !item.isAdmin && item.senderId === user?.id;
          return (
            <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {item.isAdmin && <Text style={styles.senderLabel}>Support Team</Text>}
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />

      {isOpen ? (
        <View style={styles.composerWrap}>
          <View style={styles.composerRow}>
            <TextInput
              style={styles.composerInput}
              value={text}
              onChangeText={setText}
              placeholder="Write a reply..."
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
              {sending ? <ActivityIndicator color={COLORS.accentInk} size="small" /> : <Text style={styles.sendButtonText}>Send</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} disabled={closing}>
            <Text style={styles.closeButtonText}>{closing ? "Closing..." : "Mark as resolved & close ticket"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBar}>
          <Text style={styles.closedBarText}>This ticket is closed</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  category: { fontSize: 12, fontWeight: "700", color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 },
  bubbleRow: { marginBottom: 10, flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: COLORS.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  senderLabel: { fontSize: 11, fontWeight: "700", color: COLORS.accent, marginBottom: 3 },
  bubbleText: { fontSize: 14.5, color: COLORS.ink, lineHeight: 20 },
  bubbleTextMine: { color: COLORS.accentInk },
  composerWrap: { borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface, padding: 10 },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  composerInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100, fontSize: 14.5 },
  sendButton: { backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  closeButton: { alignItems: "center", marginTop: 10, paddingVertical: 6 },
  closeButtonText: { color: COLORS.sub, fontWeight: "700", fontSize: 12.5 },
  closedBar: { borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface, padding: 14, alignItems: "center" },
  closedBarText: { color: COLORS.sub, fontWeight: "700", fontSize: 13 },
});
