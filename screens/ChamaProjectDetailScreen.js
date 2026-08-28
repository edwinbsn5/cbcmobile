import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Modal, TouchableWithoutFeedback, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

function formatKES(n) { return `KES ${Math.round(n || 0).toLocaleString()}`; }
function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const STATUSES = ["planning", "in_progress", "on_hold", "completed", "cancelled"];
const STATUS_LABELS = { planning: "Planning", in_progress: "In Progress", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled" };
const STATUS_COLORS = {
  planning: { bg: "#E9EEF7", fg: COLORS.sub },
  in_progress: { bg: "#FFF3CD", fg: "#8A6D00" },
  on_hold: { bg: "#FDECEA", fg: "#C4433C" },
  completed: { bg: "#E3F5E9", fg: "#2E7D32" },
  cancelled: { bg: "#EEE", fg: "#777" },
};

export default function ChamaProjectDetailScreen({ route, navigation }) {
  const { chamaId, projectId, isAdmin } = route.params;
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    client.get(`/chama/${chamaId}/projects/${projectId}`)
      .then((r) => setProject(r.data))
      .catch((e) => Alert.alert("Couldn't load project", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [chamaId, projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addMilestone() {
    if (!milestoneTitle.trim()) return;
    try {
      await client.post(`/chama/${chamaId}/projects/${projectId}/milestones`, { title: milestoneTitle.trim() });
      setMilestoneTitle("");
      load();
    } catch (e) {
      Alert.alert("Couldn't add milestone", e.response?.data?.error || e.message);
    }
  }

  async function toggleMilestone(m) {
    try {
      await client.patch(`/chama/${chamaId}/projects/${projectId}/milestones/${m.id}`, { done: !m.done });
      load();
    } catch (e) {
      Alert.alert("Couldn't update milestone", e.response?.data?.error || e.message);
    }
  }

  async function removeMilestone(m) {
    try {
      await client.delete(`/chama/${chamaId}/projects/${projectId}/milestones/${m.id}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't remove milestone", e.response?.data?.error || e.message);
    }
  }

  async function postUpdate() {
    if (!updateContent.trim()) return;
    setPosting(true);
    try {
      await client.post(`/chama/${chamaId}/projects/${projectId}/updates`, { content: updateContent.trim() });
      setUpdateContent("");
      load();
    } catch (e) {
      Alert.alert("Couldn't post update", e.response?.data?.error || e.message);
    } finally {
      setPosting(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this project?", "This permanently removes its milestones and update log too.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await client.delete(`/chama/${chamaId}/projects/${projectId}`);
          navigation.goBack();
        } catch (e) {
          Alert.alert("Couldn't delete", e.response?.data?.error || e.message);
        }
      } },
    ]);
  }

  if (loading || !project) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const sc = STATUS_COLORS[project.status] || STATUS_COLORS.planning;
  const pct = project.budgetKES ? Math.min(100, Math.round((project.spentKES / project.budgetKES) * 100)) : null;
  const doneCount = project.milestones.filter((m) => m.done).length;
  const milestonePct = project.milestones.length ? Math.round((doneCount / project.milestones.length) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{project.title}</Text>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusPillText, { color: sc.fg }]}>{STATUS_LABELS[project.status] || project.status}</Text>
          </View>
        </View>

        {!!project.objectives && <Text style={styles.objectives}>{project.objectives}</Text>}

        {(!!project.startDate || !!project.endDate) && (
          <View style={styles.timelineRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.sub} />
            <Text style={styles.timelineText}>
              {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"} → {project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}
            </Text>
          </View>
        )}

        {project.budgetKES !== null && (
          <View style={styles.budgetCard}>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
            <Text style={styles.budgetText}>{formatKES(project.spentKES)} spent of {formatKES(project.budgetKES)} budget ({pct}%)</Text>
          </View>
        )}

        {!!project.closingSummary && (
          <View style={styles.closingCard}>
            <Text style={styles.closingLabel}>Closing report</Text>
            <Text style={styles.closingText}>{project.closingSummary}</Text>
          </View>
        )}

        {isAdmin && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButtonFlex} onPress={() => setEditVisible(true)}>
              <Ionicons name="create-outline" size={16} color={COLORS.accent} />
              <Text style={styles.secondaryButtonText}>Edit project</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerButtonFlex} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={16} color="#D32F2F" />
              <Text style={styles.dangerButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Milestones {project.milestones.length ? `(${milestonePct}%)` : ""}</Text>
        {!!project.milestones.length && (
          <View style={styles.barTrack}><View style={[styles.barFill, { width: `${milestonePct}%` }]} /></View>
        )}
        {isAdmin && (
          <View style={[styles.composer, { marginTop: 10 }]}>
            <TextInput style={styles.input} placeholder="New milestone" value={milestoneTitle} onChangeText={setMilestoneTitle} onSubmitEditing={addMilestone} />
            <TouchableOpacity style={styles.secondaryButton} onPress={addMilestone}><Text style={styles.secondaryButtonText}>Add</Text></TouchableOpacity>
          </View>
        )}
        {project.milestones.map((m) => (
          <View key={m.id} style={styles.milestoneRow}>
            <TouchableOpacity style={styles.milestoneCheck} onPress={() => isAdmin && toggleMilestone(m)} disabled={!isAdmin}>
              <Ionicons name={m.done ? "checkbox" : "square-outline"} size={20} color={m.done ? COLORS.accent : COLORS.sub} />
            </TouchableOpacity>
            <Text style={[styles.milestoneText, m.done && styles.milestoneTextDone]}>{m.title}</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => removeMilestone(m)}><Ionicons name="close" size={16} color={COLORS.sub} /></TouchableOpacity>
            )}
          </View>
        ))}
        {!project.milestones.length && <Text style={styles.emptySmall}>No milestones yet.</Text>}

        <Text style={styles.sectionTitle}>Update log</Text>
        {isAdmin && (
          <View style={styles.composer}>
            <TextInput style={[styles.input, styles.multiline]} placeholder="Post a progress update..." value={updateContent} onChangeText={setUpdateContent} multiline />
            <TouchableOpacity style={styles.secondaryButton} onPress={postUpdate} disabled={posting}>
              <Text style={styles.secondaryButtonText}>{posting ? "Posting..." : "Post update"}</Text>
            </TouchableOpacity>
          </View>
        )}
        {project.updates.map((u) => (
          <View key={u.id} style={styles.updateCard}>
            <Text style={styles.updateMeta}>{u.poster?.name} · {timeAgo(u.createdAt)}</Text>
            <Text style={styles.updateContent}>{u.content}</Text>
          </View>
        ))}
        {!project.updates.length && <Text style={styles.emptySmall}>No updates posted yet.</Text>}
      </ScrollView>

      <EditProjectModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        project={project}
        onSaved={() => { setEditVisible(false); load(); }}
        chamaId={chamaId}
      />
    </View>
  );
}

function EditProjectModal({ visible, onClose, project, onSaved, chamaId }) {
  const [status, setStatus] = useState(project.status);
  const [spentKES, setSpentKES] = useState(String(project.spentKES ?? 0));
  const [closingSummary, setClosingSummary] = useState(project.closingSummary || "");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    const spent = parseInt(spentKES, 10);
    if (spentKES.trim() && (!Number.isInteger(spent) || spent < 0)) return Alert.alert("Invalid amount", "Enter a whole number in KES");
    setSubmitting(true);
    try {
      await client.patch(`/chama/${chamaId}/projects/${project.id}`, {
        status, spentKES: spentKES.trim() ? spent : undefined, closingSummary: closingSummary.trim() || null,
      });
      onSaved();
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Edit {project.title}</Text>

        <Text style={styles.label}>Status</Text>
        <View style={styles.optionRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity key={s} style={[styles.optionChip, status === s && styles.optionChipActive]} onPress={() => setStatus(s)}>
              <Text style={[styles.optionChipText, status === s && styles.optionChipTextActive]}>{STATUS_LABELS[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Amount spent so far (KES)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={spentKES} onChangeText={setSpentKES} />

        <Text style={styles.label}>Closing report (optional — shown once the project wraps up)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={closingSummary} onChangeText={setClosingSummary} multiline placeholder="What was achieved, final costs, outcomes..." />

        <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Save changes"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.ink, flex: 1 },
  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  objectives: { color: COLORS.sub, marginTop: 8, lineHeight: 19 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  timelineText: { color: COLORS.sub, fontSize: 12 },
  budgetCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 12 },
  barTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },
  budgetText: { color: COLORS.sub, fontSize: 12, marginTop: 8 },
  closingCard: { backgroundColor: "#E3F5E9", borderRadius: 10, padding: 12, marginTop: 12 },
  closingLabel: { color: "#2E7D32", fontWeight: "800", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.3 },
  closingText: { color: "#215E29", fontSize: 13, marginTop: 6, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryButtonFlex: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 11, alignItems: "center" },
  secondaryButtonText: { color: COLORS.accent, fontWeight: "700" },
  dangerButtonFlex: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", borderWidth: 1, borderColor: "#D32F2F", borderRadius: 8, padding: 11, alignItems: "center" },
  dangerButtonText: { color: "#D32F2F", fontWeight: "700" },
  sectionTitle: { fontSize: 14.5, fontWeight: "800", color: COLORS.ink, marginTop: 24, marginBottom: 8 },
  composer: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12 },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink, backgroundColor: COLORS.surface },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginTop: 8 },
  milestoneCheck: { padding: 2 },
  milestoneText: { flex: 1, color: COLORS.ink, fontSize: 13.5 },
  milestoneTextDone: { color: COLORS.sub, textDecorationLine: "line-through" },
  emptySmall: { color: COLORS.sub, fontSize: 12.5, marginTop: 8 },
  updateCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 8 },
  updateMeta: { color: COLORS.sub, fontSize: 11, marginBottom: 6, fontWeight: "600" },
  updateContent: { color: COLORS.ink, fontSize: 13.5, lineHeight: 19 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28, maxHeight: "85%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 16, marginBottom: 12 },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 5, marginTop: 10, fontWeight: "600" },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12 },
  optionChipTextActive: { color: COLORS.accentInk },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 18 },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700" },
});
