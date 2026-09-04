import React, { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

// Each field pairs a plain-language label with a "clue" describing exactly
// what belongs in it — the whole point of a guided form instead of one big
// free-text box, so a first-time admin isn't staring at a blank page
// wondering what a "business plan" is supposed to contain.
const FIELDS = [
  {
    key: "businessIdea", label: "Business idea",
    clue: "What exactly will this business do? Describe the product or service in a few sentences, and why it makes sense for this group to run it.",
    placeholder: "e.g. A poultry farm selling eggs and broiler chicken to hotels and households nearby.",
  },
  {
    key: "targetMarket", label: "Target market",
    clue: "Who will actually buy from you? Describe your customers — who they are, where they are, and roughly how many potential buyers are within reach.",
    placeholder: "e.g. Hotels, restaurants, and households within 5km of the farm.",
  },
  {
    key: "productsPricing", label: "Products & pricing",
    clue: "List everything you'll sell and how much each will cost.",
    placeholder: "e.g. Eggs — KES 15 each. Broiler chicken — KES 600 each.",
  },
  {
    key: "startupCosts", label: "Startup costs",
    clue: "List every item needed to get started and its cost — equipment, stock, rent, licenses, anything else. This is what a pool/project funding request should be based on.",
    placeholder: "e.g. Chicken coop — 50,000. Day-old chicks (200) — 30,000. Feed (first 2 months) — 20,000.",
  },
  {
    key: "revenueProjection", label: "Revenue projection",
    clue: "Estimate your expected monthly sales, monthly running costs, and the profit left over. Rough numbers are fine — this is a plan, not an audit.",
    placeholder: "e.g. Expect KES 40,000/month in sales, KES 15,000/month running costs, KES 25,000/month profit.",
  },
  {
    key: "operations", label: "Operations",
    clue: "Where will this actually run from, and who's doing the day-to-day work? Name roles/responsibilities, not just \"the group.\"",
    placeholder: "e.g. Runs from [member]'s land in Kikuyu. Two members rotate feeding/collection duties weekly.",
  },
  {
    key: "risks", label: "Risks & how you'll handle them",
    clue: "What could realistically go wrong, and what's the plan if it does?",
    placeholder: "e.g. Disease outbreak — mitigated by a strict vaccination schedule and a vet on call.",
  },
];

export default function ChamaProjectBusinessPlanScreen({ route }) {
  const { chamaId, projectId, isAdmin } = route.params;
  const [plan, setPlan] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    client.get(`/chama/${chamaId}/projects/${projectId}/business-plan`)
      .then((r) => {
        setPlan(r.data);
        setValues(Object.fromEntries(FIELDS.map((f) => [f.key, r.data[f.key] || ""])));
      })
      .catch((e) => Alert.alert("Couldn't load business plan", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [chamaId, projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    setSaving(true);
    try {
      const { data } = await client.put(`/chama/${chamaId}/projects/${projectId}/business-plan`, values);
      setPlan(data);
      Alert.alert("Saved", "The business plan has been updated.");
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.intro}>
        {isAdmin
          ? "Fill this in so members know exactly what they're funding — each section below explains what belongs in it."
          : "What this project's admin has laid out for the business."}
      </Text>
      {!!plan?.updatedAt && <Text style={styles.updatedAt}>Last updated {new Date(plan.updatedAt).toLocaleDateString()}</Text>}

      {FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <Text style={styles.clue}>{f.clue}</Text>
          {isAdmin ? (
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={f.placeholder}
              placeholderTextColor={COLORS.sub}
              value={values[f.key]}
              onChangeText={(t) => setValues((prev) => ({ ...prev, [f.key]: t }))}
              multiline
            />
          ) : (
            <Text style={values[f.key] ? styles.filledText : styles.emptyText}>
              {values[f.key] || "Not filled in yet."}
            </Text>
          )}
        </View>
      ))}

      {isAdmin && (
        <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save business plan"}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  intro: { color: COLORS.sub, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  updatedAt: { color: COLORS.sub, fontSize: 11, marginBottom: 10 },
  field: { marginTop: 18 },
  label: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  clue: { fontSize: 12, color: COLORS.sub, lineHeight: 17, marginTop: 3, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 11, color: COLORS.ink, backgroundColor: COLORS.surface },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  filledText: { color: COLORS.ink, fontSize: 13.5, lineHeight: 19, backgroundColor: COLORS.surface, borderRadius: 8, padding: 11 },
  emptyText: { color: COLORS.sub, fontSize: 13, fontStyle: "italic", backgroundColor: COLORS.surface, borderRadius: 8, padding: 11 },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 24, marginBottom: 8 },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700" },
});
