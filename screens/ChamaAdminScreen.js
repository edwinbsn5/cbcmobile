import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Alert, Switch, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

function formatKES(n) { return `KES ${Math.round(n || 0).toLocaleString()}`; }

const TABS = ["Requests", "Members", "Contributions", "Payouts", "Withdrawals", "Settings", "Audit"];

export default function ChamaAdminScreen({ route }) {
  const { chamaId } = route.params;
  const [tab, setTab] = useState("Requests");
  const [chama, setChama] = useState(null);

  const load = useCallback(() => { client.get(`/chama/${chamaId}`).then((r) => setChama(r.data)).catch(() => {}); }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!chama) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 10 }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.body} contentContainerStyle={{ padding: 14 }}>
        {tab === "Requests" && <RequestsTab chamaId={chamaId} onChange={load} />}
        {tab === "Members" && <MembersTab chamaId={chamaId} chama={chama} onChange={load} />}
        {tab === "Contributions" && <ContributionsTab chamaId={chamaId} />}
        {tab === "Payouts" && <PayoutsTab chamaId={chamaId} chama={chama} onChange={load} />}
        {tab === "Withdrawals" && <WithdrawalsTab chamaId={chamaId} />}
        {tab === "Settings" && <SettingsTab chamaId={chamaId} chama={chama} onChange={load} />}
        {tab === "Audit" && <AuditTab chamaId={chamaId} />}
      </ScrollView>
    </View>
  );
}

function RequestsTab({ chamaId, onChange }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => { client.get(`/chama/${chamaId}/requests`).then((r) => setData(r.data)).catch(() => setData({ pending: [], waitlisted: [] })); }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function decide(memberId, action) {
    try {
      await client.post(`/chama/${chamaId}/requests/${memberId}/${action}`);
      load(); onChange();
    } catch (e) {
      Alert.alert("Action failed", e.response?.data?.error || e.message);
    }
  }

  if (!data) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <Text style={styles.sectionTitle}>Pending requests ({data.pending.length})</Text>
      {data.pending.map((m) => (
        <View key={m.id} style={styles.row}>
          <Text style={styles.rowName}>{m.user?.name}</Text>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => decide(m.id, "approve")}><Text style={styles.approveBtnText}>Approve</Text></TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => decide(m.id, "reject")}><Text style={styles.rejectBtnText}>Reject</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {!data.pending.length && <Text style={styles.empty}>No pending requests</Text>}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Waitlist ({data.waitlisted.length})</Text>
      {data.waitlisted.map((m, idx) => (
        <View key={m.id} style={styles.row}>
          <Text style={styles.rowName}>#{idx + 1} {m.user?.name}</Text>
          <TouchableOpacity style={styles.approveBtn} onPress={() => decide(m.id, "approve")}><Text style={styles.approveBtnText}>Admit now</Text></TouchableOpacity>
        </View>
      ))}
      {!data.waitlisted.length && <Text style={styles.empty}>Waitlist is empty</Text>}
    </View>
  );
}

function MembersTab({ chamaId, chama, onChange }) {
  const [members, setMembers] = useState(null);
  const load = useCallback(() => { client.get(`/chama/${chamaId}/members`).then((r) => setMembers(r.data)).catch(() => setMembers([])); }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function remove(memberId, name) {
    Alert.alert("Remove member", `Remove ${name} from this Chama?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try { await client.post(`/chama/${chamaId}/members/${memberId}/remove`); load(); onChange(); }
        catch (e) { Alert.alert("Couldn't remove", e.response?.data?.error || e.message); }
      } },
    ]);
  }

  async function makeTreasurer(userId) {
    try { await client.post(`/chama/${chamaId}/treasurer`, { userId }); load(); }
    catch (e) { Alert.alert("Couldn't assign", e.response?.data?.error || e.message); }
  }

  if (!members) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      {members.map((m) => (
        <View key={m.id} style={styles.memberCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{m.user?.name}{m.userId === chama.creatorId ? " (Creator)" : ""}</Text>
            <Text style={styles.rowSub}>{m.role === "treasurer" ? "Treasurer" : m.role === "admin" ? "Admin" : "Member"}{m.defaulter?.isDefaulter ? " · Behind on contributions" : ""}</Text>
          </View>
          {m.userId !== chama.creatorId && (
            <View style={styles.rowActions}>
              {m.role !== "treasurer" && <TouchableOpacity style={styles.smallBtn} onPress={() => makeTreasurer(m.userId)}><Text style={styles.smallBtnText}>Make Treasurer</Text></TouchableOpacity>}
              <TouchableOpacity style={styles.rejectBtn} onPress={() => remove(m.id, m.user?.name)}><Text style={styles.rejectBtnText}>Remove</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function ContributionsTab({ chamaId }) {
  const [defaulters, setDefaulters] = useState(null);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => { client.get(`/chama/${chamaId}/defaulters`).then((r) => setDefaulters(r.data)).catch(() => setDefaulters([])); }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function recordManual() {
    if (!userId.trim()) return Alert.alert("Missing member", "Paste the member's user ID (tap a defaulter below to fill it in)");
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount");
    setSubmitting(true);
    try {
      await client.post(`/chama/${chamaId}/contributions/manual`, { userId: userId.trim(), amount: amt, note });
      Alert.alert("Recorded", "Cash contribution recorded");
      setAmount(""); setNote("");
      load();
    } catch (e) {
      Alert.alert("Couldn't record", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remindAll() {
    try {
      const { data } = await client.post(`/chama/${chamaId}/remind`, {});
      Alert.alert("Reminders sent", `Notified ${data.remindedCount} member(s)`);
    } catch (e) {
      Alert.alert("Couldn't send", e.response?.data?.error || e.message);
    }
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Record a cash contribution</Text>
      <TextInput style={styles.input} placeholder="Member user ID" value={userId} onChangeText={setUserId} />
      <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
      <TextInput style={styles.input} placeholder="Note (optional)" value={note} onChangeText={setNote} />
      <TouchableOpacity style={styles.approveBtn} onPress={recordManual} disabled={submitting}>
        <Text style={styles.approveBtnText}>{submitting ? "Saving..." : "Record contribution"}</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Defaulters ({defaulters?.length ?? 0})</Text>
        {!!defaulters?.length && <TouchableOpacity style={styles.smallBtn} onPress={remindAll}><Text style={styles.smallBtnText}>Remind all</Text></TouchableOpacity>}
      </View>
      {defaulters === null && <ActivityIndicator color={COLORS.accent} />}
      {defaulters?.map((d) => (
        <TouchableOpacity key={d.member.id} style={styles.row} onPress={() => setUserId(d.user.id)}>
          <Text style={styles.rowName}>{d.user?.name}</Text>
          <Text style={styles.rowSub}>{d.periodsPaid}/{d.periodsDue} periods paid</Text>
        </TouchableOpacity>
      ))}
      {defaulters?.length === 0 && <Text style={styles.empty}>No one is behind — nice!</Text>}
    </View>
  );
}

function PayoutsTab({ chamaId, chama, onChange }) {
  const [rotation, setRotation] = useState(null);
  const load = useCallback(() => { client.get(`/chama/${chamaId}/rotation`).then((r) => setRotation(r.data)).catch(() => setRotation([])); }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function trigger(slotId) {
    try {
      const { data } = await client.post(`/chama/${chamaId}/payouts/trigger`, { slotId });
      Alert.alert("Payout sent", `${formatKES(data.payout.amount)} sent to their wallet`);
      load(); onChange();
    } catch (e) {
      Alert.alert("Payout failed", e.response?.data?.error || e.message);
    }
  }

  async function shuffle() {
    try { await client.post(`/chama/${chamaId}/rotation/shuffle`); load(); }
    catch (e) { Alert.alert("Couldn't shuffle", e.response?.data?.error || e.message); }
  }

  async function completeCycle() {
    try {
      await client.post(`/chama/${chamaId}/cycle/complete`);
      Alert.alert("Cycle complete", "A new cycle has started");
      load(); onChange();
    } catch (e) {
      Alert.alert("Couldn't complete cycle", e.response?.data?.error || e.message);
    }
  }

  if (chama.payoutModel !== "merry_go_round") return <Text style={styles.empty}>This Chama uses pooled savings — see the Withdrawals tab.</Text>;
  if (!rotation) return <ActivityIndicator color={COLORS.accent} />;
  const current = rotation.filter((s) => s.cycle === chama.currentCycle).sort((a, b) => a.position - b.position);
  const allPaid = current.length > 0 && current.every((s) => s.paidAt);

  return (
    <View>
      <Text style={styles.tabHint}>Pool balance: {formatKES(chama.poolBalance)} · Cycle {chama.currentCycle}</Text>
      <View style={styles.rowActions}>
        <TouchableOpacity style={styles.smallBtn} onPress={shuffle}><Text style={styles.smallBtnText}>Shuffle order</Text></TouchableOpacity>
        {allPaid && <TouchableOpacity style={styles.approveBtn} onPress={completeCycle}><Text style={styles.approveBtnText}>Start next cycle</Text></TouchableOpacity>}
      </View>
      {current.map((s) => (
        <View key={s.id} style={styles.row}>
          <Text style={styles.rowName}>#{s.position} {s.user?.name}</Text>
          {s.paidAt ? <Text style={styles.paidBadge}>Paid</Text> : <TouchableOpacity style={styles.approveBtn} onPress={() => trigger(s.id)}><Text style={styles.approveBtnText}>Trigger payout</Text></TouchableOpacity>}
        </View>
      ))}
    </View>
  );
}

function WithdrawalsTab({ chamaId }) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => { client.get(`/chama/${chamaId}/withdrawals`).then((r) => setItems(r.data)).catch(() => setItems([])); }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function decide(reqId, action) {
    try { await client.post(`/chama/${chamaId}/withdrawals/${reqId}/${action}`); load(); }
    catch (e) { Alert.alert("Action failed", e.response?.data?.error || e.message); }
  }

  if (!items) return <ActivityIndicator color={COLORS.accent} />;
  const pending = items.filter((w) => w.status === "pending");
  return (
    <View>
      <Text style={styles.sectionTitle}>Pending ({pending.length})</Text>
      {pending.map((w) => (
        <View key={w.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{w.requester?.name} — {formatKES(w.amount)}</Text>
            <Text style={styles.rowSub}>{w.reason || "No reason"} · {w.approvals.length}/{w.approvalsRequired} approvals</Text>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => decide(w.id, "approve")}><Text style={styles.approveBtnText}>Approve</Text></TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => decide(w.id, "reject")}><Text style={styles.rejectBtnText}>Reject</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {!pending.length && <Text style={styles.empty}>Nothing pending</Text>}
    </View>
  );
}

function SettingsTab({ chamaId, chama, onChange }) {
  const [maxMembers, setMaxMembers] = useState(String(chama.maxMembers));
  const [contributionAmount, setContributionAmount] = useState(String(chama.contributionAmount || ""));
  const [membersVisible, setMembersVisible] = useState(chama.membersVisibleToMembers);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body = { membersVisibleToMembers: membersVisible };
      const max = parseInt(maxMembers, 10);
      if (max && max !== chama.maxMembers) body.maxMembers = max;
      if (chama.contributionType === "fixed_recurring") {
        const amt = parseInt(contributionAmount, 10);
        if (amt && amt !== chama.contributionAmount) body.contributionAmount = amt;
      }
      await client.patch(`/chama/${chamaId}`, body);
      Alert.alert("Saved", "Settings updated");
      onChange();
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePositions() {
    try {
      await client.post(`/chama/${chamaId}/positions/${chama.joiningClosed ? "reopen" : "close"}`);
      onChange();
    } catch (e) {
      Alert.alert("Couldn't update", e.response?.data?.error || e.message);
    }
  }

  async function archive() {
    Alert.alert("Archive Chama", "This closes the Chama permanently. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: async () => {
        try { await client.post(`/chama/${chamaId}/archive`); onChange(); }
        catch (e) { Alert.alert("Couldn't archive", e.response?.data?.error || e.message); }
      } },
    ]);
  }

  async function exportReport() {
    try {
      const { data } = await client.get(`/chama/${chamaId}/reports/csv`, { responseType: "text", transformResponse: [(d) => d] });
      await Share.share({ title: `${chama.name} — financial report`, message: data });
    } catch (e) {
      Alert.alert("Couldn't export report", e.response?.data?.error || e.message);
    }
  }

  return (
    <View>
      <Text style={styles.label}>Max members</Text>
      <TextInput style={styles.input} value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" />
      {chama.contributionType === "fixed_recurring" && (
        <>
          <Text style={styles.label}>Contribution amount (KES)</Text>
          <TextInput style={styles.input} value={contributionAmount} onChangeText={setContributionAmount} keyboardType="number-pad" />
        </>
      )}
      <View style={styles.switchRow}>
        <Text style={styles.rowName}>Members can see each other</Text>
        <Switch value={membersVisible} onValueChange={setMembersVisible} trackColor={{ true: COLORS.accent }} />
      </View>
      <TouchableOpacity style={styles.approveBtn} onPress={save} disabled={saving}><Text style={styles.approveBtnText}>{saving ? "Saving..." : "Save settings"}</Text></TouchableOpacity>

      <TouchableOpacity style={[styles.smallBtn, { marginTop: 20 }]} onPress={togglePositions}>
        <Text style={styles.smallBtnText}>{chama.joiningClosed ? "Reopen positions" : "Manually close positions"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.smallBtn, { marginTop: 10 }]} onPress={exportReport}>
        <Text style={styles.smallBtnText}>Export financial report (CSV)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.rejectBtn, { marginTop: 20, alignSelf: "flex-start" }]} onPress={archive}>
        <Text style={styles.rejectBtnText}>Archive Chama</Text>
      </TouchableOpacity>
    </View>
  );
}

function AuditTab({ chamaId }) {
  const [entries, setEntries] = useState(null);
  useFocusEffect(useCallback(() => { client.get(`/chama/${chamaId}/audit-log`).then((r) => setEntries(r.data)).catch(() => setEntries([])); }, [chamaId]));
  if (!entries) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      {entries.map((e) => (
        <View key={e.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{e.action.replace(/_/g, " ")}</Text>
            <Text style={styles.rowSub}>{e.actor?.name || "System"} · {new Date(e.createdAt).toLocaleString()}</Text>
          </View>
        </View>
      ))}
      {!entries.length && <Text style={styles.empty}>No activity yet</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabRow: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 46 },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { fontSize: 12.5, color: COLORS.sub, fontWeight: "600" },
  tabTextActive: { color: COLORS.accent, fontWeight: "800" },
  body: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  memberCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  rowName: { color: COLORS.ink, fontWeight: "700", fontSize: 13 },
  rowSub: { color: COLORS.sub, fontSize: 11.5, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8 },
  approveBtn: { backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  approveBtnText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12 },
  rejectBtn: { backgroundColor: "#FBE7E7", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  rejectBtnText: { color: "#D32F2F", fontWeight: "700", fontSize: 12 },
  smallBtn: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 12 },
  paidBadge: { color: "#2E7D32", fontWeight: "700", fontSize: 12 },
  empty: { color: COLORS.sub, textAlign: "center", marginVertical: 12 },
  tabHint: { color: COLORS.sub, fontSize: 12, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 4 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 16 },
});
