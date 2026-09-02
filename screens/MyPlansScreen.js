import React, { useCallback, useMemo, useState } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, TouchableWithoutFeedback, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import FeatureAccessModal from "../components/FeatureAccessModal";
import { COLORS } from "../theme";

// "Business" and "Mental Health" split out from the more general
// Career/Health buckets — named to match how people actually describe
// goals in this category (savings goal, relationship goal, mental health
// goal, business goal) rather than the original 8-way taxonomy alone.
const LIFE_AREAS = [
  { key: "finances", label: "Savings & Finances" },
  { key: "business", label: "Business" },
  { key: "career", label: "Career" },
  { key: "relationships", label: "Relationships" },
  { key: "mental_health", label: "Mental Health" },
  { key: "health", label: "Physical Health" },
  { key: "education", label: "Education" },
  { key: "spiritual", label: "Spiritual" },
  { key: "personal_growth", label: "Personal Growth" },
  { key: "other", label: "Other" },
];
const LIFE_AREA_LABELS = Object.fromEntries(LIFE_AREAS.map((a) => [a.key, a.label]));
const NO_AREA_LABEL = "Uncategorized";

const STATUS_LABELS = { not_started: "Not started", in_progress: "In Progress", achieved: "Achieved", abandoned: "Abandoned" };
const STATUS_COLORS = {
  not_started: { bg: COLORS.wash, fg: COLORS.sub },
  in_progress: { bg: "#FFF3CD", fg: "#8A6D00" },
  achieved: { bg: "#E3F5E9", fg: "#2E7D32" },
  abandoned: { bg: "#EEE", fg: "#777" },
};

export default function MyPlansScreen({ navigation }) {
  const [hasAccess, setHasAccess] = useState(true);
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  const [vision, setVision] = useState(null);
  const [goals, setGoals] = useState(null);
  const [visionModalVisible, setVisionModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const load = useCallback(() => {
    client.get("/access/status").then((r) => setHasAccess(!!r.data.access?.project)).catch(() => {});
    client.get("/myplans/vision").then((r) => setVision(r.data)).catch(() => {});
    client.get("/myplans/goals").then((r) => setGoals(r.data)).catch((e) => {
      setGoals([]);
      if (!e.response?.data?.requiresAccess) Alert.alert("Couldn't load your goals", e.response?.data?.error || e.message);
    });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Achieved goals get pulled into their own "Wins" section up top — a
  // trophy shelf, rather than sitting buried in their life-area group with
  // just a green pill to show for it. Everything else keeps the existing
  // by-life-area grouping (in LIFE_AREAS' own order; an area only gets a
  // section once it actually has a goal in it; anything without a life
  // area falls into its own trailing bucket).
  const sections = useMemo(() => {
    if (!goals) return [];
    const wins = goals
      .filter((g) => g.status === "achieved")
      .sort((a, b) => (b.achievedAt || b.updatedAt || 0) - (a.achievedAt || a.updatedAt || 0));
    const rest = goals.filter((g) => g.status !== "achieved");

    const byArea = new Map();
    for (const g of rest) {
      const key = g.lifeArea || "__none";
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key).push(g);
    }
    const ordered = [];
    if (wins.length) ordered.push({ title: "🏆 Wins", kind: "wins", data: wins });
    ordered.push(
      ...LIFE_AREAS.filter((a) => byArea.has(a.key)).map((a) => ({ title: a.label, data: byArea.get(a.key) }))
    );
    if (byArea.has("__none")) ordered.push({ title: NO_AREA_LABEL, data: byArea.get("__none") });
    return ordered;
  }, [goals]);

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(g) => g.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) =>
        section.kind === "wins" ? (
          <View style={styles.winsHeader}>
            <Text style={styles.winsHeaderText}>{section.title}</Text>
            <Text style={styles.winsHeaderCount}>{section.data.length} achieved</Text>
          </View>
        ) : (
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        )
      }
      ListHeaderComponent={
        <View>
          <View style={styles.hero}>
            <Ionicons name="rocket-outline" size={22} color={COLORS.accent} />
            <Text style={styles.heroTitle}>The PLAN</Text>
            <Text style={styles.heroSubtitle}>Your private life planner — vision, goals, and progress, seen by no one but you.</Text>
          </View>

          {!hasAccess && (
            <TouchableOpacity style={styles.accessBanner} onPress={() => setAccessModalVisible(true)}>
              <Ionicons name="lock-closed-outline" size={16} color="#8A6D00" />
              <Text style={styles.accessBannerText}>Unlock The PLAN access to write your vision and track your goals — from KES 5</Text>
              <Ionicons name="chevron-forward" size={16} color="#8A6D00" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.visionCard}
            onPress={() => (hasAccess ? setVisionModalVisible(true) : setAccessModalVisible(true))}
          >
            <View style={styles.visionHeader}>
              <Ionicons name="compass-outline" size={16} color={COLORS.accent} />
              <Text style={styles.visionLabel}>My vision</Text>
              <Ionicons name="create-outline" size={15} color={COLORS.sub} />
            </View>
            <Text style={vision?.content ? styles.visionText : styles.visionPlaceholder} numberOfLines={4}>
              {vision?.content || "Write down your purpose — what you're working toward, and why."}
            </Text>
          </TouchableOpacity>

          <View style={styles.goalsHeaderRow}>
            <Text style={styles.sectionTitle}>My goals</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => (hasAccess ? setGoalModalVisible(true) : setAccessModalVisible(true))}
            >
              <Ionicons name="add" size={16} color={COLORS.accentInk} />
              <Text style={styles.addButtonText}>New goal</Text>
            </TouchableOpacity>
          </View>

          <FeatureAccessModal
            visible={accessModalVisible}
            onClose={() => setAccessModalVisible(false)}
            feature="project"
            featureLabel="The PLAN"
            onPurchased={() => { setHasAccess(true); setAccessModalVisible(false); load(); }}
          />
          <VisionModal
            visible={visionModalVisible}
            onClose={() => setVisionModalVisible(false)}
            initialContent={vision?.content || ""}
            onSaved={(v) => { setVision(v); setVisionModalVisible(false); }}
          />
          <GoalModal
            visible={goalModalVisible}
            onClose={() => setGoalModalVisible(false)}
            onSaved={() => { setGoalModalVisible(false); load(); }}
          />
        </View>
      }
      ListEmptyComponent={
        goals === null ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /> : (
          <Text style={styles.empty}>{hasAccess ? "No goals yet — add one to start tracking." : ""}</Text>
        )
      }
      renderItem={({ item, section }) => {
        if (section.kind === "wins") {
          return (
            <TouchableOpacity style={styles.winCard} onPress={() => navigation.navigate("MyPlansGoal", { goalId: item.id })}>
              <View style={styles.winTrophy}>
                <Ionicons name="trophy" size={18} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.winTitle}>{item.title}</Text>
                <View style={styles.goalMetaRow}>
                  {!!item.lifeArea && <View style={styles.areaPill}><Text style={styles.areaPillText}>{LIFE_AREA_LABELS[item.lifeArea]}</Text></View>}
                  <Text style={styles.winMetaText}>
                    Achieved {new Date(item.achievedAt || item.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }
        const sc = STATUS_COLORS[item.status] || STATUS_COLORS.not_started;
        const doneCount = item.milestones.filter((m) => m.done).length;
        return (
          <TouchableOpacity style={styles.goalCard} onPress={() => navigation.navigate("MyPlansGoal", { goalId: item.id })}>
            <View style={styles.goalTop}>
              <Text style={styles.goalTitle}>{item.title}</Text>
              <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusPillText, { color: sc.fg }]}>{STATUS_LABELS[item.status]}</Text>
              </View>
            </View>
            <View style={styles.goalMetaRow}>
              {!!item.lifeArea && <View style={styles.areaPill}><Text style={styles.areaPillText}>{LIFE_AREA_LABELS[item.lifeArea]}</Text></View>}
              {!!item.targetDate && <Text style={styles.goalMetaText}>Target: {new Date(item.targetDate).toLocaleDateString()}</Text>}
            </View>
            {!!item.milestones.length && <Text style={styles.goalMetaText}>{doneCount} of {item.milestones.length} milestones done</Text>}
          </TouchableOpacity>
        );
      }}
    />
  );
}

function VisionModal({ visible, onClose, initialContent, onSaved }) {
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => { if (visible) setContent(initialContent); }, [visible, initialContent]);

  async function save() {
    setSubmitting(true);
    try {
      const { data } = await client.put("/myplans/vision", { content: content.trim() });
      onSaved(data);
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>My vision</Text>
        <Text style={styles.tabHint}>Private to you — never shown to anyone else. What's your purpose? What are you working toward?</Text>
        <TextInput style={[styles.input, styles.multiline]} value={content} onChangeText={setContent} multiline placeholder="I want to..." autoFocus />
        <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Save vision"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GoalModal({ visible, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [lifeArea, setLifeArea] = useState(null);
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => { if (visible) { setTitle(""); setLifeArea(null); setTargetDate(""); } }, [visible]);

  async function save() {
    if (!title.trim()) return Alert.alert("Title required", "Give this goal a name");
    let target;
    if (targetDate.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD, e.g. 2026-12-31");
      target = new Date(`${targetDate.trim()}T00:00:00`).getTime();
      if (isNaN(target)) return Alert.alert("Invalid date", "Use the format YYYY-MM-DD, e.g. 2026-12-31");
    }
    setSubmitting(true);
    try {
      await client.post("/myplans/goals", { title: title.trim(), lifeArea: lifeArea || undefined, targetDate: target });
      onSaved();
    } catch (e) {
      Alert.alert("Couldn't add goal", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>New goal</Text>
        <TextInput style={styles.input} placeholder="e.g. Run a half marathon" value={title} onChangeText={setTitle} autoFocus />
        <Text style={styles.label}>Life area (optional)</Text>
        <View style={styles.optionRow}>
          {LIFE_AREAS.map((a) => (
            <TouchableOpacity key={a.key} style={[styles.optionChip, lifeArea === a.key && styles.optionChipActive]} onPress={() => setLifeArea(lifeArea === a.key ? null : a.key)}>
              <Text style={[styles.optionChipText, lifeArea === a.key && styles.optionChipTextActive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Target date (optional)</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={targetDate} onChangeText={setTargetDate} />
        <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Adding..." : "Add goal"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: COLORS.accentInk, marginHorizontal: 12, marginTop: 12, borderRadius: 12, paddingVertical: 20, paddingHorizontal: 20, alignItems: "center" },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 8 },
  heroSubtitle: { color: "#B9C6DC", fontSize: 12, marginTop: 6, textAlign: "center", lineHeight: 18 },
  accessBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF3CD", borderRadius: 10, padding: 12, marginHorizontal: 12, marginTop: 12 },
  accessBannerText: { color: "#8A6D00", fontSize: 12, fontWeight: "600", flex: 1 },
  visionCard: { backgroundColor: COLORS.surface, marginHorizontal: 12, marginTop: 12, borderRadius: 10, padding: 14 },
  visionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  visionLabel: { flex: 1, color: COLORS.ink, fontWeight: "800", fontSize: 13.5 },
  visionText: { color: COLORS.ink, fontSize: 13.5, marginTop: 8, lineHeight: 19 },
  visionPlaceholder: { color: COLORS.sub, fontSize: 13, marginTop: 8, lineHeight: 19, fontStyle: "italic" },
  goalsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 12, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  sectionHeaderText: { fontSize: 11.5, fontWeight: "800", color: COLORS.accent, textTransform: "uppercase", letterSpacing: 0.4, marginHorizontal: 12, marginTop: 16, marginBottom: 4 },
  winsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 12, marginTop: 16, marginBottom: 4,
  },
  winsHeaderText: { fontSize: 13.5, fontWeight: "800", color: COLORS.accentInk },
  winsHeaderCount: { fontSize: 11, fontWeight: "700", color: COLORS.sub },
  addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  addButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12.5 },
  empty: { textAlign: "center", color: COLORS.sub, marginTop: 30 },
  goalCard: { backgroundColor: COLORS.surface, marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 14 },
  goalTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  goalTitle: { color: COLORS.ink, fontSize: 14.5, fontWeight: "700", flex: 1 },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10.5, fontWeight: "700" },
  winCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFBF0", borderWidth: 1, borderColor: COLORS.accent,
    marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 14,
  },
  winTrophy: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#FBF0D2",
    alignItems: "center", justifyContent: "center",
  },
  winTitle: { color: COLORS.ink, fontSize: 14.5, fontWeight: "700" },
  winMetaText: { color: COLORS.sub, fontSize: 11.5, marginTop: 4 },
  goalMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  areaPill: { backgroundColor: COLORS.wash, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  areaPillText: { color: COLORS.accent, fontSize: 10.5, fontWeight: "700" },
  goalMetaText: { color: COLORS.sub, fontSize: 11.5, marginTop: 4 },
  kbAvoid: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28, maxHeight: "85%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 16, marginBottom: 10 },
  tabHint: { color: COLORS.sub, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink, backgroundColor: COLORS.surface, marginBottom: 10 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 5, fontWeight: "600" },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12 },
  optionChipTextActive: { color: COLORS.accentInk },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700" },
});
