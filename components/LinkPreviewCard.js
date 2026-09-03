import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { COLORS } from "../theme";
import { openInAppBrowser } from "../utils/inAppBrowser";

// "Compact Row" link-preview design — a small square thumbnail with
// domain/title/description stacked beside it in one bordered band, instead
// of the old full-bleed hero image. Roughly half the vertical space, so a
// feed with several link posts back to back doesn't turn into a wall of
// photos. Missing image degrades gracefully — the text column just takes
// the full width instead of a placeholder box.
export default function LinkPreviewCard({ preview }) {
  if (!preview) return null;

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={() => openInAppBrowser(preview.url)}>
      {!!preview.imageUrl && <Image source={{ uri: preview.imageUrl }} style={styles.thumb} contentFit="cover" />}
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
  card: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 8, marginBottom: 8 },
  thumb: { width: 58, height: 58, borderRadius: 7, backgroundColor: COLORS.wash, flexShrink: 0 },
  body: { flex: 1 },
  domain: { fontSize: 9, fontWeight: "800", color: COLORS.sub, letterSpacing: 0.4 },
  title: { fontSize: 12.5, fontWeight: "700", color: COLORS.ink, marginTop: 2, lineHeight: 16 },
  desc: { fontSize: 10.5, color: COLORS.sub, marginTop: 2, lineHeight: 14 },
});
