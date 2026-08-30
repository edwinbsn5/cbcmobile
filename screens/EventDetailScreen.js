import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

function formatWhen(startAt, endAt) {
  const start = new Date(startAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  if (!endAt) return start;
  const end = new Date(endAt).toLocaleString([], { hour: "numeric", minute: "2-digit" });
  return `${start} – ${end}`;
}

// Ported from Fundi Jikoni's own EventDetailScreen: navy back-bar, cover +
// bookmark, host identity row, a status pill, Going/Interested as their own
// counter buttons (tap again to clear), a Date cell, and a small tab row
// (About / DM Organiser — the latter is an action, not a content tab, same
// as the reference). Photos/Discussions tabs aren't ported — this app has
// no event-photos or event-comments backend yet.
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

  const load = useCallback(async () => {
    const [eventRes, rsvpRes] = await Promise.all([
      client.get(`/events/${eventId}`),
      client.get(`/events/${eventId}/my-rsvp`),
    ]);
    setEvent(eventRes.data);
    setMyStatus(rsvpRes.data.rsvp?.status || null);
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
  const canRsvp = event.status !== "cancelled";
  const saved = isSaved("event", event.id);

  return (
    <View style={styles.container}>
      <View style={[styles.backBar, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
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

        <Text style={styles.eventTitle}>{event.name}</Text>
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
              <Text style={styles.locationPillText}>{event.location}{event.county ? ` · ${event.county}` : ""}</Text>
            </View>
            <View style={[styles.statusPill, event.status === "cancelled" ? styles.statusPillCancelled : styles.statusPillActive]}>
              <Text style={[styles.statusPillText, { color: event.status === "cancelled" ? "#C4433C" : "#2E7D32" }]}>
                ● {event.status === "cancelled" ? "Cancelled" : "Upcoming"}
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

        {isHost && event.status !== "cancelled" ? (
          <TouchableOpacity style={styles.outlineButton} onPress={handleCancel} disabled={cancelling}>
            <Text style={styles.outlineButtonText}>{cancelling ? "Cancelling..." : "Cancel event"}</Text>
          </TouchableOpacity>
        ) : null}

        {isHost && !event.isBoosted && event.status !== "cancelled" && (
          <TouchableOpacity style={styles.outlineButton} onPress={() => navigation.navigate("BoostEvent", { event })}>
            <Text style={styles.outlineButtonText}>⚡ Boost this event</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tabRow}>
          <View style={styles.tabChip}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.accent} />
            <Text style={[styles.tabChipText, styles.tabChipTextActive]}>About</Text>
            <View style={[styles.tabUnderline, styles.tabUnderlineActive]} />
          </View>
          {!isHost && (
            <TouchableOpacity style={styles.tabChip} onPress={handleDmOrganiser} disabled={messaging}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.ink} />
              <Text style={[styles.tabChipText, styles.tabChipTextDm]}>{messaging ? "..." : "DM Organiser"}</Text>
              <View style={styles.tabUnderline} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.aboutCard}>
          {!!event.description && <Text style={styles.description}>{event.description}</Text>}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.sub} />
            <Text style={styles.detailText}>{formatWhen(event.startAt, event.endAt)}</Text>
          </View>
          {!!event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={13} color={COLORS.sub} />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={13} color={COLORS.sub} />
            <Text style={styles.detailText}>Hosted by {event.host?.name}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { backgroundColor: COLORS.accentInk, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  cancelledBanner: { backgroundColor: "#FDECEA", borderRadius: 10, padding: 10, marginBottom: 12 },
  cancelledBannerText: { color: "#C4433C", fontWeight: "700", fontSize: 12.5, textAlign: "center" },
  coverWrap: { marginBottom: 14 },
  cover: { width: "100%", height: 170, borderRadius: 14, backgroundColor: "#eee" },
  coverPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.wash },
  coverBookmark: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(20,24,28,0.4)", alignItems: "center", justifyContent: "center" },
  boostedBadge: { position: "absolute", top: 10, left: 10, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  boostedBadgeText: { color: COLORS.accentInk, fontSize: 11, fontWeight: "800" },
  eventTitle: { fontSize: 19, fontWeight: "800", color: COLORS.ink, lineHeight: 25 },
  eventDateSub: { fontSize: 12.5, fontWeight: "600", color: COLORS.accent, marginTop: 4, marginBottom: 12 },
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
});
