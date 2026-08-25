import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, FlatList, TextInput, Modal, TouchableWithoutFeedback, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import ReactionBar from "../components/ReactionBar";
import LinkifiedText from "../components/LinkifiedText";
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

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "ledger", label: "Ledger" },
  { key: "payouts", label: "Payouts" },
  { key: "feed", label: "Announcements" },
  { key: "members", label: "Members" },
];

export default function ChamaDetailScreen({ route, navigation }) {
  const { chamaId } = route.params;
  const { user } = useAuth();
  const [chama, setChama] = useState(null);
  const [membership, setMembership] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [defaulter, setDefaulter] = useState(null);
  const [myTotal, setMyTotal] = useState(0);
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
            <View style={styles.metaChip}><Text style={styles.metaChipText}>{chama.payoutModel === "merry_go_round" ? "Merry-go-round" : "Pooled savings"}</Text></View>
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
                <Ionicons name="add-circle-outline" size={16} color={COLORS.accentInk} />
                <Text style={styles.primaryButtonText}>Contribute</Text>
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
              <Text style={styles.defaulterText}>You're behind on {defaulter.periodsDue - defaulter.periodsPaid} contribution(s). Contribute now to catch up.</Text>
            </View>
          )}
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabBody}>
          {tab === "overview" && <OverviewTab chama={chama} myTotal={myTotal} isMember={isMember} />}
          {tab === "ledger" && <LedgerTab chamaId={chamaId} isMember={isMember} />}
          {tab === "payouts" && <PayoutsTab chamaId={chamaId} chama={chama} isMember={isMember} userId={user?.id} />}
          {tab === "feed" && <FeedTab chamaId={chamaId} isMember={isMember} userId={user?.id} />}
          {tab === "members" && <MembersTab chamaId={chamaId} isMember={isMember} chama={chama} myUserId={user?.id} />}
        </View>
      </ScrollView>

      <ContributeModal
        visible={contributeVisible}
        onClose={() => setContributeVisible(false)}
        chamaId={chamaId}
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

function LedgerTab({ chamaId, isMember }) {
  const [items, setItems] = useState(null);
  useFocusEffect(useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/contributions`).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [chamaId, isMember]));

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view the group ledger.</Text>;
  if (!items) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <Text style={styles.tabHint}>Every contribution, visible to all members.</Text>
      {items.map((c) => (
        <View key={c.id} style={styles.ledgerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{c.user?.name || "Member"}</Text>
            <Text style={styles.ledgerMeta}>{c.method === "cash_manual" ? "Cash (recorded by admin)" : c.method.toUpperCase()} · {new Date(c.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.ledgerAmount}>{formatKES(c.amount)}</Text>
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

  if (chama.payoutModel === "merry_go_round") {
    if (!rotation) return <ActivityIndicator color={COLORS.accent} />;
    const nextUp = rotation.filter((s) => s.cycle === chama.currentCycle && !s.paidAt).sort((a, b) => a.position - b.position)[0];
    return (
      <View>
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

  const load = useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/members`).then((r) => setMembers(r.data)).catch((e) => setError(e.response?.data?.error || "Couldn't load members"));
  }, [chamaId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view members.</Text>;
  if (error) return <Text style={styles.gatedText}>{error}</Text>;
  if (!members) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      {members.map((m) => (
        <View key={m.id} style={styles.memberRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{m.user?.name}{m.userId === chama.creatorId ? " (Creator)" : ""}</Text>
            <Text style={styles.ledgerMeta}>{m.role === "treasurer" ? "Treasurer" : m.role === "admin" ? "Admin" : "Member"} · Trust {m.trust?.score ?? "—"}{m.trust?.kycVerified ? " · KYC ✓" : ""}</Text>
          </View>
          {m.alreadyPaidOutThisCycle && <Text style={styles.defaulterPill}>Already paid this cycle</Text>}
          {m.defaulter?.isDefaulter && <Text style={styles.defaulterPill}>Behind</Text>}
          {m.userId !== myUserId && (
            <TouchableOpacity style={styles.reportButton} onPress={() => setReportTarget(m)}>
              <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <ReportFraudModal groupPath={`/chama/${chamaId}`} target={reportTarget} onClose={() => setReportTarget(null)} onDone={() => setReportTarget(null)} />
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

  const load = useCallback(() => {
    if (!isMember) return;
    client.get(`/chama/${chamaId}/posts`).then((r) => setPosts(r.data)).catch(() => setPosts([]));
  }, [chamaId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  async function react(post, reaction) {
    try {
      const { data } = await client.post(`/chama/${chamaId}/posts/${post.id}/react`, { reaction });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? data : p)));
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  if (!isMember) return <Text style={styles.gatedText}>Join this Chama to view announcements.</Text>;
  if (!posts) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <View style={styles.composer}>
        <TextInput style={[styles.input, styles.multiline]} placeholder="Post an announcement..." value={text} onChangeText={setText} multiline />
        <TouchableOpacity style={styles.secondaryButton} onPress={submitPost} disabled={posting}>
          <Text style={styles.secondaryButtonText}>{posting ? "Posting..." : "Post"}</Text>
        </TouchableOpacity>
      </View>
      {posts.map((p) => (
        <View key={p.id} style={styles.postCard}>
          <Text style={styles.ledgerName}>{p.author?.name}</Text>
          <Text style={styles.postMeta}>{timeAgo(p.createdAt)} ago</Text>
          <LinkifiedText text={p.content} style={styles.postContent} />
          <ReactionBar reactions={p.reactions} myUserId={userId} onReact={(r) => react(p, r)} />
        </View>
      ))}
      {!posts.length && <Text style={styles.gatedText}>No announcements yet.</Text>}
    </View>
  );
}

function ContributeModal({ visible, onClose, chamaId, onDone }) {
  const [method, setMethod] = useState("wallet");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("2547");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    setSubmitting(true);
    try {
      if (method === "wallet") {
        await client.post(`/chama/${chamaId}/contributions/wallet`, { amount: amt });
        Alert.alert("Contribution recorded", `${formatKES(amt)} contributed from your wallet.`);
        setAmount("");
        onDone();
      } else {
        if (!/^2547\d{8}$/.test(phone)) return Alert.alert("Invalid phone", "Use format 2547XXXXXXXX");
        const { data } = await client.post(`/chama/${chamaId}/contributions/mpesa`, { phone, amount: amt });
        Alert.alert("Check your phone", data.message);
        setAmount("");
        onDone();
      }
    } catch (e) {
      Alert.alert("Contribution failed", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Make a contribution</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity style={[styles.optionChip, method === "wallet" && styles.optionChipActive]} onPress={() => setMethod("wallet")}>
            <Text style={[styles.optionChipText, method === "wallet" && styles.optionChipTextActive]}>Wallet balance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionChip, method === "mpesa" && styles.optionChipActive]} onPress={() => setMethod("mpesa")}>
            <Text style={[styles.optionChipText, method === "mpesa" && styles.optionChipTextActive]}>M-Pesa</Text>
          </TouchableOpacity>
        </View>
        {method === "mpesa" && (
          <TextInput style={styles.input} placeholder="Phone (2547XXXXXXXX)" keyboardType="number-pad" value={phone} onChangeText={setPhone} />
        )}
        <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Processing..." : "Contribute"}</Text>
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
});
