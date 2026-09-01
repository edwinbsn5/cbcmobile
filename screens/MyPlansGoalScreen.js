import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Modal, TouchableWithoutFeedback, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const LIFE_AREAS = ["finances", "business", "career", "relationships", "mental_health", "health", "education", "spiritual", "personal_growth", "other"];
const LIFE_AREA_LABELS = {
  finances: "Savings & Finances", business: "Business", career: "Career", relationships: "Relationships",
  mental_health: "Mental Health", health: "Physical Health", education: "Education", spiritual: "Spiritual",
  personal_growth: "Personal Growth", other: "Other",
};
const STATUSES = ["not_started", "in_progress", "achieved", "abandoned"];
const STATUS_LABELS = { not_started: "Not started", in_progress: "In Progress", achieved: "Achieved", abandoned: "Abandoned" };

export default function MyPlansGoalScreen({ route, navigation }) {
  const { goalId } = route.params;
  const insets = useSafeAreaInsets();
  const [goal, setGoal] = useState(null);
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [journalContent, setJournalContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [addingMilestone, setAddingMilestone] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: goals }, { data: entries }] = await Promise.all([
        client.get("/myplans/goals"),
        client.get("/myplans/journal", { params: { goalId } }),
      ]);
      const found = goals.find((g) => g.id === goalId);
      if (!found) { Alert.alert("Goal not found", "This goal may have been deleted."); navigation.goBack(); return; }
      setGoal(found);
      setJournal(entries);
    } catch (e) {
      Alert.alert("Couldn't load goal", e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [goalId, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addMilestone() {
    // Guards against the exact bug reported: the round trip has enough
    // delay that a second tap (or a second Enter, since the same input's
    // onSubmitEditing calls this too) before the first request lands used
    // to fire a second, near-identical POST — two milestones from one tap.
    if (!milestoneTitle.trim() || addingMilestone) return;
    setAddingMilestone(true);
    try {
      await client.post(`/myplans/goals/${goalId}/milestones`, { title: milestoneTitle.trim() });
      setMilestoneTitle("");
      await load();
    } catch (e) {
      Alert.alert("Couldn't add milestone", e.response?.data?.error || e.message);
    } finally {
      setAddingMilestone(false);
    }
  }

  async function toggleMilestone(m) {
    try {
      await client.patch(`/myplans/milestones/${m.id}`, { done: !m.done });
      load();
    } catch (e) {
      Alert.alert("Couldn't update milestone", e.response?.data?.error || e.message);
    }
  }

  async function removeMilestone(m) {
    try {
      await client.delete(`/myplans/milestones/${m.id}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't remove milestone", e.response?.data?.error || e.message);
    }
  }

  // Moves one milestone up/down in the checklist — same "reorder locally,
  // send the whole new order to the server in one go" pattern as the
  // Chama Projects milestone reorder.
  async function moveMilestone(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= goal.milestones.length) return;
    const reordered = goal.milestones.slice();
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await client.patch(`/myplans/goals/${goalId}/milestones/reorder`, { order: reordered.map((m) => m.id) });
      load();
    } catch (e) {
      Alert.alert("Couldn't reorder", e.response?.data?.error || e.message);
    }
  }

  async function postJournal() {
    if (!journalContent.trim()) return;
    setPosting(true);
    try {
      await client.post("/myplans/journal", { content: journalContent.trim(), goalId });
      setJournalContent("");
      load();
    } catch (e) {
      Alert.alert("Couldn't save entry", e.response?.data?.error || e.message);
    } finally {
      setPosting(false);
    }
  }

  async function removeJournal(id) {
    try {
      await client.delete(`/myplans/journal/${id}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't remove entry", e.response?.data?.error || e.message);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this goal?", "This permanently removes its milestones too.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await client.delete(`/myplans/goals/${goalId}`);
          navigation.goBack();
        } catch (e) {
          Alert.alert("Couldn't delete", e.response?.data?.error || e.message);
        }
      } },
    ]);
  }

  if (loading || !goal) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const doneCount = goal.milestones.filter((m) => m.done).length;
  const pct = goal.milestones.length ? Math.round((doneCount / goal.milestones.length) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{goal.title}</Text>
          <TouchableOpacity onPress={() => setEditVisible(true)}><Ionicons name="create-outline" size={20} color={COLORS.accent} /></TouchableOpacity>
        </View>
        {!!goal.description && <Text style={styles.description}>{goal.description}</Text>}
        <View style={styles.metaRow}>
          <View style={styles.statusPill}><Text style={styles.statusPillText}>{STATUS_LABELS[goal.status]}</Text></View>
          {!!goal.lifeArea && <View style={styles.areaPill}><Text style={styles.areaPillText}>{LIFE_AREA_LABELS[goal.lifeArea]}</Text></View>}
          {!!goal.targetDate && <Text style={styles.metaText}>Target: {new Date(goal.targetDate).toLocaleDateString()}</Text>}
        </View>

        <Text style={styles.sectionTitle}>Milestones {goal.milestones.length ? `(${pct}%)` : ""}</Text>
        {!!goal.milestones.length && <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>}
        <View style={[styles.composer, { marginTop: 10 }]}>
          <TextInput
            style={styles.input}
            placeholder="New milestone"
            value={milestoneTitle}
            onChangeText={setMilestoneTitle}
            onSubmitEditing={addMilestone}
            editable={!addingMilestone}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={addMilestone} disabled={addingMilestone}>
            {addingMilestone ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={styles.secondaryButtonText}>Add</Text>}
          </TouchableOpacity>
        </View>
        {goal.milestones.map((m, idx) => (
          <View key={m.id} style={styles.milestoneRow}>
            <TouchableOpacity style={styles.milestoneCheck} onPress={() => toggleMilestone(m)}>
              <Ionicons name={m.done ? "checkbox" : "square-outline"} size={20} color={m.done ? COLORS.accent : COLORS.sub} />
            </TouchableOpacity>
            <Text style={[styles.milestoneText, m.done && styles.milestoneTextDone]}>{m.title}</Text>
            <View style={styles.milestoneActions}>
              <TouchableOpacity disabled={idx === 0} onPress={() => moveMilestone(idx, -1)}>
                <Ionicons name="chevron-up" size={18} color={idx === 0 ? COLORS.border : COLORS.sub} />
              </TouchableOpacity>
              <TouchableOpacity disabled={idx === goal.milestones.length - 1} onPress={() => moveMilestone(idx, 1)}>
                <Ionicons name="chevron-down" size={18} color={idx === goal.milestones.length - 1 ? COLORS.border : COLORS.sub} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeMilestone(m)}><Ionicons name="close" size={16} color={COLORS.sub} /></TouchableOpacity>
            </View>
          </View>
        ))}
        {!goal.milestones.length && <Text style={styles.emptySmall}>No milestones yet.</Text>}

        <Text style={styles.sectionTitle}>Journal</Text>
        <View style={styles.composer}>
          <TextInput style={[styles.input, styles.multiline]} placeholder="How's it going? Write a private note..." value={journalContent} onChangeText={setJournalContent} multiline />
          <TouchableOpacity style={styles.secondaryButton} onPress={postJournal} disabled={posting}>
            <Text style={styles.secondaryButtonText}>{posting ? "Saving..." : "Save entry"}</Text>
          </TouchableOpacity>
        </View>
        {(journal || []).map((j) => (
          <View key={j.id} style={styles.journalCard}>
            <View style={styles.journalTop}>
              <Text style={styles.journalMeta}>{timeAgo(j.createdAt)}</Text>
              <TouchableOpacity onPress={() => removeJournal(j.id)}><Ionicons name="trash-outline" size={14} color={COLORS.sub} /></TouchableOpacity>
            </View>
            <Text style={styles.journalContent}>{j.content}</Text>
          </View>
        ))}
        {!(journal || []).length && <Text style={styles.emptySmall}>No journal entries for this goal yet.</Text>}

        <TouchableOpacity style={styles.dangerButton} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={16} color="#D32F2F" />
          <Text style={styles.dangerButtonText}>Delete this goal</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditGoalModal visible={editVisible} onClose={() => setEditVisible(false)} goal={goal} onSaved={() => { setEditVisible(false); load(); }} />
    </View>
  );
}

function EditGoalModal({ visible, onClose, goal, onSaved }) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || "");
  const [lifeArea, setLifeArea] = useState(goal.lifeArea);
  const [status, setStatus] = useState(goal.status);
  const [targetDate, setTargetDate] = useState(goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : "");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    if (!title.trim()) return Alert.alert("Title required", "Give this goal a name");
    let target;
    if (targetDate.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD");
      target = new Date(`${targetDate.trim()}T00:00:00`).getTime();
      if (isNaN(target)) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD");
    } else {
      target = null;
    }
    const justAchieved = status === "achieved" && goal.status !== "achieved";
    setSubmitting(true);
    try {
      await client.patch(`/myplans/goals/${goal.id}`, { title: title.trim(), description: description.trim(), lifeArea, status, targetDate: target });
      onSaved();
      if (justAchieved) {
        Alert.alert("🎉 Goal achieved!", `"${title.trim()}" just moved to your Wins.`);
      }
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Edit goal</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Goal title" />
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Description (optional)" multiline />

        <Text style={styles.label}>Status</Text>
        <View style={styles.optionRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity key={s} style={[styles.optionChip, status === s && styles.optionChipActive]} onPress={() => setStatus(s)}>
              <Text style={[styles.optionChipText, status === s && styles.optionChipTextActive]}>{STATUS_LABELS[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Life area</Text>
        <View style={styles.optionRow}>
          {LIFE_AREAS.map((a) => (
            <TouchableOpacity key={a} style={[styles.optionChip, lifeArea === a && styles.optionChipActive]} onPress={() => setLifeArea(lifeArea === a ? null : a)}>
              <Text style={[styles.optionChipText, lifeArea === a && styles.optionChipTextActive]}>{LIFE_AREA_LABELS[a]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Target date</Text>
        <TextInput style={styles.input} value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" />

        <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Save changes"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.ink, flex: 1 },
  description: { color: COLORS.sub, marginTop: 8, lineHeight: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" },
  statusPill: { backgroundColor: COLORS.wash, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { color: COLORS.ink, fontSize: 11, fontWeight: "700" },
  areaPill: { backgroundColor: COLORS.wash, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  areaPillText: { color: COLORS.accent, fontSize: 10.5, fontWeight: "700" },
  metaText: { color: COLORS.sub, fontSize: 11.5 },
  sectionTitle: { fontSize: 14.5, fontWeight: "800", color: COLORS.ink, marginTop: 24, marginBottom: 8 },
  barTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },
  composer: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12 },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  secondaryButtonText: { color: COLORS.accent, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink, backgroundColor: COLORS.surface, marginBottom: 10 },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginTop: 8 },
  milestoneCheck: { padding: 2 },
  milestoneText: { flex: 1, color: COLORS.ink, fontSize: 13.5 },
  milestoneTextDone: { color: COLORS.sub, textDecorationLine: "line-through" },
  milestoneActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  emptySmall: { color: COLORS.sub, fontSize: 12.5, marginTop: 8 },
  journalCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 8 },
  journalTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  journalMeta: { color: COLORS.sub, fontSize: 11, fontWeight: "600" },
  journalContent: { color: COLORS.ink, fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  dangerButton: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#D32F2F", borderRadius: 8, padding: 12, marginTop: 28 },
  dangerButtonText: { color: "#D32F2F", fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: "85%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 16, marginBottom: 12 },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 5, marginTop: 4, fontWeight: "600" },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12 },
  optionChipTextActive: { color: COLORS.accentInk },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 10 },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700" },
});
