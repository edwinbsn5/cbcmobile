import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from "react-native";
import client from "../api/client";
import { openInAppBrowser } from "../utils/inAppBrowser";
import { COLORS } from "../theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function JobDetailScreen({ route }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/jobs/${jobId}`)
      .then((r) => setJob(r.data))
      .catch((e) => Alert.alert("Couldn't load job", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [jobId]);

  function handleApply() {
    if (!job?.applyContact) return;
    // An in-app browser can't open a mail compose sheet — mailto: still
    // goes through Linking; a real apply link opens in the in-app browser
    // so the user lands back on this screen afterward.
    if (EMAIL_RE.test(job.applyContact)) {
      Linking.openURL(`mailto:${job.applyContact}`).catch(() => Alert.alert("Couldn't open", "This contact method couldn't be opened on your device"));
    } else {
      openInAppBrowser(job.applyContact);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;
  if (!job) return null;

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.company}</Text>

        {job.status === "pending" && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>⏳ Awaiting admin approval — only you can see this listing until then</Text>
          </View>
        )}
        {job.status === "rejected" && (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedBannerText}>This job posting was not approved. Contact support for details.</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{job.jobType}</Text>
          {!!job.location && <Text style={styles.metaText}> · {job.location}</Text>}
          {!!job.salaryRange && <Text style={styles.metaText}> · {job.salaryRange}</Text>}
        </View>

        <Text style={styles.poster}>Posted by {job.poster?.name}</Text>

        {!!job.description && <Text style={styles.description}>{job.description}</Text>}

        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { padding: 16 },
  title: { fontSize: 22, fontWeight: "800" },
  company: { color: COLORS.accent, fontWeight: "700", marginTop: 6, fontSize: 16 },
  pendingBanner: { backgroundColor: "#FFF3CD", padding: 10, borderRadius: 8, marginTop: 12 },
  pendingBannerText: { color: "#856404", fontWeight: "600" },
  rejectedBanner: { backgroundColor: "#F8D7DA", padding: 10, borderRadius: 8, marginTop: 12 },
  rejectedBannerText: { color: "#721C24", fontWeight: "600" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  metaText: { color: COLORS.sub, fontSize: 13 },
  poster: { color: COLORS.sub, fontSize: 12, marginTop: 8 },
  description: { color: COLORS.ink, marginTop: 16, fontSize: 14, lineHeight: 20 },
  applyButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 24 },
  applyButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
});
