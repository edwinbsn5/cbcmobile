import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, FlatList, TextInput, Modal, TouchableWithoutFeedback, Alert, Switch } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import ReactionBar from "../components/ReactionBar";
import LinkifiedText from "../components/LinkifiedText";
import PostCard from "../components/PostCard";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

const SCAM_TIPS = [
  "Never send contributions or loan repayments to a member's personal M-Pesa \"to save time\" — pay at the group meeting, in front of others.",
  "Get a receipt or written note for every contribution and repayment, even in a WhatsApp group chat.",
  "Be wary of anyone pushing to skip the admin/treasurer or bypass the group's usual process \"just this once.\"",
  "If you're an admin or treasurer: record every contribution and payout promptly — being slow to update the ledger looks the same as hiding something.",
  "Vouch for people you actually know before inviting them — a chama spreads fastest through trust, and so does fraud.",
];

async function pickPhoto() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access to add a photo"); return null; }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType || "image/jpeg";
  return { uri: asset.uri, mimeType, fileName: asset.fileName || `photo.${mimeType.split("/")[1]}` };
}

function formatKES(n) { return `KES ${Math.round(n || 0).toLocaleString()}`; }
function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "feed", label: "Discussions" },
  { key: "ledger", label: "Ledger" },
  { key: "payouts", label: "Payouts" },
  { key: "members", label: "Members" },
  { key: "achievements", label: "Achievements" },
  { key: "wall_of_shame", label: "Wall of Shame" },
];

export default function ChamaDetailScreen({ route, navigation }) {
  const { chamaId } = route.params;
  const { user } = useAuth();
  const [chama, setChama] = useState(null);
  const [membership, setMembership] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [defaulter, setDefaulter] = useState(null);
  const [myTotal, setMyTotal] = useState(0);
  const [owed, setOwed] = useState(0);
  const [lateFeesOwed, setLateFeesOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [contributeVisible, setContributeVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: c }, { data: mem }] = await Promise.all([
        client.get(`/chama/${chamaId}`),
        client.get(`/chama/${chamaId}/my-membership`),
      ]);
      setChama(c);
      setMembership(mem.membership);
      setIsAdmin(mem.isAdmin);
      setDefaulter(mem.defaulter);
      if (mem.membership?.status === "active") {
        const { data: mine } = await client.get(`/chama/${chamaId}/contributions/mine`);
        setMyTotal(mine.total);
        setOwed(mine.owed || 0);
        setLateFeesOwed(mine.lateFeesOwed || 0);
      }
    } catch (e) {
      Alert.alert("Couldn't load Chama", e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [chamaId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleJoin() {
    try {
      const { data } = await client.post(`/chama/${chamaId}/join`);
      setMembership(data.membership);
      Alert.alert(
        data.membership.status === "active" ? "You're in!" : data.membership.status === "waitlisted" ? "Added to waitlist" : "Request sent",
        data.membership.status === "active" ? "You're now a member." : data.membership.status === "waitlisted" ? "This Chama is full — you'll be notified if a spot opens up." : "The admin will review your request."
      );
      load();
    } catch (e) {
      if (e.response?.data?.requiresKyc) {
        Alert.alert("Identity verification required", e.response.data.error, [{ text: "Not now", style: "cancel" }, { text: "Verify now", onPress: () => navigation.navigate("KYC") }]);
      } else if (e.response?.data?.requiresGuarantors) {
        Alert.alert("Guarantors required", e.response.data.error, [{ text: "Not now", style: "cancel" }, { text: "Add guarantors", onPress: () => navigation.navigate("Guarantors") }]);
      } else {
        Alert.alert("Couldn't join", e.response?.data?.error || e.message);
      }
    }
  }

  if (loading || !chama) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const isMember = membership?.status === "active" || isAdmin;

  return (
    <View style={styles.container}>
      <ScrollView>
        <Image source={{ uri: chama.coverUrl }} style={styles.cover} contentFit="cover" />
        <View style={styles.headerBody}>
          <Text style={styles.name}>{chama.name}</Text>
          <Text style={styles.desc}>{chama.description}</Text>

          <View style={styles.positionsCard}>
            <Text style={styles.positionsBig}>{chama.filled} of {chama.maxMembers} positions filled</Text>
            <Text style={styles.positionsSub}>
              {chama.remaining > 0 ? `${chama.remaining} position${chama.remaining === 1 ? "" : "s"} remaining` : chama.joiningClosedReason === "manual" ? "Closed by admin" : "Full"}
            </Text>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, (chama.filled / chama.maxMembers) * 100)}%` }]} /></View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>
              {chama.contributionType === "fixed_recurring" ? `${formatKES(chama.contributionAmount)}/${chama.contributionFrequency}` : `Goal ${formatKES(chama.goalAmount)}`}
            </Text></View>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>{chama.payoutModel === "merry_go_round" ? "Merry-go-round" : chama.payoutModel === "table_banking" ? "Table banking" : "Pooled savings"}</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>Pool: {formatKES(chama.poolBalance)}</Text></View>
          </View>

          {!membership && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleJoin}>
              <Text style={styles.primaryButtonText}>{chama.joinPolicy === "open" && chama.remaining > 0 ? "Join Chama" : "Request to Join"}</Text>
            </TouchableOpacity>
          )}
          {membership?.status === "pending" && <Text style={styles.pendingNote}>Your request to join is awaiting admin approval.</Text>}
          {membership?.status === "waitlisted" && <Text style={styles.pendingNote}>You're on the waitlist — you'll be notified when a spot opens.</Text>}
          {membership?.status === "rejected" && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleJoin}>
              <Text style={styles.secondaryButtonText}>Your request was declined — request again</Text>
            </TouchableOpacity>
          )}

          {isMember && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => setContributeVisible(true)}>
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accentInk} />
                <Text style={styles.primaryButtonText}>Mark as contributed</Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity style={styles.secondaryButtonFlex} onPress={() => navigation.navigate("ChamaAdmin", { chamaId })}>
                  <Ionicons name="settings-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.secondaryButtonText}>Manage</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {defaulter?.isDefaulter && (
            <View style={styles.defaulterBanner}>
              <Ionicons name="warning-outline" size={16} color="#8A6D00" />
              <Text style={styles.defaulterText}>You owe {formatKES(defaulter.balance)}{defaulter.daysLate > 0 ? ` — ${defaulter.daysLate} day(s) past deadline` : ""}. Mark as contributed to catch up.</Text>
            </View>
          )}
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.key === "payouts" ? (chama.payoutModel === "merry_go_round" ? "Payouts" : chama.payoutModel === "table_banking" ? "Loans" : "Withdrawals") : t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabBody}>
          {tab === "overview" && <OverviewTab chama={chama} myTotal={myTotal} isMember={isMember} />}
          {tab === "feed" && <FeedTab chamaId={chamaId} isMember={isMember} userId={user?.id} />}
          {tab === "ledger" && <LedgerTab chamaId={chamaId} isMember={isMember} chama={chama} />}
          {tab === "payouts" && <PayoutsTab chamaId={chamaId} chama={chama} isMember={isMember} userId={user?.id} />}
          {tab === "members" && <MembersTab chamaId={chamaId} isMember={isMember} chama={chama} myUserId={user?.id} />}
          {tab === "achievements" && <AchievementsTab chamaId={chamaId} isMember={isMember} />}
          {tab === "wall_of_shame" && <WallOfShameTab chamaId={chamaId} isMember={isMember} />}
        </View>
      </ScrollView>

      <ContributeModal
        visible={contributeVisible}
        onClose={() => setContributeVisible(false)}
        chamaId={chamaId}
        owed={owed}
        lateFeesOwed={lateFeesOwed}
        onDone={() => { setContributeVisible(false); load(); }}
      />
    </View>
  );
}

function OverviewTab({ chama, myTotal, isMember }) {
  return (
    <View>
      {isMember && (
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Your total contributions</Text>
          <Text style={styles.statValue}>{formatKES(myTotal)}</Text>
        </View>
      )}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Join policy</Text>
        <Text style={styles.infoValue}>{chama.joinPolicy === "open" ? "Open until positions fill" : "Requires admin approval"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Current cycle</Text>
        <Text style={styles.infoValue}>Cycle {chama.currentCycle}</Text>
      </View>
      {chama.frozenAt && (
        <View style={styles.frozenBanner}>
          <Ionicons name="lock-closed-outline" size={16} color="#C4433C" />
          <Text style={styles.frozenText}>This Chama's funds are frozen pending investigation.</Text>
        </View>
      )}
    </View>
  );
}

function LedgerTab({ chamaId, isMember, chama }) {
  const [items, setItems] = useState(null);
  const [members, setMembers] = useState(null);
  useFocusEffect(useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/contributions`).then((r) => setItems(r.data)).catch(() => setItems([]));
    if (chama?.contributionType === "fixed_recurring" && chama.activatedAt) {
      client.get(`/chama/${chamaId}/members`).then((r) => setMembers(r.data)).catch(() => setMembers([]));
    }
  }, [chamaId, isMember, chama?.contributionType, chama?.activatedAt]));

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view the group ledger.</Text>;
  if (!items) return <ActivityIndicator color={COLORS.accent} />;
  const owing = (members || []).filter((m) => m.defaulter?.payableNow > 0);
  return (
    <View>
      <Text style={styles.tabHint}>Self-reported by members — contributions happen physically, not through the app.</Text>
      {!!owing.length && (
        <View style={styles.balancesCard}>
          <Text style={styles.balancesTitle}>Balances still needed this period</Text>
          {owing.map((m) => (
            <View key={m.id} style={styles.balanceRow}>
              <Text style={styles.balanceName}>{m.user?.name}</Text>
              <Text style={styles.balanceAmount}>{formatKES(m.defaulter.payableNow)}</Text>
            </View>
          ))}
        </View>
      )}
      {items.map((c) => (
        <View key={c.id} style={styles.ledgerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{c.user?.name || "Member"}</Text>
            <Text style={styles.ledgerMeta}>{c.method === "cash_manual" ? "Recorded by admin" : "Self-reported"} · {new Date(c.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.ledgerAmount, c.status === "not_contributed" && styles.ledgerAmountVoided]}>{formatKES(c.amount)}</Text>
          {c.status === "not_contributed" && <Text style={styles.notContributedBadge}>Not received</Text>}
        </View>
      ))}
      {!items.length && <Text style={styles.gatedText}>No contributions recorded yet.</Text>}
    </View>
  );
}

function PayoutsTab({ chamaId, chama, isMember, userId }) {
  const [rotation, setRotation] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [flagTarget, setFlagTarget] = useState(null);

  const load = useCallback(() => {
    if (!isMember) return;
    if (chama.payoutModel === "merry_go_round") {
      client.get(`/chama/${chamaId}/rotation`).then((r) => setRotation(r.data)).catch(() => setRotation([]));
      client.get(`/chama/${chamaId}/payouts/pending`).then((r) => setPendingPayouts(r.data)).catch(() => setPendingPayouts([]));
    }
    client.get(`/chama/${chamaId}/payouts`).then((r) => setPayouts(r.data)).catch(() => setPayouts([]));
  }, [chamaId, isMember, chama.payoutModel]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view payouts.</Text>;

  if (chama.payoutModel === "table_banking") return <LoansTab chamaId={chamaId} chama={chama} />;

  if (chama.payoutModel === "merry_go_round") {
    if (!rotation) return <ActivityIndicator color={COLORS.accent} />;
    const nextUp = rotation.filter((s) => s.cycle === chama.currentCycle && !s.paidAt).sort((a, b) => a.position - b.position)[0];
    return (
      <View>
        {!!nextUp && !!chama.nextPayoutDueAt && (
          <Text style={styles.tabHint}>Next in line: {nextUp.user?.name} — expected {new Date(chama.nextPayoutDueAt).toLocaleDateString()}</Text>
        )}
        {!!pendingPayouts.length && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.tabHint}>Scheduled payouts — you can flag one within its cooling-off window</Text>
            {pendingPayouts.map((p) => (
              <View key={p.id} style={styles.pendingPayoutCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerName}>{p.recipient?.name} — {formatKES(p.amount)}</Text>
                  <Text style={styles.ledgerMeta}>
                    {p.status === "flagged" ? "Flagged — awaiting admin review" : `Executes ${new Date(p.executeAt).toLocaleString()}`}
                  </Text>
                </View>
                {p.status === "scheduled" && (
                  <TouchableOpacity style={styles.flagButton} onPress={() => setFlagTarget(p)}>
                    <Ionicons name="flag-outline" size={14} color="#D32F2F" />
                    <Text style={styles.flagButtonText}>Flag</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
        <FlagPayoutModal chamaId={chamaId} pending={flagTarget} onClose={() => setFlagTarget(null)} onDone={() => { setFlagTarget(null); load(); }} />
        <Text style={styles.tabHint}>Rotation order for cycle {chama.currentCycle}</Text>
        {nextUp && <Text style={styles.nextUpBanner}>Next up: {nextUp.user?.name}</Text>}
        {rotation.filter((s) => s.cycle === chama.currentCycle).sort((a, b) => a.position - b.position).map((s) => (
          <View key={s.id} style={styles.rotationRow}>
            <View style={styles.rotationPosition}><Text style={styles.rotationPositionText}>{s.position}</Text></View>
            <Text style={[styles.ledgerName, { flex: 1 }]}>{s.user?.name}{s.memberId === userId ? " (you)" : ""}</Text>
            {s.paidAt ? <Text style={styles.paidBadge}>Paid</Text> : <Text style={styles.pendingBadge}>Pending</Text>}
          </View>
        ))}
        <Text style={[styles.tabHint, { marginTop: 16 }]}>Payout history</Text>
        {payouts.map((p) => (
          <View key={p.id} style={styles.ledgerRow}>
            <Text style={styles.ledgerName}>{p.recipient?.name}</Text>
            <Text style={styles.ledgerAmount}>{formatKES(p.amount)}</Text>
          </View>
        ))}
        {!payouts.length && <Text style={styles.gatedText}>No payouts yet.</Text>}
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setWithdrawVisible(true)}>
        <Text style={styles.secondaryButtonText}>Request a withdrawal</Text>
      </TouchableOpacity>
      <WithdrawalRequestModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} baseUrl={`/chama/${chamaId}`} onDone={() => { setWithdrawVisible(false); load(); }} />
      <WithdrawalList baseUrl={`/chama/${chamaId}`} />
    </View>
  );
}

function LoansTab({ chamaId, chama }) {
  const [mine, setMine] = useState(null);
  const [all, setAll] = useState([]);
  const [requestVisible, setRequestVisible] = useState(false);
  const [repayTarget, setRepayTarget] = useState(null);
  const [guarantorLoan, setGuarantorLoan] = useState(null);

  const load = useCallback(() => {
    client.get(`/chama/${chamaId}/loans/mine`).then((r) => setMine(r.data)).catch(() => setMine({ loans: [], eligibility: { maxEligible: 0, alreadyOwed: 0 }, myGuarantorViability: { viable: true, reason: null }, requiredGuarantors: 2 }));
    client.get(`/chama/${chamaId}/loans`).then((r) => setAll(r.data)).catch(() => setAll([]));
  }, [chamaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!mine) return <ActivityIndicator color={COLORS.accent} />;
  // A member's eligibility (their contributions × the multiplier) is only
  // half the ceiling — they also can't borrow more than the chama actually
  // has, whichever is smaller. The backend re-checks this too (the real
  // safety net), but showing/allowing a bigger number here just sets the
  // member up for a confusing rejection.
  const eligibleCap = mine.eligibility.maxEligible - mine.eligibility.alreadyOwed;
  const canBorrow = Math.max(0, Math.min(eligibleCap, chama.poolBalance));
  const hasOpenApplication = mine.loans.some((l) => ["pending_guarantors", "requested"].includes(l.status));

  function statusLabel(l) {
    if (l.status === "active") return `${formatKES(l.remaining)} left of ${formatKES(l.owed)}${l.isOverdue ? " · OVERDUE" : ""}`;
    if (l.status === "requested") return "Both guarantors accepted — awaiting admin approval";
    if (l.status === "pending_guarantors") {
      const accepted = l.guarantors.filter((g) => g.status === "accepted").length;
      return `Awaiting guarantors (${accepted}/${mine.requiredGuarantors} accepted) — tap to manage`;
    }
    if (l.status === "rejected") return l.rejectionReason === "insufficient_pool" ? "Declined — not enough in the pool at the time" : "Declined by admin";
    if (l.status === "cancelled") return "Cancelled";
    return l.reason || "";
  }

  return (
    <View>
      <Text style={styles.tabHint}>
        Pool balance: {formatKES(chama.poolBalance)} · {chama.loanInterestRate}% interest · {chama.loanTermWeeks}-week term
      </Text>
      <Text style={styles.tabHint}>You can borrow up to {formatKES(canBorrow)} right now.</Text>
      <View style={[styles.guarantorStatusPill, !mine.myGuarantorViability.viable && styles.guarantorStatusPillWarn]}>
        <Ionicons name={mine.myGuarantorViability.viable ? "checkmark-circle-outline" : "alert-circle-outline"} size={15} color={mine.myGuarantorViability.viable ? "#2E7D32" : "#8A6D00"} />
        <Text style={styles.guarantorStatusText}>
          {mine.myGuarantorViability.viable ? "You're currently a viable guarantor for others in this chama" : `Not currently a viable guarantor: ${mine.myGuarantorViability.reason}`}
        </Text>
      </View>
      {hasOpenApplication ? (
        <Text style={styles.tabHint}>You already have a loan application in progress — see below.</Text>
      ) : (
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setRequestVisible(true)}>
          <Text style={styles.secondaryButtonText}>Request a loan</Text>
        </TouchableOpacity>
      )}
      <LoanRequestModal
        visible={requestVisible}
        onClose={() => setRequestVisible(false)}
        chamaId={chamaId}
        maxAmount={canBorrow}
        onCreated={(loan) => { setRequestVisible(false); load(); setGuarantorLoan(loan); }}
      />
      <LoanRepayModal loan={repayTarget} chamaId={chamaId} onClose={() => setRepayTarget(null)} onDone={() => { setRepayTarget(null); load(); }} />
      <GuarantorPickerModal
        loan={guarantorLoan}
        chamaId={chamaId}
        requiredGuarantors={mine.requiredGuarantors}
        onClose={() => setGuarantorLoan(null)}
        onDone={() => { setGuarantorLoan(null); load(); }}
      />

      <Text style={[styles.tabHint, { marginTop: 16, fontWeight: "700" }]}>Your loans</Text>
      {mine.loans.map((l) => (
        <TouchableOpacity
          key={l.id}
          style={styles.ledgerRow}
          disabled={l.status !== "pending_guarantors"}
          onPress={() => setGuarantorLoan(l)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{formatKES(l.principal)} — {l.status.replace("_", " ")}</Text>
            <Text style={styles.ledgerMeta}>{statusLabel(l)}</Text>
          </View>
          {l.status === "active" && <TouchableOpacity style={styles.smallActionBtn} onPress={() => setRepayTarget(l)}><Text style={styles.smallActionBtnText}>Repay</Text></TouchableOpacity>}
        </TouchableOpacity>
      ))}
      {!mine.loans.length && <Text style={styles.gatedText}>You haven't borrowed anything yet.</Text>}

      <Text style={[styles.tabHint, { marginTop: 16, fontWeight: "700" }]}>All loans in this chama</Text>
      {all.map((l) => (
        <View key={l.id} style={styles.ledgerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{l.borrower?.name}</Text>
            <Text style={styles.ledgerMeta}>{l.status.replace("_", " ")}{l.missedLastTime && l.status === "requested" ? " · priority" : ""}</Text>
          </View>
          <Text style={styles.ledgerAmount}>{formatKES(l.principal)}</Text>
        </View>
      ))}
      {!all.length && <Text style={styles.gatedText}>No loans yet.</Text>}
    </View>
  );
}

function LoanRequestModal({ visible, onClose, chamaId, maxAmount, onCreated }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    if (amt > maxAmount) return Alert.alert("Amount too high", `You can borrow up to ${formatKES(maxAmount)} right now.`);
    setSubmitting(true);
    try {
      const { data } = await client.post(`/chama/${chamaId}/loans`, { amount: amt, reason: reason.trim() || undefined });
      setAmount(""); setReason("");
      onCreated(data.loan);
    } catch (e) {
      Alert.alert("Couldn't request loan", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Request a loan</Text>
        <Text style={styles.tabHint}>You can borrow up to {formatKES(maxAmount)} right now.</Text>
        <Text style={styles.tabHint}>After this, you'll need 2 members to accept being your guarantors before it's sent to admins.</Text>
        <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={styles.input} placeholder="Reason (optional)" value={reason} onChangeText={setReason} />
        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Next: choose guarantors"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// Shown right after a loan application is created (status 'pending_guarantors')
// and re-openable any time by tapping that loan in "Your loans" — lets the
// borrower pick up to REQUIRED_GUARANTORS members, see accept/decline status
// live, replace a declined slot, or cancel the whole application.
function GuarantorPickerModal({ loan, chamaId, requiredGuarantors, onClose, onDone }) {
  const [guarantorRows, setGuarantorRows] = useState([]);
  const [candidates, setCandidates] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!loan) return;
    client.get(`/chama/${chamaId}/loans/${loan.id}/guarantors`).then((r) => setGuarantorRows(r.data)).catch(() => setGuarantorRows([]));
    client.get(`/chama/${chamaId}/loans/guarantor-candidates`).then((r) => setCandidates(r.data)).catch(() => setCandidates([]));
  }, [chamaId, loan]);
  React.useEffect(() => { if (loan) load(); }, [loan, load]);

  if (!loan) return null;
  const openSlots = guarantorRows.filter((g) => ["pending", "accepted"].includes(g.status)).length;
  const alreadyAskedIds = new Set(guarantorRows.filter((g) => ["pending", "accepted"].includes(g.status)).map((g) => g.guarantorUserId));
  const pickable = (candidates || []).filter((c) => !alreadyAskedIds.has(c.id));

  async function askGuarantor(userId) {
    setBusy(true);
    try {
      await client.post(`/chama/${chamaId}/loans/${loan.id}/guarantors`, { guarantorUserId: userId });
      setPickerOpen(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't send request", e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelApplication() {
    Alert.alert("Cancel this loan application?", "Any pending guarantor requests will be withdrawn.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel application", style: "destructive",
        onPress: async () => {
          try {
            await client.post(`/chama/${chamaId}/loans/${loan.id}/cancel`);
            onDone();
          } catch (e) {
            Alert.alert("Couldn't cancel", e.response?.data?.error || e.message);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Guarantors for your {formatKES(loan.principal)} loan</Text>
        {loan.status !== "pending_guarantors" ? (
          <Text style={styles.tabHint}>{loan.status === "requested" ? "Both guarantors accepted — this is now with admins." : `This application is ${loan.status}.`}</Text>
        ) : (
          <>
            <Text style={styles.tabHint}>Needs {requiredGuarantors} accepted guarantors before it's sent to admins.</Text>
            {guarantorRows.map((g) => (
              <View key={g.id} style={styles.ledgerRow}>
                <Text style={styles.ledgerName}>{g.guarantor?.name}</Text>
                <Text style={[styles.statusBadgeSmall, g.status === "accepted" && styles.statusAcceptedSmall, g.status === "declined" && styles.statusDeclinedSmall, g.status === "cancelled" && styles.statusDeclinedSmall]}>
                  {g.status}
                </Text>
              </View>
            ))}
            {!guarantorRows.filter((g) => ["pending", "accepted"].includes(g.status)).length && (
              <Text style={styles.gatedText}>No guarantors asked yet.</Text>
            )}

            {openSlots < requiredGuarantors && (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setPickerOpen(true)}>
                <Text style={styles.secondaryButtonText}>Ask a guarantor ({openSlots}/{requiredGuarantors} slots used)</Text>
              </TouchableOpacity>
            )}

            {pickerOpen && (
              <View style={styles.guarantorPickList}>
                {candidates === null ? (
                  <ActivityIndicator color={COLORS.accent} />
                ) : pickable.length ? (
                  pickable.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.ledgerRow} disabled={busy} onPress={() => askGuarantor(c.id)}>
                      <Text style={styles.ledgerName}>{c.name}</Text>
                      <Text style={styles.smallActionBtnText}>Ask</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.gatedText}>No other viable guarantors available right now.</Text>
                )}
              </View>
            )}

            <TouchableOpacity onPress={cancelApplication} style={{ marginTop: 14 }}>
              <Text style={styles.cancelLinkText}>Cancel this loan application</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

function LoanRepayModal({ loan, chamaId, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => { if (loan) setAmount(String(loan.remaining)); }, [loan]);

  async function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    setSubmitting(true);
    try {
      await client.post(`/chama/${chamaId}/loans/${loan.id}/repayments/mark`, { amount: amt });
      Alert.alert("Repayment recorded", `${formatKES(amt)} recorded against your loan.`);
      onDone();
    } catch (e) {
      Alert.alert("Couldn't record repayment", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!loan} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Repay loan</Text>
        <Text style={styles.tabHint}>This just logs the repayment — hand the cash to your admin/treasurer directly.</Text>
        <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Record repayment"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function WithdrawalList({ baseUrl }) {
  const [items, setItems] = useState(null);
  useFocusEffect(useCallback(() => { client.get(`${baseUrl}/withdrawals`).then((r) => setItems(r.data)).catch(() => setItems([])); }, [baseUrl]));
  if (!items) return <ActivityIndicator color={COLORS.accent} style={{ marginTop: 12 }} />;
  return (
    <View style={{ marginTop: 12 }}>
      {items.map((w) => (
        <View key={w.id} style={styles.ledgerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{w.requester?.name} — {formatKES(w.amount)}</Text>
            <Text style={styles.ledgerMeta}>{w.reason || "No reason given"}</Text>
          </View>
          <Text style={[styles.statusBadge, w.status === "paid" && styles.statusPaid, w.status === "rejected" && styles.statusRejected]}>{w.status}</Text>
        </View>
      ))}
      {!items.length && <Text style={styles.gatedText}>No withdrawal requests yet.</Text>}
    </View>
  );
}

function FlagPayoutModal({ chamaId, pending, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await client.post(`/chama/${chamaId}/payouts/pending/${pending.id}/flag`, { reason: reason.trim() || undefined });
      setReason("");
      onDone();
    } catch (e) {
      Alert.alert("Couldn't flag", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!pending} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Flag this payout</Text>
        <Text style={styles.tabHint}>This pauses the payout until an admin reviews it. Say what looks wrong.</Text>
        <TextInput style={[styles.input, styles.multiline]} placeholder="What looks wrong?" value={reason} onChangeText={setReason} multiline />
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: "#D32F2F" }]} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Flagging..." : "Flag payout"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function WithdrawalRequestModal({ visible, onClose, baseUrl, onDone }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    setSubmitting(true);
    try {
      await client.post(`${baseUrl}/withdrawals`, { amount: amt, reason });
      Alert.alert("Request submitted", "Admins will review your withdrawal request.");
      setAmount(""); setReason("");
      onDone();
    } catch (e) {
      Alert.alert("Couldn't submit", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Request a withdrawal</Text>
        <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={styles.input} placeholder="Reason (optional)" value={reason} onChangeText={setReason} />
        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Submit request"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function MembersTab({ chamaId, isMember, chama, myUserId }) {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [voteTarget, setVoteTarget] = useState(null);
  const [openVotes, setOpenVotes] = useState([]);

  const load = useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/members`).then((r) => setMembers(r.data)).catch((e) => setError(e.response?.data?.error || "Couldn't load members"));
    client.get(`/chama/${chamaId}/votes`).then((r) => setOpenVotes(r.data.filter((v) => v.status === "open"))).catch(() => setOpenVotes([]));
  }, [chamaId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function castBallot(voteId, choice) {
    try {
      const { data } = await client.post(`/chama/${chamaId}/votes/${voteId}/ballot`, { choice });
      Alert.alert("Vote cast", data.vote.status === "open" ? "Recorded." : `The vote ${data.vote.status}.`);
      load();
    } catch (e) {
      Alert.alert("Couldn't vote", e.response?.data?.error || e.message);
    }
  }

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view members.</Text>;
  if (error) return <Text style={styles.gatedText}>{error}</Text>;
  if (!members) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      {!!openVotes.length && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.tabHint, { fontWeight: "700" }]}>Open votes</Text>
          {openVotes.map((v) => (
            <View key={v.id} style={styles.voteCard}>
              <Text style={styles.ledgerName}>{v.voteType === "remove" ? "Remove" : "Wall of Shame"}: {v.target?.name}</Text>
              <Text style={styles.ledgerMeta}>{v.reason || "No reason given"} · {v.tally.yes}/{v.tally.required} yes needed · {v.tally.votedCount}/{v.tally.eligible} voted</Text>
              {v.targetUserId !== myUserId && (
                <View style={[styles.rowActions, { marginTop: 8 }]}>
                  <TouchableOpacity style={styles.approveBtnSmall} onPress={() => castBallot(v.id, "yes")}><Text style={styles.approveBtnSmallText}>Vote yes</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtnSmall} onPress={() => castBallot(v.id, "no")}><Text style={styles.rejectBtnSmallText}>Vote no</Text></TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {members.map((m) => (
        <View key={m.id} style={styles.memberRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{m.user?.name}{m.userId === chama.creatorId ? " (Creator)" : ""}</Text>
            <Text style={styles.ledgerMeta}>{m.role === "treasurer" ? "Treasurer" : m.role === "admin" ? "Admin" : "Member"} · Trust {m.trust?.score ?? "—"}{m.trust?.kycVerified ? " · KYC ✓" : ""}</Text>
          </View>
          {m.alreadyPaidOutThisCycle && <Text style={styles.defaulterPill}>Already paid this cycle</Text>}
          {m.defaulter?.isDefaulter && <Text style={styles.defaulterPill}>{m.defaulter.daysLate}d late</Text>}
          {m.defaulter?.isDefaulter && m.userId !== myUserId && (
            <TouchableOpacity style={styles.reportButton} onPress={() => setVoteTarget(m)}>
              <Ionicons name="people-outline" size={16} color="#8A6D00" />
            </TouchableOpacity>
          )}
          {m.userId !== myUserId && (
            <TouchableOpacity style={styles.reportButton} onPress={() => setReportTarget(m)}>
              <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <ReportFraudModal groupPath={`/chama/${chamaId}`} target={reportTarget} onClose={() => setReportTarget(null)} onDone={() => setReportTarget(null)} />
      <StartVoteModal chamaId={chamaId} target={voteTarget} onClose={() => setVoteTarget(null)} onDone={() => { setVoteTarget(null); load(); }} />
    </View>
  );
}

function StartVoteModal({ chamaId, target, onClose, onDone }) {
  const [voteType, setVoteType] = useState("remove");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (voteType === "wall_of_shame" && !reason.trim()) return Alert.alert("Reason required", "Say why you're flagging this member for fraud");
    setSubmitting(true);
    try {
      await client.post(`/chama/${chamaId}/votes`, { targetUserId: target.userId, voteType, reason: reason.trim() || undefined });
      Alert.alert("Vote started", "Other members can now cast their vote from this tab.");
      setReason("");
      onDone();
    } catch (e) {
      Alert.alert("Couldn't start vote", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Start a vote on {target?.user?.name}</Text>
        <Text style={styles.tabHint}>This isn't an admin decision — it passes only once more than half the other active members vote yes.</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity style={[styles.optionChip, voteType === "remove" && styles.optionChipActive]} onPress={() => setVoteType("remove")}>
            <Text style={[styles.optionChipText, voteType === "remove" && styles.optionChipTextActive]}>Remove from group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionChip, voteType === "wall_of_shame" && styles.optionChipActive]} onPress={() => setVoteType("wall_of_shame")}>
            <Text style={[styles.optionChipText, voteType === "wall_of_shame" && styles.optionChipTextActive]}>Flag for Wall of Shame</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tabHint}>
          {voteType === "remove"
            ? "Ends their membership in this Chama if the vote passes."
            : "If the vote passes, they're listed on this Chama's Wall of Shame and the public Wall of Shame tab on the homepage, and a report is filed for platform review."}
        </Text>
        <TextInput style={[styles.input, styles.multiline]} placeholder={voteType === "wall_of_shame" ? "Reason (required)" : "Reason (optional)"} value={reason} onChangeText={setReason} multiline />
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: "#D32F2F" }]} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Starting..." : "Start vote"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function AchievementsTab({ chamaId, isMember }) {
  const [items, setItems] = useState(null);
  const [postVisible, setPostVisible] = useState(false);

  const load = useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/achievements`).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [chamaId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view achievements.</Text>;
  if (!items) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <Text style={styles.tabHint}>Celebrate what your contributions or payouts made possible — a new bike, a vacation, school fees paid off.</Text>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setPostVisible(true)}>
        <Text style={styles.secondaryButtonText}>Post an achievement</Text>
      </TouchableOpacity>
      <PostAchievementModal visible={postVisible} chamaId={chamaId} onClose={() => setPostVisible(false)} onDone={() => { setPostVisible(false); load(); }} />

      {items.map((a) => (
        <View key={a.id} style={styles.postCard}>
          <View style={styles.achievementHeader}>
            <Text style={styles.ledgerName}>{a.user?.name}</Text>
            {a.isPublic ? (
              <View style={styles.publicPill}><Ionicons name="globe-outline" size={10} color="#2E7D32" /><Text style={styles.publicPillText}>Public</Text></View>
            ) : (
              <View style={styles.privatePill}><Ionicons name="lock-closed-outline" size={10} color={COLORS.sub} /><Text style={styles.privatePillText}>Chama only</Text></View>
            )}
          </View>
          <Text style={styles.postMeta}>{new Date(a.createdAt).toLocaleDateString()}</Text>
          <Text style={styles.postContent}>{a.content}</Text>
          {!!a.photoUrl && <Image source={{ uri: a.photoUrl }} style={styles.achievementPhoto} contentFit="cover" />}
        </View>
      ))}
      {!items.length && <Text style={styles.gatedText}>No achievements posted yet — be the first!</Text>}
    </View>
  );
}

function PostAchievementModal({ visible, chamaId, onClose, onDone }) {
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState(null);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function submit() {
    if (!content.trim()) return Alert.alert("Say something", "Describe what you achieved");
    setSubmitting(true);
    try {
      let photoUrl;
      if (photo) {
        setUploading(true);
        const form = new FormData();
        form.append("file", { uri: photo.uri, name: photo.fileName, type: photo.mimeType });
        const { data } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
        photoUrl = data.url;
        setUploading(false);
      }
      await client.post(`/chama/${chamaId}/achievements`, { content: content.trim(), photoUrl, isPublic });
      setContent(""); setPhoto(null);
      onDone();
    } catch (e) {
      Alert.alert("Couldn't post", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Post an achievement</Text>
        <TextInput style={[styles.input, styles.multiline]} placeholder="What did you do with it?" value={content} onChangeText={setContent} multiline />
        {photo ? (
          <View style={styles.achievementPhotoPreviewWrap}>
            <Image source={{ uri: photo.uri }} style={styles.achievementPhotoPreview} contentFit="cover" />
            <TouchableOpacity style={styles.photoRemoveButton} onPress={() => setPhoto(null)}><Ionicons name="close" size={16} color="#fff" /></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoPicker} onPress={async () => setPhoto(await pickPhoto())}>
            <Ionicons name="image-outline" size={20} color={COLORS.accent} />
            <Text style={styles.photoPickerText}>Add a photo (optional)</Text>
          </TouchableOpacity>
        )}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show on the public Achievements tab (homepage)</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: COLORS.accent }} />
        </View>
        <Text style={styles.tabHint}>{isPublic ? "Visible to everyone browsing Chamas." : "Only visible to this Chama's members."}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? (uploading ? "Uploading photo..." : "Posting...") : "Post achievement"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function WallOfShameTab({ chamaId, isMember }) {
  const [votes, setVotes] = useState(null);
  useFocusEffect(useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/votes`).then((r) => setVotes(r.data.filter((v) => v.voteType === "wall_of_shame" && v.status === "passed"))).catch(() => setVotes([]));
  }, [chamaId, isMember]));

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view its Wall of Shame.</Text>;
  if (!votes) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeaderRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#8A6D00" />
          <Text style={styles.tipsTitle}>Avoid getting scammed — or posted here</Text>
        </View>
        {SCAM_TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.tabHint, { marginTop: 14 }]}>Members this Chama has voted (&gt;51%) to flag for fraud. Also visible on the homepage's public Wall of Shame tab.</Text>
      {votes.map((v) => (
        <View key={v.id} style={styles.shameRow}>
          <Text style={styles.ledgerName}>{v.target?.name}</Text>
          <Text style={styles.ledgerMeta}>{v.reason}</Text>
          <Text style={styles.postMeta}>{new Date(v.decidedAt).toLocaleDateString()}</Text>
        </View>
      ))}
      {!votes.length && <Text style={styles.gatedText}>No one from this Chama has been flagged.</Text>}
    </View>
  );
}

function ReportFraudModal({ groupPath, target, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason.trim()) return Alert.alert("Reason required", "Briefly describe what happened");
    setSubmitting(true);
    try {
      await client.post(`${groupPath}/fraud-reports`, { reportedUserId: target.userId, reason: reason.trim(), details: details.trim() || undefined });
      Alert.alert("Report filed", "This group's funds are now frozen pending a platform review. Thank you for flagging this.");
      setReason(""); setDetails("");
      onDone();
    } catch (e) {
      Alert.alert("Couldn't file report", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Report {target?.user?.name}</Text>
        <Text style={styles.tabHint}>This freezes the group's funds and starts a platform investigation. Only report genuine fraud/theft concerns.</Text>
        <TextInput style={styles.input} placeholder="Reason (short)" value={reason} onChangeText={setReason} />
        <TextInput style={[styles.input, styles.multiline]} placeholder="Additional details (optional)" value={details} onChangeText={setDetails} multiline />
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: "#D32F2F" }]} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Filing..." : "File report"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function FeedTab({ chamaId, isMember, userId }) {
  const [posts, setPosts] = useState(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();

  const load = useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/posts`).then((r) => setPosts(r.data)).catch(() => setPosts([]));
  }, [chamaId, isMember]);
  useFocusEffect(useCallback(() => { load(); loadSaved(); }, [load, loadSaved]));

  async function submitPost() {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await client.post(`/chama/${chamaId}/posts`, { content: text.trim() });
      setText("");
      load();
    } catch (e) {
      Alert.alert("Couldn't post", e.response?.data?.error || e.message);
    } finally {
      setPosting(false);
    }
  }

  async function react(postId, reaction) {
    try {
      const { data } = await client.post(`/chama/${chamaId}/posts/${postId}/react`, { reaction });
      setPosts((prev) => prev.map((p) => (p.id === postId ? data : p)));
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function deletePost(postId) {
    try {
      await client.delete(`/chama/${chamaId}/posts/${postId}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view discussions.</Text>;
  if (!posts) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <View style={styles.composer}>
        <TextInput style={[styles.input, styles.multiline]} placeholder="Share something with the group..." value={text} onChangeText={setText} multiline />
        <TouchableOpacity style={styles.secondaryButton} onPress={submitPost} disabled={posting}>
          <Text style={styles.secondaryButtonText}>{posting ? "Posting..." : "Post"}</Text>
        </TouchableOpacity>
      </View>
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onReact={react}
          isSaved={isSaved("post", p.id)}
          onToggleSave={() => toggleSave("post", p.id)}
          onDelete={deletePost}
          onChanged={load}
        />
      ))}
      {!posts.length && <Text style={styles.gatedText}>No discussions yet — be the first to post.</Text>}
    </View>
  );
}

function ContributeModal({ visible, onClose, chamaId, owed, lateFeesOwed, onDone }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible && owed > 0) setAmount(String(owed));
  }, [visible, owed]);

  async function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    setSubmitting(true);
    try {
      await client.post(`/chama/${chamaId}/contributions/mark`, { amount: amt, note: note.trim() || undefined });
      Alert.alert("Marked as contributed", `${formatKES(amt)} recorded. An admin can correct this if the cash wasn't actually received.`);
      setAmount(""); setNote("");
      onDone();
    } catch (e) {
      Alert.alert("Couldn't record", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Mark as contributed</Text>
        <Text style={styles.tabHint}>This just logs it to the group ledger — contributions are handed over physically, not through the app.</Text>
        {owed > 0 && <Text style={styles.owedText}>You owe {formatKES(owed)} so far</Text>}
        {lateFeesOwed > 0 && <Text style={styles.owedTextWarn}>Plus {formatKES(lateFeesOwed)} in unpaid late fees — settle those separately with your admin</Text>}
        <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={styles.input} placeholder="Note (optional)" value={note} onChangeText={setNote} />
        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Mark as contributed"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  cover: { width: "100%", height: 150, backgroundColor: "#eee" },
  headerBody: { padding: 16, backgroundColor: COLORS.surface },
  name: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  desc: { color: COLORS.sub, marginTop: 4 },
  positionsCard: { marginTop: 14, backgroundColor: COLORS.wash, borderRadius: 10, padding: 12 },
  positionsBig: { fontWeight: "800", color: COLORS.ink, fontSize: 15 },
  positionsSub: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  barTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  metaChip: { backgroundColor: COLORS.wash, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  metaChipText: { color: COLORS.ink, fontWeight: "700", fontSize: 11.5 },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 14 },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  primaryButtonFlex: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center" },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 11, alignItems: "center", marginTop: 10 },
  secondaryButtonText: { color: COLORS.accent, fontWeight: "700" },
  secondaryButtonFlex: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 11, alignItems: "center" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  pendingNote: { color: COLORS.sub, fontSize: 12.5, marginTop: 10, textAlign: "center" },
  defaulterBanner: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#FFF3CD", borderRadius: 8, padding: 10, marginTop: 12 },
  defaulterText: { color: "#8A6D00", fontSize: 12, flex: 1 },
  frozenBanner: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#FBE7E7", borderRadius: 8, padding: 10, marginTop: 8 },
  frozenText: { color: "#C4433C", fontSize: 12, flex: 1 },
  tabRow: { flexDirection: "row", backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: COLORS.accent },
  tabText: { fontSize: 11.5, color: COLORS.sub, fontWeight: "600" },
  tabTextActive: { color: COLORS.accent, fontWeight: "800" },
  tabBody: { padding: 14 },
  gatedText: { color: COLORS.sub, textAlign: "center", marginTop: 20 },
  tabHint: { color: COLORS.sub, fontSize: 12, marginBottom: 8 },
  guarantorStatusPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5E9", borderRadius: 8, padding: 8, marginBottom: 8 },
  guarantorStatusPillWarn: { backgroundColor: "#FFF3CD" },
  guarantorStatusText: { color: COLORS.ink, fontSize: 11.5, flex: 1 },
  statusBadgeSmall: { fontSize: 11, fontWeight: "700", color: "#8A6D00", textTransform: "uppercase" },
  statusAcceptedSmall: { color: "#2E7D32" },
  statusDeclinedSmall: { color: "#D32F2F" },
  guarantorPickList: { marginTop: 8, maxHeight: 220 },
  cancelLinkText: { color: "#D32F2F", fontWeight: "700", fontSize: 12.5, textAlign: "center" },
  statCard: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, marginBottom: 10 },
  statLabel: { color: "rgba(11,31,58,0.75)", fontSize: 11, textTransform: "uppercase" },
  statValue: { color: COLORS.accentInk, fontSize: 22, fontWeight: "800", marginTop: 4 },
  infoCard: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { color: COLORS.sub, fontSize: 12.5 },
  infoValue: { color: COLORS.ink, fontWeight: "700", fontSize: 12.5 },
  ledgerRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  ledgerName: { color: COLORS.ink, fontWeight: "700", fontSize: 13.5 },
  ledgerMeta: { color: COLORS.sub, fontSize: 11.5, marginTop: 2 },
  ledgerAmount: { color: COLORS.accent, fontWeight: "800", fontSize: 13.5 },
  ledgerAmountVoided: { color: COLORS.sub, textDecorationLine: "line-through" },
  notContributedBadge: { color: "#D32F2F", fontWeight: "700", fontSize: 10.5, marginLeft: 8 },
  nextUpBanner: { backgroundColor: COLORS.accent, color: COLORS.accentInk, padding: 10, borderRadius: 8, fontWeight: "700", marginBottom: 10, overflow: "hidden" },
  pendingPayoutCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF3CD", borderRadius: 8, padding: 12, marginBottom: 8 },
  flagButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FBE7E7", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  flagButtonText: { color: "#D32F2F", fontWeight: "700", fontSize: 11.5 },
  rotationRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  rotationPosition: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  rotationPositionText: { fontWeight: "800", color: COLORS.ink, fontSize: 12 },
  paidBadge: { color: "#2E7D32", fontWeight: "700", fontSize: 11.5 },
  pendingBadge: { color: "#8A6D00", fontWeight: "700", fontSize: 11.5 },
  statusBadge: { fontSize: 11.5, fontWeight: "700", color: COLORS.sub, textTransform: "uppercase" },
  statusPaid: { color: "#2E7D32" },
  statusRejected: { color: "#D32F2F" },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  defaulterPill: { backgroundColor: "#FFF3CD", color: "#8A6D00", fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 6 },
  reportButton: { padding: 6, marginLeft: 6 },
  composer: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 14 },
  postCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  postMeta: { color: COLORS.sub, fontSize: 11, marginBottom: 8 },
  postContent: { color: COLORS.ink, fontSize: 13.5, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12.5 },
  optionChipTextActive: { color: COLORS.accentInk },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 16, marginBottom: 12 },
  owedText: { color: COLORS.accent, fontWeight: "700", fontSize: 13, marginBottom: 8 },
  owedTextWarn: { color: "#D32F2F", fontWeight: "600", fontSize: 11.5, marginBottom: 8 },
  smallActionBtn: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  smallActionBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 11.5 },
  rowActions: { flexDirection: "row", gap: 8 },
  voteCard: { backgroundColor: "#FFF3CD", borderRadius: 8, padding: 12, marginBottom: 8 },
  approveBtnSmall: { backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, flex: 1, alignItems: "center" },
  approveBtnSmallText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12 },
  rejectBtnSmall: { backgroundColor: "#FBE7E7", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, flex: 1, alignItems: "center" },
  rejectBtnSmallText: { color: "#D32F2F", fontWeight: "700", fontSize: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 12 },
  switchLabel: { color: COLORS.ink, fontSize: 13, flex: 1 },
  achievementHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  publicPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#E3F5E9", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  publicPillText: { color: "#2E7D32", fontSize: 10, fontWeight: "700" },
  privatePill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.wash, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  privatePillText: { color: COLORS.sub, fontSize: 10, fontWeight: "700" },
  achievementPhoto: { width: "100%", height: 180, borderRadius: 8, marginTop: 10, backgroundColor: "#eee" },
  achievementPhotoPreviewWrap: { borderRadius: 8, overflow: "hidden", marginBottom: 10 },
  achievementPhotoPreview: { width: "100%", height: 150, backgroundColor: "#eee" },
  photoRemoveButton: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  photoPicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 8, paddingVertical: 16, marginBottom: 10 },
  photoPickerText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  shameRow: { backgroundColor: "#FBE7E7", borderRadius: 8, padding: 12, marginBottom: 8 },
  tipsCard: { backgroundColor: "#FFF3CD", borderRadius: 12, padding: 14 },
  tipsHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  tipsTitle: { color: "#8A6D00", fontWeight: "800", fontSize: 13 },
  tipRow: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "flex-start" },
  tipBullet: { color: "#8A6D00", fontSize: 13, lineHeight: 18 },
  tipText: { color: "#8A6D00", fontSize: 12, lineHeight: 18, flex: 1 },
  balancesCard: { backgroundColor: COLORS.wash, borderRadius: 10, padding: 12, marginBottom: 14 },
  balancesTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  balanceName: { color: COLORS.ink, fontSize: 13, fontWeight: "600" },
  balanceAmount: { color: "#D32F2F", fontSize: 13, fontWeight: "800" },
});
