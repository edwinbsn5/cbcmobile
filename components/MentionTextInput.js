import React, { forwardRef, useEffect, useRef, useState } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import client from "../api/client";
import Avatar from "./Avatar";
import { COLORS } from "../theme";

/**
 * Drop-in TextInput with @mention autocomplete — forwards every prop
 * (style, placeholder, multiline, autoFocus, ref, ...) straight to the
 * underlying TextInput, so it's a same-shape swap wherever a composer
 * already uses a plain TextInput (CreatePostScreen, CommentsScreen,
 * PageDetailScreen's inline composer).
 *
 * Tracks the cursor via onSelectionChange, looks at the word immediately
 * before it, and — if that word is "@" + 1-20 partial characters — queries
 * GET /api/search/mentions?types=user for matches. Only users are ever
 * inserted as a live, trackable @mention (see services/mentions.js's own
 * comment on why group/page display names aren't regex round-trippable
 * from plain text) — tapping a suggestion replaces the partial token with
 * "@username " (the exact shape the backend's regex re-extracts on submit).
 */
const MentionTextInput = forwardRef(function MentionTextInput({ value, onChangeText, style, ...rest }, ref) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const cursor = selection.start;
  const uptoCursor = (value || "").slice(0, cursor);
  const match = uptoCursor.match(/(?:^|\s)@([a-zA-Z0-9_]{1,20})$/);
  const activeQuery = match ? match[1] : null;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!activeQuery) {
      setSuggestions([]);
      return undefined;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await client.get("/search/mentions", { params: { q: activeQuery, types: "user" } });
        setSuggestions(data);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [activeQuery]);

  function selectSuggestion(item) {
    const at = uptoCursor.lastIndexOf("@");
    const before = (value || "").slice(0, at);
    const after = (value || "").slice(cursor);
    onChangeText(`${before}@${item.handle} ${after}`);
    setSuggestions([]);
  }

  return (
    <View style={styles.wrapper}>
      <TextInput
        ref={ref}
        style={style}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
        {...rest}
      />
      {activeQuery !== null && (loading || suggestions.length > 0) && (
        <View style={styles.suggestionBox}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.accent} style={{ padding: 10 }} />
          ) : (
            suggestions.map((s) => (
              <TouchableOpacity key={s.id} style={styles.suggestionRow} onPress={() => selectSuggestion(s)}>
                <Avatar uri={s.avatar} name={s.label} style={styles.avatar} />
                <View>
                  <Text style={styles.name}>{s.label}</Text>
                  <Text style={styles.handle}>@{s.handle}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
});

export default MentionTextInput;

const styles = StyleSheet.create({
  // Wraps the TextInput so a floating suggestion box can render below it —
  // flex:1 so this wrapper (not just the TextInput) correctly grows to
  // fill its row-layout parent's remaining space (composerRow/inputRow in
  // CreatePostScreen/CommentsScreen both size their input via flex, not a
  // fixed width). A plain View's default alignItems:'stretch' then makes
  // the TextInput itself fill the wrapper's full width automatically.
  wrapper: { flex: 1 },
  suggestionBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4, maxHeight: 220, overflow: "hidden" },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.bg },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#eee" },
  name: { fontSize: 13.5, fontWeight: "700", color: COLORS.ink },
  handle: { fontSize: 12, color: COLORS.sub },
});
