import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { COLORS } from "../theme";
import { openInAppBrowser } from "../utils/inAppBrowser";

// The "full-bleed hero" link-preview design (Design 1 of the 5 drafts) —
// nested inside PostCard, right where a photo/video would go. The image
// portion bleeds to the true screen edges using the same negative-margin
// trick as PostCard's own `mediaFullBleed` (-22 = the card's own
// marginHorizontal:10 + padding:12 — must stay in sync with PostCard.js if
// that ever changes); the title/description strip stays inset like normal
// card content. Missing image degrades gracefully — the tinted strip alone
// still renders full-width, not a different layout.
export default function LinkPreviewCard({ preview }) {
  if (!preview) return null;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => openInAppBrowser(preview.url)}>
      {!!preview.imageUrl && (
        <View style={styles.mediaFullBleed}>
          <Image source={{ uri: preview.imageUrl }} style={styles.image} contentFit="cover" />
        </View>
      )}
      <View style={styles.body}>
        {!!preview.siteName && <Text style={styles.domain} numberOfLines={1}>{preview.siteName.toUpperCase()}</Text>}
        <Text style={styles.title} numberOfLines={2}>{preview.title}</Text>
        {!!preview.description && (
          <Text style={styles.desc} numberOfLines={2}>{preview.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mediaFullBleed: { marginHorizontal: -22, marginBottom: 8 },
  image: { width: "100%", height: 180, backgroundColor: COLORS.wash },
  body: { backgroundColor: COLORS.wash, borderRadius: 8, padding: 10, marginBottom: 8 },
  domain: { fontSize: 10, fontWeight: "800", color: COLORS.sub, letterSpacing: 0.4 },
  title: { fontSize: 14, fontWeight: "800", color: COLORS.ink, marginTop: 3, lineHeight: 19 },
  desc: { fontSize: 12, color: COLORS.sub, marginTop: 3, lineHeight: 16 },
});
