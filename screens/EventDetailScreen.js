import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

const RSVP_OPTIONS = [
  { status: "going", label: "Going" },
  { status: "interested", label: "Interested" },
  { status: "not_going", label: "Not going" },
];

function formatWhen(startAt, endAt) {
  const start = new Date(startAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  if (!endAt) return start;
  const end = new Date(endAt).toLocaleString([], { hour: "numeric", minute: "2-digit" });
  return `${start} – ${end}`;
}

export default function EventDetailScreen({ route }) {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);

  async function load() {
    const [eventRes, rsvpRes] = await Promise.all([
      client.get(`/events/${eventId}`),
      client.get(`/events/${eventId}/my-rsvp`),
    ]);
    setEvent(eventRes.data);
    setMyStatus(rsvpRes.data.rsvp?.status || null);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [eventId]);

  async function handleRsvp(status) {
    setResponding(status);
    try {
      const { data } = await client.post(`/events/${eventId}/rsvp`, { status });
      setEvent(data);
      setMyStatus(status);
    } catch (e) {
      Alert.alert("RSVP failed", e.response?.data?.error || e.message);
    } finally {
      setResponding(null);
    }
  }

  if (loading || !event) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      {event.coverUrl && <Image source={{ uri: event.coverUrl }} style={styles.cover} />}
      <View style={styles.body}>
        <Text style={styles.name}>{event.name}</Text>
        <Text style={styles.when}>{formatWhen(event.startAt, event.endAt)}</Text>
        {!!event.location && <Text style={styles.location}>📍 {event.location}</Text>}
        <Text style={styles.host}>Hosted by {event.host?.name}</Text>

        {!!event.description && <Text style={styles.description}>{event.description}</Text>}

        <Text style={styles.counts}>{event.goingCount} going · {event.interestedCount} interested</Text>

        <Text style={styles.sectionTitle}>Your RSVP</Text>
        <View style={styles.rsvpRow}>
          {RSVP_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.status}
              style={[styles.rsvpButton, myStatus === opt.status && styles.rsvpButtonActive]}
              disabled={responding === opt.status}
              onPress={() => handleRsvp(opt.status)}
            >
              <Text style={[styles.rsvpButtonText, myStatus === opt.status && styles.rsvpButtonTextActive]}>
                {responding === opt.status ? "..." : opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  cover: { width: "100%", height: 160, backgroundColor: "#eee" },
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: "800" },
  when: { color: COLORS.accent, fontWeight: "700", marginTop: 8 },
  location: { color: COLORS.sub, marginTop: 6, fontSize: 14 },
  host: { color: COLORS.sub, fontSize: 12, marginTop: 8 },
  description: { color: COLORS.ink, marginTop: 14, fontSize: 14, lineHeight: 20 },
  counts: { color: COLORS.sub, fontSize: 13, marginTop: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  rsvpRow: { flexDirection: "row" },
  rsvpButton: { flex: 1, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginRight: 8 },
  rsvpButtonActive: { backgroundColor: COLORS.accent },
  rsvpButtonText: { color: COLORS.accent, fontWeight: "700" },
  rsvpButtonTextActive: { color: COLORS.accentInk },
});
