import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import Avatar from "../components/Avatar";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

function formatWhen(startAt, endAt) {
  const start = new Date(startAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  if (!endAt) return start;
  const end = new Date(endAt).toLocaleString([], { hour: "numeric", minute: "2-digit" });
  return `${start} – ${end}`;
}

async function pickMultiplePhotos() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Allow photo library access to attach photos");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    mimeType: a.mimeType || "image/jpeg",
    fileName: a.fileName || `upload.${(a.mimeType || "image/jpeg").split("/")[1]}`,
  }));
}

async function uploadPhoto(p) {
  const form = new FormData();
  form.append("file", { uri: p.uri, name: p.fileName, type: p.mimeType });
  const { data } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  return data.url;
}

const TABS = ["About", "Photos", "Discussions"];

// Ported from Fundi Jikoni's own EventDetailScreen: navy back-bar, cover +
// bookmark, host identity row, a status pill, Going/Interested as their own
// counter buttons (tap again to clear), a Date cell, and a small tab row.
// Photos/Discussions go further than the reference: Photos is a plain
// host-curated gallery, but Discussions is a full mini-feed (background-
// colored text, photos/video, reactions, comments) via the same PostCard/
// CreatePostScreen machinery Chama's own Discussion tab uses — not just
// flat comments. DM Organiser sits alongside the tabs as an action, not a
// content tab, same as the reference.
export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleSave, loadSaved } = useSaved();
  const [event, setEvent] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [activeTab, setActiveTab] = useState("About");
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [discussionPosts, setDiscussionPosts] = useState([]);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);

  const load = useCallback(async () => {
    const [eventRes, rsvpRes, photosRes, postsRes] = await Promise.all([
      client.get(`/events/${eventId}`),
      client.get(`/events/${eventId}/my-rsvp`),
      client.get(`/events/${eventId}/photos`),
      client.get(`/events/${eventId}/posts`),
    ]);
    setEvent(eventRes.data);
    setMyStatus(rsvpRes.data.rsvp?.status || null);
    setPhotos(photosRes.data);
    setDiscussionPosts(postsRes.data);
    loadSaved();
  }, [eventId, loadSaved]);

  useFocusEffect(useCallback(() => {
    load().catch((e) => Alert.alert("Couldn't load event", e.response?.data?.error || e.message)).finally(() => setLoading(false));
  }, [load]));

  // Tapping an already-active cell clears the RSVP (sent as 'not_going')
  // instead of re-sending the same status — the toggled-off state IS
  // "can't go," it just has no button of its own.
  async function handleEngage(status) {
    const next = myStatus === status ? "not_going" : status;
    setResponding(status);
    try {
      const { data } = await client.post(`/events/${eventId}/rsvp`, { status: next });
      setEvent((prev) => ({ ...prev, goingCount: data.goingCount, interestedCount: data.interestedCount }));
      setMyStatus(next === "not_going" ? null : next);
    } catch (e) {
      Alert.alert("RSVP failed", e.response?.data?.error || e.message);
    } finally {
      setResponding(null);
    }
  }

  function handleCancel() {
    Alert.alert("Cancel this event?", "People who RSVP'd will still see it, marked as cancelled.", [
      { text: "Never mind", style: "cancel" },
      {
        text: "Cancel event", style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            const { data } = await client.post(`/events/${eventId}/cancel`);
            setEvent((prev) => ({ ...prev, ...data }));
          } catch (e) {
            Alert.alert("Couldn't cancel", e.response?.data?.error || e.message);
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  async function handleDmOrganiser() {
    if (!event?.host?.id) return;
    setMessaging(true);
    try {
      const { data } = await client.post("/inbox/start", {
        userId: event.host.id, contextType: "event", contextEventId: event.id,
      });
      navigation.navigate("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start chat", e.response?.data?.error || e.message);
    } finally {
      setMessaging(false);
    }
  }

  // Host-only, multi-select — mirrors CreateEventScreen's own cover-photo
  // upload, just looped for a whole batch and posted one at a time to
  // POST /:id/photos (backend rejects a non-host with 403 regardless).
  async function handleAddPhotos() {
    const picked = await pickMultiplePhotos();
    if (!picked.length) return;
    setUploadingPhotos(true);
    try {
      for (const p of picked) {
        const url = await uploadPhoto(p);
        await client.post(`/events/${eventId}/photos`, { url });
      }
      const { data } = await client.get(`/events/${eventId}/photos`);
      setPhotos(data);
    } catch (e) {
      Alert.alert("Couldn't add photos", e.response?.data?.error || e.message);
    } finally {
      setUploadingPhotos(false);
    }
  }

  function handleRemovePhoto(photoId) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    client.delete(`/events/${eventId}/photos/${photoId}`).catch(() => {
      client.get(`/events/${eventId}/photos`).then((r) => setPhotos(r.data));
    });
  }

  async function handleReactDiscussion(postId, reaction) {
    try {
      await client.post(`/events/${eventId}/posts/${postId}/react`, { reaction });
      const { data } = await client.get(`/events/${eventId}/posts`);
      setDiscussionPosts(data);
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleDeleteDiscussionPost(postId) {
    try {
      await client.delete(`/events/${eventId}/posts/${postId}`);
      const { data } = await client.get(`/events/${eventId}/posts`);
      setDiscussionPosts(data);
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  if (loading || !event) {
    return (
      <View style={styles.container}>
        <View style={[styles.backBar, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />
      </View>
    );
  }

  const isHost = event.host?.id === user?.id;
  const isSuspended = event.status === "suspended";
  const canRsvp = event.status !== "cancelled" && !isSuspended;
  const saved = isSaved("event", event.id);
  const canCancelEvent = isHost && event.status !== "cancelled";
  const canBoostEvent = isHost && !event.isBoosted && event.status !== "cancelled" && !isSuspended;
  const hasManageActions = canCancelEvent || canBoostEvent;

  return (
    <View style={styles.container}>
      <View style={[styles.backBar, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
        {isSuspended && (
          <View style={styles.suspendedBanner}>
            <Text style={styles.suspendedBannerTitle}>⏸ SUSPENDED</Text>
            <Text style={styles.suspendedBannerText}>
              This event was suspended by a platform admin. RSVPs, boosting, and messaging the organiser are disabled.
            </Text>
            {!!event.moderationReason && <Text style={styles.suspendedBannerReason}>Reason: {event.moderationReason}</Text>}
          </View>
        )}
        {event.status === "cancelled" && (
          <View style={styles.cancelledBanner}><Text style={styles.cancelledBannerText}>This event has been cancelled.</Text></View>
        )}

        <View style={styles.coverWrap}>
          {event.coverUrl ? (
            <Image source={{ uri: event.coverUrl }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="calendar-outline" size={34} color={COLORS.accent} />
            </View>
          )}
          <TouchableOpacity style={styles.coverBookmark} onPress={() => toggleSave("event", event.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={16} color="#fff" />
          </TouchableOpacity>
          {event.isBoosted && (
            <View style={styles.boostedBadge}><Text style={styles.boostedBadgeText}>⚡ Boosted</Text></View>
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.eventTitle}>{event.name}</Text>
          {hasManageActions && (
            <View style={styles.manageMenuWrap}>
              <TouchableOpacity style={styles.manageMenuTrigger} onPress={() => setManageMenuOpen((o) => !o)}>
                <Ionicons name="ellipsis-vertical" size={18} color={COLORS.ink} />
              </TouchableOpacity>
              {manageMenuOpen && (
                <View style={styles.manageMenuDropdown}>
                  {canBoostEvent && (
                    <TouchableOpacity
                      style={styles.manageMenuItem}
                      onPress={() => { setManageMenuOpen(false); navigation.navigate("BoostEvent", { event }); }}
                    >
                      <Ionicons name="flash-outline" size={16} color={COLORS.ink} />
                      <Text style={styles.manageMenuItemText}>Boost this event</Text>
                    </TouchableOpacity>
                  )}
                  {canBoostEvent && canCancelEvent && <View style={styles.manageMenuDivider} />}
                  {canCancelEvent && (
                    <TouchableOpacity
                      style={styles.manageMenuItem}
                      onPress={() => { setManageMenuOpen(false); handleCancel(); }}
                      disabled={cancelling}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#D32F2F" />
                      <Text style={[styles.manageMenuItemText, styles.manageMenuItemTextDanger]}>
                        {cancelling ? "Cancelling..." : "Cancel event"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        <Text style={styles.eventDateSub}>{formatWhen(event.startAt, event.endAt)}</Text>

        <View style={styles.identityRow}>
          <Avatar uri={event.host?.avatar} name={event.host?.name} style={styles.hostAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hostedByLabel}>Hosted by</Text>
            <Text style={styles.hostName} numberOfLines={1}>{event.host?.name}</Text>
          </View>
        </View>

        {!!event.location && (
          <View style={styles.pillRow}>
            <View style={styles.locationPill}>
              <Ionicons name="location-outline" size={12} color={COLORS.sub} />
              <Text style={styles.locationPillText}>Venue: {event.location}{event.county ? ` · ${event.county}` : ""}</Text>
            </View>
            <View style={[styles.statusPill, event.status === "cancelled" || isSuspended ? styles.statusPillCancelled : styles.statusPillActive]}>
              <Text style={[styles.statusPillText, { color: event.status === "cancelled" || isSuspended ? "#C4433C" : "#2E7D32" }]}>
                ● {isSuspended ? "Suspended" : event.status === "cancelled" ? "Cancelled" : "Upcoming"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.engageRow}>
          <TouchableOpacity
            style={[styles.engageCell, myStatus === "going" && styles.engageCellActive]}
            disabled={!canRsvp || responding === "going"}
            onPress={() => handleEngage("going")}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={myStatus === "going" ? "#fff" : COLORS.sub} />
            <View style={styles.engageLine}>
              <Text style={[styles.engageLabel, myStatus === "going" && styles.engageLabelActive]}>Going</Text>
              <Text style={[styles.engageCount, myStatus === "going" && styles.engageCountActive]}>{event.goingCount}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.engageCell, myStatus === "interested" && styles.engageCellActive]}
            disabled={!canRsvp || responding === "interested"}
            onPress={() => handleEngage("interested")}
          >
            <Ionicons name="star-outline" size={18} color={myStatus === "interested" ? "#fff" : COLORS.sub} />
            <View style={styles.engageLine}>
              <Text style={[styles.engageLabel, myStatus === "interested" && styles.engageLabelActive]}>Interested</Text>
              <Text style={[styles.engageCount, myStatus === "interested" && styles.engageCountActive]}>{event.interestedCount}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.dateCell}>
            <Text style={styles.dateValue}>{new Date(event.startAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</Text>
            <Text style={styles.dateLabel}>Date</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const icon = t === "About" ? "information-circle-outline" : t === "Photos" ? "images-outline" : "chatbubbles-outline";
            const active = activeTab === t;
            return (
              <TouchableOpacity key={t} style={styles.tabChip} onPress={() => setActiveTab(t)}>
                <Ionicons name={icon} size={16} color={active ? COLORS.accent : COLORS.sub} />
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{t}</Text>
                <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
              </TouchableOpacity>
            );
          })}
          {!isHost && !isSuspended && (
            <TouchableOpacity style={styles.tabChip} onPress={handleDmOrganiser} disabled={messaging}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.ink} />
              <Text style={[styles.tabChipText, styles.tabChipTextDm]}>{messaging ? "..." : "DM Organiser"}</Text>
              <View style={styles.tabUnderline} />
            </TouchableOpacity>
          )}
        </View>

        {activeTab === "About" && (
          <View style={styles.aboutCard}>
            {!!event.description && <Text style={styles.description}>{event.description}</Text>}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.sub} />
              <Text style={styles.detailText}>{formatWhen(event.startAt, event.endAt)}</Text>
            </View>
            {!!event.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={13} color={COLORS.sub} />
                <Text style={styles.detailText}>Venue: {event.location}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={13} color={COLORS.sub} />
              <Text style={styles.detailText}>Hosted by {event.host?.name}</Text>
            </View>
          </View>
        )}

        {activeTab === "Photos" && (
          <View style={styles.aboutCard}>
            {isHost && !isSuspended && (
              <TouchableOpacity style={styles.outlineButton} onPress={handleAddPhotos} disabled={uploadingPhotos}>
                <Text style={styles.outlineButtonText}>{uploadingPhotos ? "Uploading..." : "+ Add photos"}</Text>
              </TouchableOpacity>
            )}
            {photos.length === 0 ? (
              <View style={styles.photosEmpty}>
                <Ionicons name="images-outline" size={26} color={COLORS.sub} />
                <Text style={styles.empty}>{isHost ? "No photos yet — add some above." : "No photos yet."}</Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((p, i) => (
                  <View key={p.id} style={[styles.photoTile, (i + 1) % 3 !== 0 && styles.photoTileSpaced]}>
                    <Image source={{ uri: p.url }} style={styles.photoImage} contentFit="cover" />
                    {isHost && (
                      <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => handleRemovePhoto(p.id)} hitSlop={6}>
                        <Ionicons name="close" size={11} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === "Discussions" && (
          <View>
            {!isSuspended && (
              <TouchableOpacity
                style={styles.composerTeaser}
                onPress={() => navigation.navigate("CreatePost", { eventId, eventLabel: event.name })}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.sub} />
                <Text style={styles.composerTeaserText}>Share something about this event...</Text>
              </TouchableOpacity>
            )}
            {discussionPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onReact={handleReactDiscussion}
                isSaved={isSaved("post", p.id)}
                onToggleSave={() => toggleSave("post", p.id)}
                onDelete={handleDeleteDiscussionPost}
                onChanged={load}
              />
            ))}
            {discussionPosts.length === 0 && <Text style={styles.empty}>No discussion posts yet — be the first to post.</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { backgroundColor: COLORS.accentInk, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  suspendedBanner: { backgroundColor: "#D32F2F", padding: 14, borderRadius: 10, marginBottom: 12 },
  suspendedBannerTitle: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5, marginBottom: 4 },
  suspendedBannerText: { color: "#fff", fontWeight: "600", fontSize: 13, lineHeight: 18 },
  suspendedBannerReason: { color: "#FFE0E0", fontSize: 12.5, marginTop: 8, fontStyle: "italic" },
  cancelledBanner: { backgroundColor: "#FDECEA", borderRadius: 10, padding: 10, marginBottom: 12 },
  cancelledBannerText: { color: "#C4433C", fontWeight: "700", fontSize: 12.5, textAlign: "center" },
  coverWrap: { marginBottom: 14 },
  cover: { width: "100%", height: 170, borderRadius: 14, backgroundColor: "#eee" },
  coverPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.wash },
  coverBookmark: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(20,24,28,0.4)", alignItems: "center", justifyContent: "center" },
  boostedBadge: { position: "absolute", top: 10, left: 10, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  boostedBadgeText: { color: COLORS.accentInk, fontSize: 11, fontWeight: "800" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  eventTitle: { flex: 1, fontSize: 19, fontWeight: "800", color: COLORS.ink, lineHeight: 25 },
  eventDateSub: { fontSize: 12.5, fontWeight: "600", color: COLORS.accent, marginTop: 4, marginBottom: 12 },
  manageMenuWrap: { position: "relative", flexShrink: 0, marginTop: 2 },
  manageMenuTrigger: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  manageMenuDropdown: {
    position: "absolute", top: "100%", right: 0, marginTop: 6, backgroundColor: COLORS.surface, borderRadius: 12,
    paddingVertical: 6, minWidth: 190, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2,
    shadowRadius: 12, elevation: 8, zIndex: 20,
  },
  manageMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  manageMenuItemText: { color: COLORS.ink, fontWeight: "700", fontSize: 13 },
  manageMenuItemTextDanger: { color: "#D32F2F" },
  manageMenuDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  hostAvatar: { width: 48, height: 48, borderRadius: 14 },
  hostedByLabel: { fontSize: 10.5, color: COLORS.sub },
  hostName: { fontSize: 14.5, fontWeight: "700", color: COLORS.ink, marginTop: 1 },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  locationPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.wash, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  locationPillText: { fontSize: 11, color: COLORS.sub, fontWeight: "600" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillActive: { backgroundColor: "#E3F5E9" },
  statusPillCancelled: { backgroundColor: "#FDECEA" },
  statusPillText: { fontSize: 10.5, fontWeight: "700" },
  engageRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  engageCell: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  engageCellActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  engageLine: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  engageLabel: { fontSize: 10.5, fontWeight: "700", color: COLORS.sub },
  engageLabelActive: { color: "rgba(255,255,255,0.9)" },
  engageCount: { fontSize: 12.5, fontWeight: "800", color: COLORS.ink },
  engageCountActive: { color: "#fff" },
  dateCell: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  dateValue: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  dateLabel: { fontSize: 9, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 1 },
  outlineButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, paddingVertical: 11, alignItems: "center", marginBottom: 12 },
  outlineButtonText: { color: COLORS.accent, fontWeight: "700", fontSize: 13 },
  tabRow: { flexDirection: "row", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9 },
  tabChipText: { fontSize: 12, fontWeight: "600", color: COLORS.sub },
  tabChipTextActive: { color: COLORS.accent, fontWeight: "800" },
  tabChipTextDm: { color: COLORS.ink, fontWeight: "700" },
  tabUnderline: { position: "absolute", bottom: -1, height: 2, width: 40, borderRadius: 1, backgroundColor: "transparent", alignSelf: "center" },
  tabUnderlineActive: { backgroundColor: COLORS.accent },
  aboutCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14 },
  description: { fontSize: 13.5, color: COLORS.ink, lineHeight: 20, marginBottom: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.bg },
  detailText: { fontSize: 12.5, color: COLORS.ink, flex: 1 },
  empty: { fontSize: 12.5, color: COLORS.sub, textAlign: "center", marginVertical: 14 },
  photosEmpty: { alignItems: "center", paddingVertical: 20, gap: 8 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap" },
  photoTile: { width: "31.33%", aspectRatio: 1, borderRadius: 8, overflow: "hidden", position: "relative", backgroundColor: COLORS.bg, marginBottom: 8 },
  photoTileSpaced: { marginRight: "3%" },
  photoImage: { width: "100%", height: "100%" },
  photoRemoveBtn: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(20,24,28,0.6)", alignItems: "center", justifyContent: "center" },
  composerTeaser: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 4 },
  composerTeaserText: { color: COLORS.sub, fontSize: 13.5 },
});
