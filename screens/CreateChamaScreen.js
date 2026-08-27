import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Switch } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import { COLORS } from "../theme";

function OptionRow({ label, options, value, onChange }) {
  return (
    <View style={styles.optionRow}>
      {options.map((o) => (
        <TouchableOpacity key={o.value} style={[styles.optionChip, value === o.value && styles.optionChipActive]} onPress={() => onChange(o.value)}>
          <Text style={[styles.optionChipText, value === o.value && styles.optionChipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function CreateChamaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState(null);
  const [maxMembers, setMaxMembers] = useState("10");
  const [contributionType, setContributionType] = useState("fixed_recurring");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionFrequency, setContributionFrequency] = useState("weekly");
  const [contributionLateFeeRate, setContributionLateFeeRate] = useState("10");
  const [goalAmount, setGoalAmount] = useState("");
  const [payoutModel, setPayoutModel] = useState("merry_go_round");
  const [loanInterestRate, setLoanInterestRate] = useState("10");
  const [loanMaxMultiplier, setLoanMaxMultiplier] = useState("3");
  const [loanTermWeeks, setLoanTermWeeks] = useState("4");
  const [latePenaltyRate, setLatePenaltyRate] = useState("5");
  const [joinPolicy, setJoinPolicy] = useState("approval");
  const [membersVisible, setMembersVisible] = useState(true);
  const [county, setCounty] = useState("");
  const [subCounty, setSubCounty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  function handleCountyChange(c) {
    setCounty(c);
    setSubCounty("");
  }

  // Table banking lends against members' contribution history, so it needs
  // a predictable recurring cadence — switching to it forces (and locks)
  // fixed recurring contributions, same rule routes/chama.js enforces
  // server-side.
  function handlePayoutModelChange(model) {
    setPayoutModel(model);
    if (model === "table_banking") setContributionType("fixed_recurring");
  }

  async function handlePickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to pick a cover photo");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    setCover({ uri: asset.uri, mimeType, fileName: asset.fileName || `cover.${mimeType.split("/")[1]}` });
  }

  async function handleCreate() {
    if (!name.trim()) return Alert.alert("Name required", "Give your Chama a name");
    const max = parseInt(maxMembers, 10);
    if (!Number.isInteger(max) || max < 2) return Alert.alert("Invalid size", "Max members must be 2 or more");
    if (contributionType === "fixed_recurring" && (!parseInt(contributionAmount, 10) || parseInt(contributionAmount, 10) <= 0)) {
      return Alert.alert("Invalid amount", "Enter a contribution amount in KES");
    }
    if (contributionType === "fixed_recurring" && (contributionLateFeeRate === "" || isNaN(parseFloat(contributionLateFeeRate)) || parseFloat(contributionLateFeeRate) < 0)) {
      return Alert.alert("Invalid late fee", "Enter a late fee percentage (0 or more)");
    }
    if (contributionType === "goal_based" && (!parseInt(goalAmount, 10) || parseInt(goalAmount, 10) <= 0)) {
      return Alert.alert("Invalid goal", "Enter a savings goal in KES");
    }
    if (payoutModel === "table_banking") {
      if (loanInterestRate === "" || isNaN(parseFloat(loanInterestRate)) || parseFloat(loanInterestRate) < 0) return Alert.alert("Invalid interest rate", "Enter a loan interest percentage (0 or more)");
      if (!parseFloat(loanMaxMultiplier) || parseFloat(loanMaxMultiplier) <= 0) return Alert.alert("Invalid multiplier", "Enter how many times a member's savings they can borrow");
      if (!parseInt(loanTermWeeks, 10) || parseInt(loanTermWeeks, 10) <= 0) return Alert.alert("Invalid term", "Enter a loan repayment term in weeks");
      if (latePenaltyRate === "" || isNaN(parseFloat(latePenaltyRate)) || parseFloat(latePenaltyRate) < 0) return Alert.alert("Invalid penalty", "Enter a late-penalty percentage (0 or more)");
    }
    if (!county || !subCounty) return Alert.alert("Location required", "Select the county and sub-county your Chama meets in");

    setSubmitting(true);
    try {
      let coverUrl;
      if (cover) {
        setUploading(true);
        const form = new FormData();
        form.append("file", { uri: cover.uri, name: cover.fileName, type: cover.mimeType });
        const { data: uploaded } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
        coverUrl = uploaded.url;
        setUploading(false);
      }

      const { data } = await client.post("/chama", {
        name: name.trim(), description: description.trim(), coverUrl, maxMembers: max,
        contributionType, contributionAmount: contributionType === "fixed_recurring" ? parseInt(contributionAmount, 10) : undefined,
        contributionFrequency: contributionType === "fixed_recurring" ? contributionFrequency : undefined,
        contributionLateFeeRate: contributionType === "fixed_recurring" ? parseFloat(contributionLateFeeRate) : undefined,
        goalAmount: contributionType === "goal_based" ? parseInt(goalAmount, 10) : undefined,
        payoutModel, joinPolicy, membersVisibleToMembers: membersVisible,
        loanInterestRate: payoutModel === "table_banking" ? parseFloat(loanInterestRate) : undefined,
        loanMaxMultiplier: payoutModel === "table_banking" ? parseFloat(loanMaxMultiplier) : undefined,
        loanTermWeeks: payoutModel === "table_banking" ? parseInt(loanTermWeeks, 10) : undefined,
        latePenaltyRate: payoutModel === "table_banking" ? parseFloat(latePenaltyRate) : undefined,
        county, subCounty,
      });
      Alert.alert("Chama created!", "You're the admin — start inviting members.");
      navigation.replace("ChamaDetail", { chamaId: data.id });
    } catch (e) {
      if (e.response?.data?.requiresAccess) {
        Alert.alert(
          "Chama access required",
          e.response.data.error,
          [
            { text: "Not now", style: "cancel" },
            { text: "Get access", onPress: () => navigation.navigate("ChamaHome") },
          ]
        );
      } else {
        Alert.alert("Couldn't create Chama", e.response?.data?.error || e.message);
      }
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Chama name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Umoja Savings Group" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What's this Chama for?" multiline />

        <Text style={styles.label}>Cover photo</Text>
        {cover ? (
          <View style={styles.coverPreviewWrap}>
            <Image source={{ uri: cover.uri }} style={styles.coverPreview} contentFit="cover" />
            <TouchableOpacity style={styles.coverRemoveButton} onPress={() => setCover(null)}><Ionicons name="close" size={16} color="#fff" /></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover}>
            <Ionicons name="image-outline" size={22} color={COLORS.accent} />
            <Text style={styles.coverPickerText}>Choose a cover photo</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Target number of positions</Text>
        <TextInput style={styles.input} value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" placeholder="10" />

        <Text style={styles.sectionTitle}>Contribution type</Text>
        <OptionRow
          options={
            payoutModel === "table_banking"
              ? [{ value: "fixed_recurring", label: "Fixed recurring" }]
              : [{ value: "fixed_recurring", label: "Fixed recurring" }, { value: "goal_based", label: "Goal-based" }]
          }
          value={contributionType} onChange={setContributionType}
        />
        {payoutModel === "table_banking" && (
          <Text style={styles.hint}>Table banking requires a fixed weekly or monthly contribution to fund the loan pool.</Text>
        )}
        {contributionType === "fixed_recurring" ? (
          <>
            <Text style={styles.label}>Contribution amount (KES)</Text>
            <TextInput style={styles.input} value={contributionAmount} onChangeText={setContributionAmount} keyboardType="number-pad" placeholder="500" />
            <Text style={styles.label}>Frequency</Text>
            <OptionRow options={[{ value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} value={contributionFrequency} onChange={setContributionFrequency} />
            <Text style={styles.label}>Late fee (% of the missed contribution, charged once past deadline)</Text>
            <TextInput style={styles.input} value={contributionLateFeeRate} onChangeText={setContributionLateFeeRate} keyboardType="decimal-pad" placeholder="10" />
          </>
        ) : (
          <>
            <Text style={styles.label}>Savings goal (KES)</Text>
            <TextInput style={styles.input} value={goalAmount} onChangeText={setGoalAmount} keyboardType="number-pad" placeholder="500000" />
          </>
        )}

        <Text style={styles.sectionTitle}>Payout model</Text>
        <OptionRow
          options={[{ value: "merry_go_round", label: "Merry-go-round" }, { value: "pooled_savings", label: "Pooled savings" }, { value: "table_banking", label: "Table banking" }]}
          value={payoutModel} onChange={handlePayoutModelChange}
        />
        <Text style={styles.hint}>
          {payoutModel === "merry_go_round"
            ? "Funds rotate — one member receives the payout each cycle."
            : payoutModel === "pooled_savings"
            ? "Funds stay pooled — members can request withdrawals with admin approval."
            : "Funds stay pooled and members can borrow against them, with interest and a repayment term you set below."}
        </Text>
        {payoutModel === "table_banking" && (
          <>
            <Text style={styles.label}>Loan interest rate (% of the amount borrowed)</Text>
            <TextInput style={styles.input} value={loanInterestRate} onChangeText={setLoanInterestRate} keyboardType="decimal-pad" placeholder="10" />
            <Text style={styles.label}>Max loan size (× a member's total contributions)</Text>
            <TextInput style={styles.input} value={loanMaxMultiplier} onChangeText={setLoanMaxMultiplier} keyboardType="decimal-pad" placeholder="3" />
            <Text style={styles.label}>Repayment term (weeks)</Text>
            <TextInput style={styles.input} value={loanTermWeeks} onChangeText={setLoanTermWeeks} keyboardType="number-pad" placeholder="4" />
            <Text style={styles.label}>Late penalty (% of the outstanding balance, charged once overdue)</Text>
            <TextInput style={styles.input} value={latePenaltyRate} onChangeText={setLatePenaltyRate} keyboardType="decimal-pad" placeholder="5" />
          </>
        )}

        <Text style={styles.sectionTitle}>Joining</Text>
        <OptionRow options={[{ value: "approval", label: "Requires approval" }, { value: "open", label: "Open until full" }]} value={joinPolicy} onChange={setJoinPolicy} />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Members can see who else is in the Chama</Text>
          <Switch value={membersVisible} onValueChange={setMembersVisible} trackColor={{ true: COLORS.accent }} />
        </View>

        <Text style={styles.sectionTitle}>Where does this Chama meet?</Text>
        <Text style={styles.label}>County</Text>
        <CountyPicker value={county} onChange={handleCountyChange} />
        <Text style={styles.label}>Sub-county</Text>
        <SubCountyPicker county={county} value={subCounty} onChange={setSubCounty} />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>{uploading ? "Uploading cover..." : "Create Chama"}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  sectionTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "700", marginTop: 20 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  coverPicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 8, paddingVertical: 22 },
  coverPickerText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  coverPreviewWrap: { borderRadius: 8, overflow: "hidden" },
  coverPreview: { width: "100%", height: 150, backgroundColor: "#eee" },
  coverRemoveButton: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  optionRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12.5 },
  optionChipTextActive: { color: COLORS.accentInk },
  hint: { color: COLORS.sub, fontSize: 12, marginTop: 8, lineHeight: 17 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 12 },
  switchLabel: { color: COLORS.ink, fontSize: 13, flex: 1 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 24 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
});
