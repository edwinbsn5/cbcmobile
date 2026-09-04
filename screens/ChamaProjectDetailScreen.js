import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Modal, TouchableWithoutFeedback, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState(null);
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [fundVisible, setFundVisible] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseReason, setExpenseReason] = useState("");
  const [profitVisible, setProfitVisible] = useState(false);
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addingMilestone, setAddingMilestone] = useState(false);

  const load = useCallback(() => {
    client.get(`/chama/${chamaId}/projects/${projectId}`)
      .then((r) => setProject(r.data))
      .catch((e) => Alert.alert("Couldn't load project", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    client.get(`/chama/${chamaId}/projects/${projectId}/contributions`).then((r) => setContributions(r.data)).catch(() => setContributions([]));
  }, [chamaId, projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addMilestone() {
    // Guards against the exact bug reported: the round trip has enough
    // delay that a second tap (or a second Enter, since the same input's
    // onSubmitEditing calls this too) before the first request lands used
    // to fire a second, near-identical POST — two milestones from one tap.
    if (!milestoneTitle.trim() || addingMilestone) return;
    setAddingMilestone(true);
    try {
      await client.post(`/chama/${chamaId}/projects/${projectId}/milestones`, { title: milestoneTitle.trim() });
      setMilestoneTitle("");
      load();
    } catch (e) {
      Alert.alert("Couldn't add milestone", e.response?.data?.error || e.message);
    } finally {
      setAddingMilestone(false);
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

  // Moves one milestone up/down in the checklist — e.g. #8 to #4 — by
  // reordering the local array and sending the whole new order to the
  // server in one go (mirrors the chama's own rotation-reorder pattern).
  async function moveMilestone(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= project.milestones.length) return;
    const reordered = project.milestones.slice();
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await client.patch(`/chama/${chamaId}/projects/${projectId}/milestones/reorder`, { order: reordered.map((m) => m.id) });
      load();
    } catch (e) {
      Alert.alert("Couldn't reorder", e.response?.data?.error || e.message);
    }
  }

  async function fundProject(amount, note) {
    setBusy(true);
    try {
      await client.post(`/chama/${chamaId}/projects/${projectId}/fund`, { amount, note });
      setFundVisible(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't fund project", e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function recordProfit(amount, note, distribution) {
    setBusy(true);
    try {
      await client.post(`/chama/${chamaId}/projects/${projectId}/profit`, { amount, note, distribution });
      setProfitVisible(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't record profit", e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleMembership(isRegistered) {
    setBusy(true);
    try {
      if (isRegistered) await client.delete(`/chama/${chamaId}/projects/${projectId}/members/me`);
      else await client.post(`/chama/${chamaId}/projects/${projectId}/members`);
      load();
    } catch (e) {
      Alert.alert("Couldn't update", e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitContribution() {
    const amt = parseInt(contributionAmount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    setBusy(true);
    try {
      await client.post(`/chama/${chamaId}/projects/${projectId}/contributions`, { amount: amt });
      setContributionAmount("");
      load();
    } catch (e) {
      Alert.alert("Couldn't contribute", e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logExpense() {
    const amt = parseInt(expenseAmount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    if (!expenseReason.trim()) return Alert.alert("Reason required", "Say what this money was spent on");
    setBusy(true);
    try {
      await client.post(`/chama/${chamaId}/projects/${projectId}/expenses`, { amount: amt, reason: expenseReason.trim() });
      setExpenseAmount("");
      setExpenseReason("");
      load();
    } catch (e) {
      Alert.alert("Couldn't log expense", e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
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

        <Text style={styles.sectionTitle}>Business Plans</Text>
        <Text style={styles.tabHint}>
          {isAdmin
            ? "A guided form covering the idea, market, pricing, costs, projected revenue, operations, and risks — so members know exactly what they're funding."
            : "See exactly what this project's admin has laid out — the idea, market, pricing, costs, projected revenue, operations, and risks."}
        </Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("ChamaProjectBusinessPlan", { chamaId, projectId, isAdmin })}
        >
          <Text style={styles.secondaryButtonText}>{isAdmin ? "Edit business plan" : "View business plan"}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Milestones {project.milestones.length ? `(${milestonePct}%)` : ""}</Text>
        {!!project.milestones.length && (
          <View style={styles.barTrack}><View style={[styles.barFill, { width: `${milestonePct}%` }]} /></View>
        )}
        {isAdmin && (
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
        )}
        {project.milestones.map((m, idx) => (
          <View key={m.id} style={styles.milestoneRow}>
            <TouchableOpacity style={styles.milestoneCheck} onPress={() => isAdmin && toggleMilestone(m)} disabled={!isAdmin}>
              <Ionicons name={m.done ? "checkbox" : "square-outline"} size={20} color={m.done ? COLORS.accent : COLORS.sub} />
            </TouchableOpacity>
            <Text style={[styles.milestoneText, m.done && styles.milestoneTextDone]}>{m.title}</Text>
            {isAdmin && (
              <View style={styles.milestoneActions}>
                <TouchableOpacity disabled={idx === 0} onPress={() => moveMilestone(idx, -1)}>
                  <Ionicons name="chevron-up" size={18} color={idx === 0 ? COLORS.border : COLORS.sub} />
                </TouchableOpacity>
                <TouchableOpacity disabled={idx === project.milestones.length - 1} onPress={() => moveMilestone(idx, 1)}>
                  <Ionicons name="chevron-down" size={18} color={idx === project.milestones.length - 1 ? COLORS.border : COLORS.sub} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeMilestone(m)}><Ionicons name="close" size={16} color={COLORS.sub} /></TouchableOpacity>
              </View>
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

        <Text style={styles.sectionTitle}>Funding</Text>
        <View style={styles.fundingCard}>
          <View style={styles.fundingRow}><Text style={styles.fundingLabel}>Funded from members' share points</Text><Text style={styles.fundingValue}>{formatKES(project.fundedFromPool)}</Text></View>
          <View style={styles.fundingRow}><Text style={styles.fundingLabel}>Raised from project members</Text><Text style={styles.fundingValue}>{formatKES(project.raisedFromMembers)}</Text></View>
          {!!project.profitRetained && (
            <View style={styles.fundingRow}><Text style={styles.fundingLabel}>Retained profit</Text><Text style={styles.fundingValue}>{formatKES(project.profitRetained)}</Text></View>
          )}
          <View style={[styles.fundingRow, { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
            <Text style={[styles.fundingLabel, { fontWeight: "800" }]}>Total funded</Text>
            <Text style={[styles.fundingValue, { fontWeight: "800" }]}>{formatKES(project.totalFunded)}</Text>
          </View>
        </View>
        <Text style={styles.tabHint}>Funding a project now draws EQUALLY from each registered member's own share points below — not the group's whole pool. A member at 0 blocks any further pool funding until they contribute again (they can still contribute directly to the project instead).</Text>
        {isAdmin && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButtonFlex} onPress={() => setFundVisible(true)}>
              <Text style={styles.secondaryButtonText}>Fund from share points</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButtonFlex} onPress={() => setProfitVisible(true)}>
              <Text style={styles.secondaryButtonText}>Record profit</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!project.profits.length && (
          <>
            <Text style={styles.subHeading}>Profit log</Text>
            {project.profits.map((p) => (
              <View key={p.id} style={styles.expenseCard}>
                <View style={styles.fundingRow}>
                  <Text style={styles.milestoneText}>{p.distribution === "retained" ? "Retained on project" : "Distributed to members"}{!!p.note && ` — ${p.note}`}</Text>
                  <Text style={styles.ledgerAmount}>{formatKES(p.amount)}</Text>
                </View>
                <Text style={styles.updateMeta}>{p.recordedByUser?.name} · {timeAgo(p.createdAt)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Ledger</Text>
        <View style={styles.ledgerSummaryRow}>
          <View style={styles.ledgerStat}>
            <Text style={styles.ledgerStatValue}>{formatKES(project.totalFunded)}</Text>
            <Text style={styles.ledgerStatLabel}>Contributed</Text>
          </View>
          <View style={styles.ledgerStatDivider} />
          <View style={styles.ledgerStat}>
            <Text style={styles.ledgerStatValue}>{formatKES(project.spentKES)}</Text>
            <Text style={styles.ledgerStatLabel}>Spent</Text>
          </View>
          <View style={styles.ledgerStatDivider} />
          <View style={styles.ledgerStat}>
            <Text style={[styles.ledgerStatValue, project.balance < 0 && { color: "#D32F2F" }]}>{formatKES(project.balance)}</Text>
            <Text style={styles.ledgerStatLabel}>Balance</Text>
          </View>
        </View>

        <Text style={styles.subHeading}>By contributor</Text>
        {project.contributorTotals.map((c) => (
          <View key={c.userId} style={styles.ledgerRow}>
            <Text style={styles.milestoneText}>{c.user?.name} <Text style={styles.tabHint}>({c.count} contribution{c.count === 1 ? "" : "s"})</Text></Text>
            <Text style={styles.ledgerAmount}>{formatKES(c.total)}</Text>
          </View>
        ))}
        {!project.contributorTotals.length && <Text style={styles.emptySmall}>No contributions logged yet.</Text>}

        <Text style={styles.subHeading}>Expenses</Text>
        {isAdmin && (
          <View style={styles.composer}>
            <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={expenseAmount} onChangeText={setExpenseAmount} />
            <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Reason — what was this spent on?" value={expenseReason} onChangeText={setExpenseReason} />
            <TouchableOpacity style={styles.secondaryButton} onPress={logExpense} disabled={busy}>
              <Text style={styles.secondaryButtonText}>{busy ? "Logging..." : "Log expense"}</Text>
            </TouchableOpacity>
          </View>
        )}
        {project.expenses.map((e) => (
          <View key={e.id} style={styles.expenseCard}>
            <View style={styles.fundingRow}>
              <Text style={styles.milestoneText}>{e.reason}</Text>
              <Text style={styles.ledgerAmount}>{formatKES(e.amount)}</Text>
            </View>
            <Text style={styles.updateMeta}>{e.loggedByUser?.name} · {timeAgo(e.createdAt)}</Text>
          </View>
        ))}
        {!project.expenses.length && <Text style={styles.emptySmall}>No expenses logged yet.</Text>}

        <Text style={styles.sectionTitle}>Project members ({project.members.length})</Text>
        <Text style={styles.tabHint}>Only an Investment Group's own members who register here can log a contribution to this project — a small crew running one project doesn't need the whole group involved.</Text>
        {(() => {
          const isRegistered = project.members.some((m) => m.userId === user?.id);
          return (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => toggleMembership(isRegistered)} disabled={busy}>
              <Text style={styles.secondaryButtonText}>{isRegistered ? "Leave this project" : "Register for this project"}</Text>
            </TouchableOpacity>
          );
        })()}
        {project.members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <Text style={styles.milestoneText}>{m.user?.name}</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.ledgerAmount}>{formatKES(m.sharePoints)} share points</Text>
              {(!!m.drawnFromShare || !!m.profitShareReceived) && (
                <Text style={styles.tabHint}>
                  {!!m.drawnFromShare && `-${formatKES(m.drawnFromShare)} drawn`}
                  {!!m.drawnFromShare && !!m.profitShareReceived && " · "}
                  {!!m.profitShareReceived && `+${formatKES(m.profitShareReceived)} profit`}
                </Text>
              )}
            </View>
          </View>
        ))}
        {!project.members.length && <Text style={styles.emptySmall}>Nobody's registered yet.</Text>}

        {project.members.some((m) => m.userId === user?.id) && (
          <View style={[styles.composer, { marginTop: 10 }]}>
            <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={contributionAmount} onChangeText={setContributionAmount} />
            <TouchableOpacity style={styles.secondaryButton} onPress={submitContribution} disabled={busy}>
              <Text style={styles.secondaryButtonText}>Mark as contributed</Text>
            </TouchableOpacity>
          </View>
        )}
        {(contributions || []).map((c) => (
          <View key={c.id} style={styles.ledgerRow}>
            <Text style={styles.milestoneText}>{c.user?.name}</Text>
            <Text style={styles.ledgerAmount}>{formatKES(c.amount)}</Text>
          </View>
        ))}
      </ScrollView>

      <EditProjectModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        project={project}
        onSaved={() => { setEditVisible(false); load(); }}
        chamaId={chamaId}
      />
      <FundProjectModal
        visible={fundVisible}
        onClose={() => setFundVisible(false)}
        onSubmit={fundProject}
        busy={busy}
        members={project.members}
      />
      <ProfitModal
        visible={profitVisible}
        onClose={() => setProfitVisible(false)}
        onSubmit={recordProfit}
        busy={busy}
        members={project.members}
        contributorTotals={project.contributorTotals}
      />
    </View>
  );
}

function FundProjectModal({ visible, onClose, onSubmit, busy, members }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    onSubmit(amt, note.trim() || undefined);
    setAmount(""); setNote("");
  }

  const amt = parseInt(amount, 10);
  const count = members?.length || 0;
  // Live preview as the admin types — mirrors the server's own math
  // exactly (routes/chama.js's POST .../fund) so what's shown here is what
  // would actually happen, not a guess.
  const perShare = amt > 0 && count ? amt / count : null;
  const dividesEvenly = perShare !== null && Number.isInteger(perShare);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Fund from share points</Text>
        <Text style={styles.tabHint}>Splits equally across this project's registered members' own share points — the whole amount is rejected if it doesn't divide evenly, or if any member can't cover their equal share.</Text>
        <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={styles.input} placeholder="Note (optional)" value={note} onChangeText={setNote} />

        {!!count && (
          <>
            <Text style={styles.label}>
              {dividesEvenly ? `Will deduct ${formatKES(perShare)} from each of ${count} member${count === 1 ? "" : "s"}:` : "Preview (enter an amount that divides evenly to fund):"}
            </Text>
            {members.map((m) => {
              const short = dividesEvenly && m.sharePoints < perShare;
              return (
                <View key={m.id} style={styles.previewRow}>
                  <Text style={styles.previewName}>{m.user?.name}</Text>
                  <Text style={[styles.previewAmount, short && styles.previewAmountWarn]}>
                    {dividesEvenly ? `-${formatKES(perShare)}` : "—"}
                    {short ? ` (only has ${formatKES(m.sharePoints)})` : ""}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={busy}>
          <Text style={styles.primaryButtonText}>{busy ? "Transferring..." : "Transfer funds"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ProfitModal({ visible, onClose, onSubmit, busy, members, contributorTotals }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [distribution, setDistribution] = useState("retain");

  function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    onSubmit(amt, note.trim() || undefined, distribution);
    setAmount(""); setNote(""); setDistribution("retain");
  }

  const amt = parseInt(amount, 10);
  const count = members?.length || 0;
  // Mirrors the server's own proportional split exactly (routes/chama.js's
  // POST .../profit): invested = this project's funding shares drawn from
  // a member (across every funding round they were part of) plus their own
  // direct contributions; falls back to an equal split if nobody's
  // invested anything yet, same as the server does.
  const preview = distribution === "distribute" && amt > 0 && count
    ? (() => {
        const invested = members.map((m) => m.drawnFromShare + (contributorTotals?.find((c) => c.userId === m.userId)?.total || 0));
        const totalInvested = invested.reduce((sum, v) => sum + v, 0);
        const shares = members.map((m, i) => ({
          userId: m.userId,
          name: m.user?.name,
          invested: invested[i],
          pct: totalInvested > 0 ? (invested[i] / totalInvested) * 100 : 100 / count,
          amount: totalInvested > 0 ? Math.round((amt * invested[i]) / totalInvested) : Math.floor(amt / count),
        }));
        const distributed = shares.reduce((sum, s) => sum + s.amount, 0);
        if (shares.length) shares[shares.length - 1].amount += amt - distributed;
        return { shares, totalInvested };
      })()
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Record profit</Text>
        <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={styles.input} placeholder="Note (optional)" value={note} onChangeText={setNote} />

        <Text style={styles.label}>What should happen to it?</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity style={[styles.optionChip, distribution === "retain" && styles.optionChipActive]} onPress={() => setDistribution("retain")}>
            <Text style={[styles.optionChipText, distribution === "retain" && styles.optionChipTextActive]}>Retain on project</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionChip, distribution === "distribute" && styles.optionChipActive]} onPress={() => setDistribution("distribute")}>
            <Text style={[styles.optionChipText, distribution === "distribute" && styles.optionChipTextActive]}>Share with members</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tabHint}>
          {distribution === "retain"
            ? "Adds to this project's own fundable balance for next time."
            : "Split among registered members proportional to how much each has funded/contributed to this project."}
        </Text>

        {!!preview && (
          <>
            <Text style={styles.label}>
              {preview.totalInvested > 0 ? "Will receive (proportional to their total investment):" : "Nobody's invested yet — will split equally:"}
            </Text>
            {preview.shares.map((s) => (
              <View key={s.userId} style={styles.previewRow}>
                <Text style={styles.previewName}>{s.name} <Text style={styles.tabHint}>({s.pct.toFixed(1)}%)</Text></Text>
                <Text style={styles.previewAmount}>+{formatKES(s.amount)}</Text>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={busy}>
          <Text style={styles.primaryButtonText}>{busy ? "Recording..." : "Record profit"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditProjectModal({ visible, onClose, project, onSaved, chamaId }) {
  const [status, setStatus] = useState(project.status);
  const [closingSummary, setClosingSummary] = useState(project.closingSummary || "");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      await client.patch(`/chama/${chamaId}/projects/${project.id}`, {
        status, closingSummary: closingSummary.trim() || null,
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
      <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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

        <Text style={styles.label}>Closing report (optional — shown once the project wraps up)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={closingSummary} onChangeText={setClosingSummary} multiline placeholder="What was achieved, final costs, outcomes..." />

        <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Save changes"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
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
  milestoneActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  emptySmall: { color: COLORS.sub, fontSize: 12.5, marginTop: 8 },
  tabHint: { color: COLORS.sub, fontSize: 12, marginBottom: 8, lineHeight: 17 },
  fundingCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12 },
  fundingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 3 },
  fundingLabel: { color: COLORS.sub, fontSize: 12.5 },
  fundingValue: { color: COLORS.ink, fontSize: 13.5, fontWeight: "600" },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginTop: 8 },
  ledgerSummaryRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 10, padding: 14 },
  ledgerStat: { flex: 1, alignItems: "center" },
  ledgerStatValue: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  ledgerStatLabel: { color: COLORS.sub, fontSize: 10.5, fontWeight: "600", marginTop: 3 },
  ledgerStatDivider: { width: 1, height: 26, backgroundColor: COLORS.border },
  subHeading: { fontSize: 12.5, fontWeight: "800", color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 18, marginBottom: 8 },
  ledgerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginTop: 8 },
  ledgerAmount: { color: COLORS.accent, fontWeight: "800", fontSize: 13.5 },
  previewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.wash, borderRadius: 8, padding: 10, marginTop: 6 },
  previewName: { flex: 1, color: COLORS.ink, fontSize: 12.5, fontWeight: "600" },
  previewAmount: { color: COLORS.accent, fontWeight: "800", fontSize: 12.5 },
  previewAmountWarn: { color: "#D32F2F" },
  expenseCard: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginTop: 8 },
  updateCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 8 },
  updateMeta: { color: COLORS.sub, fontSize: 11, marginBottom: 6, fontWeight: "600" },
  updateContent: { color: COLORS.ink, fontSize: 13.5, lineHeight: 19 },
  kbAvoid: { flex: 1 },
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
