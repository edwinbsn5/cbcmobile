import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { connectSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

export default function ChatScreen({ route, navigation }) {
  const { conversationId, otherUser } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  // Anti-spam: at most one unanswered message per side, enforced for real on
  // the server (POST /inbox/:id/messages 429s) — this is just the mirror of
  // that same rule so the composer reflects it instead of letting the user
  // hit the error. Recomputed from whatever's already loaded, so it flips
  // back the instant the other person's reply arrives over the socket.
  const lastMessage = messages[messages.length - 1];
  const waitingForReply = !!lastMessage && lastMessage.senderId === user?.id;

  function handleBlock() {
    Alert.alert(
      `Block ${otherUser?.name}?`,
      "They won't be able to follow or message you, and neither of you will see each other's content.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await client.post(`/users/${otherUser.id}/block`);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Couldn't block", e.response?.data?.error || e.message);
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    navigation.setOptions({
      title: otherUser?.name || "Chat",
      headerRight: () => (
        <TouchableOpacity onPress={handleBlock} style={{ marginRight: 14 }}>
          <Ionicons name="ban-outline" size={22} color="#D32F2F" />
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, otherUser]);

  useEffect(() => {
    let closed = false;

    client.get(`/inbox/${conversationId}/messages`).then((r) => {
      if (!closed) setMessages(r.data);
    }).finally(() => setLoading(false));

    connectSocket().then((socket) => {
      if (closed) {
        socket.close();
        return;
      }
      socketRef.current = socket;
      socket.on("connect_error", (err) => {
        Alert.alert("Connection issue", "Live updates aren't available right now: " + err.message);
      });
      socket.on("message:new", (message) => {
        if (message.conversationId !== conversationId) return;
        setMessages((prev) => [...prev, message]);
      });
    });

    return () => {
      closed = true;
      socketRef.current?.close();
    };
  }, [conversationId]);

  function scrollToEnd() {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleSendText() {
    if (!text.trim()) return;
    const body = { type: "text", text: text.trim() };
    setText("");
    setSending(true);
    try {
      const { data } = await client.post(`/inbox/${conversationId}/messages`, body);
      setMessages((prev) => [...prev, data]);
      scrollToEnd();
    } catch (e) {
      Alert.alert("Message not sent", e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleAttach() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to share media");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const messageType = asset.type === "video" ? "video" : "image";
    const mimeType = asset.mimeType || (messageType === "video" ? "video/mp4" : "image/jpeg");
    const filename = asset.fileName || `upload.${mimeType.split("/")[1]}`;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: filename, type: mimeType });
      const { data: uploaded } = await client.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      const { data: message } = await client.post(`/inbox/${conversationId}/messages`, {
        type: messageType,
        mediaUrl: uploaded.url,
      });
      setMessages((prev) => [...prev, message]);
      scrollToEnd();
    } catch (e) {
      Alert.alert("Upload failed", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 10 }}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {item.type === "text" && (
                  <Text style={mine ? styles.textMine : styles.textTheirs}>{item.text}</Text>
                )}
                {item.type === "story_reply" && (
                  <View>
                    <View style={styles.storyReplyQuote}>
                      {item.mediaUrl ? (
                        <Image source={{ uri: item.mediaUrl }} style={styles.storyReplyThumb} resizeMode="cover" />
                      ) : (
                        // A reply to a colored TEXT story has no media file
                        // to snapshot (mediaUrl is '' for those) — a plain
                        // "Aa" placeholder beats a broken image icon.
                        <View style={[styles.storyReplyThumb, styles.storyReplyThumbText]}>
                          <Text style={styles.storyReplyThumbTextGlyph}>Aa</Text>
                        </View>
                      )}
                      <Text style={[styles.storyReplyLabel, mine ? styles.textMine : styles.textTheirs]}>
                        {mine ? "Replied to their story" : "Replied to your story"}
                      </Text>
                    </View>
                    <Text style={mine ? styles.textMine : styles.textTheirs}>{item.text}</Text>
                  </View>
                )}
                {item.type === "image" && (
                  <Image source={{ uri: item.mediaUrl }} style={styles.media} resizeMode="cover" />
                )}
                {item.type === "video" && (
                  <Video
                    source={{ uri: item.mediaUrl }}
                    style={styles.media}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                  />
                )}
              </View>
            </View>
          );
        }}
      />

      {waitingForReply && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingBannerText}>Waiting for {otherUser?.name} to reply before you can send another message</Text>
        </View>
      )}
      <View style={styles.composer}>
        <TouchableOpacity style={styles.attachButton} onPress={handleAttach} disabled={uploading || waitingForReply}>
          {uploading ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={styles.attachButtonText}>📎</Text>}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={waitingForReply ? "Waiting for a reply..." : "Message..."}
          multiline
          editable={!waitingForReply}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendText} disabled={sending || !text.trim() || waitingForReply}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 14, padding: 10 },
  bubbleMine: { backgroundColor: COLORS.accent },
  bubbleTheirs: { backgroundColor: COLORS.surface },
  textMine: { color: COLORS.accentInk, fontSize: 15 },
  textTheirs: { color: COLORS.ink, fontSize: 15 },
  media: { width: 200, height: 200, borderRadius: 10, backgroundColor: "#000" },
  storyReplyQuote: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)" },
  storyReplyThumb: { width: 30, height: 42, borderRadius: 6, backgroundColor: "#000" },
  storyReplyThumbText: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.accent },
  storyReplyThumbTextGlyph: { color: COLORS.accentInk, fontSize: 11, fontWeight: "800" },
  storyReplyLabel: { fontSize: 12, fontStyle: "italic" },
  waitingBanner: { backgroundColor: "#FFF3CD", paddingVertical: 8, paddingHorizontal: 14 },
  waitingBannerText: { color: "#8A6D00", fontSize: 12.5, textAlign: "center" },
  composer: { flexDirection: "row", alignItems: "flex-end", backgroundColor: COLORS.surface, padding: 8, borderTopWidth: 1, borderTopColor: "#EEE" },
  attachButton: { padding: 8, marginRight: 4 },
  attachButtonText: { fontSize: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100, color: COLORS.ink },
  sendButton: { marginLeft: 8, backgroundColor: COLORS.accent, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  sendButtonText: { color: COLORS.accentInk, fontWeight: "700" },
});
