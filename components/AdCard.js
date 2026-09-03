import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { openInAppBrowser } from "../utils/inAppBrowser";
import PostCard from "./PostCard";
import { COLORS } from "../theme";

// Renders an admin-created sponsored ad or a user-paid boosted post — both
// arrive here already reshaped into the same {advertiser, headline,
// imageUrl, cta, targetUrl} shape (see services/adInterleave.js). Real
// Google ads never reach this component — FeedScreen.js intercepts the
// feed's googleAd slot and renders AdMobBanner instead.
//
// A user-boosted post carries the full real post, shaped identically to a
// normal feed post (adInterleave.js's boostedAdCandidates) — that's
// rendered through the real PostCard component so it looks and behaves
// EXACTLY like an organic post (reactions, comments, reshare, save,
// impressions), just under a "Sponsored" ribbon instead of PostCard's own
// header. An admin-created ad (db.ads, not a real boosted post) never has
// a `post`, so it falls back to the static headline/image/CTA card below —
// there's no real post underneath it to render.
//
// isSaved/toggleSave/isReshared/unreshare/onReact/onDelete are the SAME raw
// hook functions the host screen already uses for its own PostCards (see
// FeedScreen.js etc.) — passed through here rather than re-fetched, since
// this ad's post shares the exact same id space as any other feed post.
export default function AdCard({
  ad,
  onReact,
  isSaved,
  toggleSave,
  isReshared,
  unreshare,
  onDelete,
  onChanged,
  isActive,
  shouldMount,
  onOpenVideoFullscreen,
}) {
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);

  function openReport() {
    setMenuOpen(false);
    navigation.navigate("ReportAd", {
      // A boosted post's placement is reported as "post_boost" (the
      // post_boosts row's own id, `ad.id` — see adInterleave.js), never
      // "ad" — that's reserved for an admin-created db.ads row, which has
      // no `post` underneath it.
      adType: ad.post ? "post_boost" : "ad",
      adRefId: ad.id,
      advertiserName: ad.advertiser,
    });
  }

  const reportMenu = (
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuOpen(false)}>
        <View style={styles.menuCard} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={styles.menuItem} onPress={openReport}>
            <Ionicons name="flag-outline" size={19} color={COLORS.ink} />
            <Text style={styles.menuItemText}>Report ad</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (ad.post) {
    return (
      <View>
        <View style={styles.sponsoredBadgeRow}>
          <View style={styles.sponsoredBadgeLeft}>
            <Ionicons name="megaphone-outline" size={13} color={COLORS.sub} />
            <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
          </View>
          <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.sub} />
          </TouchableOpacity>
        </View>
        <PostCard
          post={ad.post}
          onReact={onReact}
          isSaved={isSaved ? isSaved("post", ad.post.id) : false}
          onToggleSave={isSaved && toggleSave ? () => toggleSave("post", ad.post.id) : undefined}
          isReshared={isReshared ? isReshared(ad.post.id) : false}
          onUnreshare={unreshare ? () => unreshare(ad.post.id) : undefined}
          onDelete={onDelete}
          onChanged={onChanged}
          isActive={isActive}
          shouldMount={shouldMount}
          onOpenVideoFullscreen={onOpenVideoFullscreen}
        />
        {reportMenu}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.sponsored}>Sponsored</Text>
        <Text style={styles.advertiser}>· {ad.advertiser}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.sub} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.linkRow} activeOpacity={0.85} onPress={() => openInAppBrowser(ad.targetUrl)}>
        {!!ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.thumb} contentFit="cover" />}
        <View style={styles.linkBody}>
          <Text style={styles.headline} numberOfLines={2}>{ad.headline}</Text>
          {!!ad.cta && <Text style={styles.ctaInline}>{ad.cta} →</Text>}
        </View>
      </TouchableOpacity>
      {reportMenu}
    </View>
  );
}

const styles = StyleSheet.create({
  sponsoredBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, marginTop: 6, marginBottom: -2 },
  sponsoredBadgeLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  sponsoredBadgeText: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6, borderWidth: 1, borderColor: COLORS.bg },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sponsored: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  advertiser: { color: COLORS.sub, fontSize: 12, marginLeft: 4 },
  // Same "Compact Row" layout as LinkPreviewCard.js — a boosted ad is
  // conceptually just a link, so it gets the identical treatment: small
  // square thumbnail beside a text column, instead of the old full-width
  // hero image.
  linkRow: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 8 },
  thumb: { width: 58, height: 58, borderRadius: 7, backgroundColor: COLORS.wash, flexShrink: 0 },
  linkBody: { flex: 1 },
  headline: { color: COLORS.ink, fontSize: 12.5, fontWeight: "700", lineHeight: 16 },
  ctaInline: { color: COLORS.accent, fontSize: 11, fontWeight: "800", marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  menuCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 8, paddingBottom: 24 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  menuItemText: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
});
