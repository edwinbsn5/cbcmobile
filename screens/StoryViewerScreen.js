import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, Image, TextInput, TouchableOpacity, Pressable, StyleSheet,
  Alert, Keyboard,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

const IMAGE_DURATION_MS = 5000;
const TICK_MS = 50;
const REACTIONS = [
  { key: "like", emoji: "👍" },
  { key: "love", emoji: "❤️" },
  { key: "haha", emoji: "😆" },
  { key: "wow", emoji: "😮" },
  { key: "sad", emoji: "😢" },
  { key: "angry", emoji: "😡" },
];

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function StoryViewerScreen({ route, navigation }) {
  const { storyGroups, startGroupId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState(storyGroups);
  const [groupIndex, setGroupIndex] = useState(Math.max(0, storyGroups.findIndex((g) => g.author.id === startGroupId)));
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pausedRef = useRef(false);
  const viewedRef = useRef(new Set());
  const videoRef = useRef(null);

  // Same manual keyboard-height tracking as ChatScreen.js — see its comment
  // for why KeyboardAvoidingView's automatic behavior isn't reliable here.
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates?.height || 0));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwn = story?.userId === user?.id;
  const myReaction = story?.reactions?.[user?.id];

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  function updateStory(storyId, patch) {
    setGroups((prev) =>
      prev.map((g) => ({ ...g, stories: g.stories.map((s) => (s.id === storyId ? { ...s, ...patch } : s)) }))
    );
  }

  function goNext() {
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      navigation.goBack();
    }
  }

  function goPrev() {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }

  // Reset progress + mark viewed whenever the displayed story changes.
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setPickerOpen(false);
    setReplyText("");
    if (!isOwn && !viewedRef.current.has(story.id)) {
      viewedRef.current.add(story.id);
      client.post(`/stories/${story.id}/view`).catch(() => {});
    }
  }, [story?.id]);

  // Fixed-duration timer for images; video drives its own progress via onPlaybackStatusUpdate.
  useEffect(() => {
    if (!story || story.type === "video") return;
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      setProgress((p) => {
        const next = p + TICK_MS / IMAGE_DURATION_MS;
        if (next >= 1) {
          clearInterval(interval);
          goNext();
          return 1;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [story?.id]);

  async function handleReact(reaction) {
    setPickerOpen(false);
    try {
      const { data } = await client.post(`/stories/${story.id}/react`, { reaction });
      updateStory(story.id, { reactions: data.reactions });
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { data } = await client.post(`/stories/${story.id}/reply`, { text: replyText.trim() });
      setReplyText("");
      navigation.navigate("Chat", { conversationId: data.conversationId, otherUser: story.author });
    } catch (e) {
      Alert.alert("Couldn't send reply", e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleReshare() {
    try {
      await client.post(`/stories/${story.id}/reshare`);
      Alert.alert("Reshared", "This story is now on your own story for your followers to see.");
    } catch (e) {
      Alert.alert("Couldn't reshare", e.response?.data?.error || e.message);
    }
  }

  // Removes the just-deleted story from local state and lands the viewer on
  // whatever now occupies its old position — the next story in this group if
  // one shifted into place, otherwise the previous one, otherwise the next
  // author's group, otherwise closes the viewer entirely.
  function removeStoryFromState(storyId) {
    const authorId = group.author.id;
    const next = groups
      .map((g) => (g.author.id === authorId ? { ...g, stories: g.stories.filter((s) => s.id !== storyId) } : g))
      .filter((g) => g.stories.length > 0);

    if (next.length === 0) {
      navigation.goBack();
      return;
    }
    const newGroupIndex = Math.min(groupIndex, next.length - 1);
    const newStoryIndex = Math.min(storyIndex, next[newGroupIndex].stories.length - 1);
    setGroups(next);
    setGroupIndex(newGroupIndex);
    setStoryIndex(newStoryIndex);
  }

  function handleDelete() {
    Alert.alert("Delete this story?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(`/stories/${story.id}`);
            removeStoryFromState(story.id);
          } catch (e) {
            Alert.alert("Couldn't delete", e.response?.data?.error || e.message);
          }
        },
      },
    ]);
  }

  if (!story) return null;

  return (
    <View style={styles.container}>
      {story.type === "video" ? (
        <Video
          ref={videoRef}
          source={{ uri: story.mediaUrl }}
          style={styles.media}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={!paused}
          usePoster={!!story.thumbnailUrl}
          posterSource={story.thumbnailUrl ? { uri: story.thumbnailUrl } : undefined}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded || !status.durationMillis) return;
            setProgress(status.positionMillis / status.durationMillis);
            if (status.didJustFinish) goNext();
          }}
        />
      ) : story.type === "text" ? (
        <View style={[styles.media, styles.textStoryBox, { backgroundColor: story.bgColor || COLORS.accent }]}>
          <Text style={[styles.textStoryContent, { color: story.textColor || "#FFFFFF", textAlign: story.textAlign || "center" }]}>
            {story.content}
          </Text>
        </View>
      ) : (
        <Image source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="contain" />
      )}

      <View style={[styles.progressRow, { top: insets.top + 10 }]}>
        {group.stories.map((s, i) => (
          <View key={s.id} style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(i < storyIndex ? 1 : i === storyIndex ? progress : 0) * 100}%` },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={[styles.headerRow, { top: insets.top + 22 }]}>
        <Avatar uri={group.author.avatar} name={group.author.name} style={styles.headerAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{group.author.name}</Text>
          <Text style={styles.headerMeta}>
            {timeAgo(story.createdAt)} ago{story.resharedFrom ? ` · 🔁 from ${story.resharedFrom.name}` : ""}
          </Text>
        </View>
        {isOwn && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <Pressable
        style={[styles.tapZoneLeft, { top: insets.top + 100, bottom: insets.bottom + 90 }]}
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        onPress={goPrev}
      />
      <Pressable
        style={[styles.tapZoneRight, { top: insets.top + 100, bottom: insets.bottom + 90 }]}
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        onPress={goNext}
      />

      <View
        style={[styles.bottomArea, { paddingBottom: insets.bottom + 16, bottom: keyboardHeight }]}
      >
        {isOwn ? (
          <TouchableOpacity style={styles.statsBar} onPress={() => navigation.navigate("StoryInsights", { storyId: story.id })}>
            <Ionicons name="stats-chart-outline" size={16} color="#fff" />
            <Text style={styles.statsBarText}>
              View who's seen, reacted to, and reshared this story
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.replyRow}>
            {pickerOpen && (
              <View style={styles.picker}>
                {REACTIONS.map((r) => (
                  <TouchableOpacity key={r.key} onPress={() => handleReact(r.key)} style={styles.pickerItem}>
                    <Text style={styles.pickerEmoji}>{r.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder={`Reply to ${group.author.name.split(" ")[0]}...`}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={replyText}
              onChangeText={setReplyText}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            />
            <TouchableOpacity
              style={styles.reactButton}
              onPress={() => (myReaction ? handleReact(myReaction) : setPickerOpen((o) => !o))}
              onLongPress={() => setPickerOpen(true)}
            >
              <Text style={styles.reactEmoji}>{myReaction ? REACTIONS.find((r) => r.key === myReaction)?.emoji : "🤍"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reshareButton} onPress={handleReshare}>
              <Ionicons name="repeat-outline" size={20} color="#fff" />
            </TouchableOpacity>
            {!!replyText.trim() && (
              <TouchableOpacity style={styles.sendButton} onPress={handleReply} disabled={sending}>
                <Ionicons name="send" size={16} color={COLORS.accentInk} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  media: { width: "100%", height: "100%" },
  textStoryBox: { justifyContent: "center", paddingHorizontal: 28 },
  textStoryContent: { fontSize: 30, fontWeight: "700", lineHeight: 40 },
  progressRow: { position: "absolute", left: 10, right: 10, flexDirection: "row", gap: 4 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#fff" },
  headerRow: { position: "absolute", left: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  headerName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  headerMeta: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 1 },
  deleteButton: { marginRight: 4 },
  tapZoneLeft: { position: "absolute", left: 0, width: "30%" },
  tapZoneRight: { position: "absolute", right: 0, width: "70%" },
  bottomArea: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 10 },
  replyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 16, color: "#fff",
  },
  reactButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  reactEmoji: { fontSize: 22 },
  reshareButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  picker: {
    position: "absolute", bottom: 50, left: 0, flexDirection: "row", backgroundColor: "rgba(20,20,20,0.9)",
    borderRadius: 24, paddingHorizontal: 8, paddingVertical: 6,
  },
  pickerItem: { paddingHorizontal: 5 },
  pickerEmoji: { fontSize: 26 },
  statsBar: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12,
  },
  statsBarText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
});
