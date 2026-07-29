import React from "react";
import { Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

// Same token shapes as backend/services/hashtags.js's HASHTAG_RE and
// backend/services/mentions.js's MENTION_RE — kept in sync manually (no
// shared package between mobile/backend in this repo).
const TOKEN_RE = /(#[a-zA-Z0-9_]{2,50}|@[a-zA-Z0-9_]{3,20})/g;

/**
 * Drop-in replacement for a plain <Text>{content}</Text> that makes
 * #hashtags and @mentions tappable — used by PostCard and CommentsScreen's
 * CommentNode so post/comment content always renders identically wherever
 * it's shown. Hashtags navigate straight to HashtagFeed (the tag itself is
 * all a hashtag link ever needs); mentions resolve the tapped username to
 * a user id via GET /api/users/by-username/:username first, since a
 * mention only ever carries a username in plain text, not an id.
 */
export default function LinkifiedText({ text, style }) {
  const navigation = useNavigation();
  if (!text) return null;

  async function openMention(username) {
    try {
      const { data } = await client.get(`/users/by-username/${username}`);
      navigation.navigate("UserProfile", { userId: data.id });
    } catch (e) {
      // Unknown/deleted username typed in old content — tapping it just does nothing.
    }
  }

  const parts = text.split(TOKEN_RE);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (/^#[a-zA-Z0-9_]{2,50}$/.test(part)) {
          return (
            <Text key={i} style={styles.link} onPress={() => navigation.navigate("HashtagFeed", { tag: part.slice(1) })}>
              {part}
            </Text>
          );
        }
        if (/^@[a-zA-Z0-9_]{3,20}$/.test(part)) {
          return (
            <Text key={i} style={styles.link} onPress={() => openMention(part.slice(1))}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: COLORS.accent, fontWeight: "600" },
});
