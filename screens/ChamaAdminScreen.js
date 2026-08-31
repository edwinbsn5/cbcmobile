import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Alert, Switch, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import { COLORS } from "../theme";

function formatKES(n) { return `KES ${Math.round(n || 0).toLocaleString()}`; }

const TABS = ["Requests", "Members", "Contributions", "Loans", "Votes", "Settings", "Audit"];

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
        {tab === "Contributions" && <ContributionsTab chamaId={chamaId} chama={chama} />}
        {tab === "Loans" && <LoansTab chamaId={chamaId} chama={chama} onChange={load} />}
        {tab === "Votes" && <VotesTab chamaId={chamaId} />}
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

function ContributionsTab({ chamaId, chama }) {
  const [defaulters, setDefaulters] = useState(null);
  const [contributions, setContributions] = useState(null);
  const [lateFees, setLateFees] = useState(null);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    client.get(`/chama/${chamaId}/defaulters`).then((r) => setDefaulters(r.data)).catch(() => setDefaulters([]));
    client.get(`/chama/${chamaId}/contributions`).then((r) => setContributions(r.data)).catch(() => setContributions([]));
    client.get(`/chama/${chamaId}/late-fees`).then((r) => setLateFees(r.data)).catch(() => setLateFees([]));
  }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function chargeLateFee(memberUserId) {
    try {
      const { data } = await client.post(`/chama/${chamaId}/late-fees`, { memberId: memberUserId });
      Alert.alert("Late fee applied", `${formatKES(data.fee.amount)} charged`);
      load();
    } catch (e) {
      Alert.alert("Couldn't apply fee", e.response?.data?.error || e.message);
    }
  }

  async function waiveLateFee(feeId) {
    try { await client.post(`/chama/${chamaId}/late-fees/${feeId}/waive`); load(); }
    catch (e) { Alert.alert("Couldn't waive", e.response?.data?.error || e.message); }
  }

  async function markLateFeePaid(feeId) {
    try { await client.post(`/chama/${chamaId}/late-fees/${feeId}/pay`); load(); }
    catch (e) { Alert.alert("Couldn't update", e.response?.data?.error || e.message); }
  }

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

  async function toggleStatus(contribution) {
    const nextStatus = contribution.status === "contributed" ? "not_contributed" : "contributed";
    try {
      await client.patch(`/chama/${chamaId}/contributions/${contribution.id}`, { status: nextStatus });
      load();
    } catch (e) {
      Alert.alert("Couldn't update", e.response?.data?.error || e.message);
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
        <View key={d.member.id} style={styles.row}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setUserId(d.user.id)}>
            <Text style={styles.rowName}>{d.user?.name}</Text>
            <Text style={styles.rowSub}>Owes {formatKES(d.balance)} · {d.daysLate} day(s) past deadline</Text>
          </TouchableOpacity>
          {!!chama?.contributionLateFeeRate && (
            <TouchableOpacity style={styles.smallBtn} onPress={() => chargeLateFee(d.user.id)}>
              <Text style={styles.smallBtnText}>Charge {chama.contributionLateFeeRate}% fee</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {defaulters?.length === 0 && <Text style={styles.empty}>No one is behind — nice!</Text>}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Late fees</Text>
      {lateFees === null && <ActivityIndicator color={COLORS.accent} />}
      {lateFees?.map((f) => (
        <View key={f.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{f.member?.name} — {formatKES(f.amount)}</Text>
            <Text style={styles.rowSub}>{f.status === "owed" ? "Owed" : f.status === "paid" ? "Paid" : "Waived"} · {new Date(f.createdAt).toLocaleDateString()}</Text>
          </View>
          {f.status === "owed" && (
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => markLateFeePaid(f.id)}><Text style={styles.approveBtnText}>Mark paid</Text></TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => waiveLateFee(f.id)}><Text style={styles.rejectBtnText}>Waive</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      {lateFees?.length === 0 && <Text style={styles.empty}>No late fees charged yet.</Text>}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>All contributions</Text>
      <Text style={styles.tabHint}>Self-reported by members. Correct one if the cash wasn't actually received.</Text>
      {contributions === null && <ActivityIndicator color={COLORS.accent} />}
      {contributions?.map((c) => (
        <View key={c.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{c.user?.name} — {formatKES(c.amount)}</Text>
            <Text style={styles.rowSub}>{c.method === "cash_manual" ? "Recorded by admin" : "Self-reported"} · {new Date(c.createdAt).toLocaleDateString()}{c.status === "not_contributed" ? " · Not received" : ""}</Text>
          </View>
          <TouchableOpacity style={c.status === "contributed" ? styles.rejectBtn : styles.approveBtn} onPress={() => toggleStatus(c)}>
            <Text style={c.status === "contributed" ? styles.rejectBtnText : styles.approveBtnText}>
              {c.status === "contributed" ? "Mark not received" : "Mark received"}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
      {contributions?.length === 0 && <Text style={styles.empty}>No contributions recorded yet.</Text>}
    </View>
  );
}

function LoansTab({ chamaId, chama }) {
  const [loans, setLoans] = useState(null);
  const load = useCallback(() => { client.get(`/chama/${chamaId}/loans`).then((r) => setLoans(r.data)).catch(() => setLoans([])); }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function decide(loanId, action) {
    try {
      await client.post(`/chama/${chamaId}/loans/${loanId}/${action}`);
      load();
    } catch (e) {
      Alert.alert("Action failed", e.response?.data?.error || e.message);
    }
  }

  async function applyPenalty(loanId) {
    try {
      const { data } = await client.post(`/chama/${chamaId}/loans/${loanId}/penalty`);
      Alert.alert("Penalty applied", data.penalty ? `${formatKES(data.penalty)} added to the balance owed` : "No penalty needed — already up to date");
      load();
    } catch (e) {
      Alert.alert("Couldn't apply penalty", e.response?.data?.error || e.message);
    }
  }

  if (chama.payoutModel !== "table_banking") return <Text style={styles.empty}>This Chama isn't set up for table banking.</Text>;
  if (!loans) return <ActivityIndicator color={COLORS.accent} />;
  const pending = loans.filter((l) => l.status === "requested");
  const active = loans.filter((l) => l.status === "active");
  const past = loans.filter((l) => ["completed", "rejected"].includes(l.status));

  return (
    <View>
      <Text style={styles.tabHint}>
        Pool balance: {formatKES(chama.poolBalance)} · up to {chama.loanMaxMultiplier}× savings · {(chama.loanTiers || []).map((t) => `${t.rate}%/${t.days}d`).join(" · ")}
      </Text>

      <Text style={styles.sectionTitle}>Pending requests ({pending.length})</Text>
      {pending.map((l) => (
        <View key={l.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>
              {l.borrower?.name} — {formatKES(l.principal)}
              {l.missedLastTime && <Text style={styles.priorityBadge}>  PRIORITY</Text>}
            </Text>
            <Text style={styles.rowSub}>{l.reason || "No reason given"} · {l.interestRate}% over {l.termDays} days · would owe {formatKES(l.owed)} back</Text>
            {l.missedLastTime && <Text style={styles.rowSub}>Missed out last time purely for lack of pool funds</Text>}
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => decide(l.id, "approve")}><Text style={styles.approveBtnText}>Approve</Text></TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => decide(l.id, "reject")}><Text style={styles.rejectBtnText}>Reject</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {!pending.length && <Text style={styles.empty}>Nothing pending</Text>}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Active loans ({active.length})</Text>
      {active.map((l) => (
        <View key={l.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{l.borrower?.name} — {formatKES(l.remaining)} left of {formatKES(l.owed)}</Text>
            <Text style={styles.rowSub}>
              Due {new Date(l.dueAt).toLocaleDateString()}{l.isOverdue ? " · OVERDUE" : ""}
              {l.penaltiesTotal > 0 ? ` · +${formatKES(l.penaltiesTotal)} penalties` : ""}
            </Text>
          </View>
          {l.isOverdue && <TouchableOpacity style={styles.rejectBtn} onPress={() => applyPenalty(l.id)}><Text style={styles.rejectBtnText}>Apply penalty</Text></TouchableOpacity>}
        </View>
      ))}
      {!active.length && <Text style={styles.empty}>No active loans</Text>}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>History</Text>
      {past.map((l) => (
        <View key={l.id} style={styles.row}>
          <Text style={styles.rowName}>{l.borrower?.name} — {formatKES(l.principal)}</Text>
          <Text style={styles.rowSub}>{l.status}</Text>
        </View>
      ))}
      {!past.length && <Text style={styles.empty}>No completed or rejected loans yet</Text>}
    </View>
  );
}

function VotesTab({ chamaId }) {
  const [votes, setVotes] = useState(null);
  useFocusEffect(useCallback(() => { client.get(`/chama/${chamaId}/votes`).then((r) => setVotes(r.data)).catch(() => setVotes([])); }, [chamaId]));
  if (!votes) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <Text style={styles.tabHint}>Removing a member is decided by member vote, not admins alone — members start and cast these from the group's Members tab.</Text>
      {votes.map((v) => (
        <View key={v.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>Remove: {v.target?.name}</Text>
            <Text style={styles.rowSub}>{v.tally.yes}/{v.tally.required} yes needed · started by {v.initiator?.name}</Text>
          </View>
          <Text style={[styles.rowSub, v.status === "passed" && { color: "#2E7D32" }, v.status === "failed" && { color: "#D32F2F" }]}>{v.status}</Text>
        </View>
      ))}
      {!votes.length && <Text style={styles.empty}>No votes yet</Text>}
    </View>
  );
}

function SettingsTab({ chamaId, chama, onChange }) {
  const [maxMembers, setMaxMembers] = useState(String(chama.maxMembers));
  const [contributionAmount, setContributionAmount] = useState(String(chama.contributionAmount || ""));
  const [contributionLateFeeRate, setContributionLateFeeRate] = useState(String(chama.contributionLateFeeRate ?? ""));
  const [loanTiers, setLoanTiers] = useState((chama.loanTiers || [{ rate: 10, days: 30 }, { rate: 25, days: 60 }, { rate: 40, days: 90 }]).map((t) => ({ rate: String(t.rate), days: String(t.days) })));
  const [loanMaxMultiplier, setLoanMaxMultiplier] = useState(String(chama.loanMaxMultiplier ?? ""));
  const [latePenaltyRate, setLatePenaltyRate] = useState(String(chama.latePenaltyRate ?? ""));
  const [loanEligibilityDays, setLoanEligibilityDays] = useState(chama.loanEligibilityDays != null ? String(chama.loanEligibilityDays) : "");
  const [membersVisible, setMembersVisible] = useState(chama.membersVisibleToMembers);
  const [requireGuarantors, setRequireGuarantors] = useState(chama.requireGuarantorsToJoin);
  const [county, setCounty] = useState(chama.county || "");
  const [subCounty, setSubCounty] = useState(chama.subCounty || "");
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);

  function handleCountyChange(c) {
    setCounty(c);
    setSubCounty("");
  }

  async function activate() {
    Alert.alert("Activate this Chama", "Contribution deadlines start counting from this moment — members who haven't contributed each period will start showing as late. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Activate", onPress: async () => {
        setActivating(true);
        try { await client.post(`/chama/${chamaId}/activate`); onChange(); }
        catch (e) { Alert.alert("Couldn't activate", e.response?.data?.error || e.message); }
        finally { setActivating(false); }
      } },
    ]);
  }

  async function save() {
    if (!county || !subCounty) return Alert.alert("Location required", "Select the county and sub-county this Chama meets in");
    setSaving(true);
    try {
      const body = { membersVisibleToMembers: membersVisible, requireGuarantorsToJoin: requireGuarantors, county, subCounty };
      const max = parseInt(maxMembers, 10);
      if (max && max !== chama.maxMembers) body.maxMembers = max;
      if (chama.contributionType === "fixed_recurring") {
        const amt = parseInt(contributionAmount, 10);
        if (amt && amt !== chama.contributionAmount) body.contributionAmount = amt;
        const feeRate = parseFloat(contributionLateFeeRate);
        if (!isNaN(feeRate) && feeRate !== chama.contributionLateFeeRate) body.contributionLateFeeRate = feeRate;
      }
      if (chama.payoutModel === "table_banking") {
        const parsedTiers = loanTiers.map((t) => ({ rate: parseFloat(t.rate), days: parseInt(t.days, 10) }));
        if (parsedTiers.every((t) => !isNaN(t.rate) && t.rate >= 0 && t.days > 0)) body.loanTiers = parsedTiers;
        const mult = parseFloat(loanMaxMultiplier);
        if (!isNaN(mult) && mult !== chama.loanMaxMultiplier) body.loanMaxMultiplier = mult;
        const penalty = parseFloat(latePenaltyRate);
        if (!isNaN(penalty) && penalty !== chama.latePenaltyRate) body.latePenaltyRate = penalty;
        body.loanEligibilityDays = loanEligibilityDays !== "" ? parseInt(loanEligibilityDays, 10) : null;
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
      {!chama.activatedAt ? (
        <View style={styles.activateBanner}>
          <Text style={styles.activateBannerText}>This Chama isn't active yet — contribution deadlines, late fees, and member votes won't apply until you activate it.</Text>
          <TouchableOpacity style={styles.approveBtn} onPress={activate} disabled={activating}>
            <Text style={styles.approveBtnText}>{activating ? "Activating..." : "Activate Chama"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.tabHint, { marginBottom: 16 }]}>Active since {new Date(chama.activatedAt).toLocaleDateString()}</Text>
      )}

      <Text style={styles.label}>Max members</Text>
      <TextInput style={styles.input} value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" />
      {chama.contributionType === "fixed_recurring" && (
        <>
          <Text style={styles.label}>Contribution amount (KES)</Text>
          <TextInput style={styles.input} value={contributionAmount} onChangeText={setContributionAmount} keyboardType="number-pad" />
          <Text style={styles.label}>Late fee (% of the missed contribution)</Text>
          <TextInput style={styles.input} value={contributionLateFeeRate} onChangeText={setContributionLateFeeRate} keyboardType="decimal-pad" />
        </>
      )}
      {chama.payoutModel === "table_banking" && (
        <>
          <Text style={styles.label}>Repayment plans — more time, more interest</Text>
          {loanTiers.map((t, i) => (
            <View key={i} style={styles.tierRow}>
              <Text style={styles.tierRowLabel}>Plan {i + 1}</Text>
              <View style={styles.tierRowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Interest %</Text>
                  <TextInput
                    style={styles.input} value={t.rate} keyboardType="decimal-pad"
                    onChangeText={(v) => setLoanTiers((prev) => prev.map((x, idx) => (idx === i ? { ...x, rate: v } : x)))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Days</Text>
                  <TextInput
                    style={styles.input} value={t.days} keyboardType="number-pad"
                    onChangeText={(v) => setLoanTiers((prev) => prev.map((x, idx) => (idx === i ? { ...x, days: v } : x)))}
                  />
                </View>
              </View>
            </View>
          ))}
          <Text style={styles.label}>Max loan size (× savings)</Text>
          <TextInput style={styles.input} value={loanMaxMultiplier} onChangeText={setLoanMaxMultiplier} keyboardType="decimal-pad" />
          <Text style={styles.label}>Late penalty (% of outstanding balance)</Text>
          <TextInput style={styles.input} value={latePenaltyRate} onChangeText={setLatePenaltyRate} keyboardType="decimal-pad" />
          <Text style={styles.label}>Incubation period — days a member must belong before requesting a loan (blank = none)</Text>
          <TextInput style={styles.input} value={loanEligibilityDays} onChangeText={setLoanEligibilityDays} keyboardType="number-pad" placeholder="e.g. 90" />
        </>
      )}
      <View style={styles.switchRow}>
        <Text style={styles.rowName}>Members can see each other</Text>
        <Switch value={membersVisible} onValueChange={setMembersVisible} trackColor={{ true: COLORS.accent }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.rowName}>Require 2 accepted guarantors to join</Text>
        <Switch value={requireGuarantors} onValueChange={setRequireGuarantors} trackColor={{ true: COLORS.accent }} />
      </View>
      <Text style={styles.label}>County</Text>
      <CountyPicker value={county} onChange={handleCountyChange} />
      <Text style={styles.label}>Sub-county</Text>
      <SubCountyPicker county={county} value={subCounty} onChange={setSubCounty} />
      <TouchableOpacity style={[styles.approveBtn, { marginTop: 16 }]} onPress={save} disabled={saving}><Text style={styles.approveBtnText}>{saving ? "Saving..." : "Save settings"}</Text></TouchableOpacity>

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
  tierRow: { backgroundColor: COLORS.wash, borderRadius: 10, padding: 12, marginTop: 10 },
  tierRowLabel: { fontSize: 12.5, fontWeight: "700", color: COLORS.ink },
  tierRowFields: { flexDirection: "row", gap: 10 },
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
  priorityBadge: { color: "#B8860B", fontWeight: "800", fontSize: 10.5 },
  rowActions: { flexDirection: "row", gap: 8 },
  approveBtn: { backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  approveBtnText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12 },
  rejectBtn: { backgroundColor: "#FBE7E7", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  rejectBtnText: { color: "#D32F2F", fontWeight: "700", fontSize: 12 },
  smallBtn: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 12 },
  empty: { color: COLORS.sub, textAlign: "center", marginVertical: 12 },
  tabHint: { color: COLORS.sub, fontSize: 12, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 4 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 16 },
  activateBanner: { backgroundColor: "#FFF3CD", borderRadius: 10, padding: 14, marginBottom: 18, gap: 10 },
  activateBannerText: { color: "#8A6D00", fontSize: 12.5, lineHeight: 18 },
});
