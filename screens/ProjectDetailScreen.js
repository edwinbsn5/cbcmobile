import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Modal, TouchableWithoutFeedback, Alert, Linking } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import ReactionBar from "../components/ReactionBar";
import LinkifiedText from "../components/LinkifiedText";
import PostCard from "../components/PostCard";
import { useSaved } from "../hooks/useSaved";
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

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params;
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [membership, setMembership] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [joinVisible, setJoinVisible] = useState(false);
  const [contributeVisible, setContributeVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: p }, { data: mem }] = await Promise.all([
        client.get(`/projects/${projectId}`),
        client.get(`/projects/${projectId}/my-membership`),
      ]);
      setProject(p);
      setMembership(mem.membership);
      setIsAdmin(mem.isAdmin);
    } catch (e) {
      Alert.alert("Couldn't load project", e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !project) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const isMember = membership?.status === "active" || isAdmin;
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "tasks", label: "Tasks" },
    { key: "milestones", label: "Milestones" },
    { key: "docs", label: "Docs" },
    { key: "members", label: "Team" },
    ...(project.requiresCapital ? [{ key: "finance", label: "Finance" }] : []),
  ];

  return (
    <View style={styles.container}>
      <ScrollView>
        <Image source={{ uri: project.coverUrl }} style={styles.cover} contentFit="cover" />
        <View style={styles.headerBody}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{project.title}</Text>
            <View style={styles.categoryPill}><Text style={styles.categoryPillText}>{project.category}</Text></View>
          </View>
          <Text style={styles.desc}>{project.description}</Text>

          <View style={styles.positionsCard}>
            <Text style={styles.positionsBig}>{project.filled} of {project.maxMembers} positions filled</Text>
            <Text style={styles.positionsSub}>{project.remaining > 0 ? `${project.remaining} position(s) remaining` : "Team is full"}</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, (project.filled / project.maxMembers) * 100)}%` }]} /></View>
            {!!project.roles?.length && (
              <View style={styles.rolesGrid}>
                {project.roles.map((r) => (
                  <View key={r.id} style={styles.roleChip}>
                    <Text style={styles.roleChipText}>{r.name}: {r.headcountFilled}/{r.headcountNeeded}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {!membership && project.visibility === "public" && (
            <TouchableOpacity style={styles.primaryButton} onPress={() => setJoinVisible(true)}>
              <Text style={styles.primaryButtonText}>Apply to Join</Text>
            </TouchableOpacity>
          )}
          {membership?.status === "pending" && <Text style={styles.pendingNote}>Your application is awaiting review.</Text>}
          {membership?.status === "waitlisted" && <Text style={styles.pendingNote}>You're on the waitlist for this project.</Text>}
          {membership?.status === "rejected" && <Text style={styles.pendingNote}>Your application wasn't accepted.</Text>}

          {isMember && (
            <View style={styles.actionRow}>
              {project.requiresCapital && (
                <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => setContributeVisible(true)}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accentInk} />
                  <Text style={styles.primaryButtonText}>Mark as contributed</Text>
                </TouchableOpacity>
              )}
              {isAdmin && (
                <TouchableOpacity style={styles.secondaryButtonFlex} onPress={() => navigation.navigate("ProjectAdmin", { projectId })}>
                  <Ionicons name="settings-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.secondaryButtonText}>Manage</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
          {tabs.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tabBody}>
          {tab === "overview" && <FeedTab projectId={projectId} isMember={isMember} userId={user?.id} />}
          {tab === "tasks" && <TasksTab projectId={projectId} isMember={isMember} />}
          {tab === "milestones" && <MilestonesTab projectId={projectId} isMember={isMember} isAdmin={isAdmin} />}
          {tab === "docs" && <DocsTab projectId={projectId} isMember={isMember} />}
          {tab === "members" && <MembersTab projectId={projectId} isMember={isMember} project={project} myUserId={user?.id} />}
          {tab === "finance" && project.requiresCapital && <FinanceTab projectId={projectId} isMember={isMember} />}
        </View>
      </ScrollView>

      <JoinModal visible={joinVisible} onClose={() => setJoinVisible(false)} project={project} navigation={navigation} onDone={() => { setJoinVisible(false); load(); }} />
      <ContributeModal visible={contributeVisible} onClose={() => setContributeVisible(false)} projectId={projectId} onDone={() => { setContributeVisible(false); load(); }} />
    </View>
  );
}

function JoinModal({ visible, onClose, project, navigation, onDone }) {
  const [roleId, setRoleId] = useState(null);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const { data } = await client.post(`/projects/${project.id}/join`, { roleId, pitchMessage: pitch.trim() || undefined });
      Alert.alert(
        data.membership.status === "waitlisted" ? "Added to waitlist" : "Application sent",
        data.membership.status === "waitlisted" ? "This project is full — you'll be notified if a spot opens up." : "The project admin will review your application."
      );
      onDone();
    } catch (e) {
      if (e.response?.data?.requiresKyc) {
        Alert.alert("Identity verification required", e.response.data.error, [{ text: "Not now", style: "cancel" }, { text: "Verify now", onPress: () => navigation.navigate("KYC") }]);
      } else if (e.response?.data?.requiresGuarantors) {
        Alert.alert("Guarantors required", e.response.data.error, [{ text: "Not now", style: "cancel" }, { text: "Add guarantors", onPress: () => navigation.navigate("Guarantors") }]);
      } else {
        Alert.alert("Couldn't apply", e.response?.data?.error || e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Apply to join {project.title}</Text>
        {!!project.roles?.length && (
          <>
            <Text style={styles.label}>Which role? (optional)</Text>
            <View style={styles.optionRow}>
              {project.roles.map((r) => (
                <TouchableOpacity key={r.id} disabled={r.remaining <= 0} style={[styles.optionChip, roleId === r.id && styles.optionChipActive, r.remaining <= 0 && styles.optionChipDisabled]} onPress={() => setRoleId(r.id)}>
                  <Text style={[styles.optionChipText, roleId === r.id && styles.optionChipTextActive]}>{r.name}{r.remaining <= 0 ? " (full)" : ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        <Text style={styles.label}>Short pitch to the admin (optional)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={pitch} onChangeText={setPitch} placeholder="Why you're a good fit..." multiline />
        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Sending..." : "Send application"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function FeedTab({ projectId, isMember, userId }) {
  const [posts, setPosts] = useState(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();

  const load = useCallback(() => { if (isMember) client.get(`/projects/${projectId}/posts`).then((r) => setPosts(r.data)).catch(() => setPosts([])); }, [projectId, isMember]);
  useFocusEffect(useCallback(() => { load(); loadSaved(); }, [load, loadSaved]));

  async function submitPost() {
    if (!text.trim()) return;
    setPosting(true);
    try { await client.post(`/projects/${projectId}/posts`, { content: text.trim() }); setText(""); load(); }
    catch (e) { Alert.alert("Couldn't post", e.response?.data?.error || e.message); }
    finally { setPosting(false); }
  }

  async function react(postId, reaction) {
    try { const { data } = await client.post(`/projects/${projectId}/posts/${postId}/react`, { reaction }); setPosts((prev) => prev.map((p) => (p.id === postId ? data : p))); }
    catch (e) { Alert.alert("Couldn't react", e.response?.data?.error || e.message); }
  }

  async function deletePost(postId) {
    try { await client.delete(`/projects/${projectId}/posts/${postId}`); load(); }
    catch (e) { Alert.alert("Couldn't delete post", e.response?.data?.error || e.message); }
  }

  if (!isMember) return <Text style={styles.gatedText}>Join this project to view the discussion feed.</Text>;
  if (!posts) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <View style={styles.composer}>
        <TextInput style={[styles.input, styles.multiline]} placeholder="Share an update..." value={text} onChangeText={setText} multiline />
        <TouchableOpacity style={styles.secondaryButton} onPress={submitPost} disabled={posting}><Text style={styles.secondaryButtonText}>{posting ? "Posting..." : "Post"}</Text></TouchableOpacity>
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
      {!posts.length && <Text style={styles.gatedText}>No updates yet.</Text>}
    </View>
  );
}

const COLUMNS = [{ key: "todo", label: "To Do" }, { key: "in_progress", label: "In Progress" }, { key: "done", label: "Done" }];

function TasksTab({ projectId, isMember }) {
  const [tasks, setTasks] = useState(null);
  const [title, setTitle] = useState("");
  const load = useCallback(() => { if (isMember) client.get(`/projects/${projectId}/tasks`).then((r) => setTasks(r.data)).catch(() => setTasks([])); }, [projectId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function create() {
    if (!title.trim()) return;
    try { await client.post(`/projects/${projectId}/tasks`, { title: title.trim() }); setTitle(""); load(); }
    catch (e) { Alert.alert("Couldn't create task", e.response?.data?.error || e.message); }
  }

  async function move(task, status) {
    try { await client.patch(`/projects/${projectId}/tasks/${task.id}`, { status }); load(); }
    catch (e) { Alert.alert("Couldn't update task", e.response?.data?.error || e.message); }
  }

  if (!isMember) return <Text style={styles.gatedText}>Join this project to view the task board.</Text>;
  if (!tasks) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <View style={styles.composer}>
        <TextInput style={styles.input} placeholder="New task title" value={title} onChangeText={setTitle} onSubmitEditing={create} />
        <TouchableOpacity style={styles.secondaryButton} onPress={create}><Text style={styles.secondaryButtonText}>Add task</Text></TouchableOpacity>
      </View>
      {COLUMNS.map((col) => (
        <View key={col.key} style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>{col.label} ({tasks.filter((t) => t.status === col.key).length})</Text>
          {tasks.filter((t) => t.status === col.key).map((t) => (
            <View key={t.id} style={styles.taskCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerName}>{t.title}</Text>
                {!!t.assignee && <Text style={styles.ledgerMeta}>Assigned to {t.assignee.name}</Text>}
              </View>
              <View style={styles.rowActions}>
                {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                  <TouchableOpacity key={c.key} style={styles.smallBtn} onPress={() => move(t, c.key)}>
                    <Text style={styles.smallBtnText}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          {!tasks.filter((t) => t.status === col.key).length && <Text style={styles.gatedTextSmall}>Nothing here</Text>}
        </View>
      ))}
    </View>
  );
}

function MilestonesTab({ projectId, isMember, isAdmin }) {
  const [milestones, setMilestones] = useState(null);
  const [title, setTitle] = useState("");
  const load = useCallback(() => { if (isMember) client.get(`/projects/${projectId}/milestones`).then((r) => setMilestones(r.data)).catch(() => setMilestones([])); }, [projectId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function create() {
    if (!title.trim()) return;
    try { await client.post(`/projects/${projectId}/milestones`, { title: title.trim() }); setTitle(""); load(); }
    catch (e) { Alert.alert("Couldn't create milestone", e.response?.data?.error || e.message); }
  }

  async function setStatus(m, status) {
    try { await client.patch(`/projects/${projectId}/milestones/${m.id}`, { status }); load(); }
    catch (e) { Alert.alert("Couldn't update", e.response?.data?.error || e.message); }
  }

  if (!isMember) return <Text style={styles.gatedText}>Join this project to view milestones.</Text>;
  if (!milestones) return <ActivityIndicator color={COLORS.accent} />;
  const progress = milestones.length ? Math.round((milestones.filter((m) => m.status === "completed").length / milestones.length) * 100) : 0;
  return (
    <View>
      {isAdmin && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="New milestone title" value={title} onChangeText={setTitle} onSubmitEditing={create} />
          <TouchableOpacity style={styles.secondaryButton} onPress={create}><Text style={styles.secondaryButtonText}>Add milestone</Text></TouchableOpacity>
        </View>
      )}
      <Text style={styles.tabHint}>Overall progress: {progress}%</Text>
      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${progress}%` }]} /></View>
      {milestones.map((m) => (
        <View key={m.id} style={[styles.taskCard, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{m.title}</Text>
            {!!m.targetDate && <Text style={styles.ledgerMeta}>Target: {new Date(m.targetDate).toLocaleDateString()}</Text>}
          </View>
          <View style={styles.rowActions}>
            {["pending", "in_progress", "completed"].filter((s) => s !== m.status).map((s) => (
              <TouchableOpacity key={s} style={styles.smallBtn} onPress={() => setStatus(m, s)}><Text style={styles.smallBtnText}>{s.replace("_", " ")}</Text></TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      {!milestones.length && <Text style={styles.gatedText}>No milestones yet.</Text>}
    </View>
  );
}

function DocsTab({ projectId, isMember }) {
  const [docs, setDocs] = useState(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const load = useCallback(() => { if (isMember) client.get(`/projects/${projectId}/documents`).then((r) => setDocs(r.data)).catch(() => setDocs([])); }, [projectId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    if (!title.trim() || !url.trim()) return Alert.alert("Missing info", "Add both a title and a link");
    try { await client.post(`/projects/${projectId}/documents`, { title: title.trim(), url: url.trim() }); setTitle(""); setUrl(""); load(); }
    catch (e) { Alert.alert("Couldn't add", e.response?.data?.error || e.message); }
  }

  if (!isMember) return <Text style={styles.gatedText}>Join this project to view shared documents.</Text>;
  if (!docs) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <View style={styles.composer}>
        <TextInput style={styles.input} placeholder="Title (e.g. Pitch Deck)" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Link (https://...)" value={url} onChangeText={setUrl} autoCapitalize="none" />
        <TouchableOpacity style={styles.secondaryButton} onPress={add}><Text style={styles.secondaryButtonText}>Add link</Text></TouchableOpacity>
      </View>
      {docs.map((d) => (
        <TouchableOpacity key={d.id} style={styles.ledgerRow} onPress={() => Linking.openURL(d.url)}>
          <Ionicons name="document-text-outline" size={18} color={COLORS.accent} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{d.title}</Text>
            <Text style={styles.ledgerMeta} numberOfLines={1}>{d.url}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {!docs.length && <Text style={styles.gatedText}>No documents shared yet.</Text>}
    </View>
  );
}

function MembersTab({ projectId, isMember, project, myUserId }) {
  const [members, setMembers] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const load = useCallback(() => { if (isMember) client.get(`/projects/${projectId}/members`).then((r) => setMembers(r.data)).catch(() => setMembers([])); }, [projectId, isMember]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!isMember) return <Text style={styles.gatedText}>Join this project to view the team.</Text>;
  if (!members) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      {members.map((m) => (
        <View key={m.id} style={styles.memberRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{m.user?.name}{m.userId === project.creatorId ? " (Creator)" : ""}</Text>
            <Text style={styles.ledgerMeta}>{m.projectRole?.name || (m.role === "admin" ? "Admin" : "Member")} · Trust {m.trust?.score ?? "—"}{m.trust?.kycVerified ? " · KYC ✓" : ""}</Text>
          </View>
          {m.userId !== myUserId && (
            <TouchableOpacity style={styles.reportButton} onPress={() => setReportTarget(m)}>
              <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <ReportFraudModal groupPath={`/projects/${projectId}`} target={reportTarget} onClose={() => setReportTarget(null)} onDone={() => setReportTarget(null)} />
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

function FinanceTab({ projectId, isMember }) {
  const [contributions, setContributions] = useState(null);
  useFocusEffect(useCallback(() => { if (isMember) client.get(`/projects/${projectId}/contributions`).then((r) => setContributions(r.data)).catch(() => setContributions([])); }, [projectId, isMember]));
  if (!isMember) return <Text style={styles.gatedText}>Join this project to view its ledger.</Text>;
  if (!contributions) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <Text style={styles.tabHint}>Self-reported by members — capital is handed over physically, not through the app.</Text>
      {contributions.map((c) => (
        <View key={c.id} style={styles.ledgerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerName}>{c.user?.name}</Text>
            <Text style={styles.ledgerMeta}>{c.method === "cash_manual" ? "Recorded by admin" : "Self-reported"} · {new Date(c.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.ledgerAmount, c.status === "not_contributed" && styles.ledgerAmountVoided]}>{formatKES(c.amount)}</Text>
          {c.status === "not_contributed" && <Text style={styles.notContributedBadge}>Not received</Text>}
        </View>
      ))}
      {!contributions.length && <Text style={styles.gatedText}>No contributions recorded yet.</Text>}
    </View>
  );
}

function ContributeModal({ visible, onClose, projectId, onDone }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");
    setSubmitting(true);
    try {
      await client.post(`/projects/${projectId}/contributions/mark`, { amount: amt, note: note.trim() || undefined });
      Alert.alert("Marked as contributed", `${formatKES(amt)} recorded. An admin can correct this if the cash wasn't actually received.`);
      setAmount(""); setNote(""); onDone();
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
        <Text style={styles.tabHint}>This just logs it to the project ledger — capital is handed over physically, not through the app.</Text>
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
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 20, fontWeight: "800", color: COLORS.ink, flex: 1 },
  categoryPill: { backgroundColor: COLORS.accentInk, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  categoryPillText: { color: COLORS.accent, fontSize: 10.5, fontWeight: "700" },
  desc: { color: COLORS.sub, marginTop: 4, lineHeight: 19 },
  positionsCard: { marginTop: 14, backgroundColor: COLORS.wash, borderRadius: 10, padding: 12 },
  positionsBig: { fontWeight: "800", color: COLORS.ink, fontSize: 15 },
  positionsSub: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  barTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },
  rolesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  roleChip: { backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  roleChipText: { color: COLORS.ink, fontSize: 11, fontWeight: "700" },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 14 },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  primaryButtonFlex: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center" },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 11, alignItems: "center", marginTop: 10 },
  secondaryButtonText: { color: COLORS.accent, fontWeight: "700" },
  secondaryButtonFlex: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 11, alignItems: "center" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  pendingNote: { color: COLORS.sub, fontSize: 12.5, marginTop: 10, textAlign: "center" },
  tabRow: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  tab: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: COLORS.accent },
  tabText: { fontSize: 12, color: COLORS.sub, fontWeight: "600" },
  tabTextActive: { color: COLORS.accent, fontWeight: "800" },
  tabBody: { padding: 14 },
  gatedText: { color: COLORS.sub, textAlign: "center", marginTop: 20 },
  gatedTextSmall: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  tabHint: { color: COLORS.sub, fontSize: 12, marginBottom: 8 },
  reportButton: { padding: 6, marginLeft: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 8 },
  taskCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  ledgerRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  ledgerName: { color: COLORS.ink, fontWeight: "700", fontSize: 13.5 },
  ledgerMeta: { color: COLORS.sub, fontSize: 11.5, marginTop: 2 },
  ledgerAmount: { color: COLORS.accent, fontWeight: "800", fontSize: 13.5 },
  ledgerAmountVoided: { color: COLORS.sub, textDecorationLine: "line-through" },
  notContributedBadge: { color: "#D32F2F", fontWeight: "700", fontSize: 10.5, marginLeft: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  rowActions: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  smallBtn: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  smallBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 10.5, textTransform: "capitalize" },
  composer: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 14 },
  postCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  postMeta: { color: COLORS.sub, fontSize: 11, marginBottom: 8 },
  postContent: { color: COLORS.ink, fontSize: 13.5, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 4, marginTop: 4 },
  optionRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipDisabled: { opacity: 0.4 },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12.5 },
  optionChipTextActive: { color: COLORS.accentInk },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 16, marginBottom: 12 },
});
