import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import AdCard from "../components/AdCard";
import AdMobBanner from "../components/AdMobBanner";
import Avatar from "../components/Avatar";
import MentionTextInput from "../components/MentionTextInput";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

const TABS = ["Feed", "Photos", "Videos", "Reviews"];
const MANAGE_ROLES = ["Owner", "Admin"];
const POST_ROLES = ["Owner", "Admin", "Editor"];
const REPLY_ROLES = ["Owner", "Admin", "Moderator"];

function StarRow({ value, size = 14, onRate }) {
  return (
    <View style={{ flexDirection: "row", gap: onRate ? 6 : 2 }}>
      {[1, 2, 3, 4, 5].map((n) =>
        onRate ? (
          <TouchableOpacity key={n} onPress={() => onRate(n)}>
            <Ionicons name={n <= value ? "star" : "star-outline"} size={size} color="#F5A623" />
          </TouchableOpacity>
        ) : (
          <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={size} color="#F5A623" />
        )
      )}
    </View>
  );
}

function RecommendRow({ value, onChange }) {
  return (
    <View style={styles.recommendRow}>
      <TouchableOpacity
        style={[styles.recommendButton, value === "recommend" && styles.recommendButtonActive]}
        onPress={() => onChange?.("recommend")}
        disabled={!onChange}
      >
        <Ionicons name="thumbs-up-outline" size={16} color={value === "recommend" ? COLORS.accentInk : COLORS.accent} />
        <Text style={[styles.recommendText, value === "recommend" && styles.recommendTextActive]}>Recommends</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.recommendButton, value === "not_recommend" && styles.recommendButtonActiveNeg]}
        onPress={() => onChange?.("not_recommend")}
        disabled={!onChange}
      >
        <Ionicons name="thumbs-down-outline" size={16} color={value === "not_recommend" ? "#fff" : COLORS.sub} />
        <Text style={[styles.recommendText, value === "not_recommend" && styles.recommendTextActive]}>Doesn't recommend</Text>
      </TouchableOpacity>
    </View>
  );
}

function RatingBreakdown({ breakdown, totalCount }) {
  return (
    <View style={styles.breakdown}>
      {[5, 4, 3, 2, 1].map((n) => {
        const count = breakdown?.[n] || 0;
        const pct = totalCount ? (count / totalCount) * 100 : 0;
        return (
          <View key={n} style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{n}★</Text>
            <View style={styles.breakdownTrack}>
              <View style={[styles.breakdownFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.breakdownCount}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PageReviewCard({ review, canReply, onReply }) {
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onReply(review.id, replyText.trim());
      setReplying(false);
      setReplyText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar uri={review.author?.avatar} name={review.author?.name} style={styles.reviewAvatar} />
        <View>
          <Text style={styles.reviewName}>{review.author?.name}</Text>
          <StarRow value={review.rating} size={12} />
        </View>
      </View>
      <RecommendRow value={review.recommendation} />
      {!!review.reviewText && <Text style={styles.reviewContent}>{review.reviewText}</Text>}

      {!!review.replyText && (
        <View style={styles.replyBox}>
          <Text style={styles.replyAuthor}>Reply from {review.replyByName}</Text>
          <Text style={styles.replyText}>{review.replyText}</Text>
        </View>
      )}

      {canReply && !review.replyText && (
        replying ? (
          <View style={styles.replyForm}>
            <TextInput style={styles.replyInput} placeholder="Write an official reply..." value={replyText} onChangeText={setReplyText} multiline />
            <View style={styles.replyFormActions}>
              <TouchableOpacity onPress={() => setReplying(false)}>
                <Text style={styles.replyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.replySubmitButton} onPress={submit} disabled={submitting || !replyText.trim()}>
                <Text style={styles.replySubmitText}>{submitting ? "Sending..." : "Reply"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setReplying(true)}>
            <Text style={styles.replyLink}>Reply as Page</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

function MediaGridRow({ row, onPress }) {
  return (
    <View style={styles.mediaRow}>
      {row.map((item, i) => (
        <TouchableOpacity key={item.id} style={styles.mediaCell} onPress={() => onPress?.(i)} activeOpacity={onPress ? 0.85 : 1}>
          {item.mediaType === "video" ? (
            <>
              <Video source={{ uri: item.url }} style={styles.mediaCellMedia} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
              <View style={styles.playBadge}>
                <Ionicons name="play" size={16} color="#fff" />
              </View>
            </>
          ) : (
            <Image source={{ uri: item.url }} style={styles.mediaCellMedia} contentFit="cover" />
          )}
        </TouchableOpacity>
      ))}
      {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <View key={`pad-${i}`} style={styles.mediaCell} />)}
    </View>
  );
}

async function pickMedia({ videosOnly = false } = {}) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Allow photo library access to attach media");
    return null;
  }
  const mediaTypes = videosOnly ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: 0.7 });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const type = asset.type === "video" ? "video" : "image";
  const mimeType = asset.mimeType || (type === "video" ? "video/mp4" : "image/jpeg");
  return { uri: asset.uri, type, mimeType, fileName: asset.fileName || `upload.${mimeType.split("/")[1]}` };
}

async function uploadMedia(localMedia) {
  const form = new FormData();
  form.append("file", { uri: localMedia.uri, name: localMedia.fileName, type: localMedia.mimeType });
  const { data } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  return data;
}

async function pickMultiplePhotos() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Allow photo library access to attach photos");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    mimeType: a.mimeType || "image/jpeg",
    fileName: a.fileName || `upload.${(a.mimeType || "image/jpeg").split("/")[1]}`,
  }));
}

async function uploadMultiplePhotos(photoList) {
  const form = new FormData();
  photoList.forEach((p) => form.append("files", { uri: p.uri, name: p.fileName, type: p.mimeType }));
  const { data } = await client.post("/upload/multiple", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
  return data.urls;
}

export default function PageDetailScreen({ route, navigation }) {
  const { pageId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [page, setPage] = useState(null);
  const [activeTab, setActiveTab] = useState("Feed");
  const [feed, setFeed] = useState([]);
  // Arriving via a "commented on your Page post" notification tap. Same
  // already-mounted-in-the-stack caveat as GroupDetailScreen — read from
  // route.params in an effect, not a useState initializer.
  const [focusPostId, setFocusPostId] = useState(null);
  const [focusCommentId, setFocusCommentId] = useState(null);
  useEffect(() => {
    if (route.params?.focusPostId) {
      setFocusPostId(route.params.focusPostId);
      setFocusCommentId(route.params.focusCommentId ?? null);
    }
  }, [route.params?.focusPostId, route.params?.focusCommentId]);
  const listRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [reviews, setReviews] = useState({ items: [], avgRating: 0, totalCount: 0, recommendPct: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [changingCover, setChangingCover] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const [composerText, setComposerText] = useState("");
  const [postAs, setPostAs] = useState("page");
  const [posting, setPosting] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState(null);
  const [attachedPhotos, setAttachedPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [myRating, setMyRating] = useState(0);
  const [myRecommendation, setMyRecommendation] = useState(null);
  const [myReviewText, setMyReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const { isSaved, toggleSave, loadSaved } = useSaved();

  const myRole = page?.myRole || null;
  const canPost = POST_ROLES.includes(myRole);
  const canManageTeam = MANAGE_ROLES.includes(myRole);
  const canReplyReviews = REPLY_ROLES.includes(myRole);
  const isOwner = myRole === "Owner";
  const isTeamMember = !!myRole;
  const pendingInvite = page?.myPendingInvite || null;
  const isSuspended = page?.status === "suspended";

  async function load() {
    const pageRes = await client.get(`/pages/${pageId}`);
    setPage(pageRes.data);
    loadSaved();

    const [feedRes, photosRes, videosRes, reviewsRes] = await Promise.all([
      client.get(`/pages/${pageRes.data.slug}/feed`),
      client.get(`/pages/${pageRes.data.slug}/photos`),
      client.get(`/pages/${pageRes.data.slug}/videos`),
      client.get(`/pages/${pageRes.data.slug}/reviews`),
    ]);
    setFeed(feedRes.data);
    setPhotos(photosRes.data);
    setVideos(videosRes.data);
    setReviews(reviewsRes.data);

    const mine = reviewsRes.data.items.find((r) => r.userId === user?.id);
    if (mine) {
      setMyRating(mine.rating);
      setMyRecommendation(mine.recommendation);
      setMyReviewText(mine.reviewText || "");
    }
  }

  useEffect(() => {
    load()
      .catch((e) => Alert.alert("Couldn't load page", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [pageId]);

  async function handleAttachPhotos() {
    const picked = await pickMultiplePhotos();
    if (!picked.length) return;
    setAttachedMedia(null);
    setAttachedPhotos((prev) => {
      const combined = [...prev, ...picked];
      if (combined.length > 10) Alert.alert("Too many photos", "Only the first 10 photos were kept");
      return combined.slice(0, 10);
    });
  }

  async function handleAttachVideo() {
    const picked = await pickMedia({ videosOnly: true });
    if (!picked) return;
    setAttachedPhotos([]);
    setAttachedMedia(picked);
  }

  async function handlePost() {
    if (!composerText.trim() && !attachedMedia && !attachedPhotos.length) return;
    setPosting(true);
    try {
      let mediaUrl = null;
      let thumbnailUrl = null;
      let type = "text";
      let photoUrls;
      if (attachedPhotos.length) {
        setUploading(true);
        photoUrls = await uploadMultiplePhotos(attachedPhotos);
        setUploading(false);
      } else if (attachedMedia) {
        setUploading(true);
        const uploaded = await uploadMedia(attachedMedia);
        mediaUrl = uploaded.url;
        type = uploaded.type;
        thumbnailUrl = uploaded.thumbnailUrl;
        setUploading(false);
      }
      await client.post(`/pages/${pageId}/feed`, { content: composerText.trim(), type, mediaUrl, thumbnailUrl, photoUrls, postAs });
      setComposerText("");
      setAttachedMedia(null);
      setAttachedPhotos([]);
      load();
    } catch (e) {
      Alert.alert("Couldn't post", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setPosting(false);
    }
  }

  async function handleReact(postId, reaction) {
    try {
      await client.post(`/pages/${pageId}/feed/${postId}/react`, { reaction });
      load();
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleDeletePost(postId) {
    try {
      await client.delete(`/pages/${pageId}/feed/${postId}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  async function handleAddPhoto() {
    const picked = await pickMedia();
    if (!picked) return;
    setUploading(true);
    try {
      const uploaded = await uploadMedia(picked);
      await client.post(`/pages/${pageId}/photos`, { url: uploaded.url });
      load();
    } catch (e) {
      Alert.alert("Couldn't add photo", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAddVideo() {
    const picked = await pickMedia({ videosOnly: true });
    if (!picked) return;
    setUploading(true);
    try {
      const uploaded = await uploadMedia(picked);
      await client.post(`/pages/${pageId}/videos`, { url: uploaded.url, thumbnailUrl: uploaded.thumbnailUrl });
      load();
    } catch (e) {
      Alert.alert("Couldn't add video", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitReview() {
    if (myRating < 1) return Alert.alert("Pick a rating", "Tap a star to rate this Page");
    if (!myRecommendation) return Alert.alert("Pick one", "Let others know if you recommend this Page");
    setReviewSubmitting(true);
    try {
      await client.post(`/pages/${pageId}/reviews`, { rating: myRating, recommendation: myRecommendation, reviewText: myReviewText.trim() });
      load();
    } catch (e) {
      Alert.alert("Couldn't submit review", e.response?.data?.error || e.message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleReplyReview(reviewId, replyText) {
    try {
      await client.post(`/pages/${pageId}/reviews/${reviewId}/reply`, { replyText });
      load();
    } catch (e) {
      Alert.alert("Couldn't send reply", e.response?.data?.error || e.message);
    }
  }

  async function handleToggleFollow() {
    setFollowSubmitting(true);
    try {
      const path = page.amIFollowing ? "unfollow" : "follow";
      const { data } = await client.post(`/pages/${pageId}/${path}`);
      setPage((prev) => ({ ...prev, ...data }));
    } catch (e) {
      Alert.alert("Couldn't update follow status", e.response?.data?.error || e.message);
    } finally {
      setFollowSubmitting(false);
    }
  }

  async function handleMessagePage() {
    setMessaging(true);
    try {
      const { data } = await client.post("/inbox/start", {
        userId: page.ownerId, contextType: "page", contextPageId: page.id,
      });
      navigation.navigate("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start chat", e.response?.data?.error || e.message);
    } finally {
      setMessaging(false);
    }
  }

  async function handleChangeCover() {
    const localMedia = await pickMedia();
    if (!localMedia) return;
    setChangingCover(true);
    try {
      const uploaded = await uploadMedia(localMedia);
      const { data } = await client.patch(`/pages/${pageId}`, { coverUrl: uploaded.url });
      setPage(data);
    } catch (e) {
      Alert.alert("Couldn't update cover", e.response?.data?.error || e.message);
    } finally {
      setChangingCover(false);
    }
  }

  function handleToggleSuspend() {
    const nextStatus = page.status === "suspended" ? "active" : "suspended";
    Alert.alert(
      nextStatus === "suspended" ? "Suspend this Page?" : "Reactivate this Page?",
      nextStatus === "suspended" ? "The Page's content stays visible but you won't be able to post until you reactivate it." : "",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextStatus === "suspended" ? "Suspend" : "Reactivate",
          style: nextStatus === "suspended" ? "destructive" : "default",
          onPress: async () => {
            const { data } = await client.patch(`/pages/${pageId}/status`, { status: nextStatus });
            setPage(data);
          },
        },
      ]
    );
  }

  async function handleAcceptInvite() {
    await client.post(`/pages/${pageId}/members/${pendingInvite.memberId}/accept`);
    load();
  }

  async function handleDeclineInvite() {
    await client.post(`/pages/${pageId}/members/${pendingInvite.memberId}/decline`);
    load();
  }

  function handleDeletePage() {
    Alert.alert("Delete this Page?", "This permanently deletes the Page, its posts, media, reviews, and team. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await client.delete(`/pages/${pageId}`);
          navigation.goBack();
        },
      },
    ]);
  }

  useEffect(() => {
    if (!focusPostId || activeTab !== "Feed" || !feed.length) return;
    const index = feed.findIndex((item) => item.id === focusPostId);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    }
    setFocusPostId(null);
    setFocusCommentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, activeTab, focusPostId]);

  if (loading || !page) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const photoRows = [];
  for (let i = 0; i < photos.length; i += 3) photoRows.push(photos.slice(i, i + 3));
  const videoRows = [];
  for (let i = 0; i < videos.length; i += 3) videoRows.push(videos.slice(i, i + 3));

  const tabData =
    activeTab === "Reviews" ? reviews.items : activeTab === "Photos" ? photoRows : activeTab === "Videos" ? videoRows : feed;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <FlatList
      ref={listRef}
      style={styles.container}
      data={tabData}
      keyExtractor={(item, i) => (activeTab === "Photos" || activeTab === "Videos" ? `${activeTab}-row-${i}` : `${activeTab}-${item.id}-${i}`)}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.15 }), 300);
      }}
      renderItem={({ item, index }) => {
        if (activeTab === "Reviews") return <PageReviewCard review={item} canReply={canReplyReviews} onReply={handleReplyReview} />;
        if (activeTab === "Photos") return <MediaGridRow row={item} />;
        if (activeTab === "Videos") {
          return (
            <MediaGridRow
              row={item}
              onPress={(colIndex) => navigation.navigate("PageVideoPlayer", { pageId, slug: page.slug, startIndex: index * 3 + colIndex })}
            />
          );
        }
        if (item.kind === "ad") return item.network === "google" ? <AdMobBanner /> : <AdCard ad={item} />;
        return (
          <PostCard
            post={item}
            onReact={handleReact}
            isSaved={isSaved("post", item.id)}
            onToggleSave={() => toggleSave("post", item.id)}
            onDelete={handleDeletePost}
            onChanged={load}
            autoOpenComments={!!focusCommentId && item.id === focusPostId}
          />
        );
      }}
      ListEmptyComponent={
        activeTab === "Reviews" ? (
          <Text style={styles.empty}>{isTeamMember ? "No reviews yet" : "No reviews yet — be the first!"}</Text>
        ) : (
          <Text style={styles.empty}>
            {activeTab === "Photos" ? "No photos yet" : activeTab === "Videos" ? "No videos yet" : "No posts yet"}
          </Text>
        )
      }
      ListHeaderComponent={
        <View>
          <View style={styles.coverWrap}>
            <Image source={{ uri: page.coverUrl }} style={styles.cover} contentFit="cover" />
            {canManageTeam && (
              <TouchableOpacity style={styles.changeCoverButton} onPress={handleChangeCover} disabled={changingCover}>
                <Ionicons name="camera-outline" size={13} color="#fff" />
                <Text style={styles.changeCoverText}>{changingCover ? "Uploading..." : "Change cover"}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.identityStrip}>
            <Avatar uri={page.avatarUrl} name={page.name} style={styles.identityAvatar} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.coverNameLine}>
                <Text style={styles.identityName} numberOfLines={1}>{page.name}</Text>
                {page.isVerified && <Ionicons name="checkmark-circle" size={16} color="#4C9AFF" style={{ marginLeft: 4 }} />}
              </View>
              <Text style={styles.identityMeta} numberOfLines={1}>
                {page.totalCount > 0 ? `★ ${page.avgRating.toFixed(1)} (${page.totalCount})` : "★ New"}
                {page.county ? `  ·  📍 ${page.county}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.body}>
            {isSuspended && (
              <View style={styles.suspendedBanner}>
                <Text style={styles.suspendedBannerTitle}>⏸ SUSPENDED</Text>
                <Text style={styles.suspendedBannerText}>
                  {page.moderatedAt
                    ? "This Page was suspended by a platform admin. Posting, following, and reviews are disabled."
                    : `This Page is suspended${canManageTeam ? " — reactivate it below" : ""}. Posting, following, and reviews are disabled.`}
                </Text>
                {!!page.moderationReason && <Text style={styles.suspendedBannerReason}>Reason: {page.moderationReason}</Text>}
              </View>
            )}

            <View style={styles.statStrip}>
              <View style={styles.statCell}>
                <Text style={styles.statCellValue}>{page.followerCount >= 1000 ? `${(page.followerCount / 1000).toFixed(1)}k` : page.followerCount}</Text>
                <Text style={styles.statCellLabel}>Followers</Text>
              </View>
              <View style={styles.statCellDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statCellValue}>{page.totalCount}</Text>
                <Text style={styles.statCellLabel}>Reviews</Text>
              </View>
              <View style={styles.statCellDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statCellValue}>{page.totalCount > 0 ? `${page.recommendPct}%` : "—"}</Text>
                <Text style={styles.statCellLabel}>Recommend</Text>
              </View>
            </View>

            <View style={styles.categoryRow}>
              {page.categories.map((c) => (
                <View key={c.id} style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{c.name}</Text>
                </View>
              ))}
            </View>
            {!!page.description && <Text style={styles.desc}>{page.description}</Text>}

            <Text style={styles.memberCount}>
              {page.memberCount} team member{page.memberCount === 1 ? "" : "s"}
            </Text>

            {!isTeamMember && !isSuspended && (
              <View style={styles.followRow}>
                <TouchableOpacity
                  style={[styles.followButton, page.amIFollowing && styles.followingButton]}
                  onPress={handleToggleFollow}
                  disabled={followSubmitting}
                >
                  <Text style={[styles.followButtonText, page.amIFollowing && styles.followingButtonText]}>
                    {followSubmitting ? "..." : page.amIFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.followButton, styles.messageButton]} onPress={handleMessagePage} disabled={messaging}>
                  <Text style={[styles.followButtonText, styles.messageButtonText]}>{messaging ? "..." : "Message"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {pendingInvite && (
              <View style={styles.inviteBanner}>
                <Text style={styles.inviteBannerText}>You've been invited to manage this Page as {pendingInvite.role}</Text>
                <View style={styles.inviteBannerActions}>
                  <TouchableOpacity style={styles.inviteAcceptButton} onPress={handleAcceptInvite}>
                    <Text style={styles.inviteAcceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inviteDeclineButton} onPress={handleDeclineInvite}>
                    <Text style={styles.inviteDeclineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {canManageTeam && (
              <View style={styles.manageRow}>
                <TouchableOpacity style={styles.manageButton} onPress={() => navigation.navigate("PageTeamManagement", { pageId })}>
                  <Ionicons name="people-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.manageButtonText}>Manage Team</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.manageButton} onPress={() => navigation.navigate("BoostPage", { page })}>
                  <Ionicons name="megaphone-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.manageButtonText}>Boost this Page</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.manageButton} onPress={handleToggleSuspend}>
                  <Ionicons name={page.status === "suspended" ? "play-outline" : "pause-outline"} size={16} color={COLORS.accent} />
                  <Text style={styles.manageButtonText}>{page.status === "suspended" ? "Reactivate" : "Suspend"}</Text>
                </TouchableOpacity>
                {isOwner && (
                  <TouchableOpacity style={styles.manageButton} onPress={handleDeletePage}>
                    <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                    <Text style={[styles.manageButtonText, { color: "#D32F2F" }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.tabRow}>
              {TABS.map((t) => (
                <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
                  <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === "Feed" && canPost && !isSuspended && (
              <View style={styles.composer}>
                <View style={styles.postAsRow}>
                  <TouchableOpacity style={[styles.postAsButton, postAs === "page" && styles.postAsButtonActive]} onPress={() => setPostAs("page")}>
                    <Text style={[styles.postAsText, postAs === "page" && styles.postAsTextActive]}>Post as {page.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.postAsButton, postAs === "user" && styles.postAsButtonActive]} onPress={() => setPostAs("user")}>
                    <Text style={[styles.postAsText, postAs === "user" && styles.postAsTextActive]}>Post as {user?.name}</Text>
                  </TouchableOpacity>
                </View>
                <MentionTextInput
                  style={styles.composerInput}
                  placeholder={`Share something as ${postAs === "page" ? page.name : "yourself"}...`}
                  value={composerText}
                  onChangeText={setComposerText}
                  multiline
                />
                {attachedMedia && (
                  <View style={styles.previewWrap}>
                    <Video source={{ uri: attachedMedia.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                    <TouchableOpacity style={styles.removeButton} onPress={() => setAttachedMedia(null)}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {attachedPhotos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
                    {attachedPhotos.map((p, i) => (
                      <View key={i} style={styles.photoThumbWrap}>
                        <Image source={{ uri: p.uri }} style={styles.photoThumb} contentFit="cover" />
                        <TouchableOpacity style={styles.removeButtonSmall} onPress={() => setAttachedPhotos((prev) => prev.filter((_, idx) => idx !== i))}>
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <View style={styles.attachRow}>
                  <TouchableOpacity style={styles.attachButton} onPress={handleAttachPhotos} disabled={posting || uploading || !!attachedMedia}>
                    <Ionicons name="images-outline" size={18} color={attachedMedia ? COLORS.sub : COLORS.accent} />
                    <Text style={[styles.attachButtonText, attachedMedia && styles.attachButtonTextDisabled]}>
                      {attachedPhotos.length ? `Add more photos (${attachedPhotos.length}/10)` : "Add photos"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachButton} onPress={handleAttachVideo} disabled={posting || uploading || attachedPhotos.length > 0}>
                    <Ionicons name="videocam-outline" size={18} color={attachedPhotos.length ? COLORS.sub : COLORS.accent} />
                    <Text style={[styles.attachButtonText, attachedPhotos.length > 0 && styles.attachButtonTextDisabled]}>Add video</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.postButton}
                  onPress={handlePost}
                  disabled={posting || uploading || (!composerText.trim() && !attachedMedia && !attachedPhotos.length)}
                >
                  <Text style={styles.postButtonText}>{uploading ? "Uploading..." : posting ? "Posting..." : "Post"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "Photos" && canPost && !isSuspended && (
              <TouchableOpacity style={styles.attachButton} onPress={handleAddPhoto} disabled={uploading}>
                <Ionicons name="images-outline" size={18} color={COLORS.accent} />
                <Text style={styles.attachButtonText}>{uploading ? "Uploading..." : "Add photo"}</Text>
              </TouchableOpacity>
            )}

            {activeTab === "Videos" && canPost && !isSuspended && (
              <TouchableOpacity style={styles.attachButton} onPress={handleAddVideo} disabled={uploading}>
                <Ionicons name="videocam-outline" size={18} color={COLORS.accent} />
                <Text style={styles.attachButtonText}>{uploading ? "Uploading..." : "Add video"}</Text>
              </TouchableOpacity>
            )}

            {activeTab === "Reviews" && (
              page.totalCount > 0 && (
                <RatingBreakdown breakdown={reviews.breakdown} totalCount={page.totalCount} />
              )
            )}

            {activeTab === "Reviews" && !isTeamMember && !isSuspended && (
              <View style={styles.composer}>
                <Text style={styles.reviewFormLabel}>Your rating</Text>
                <StarRow value={myRating} size={28} onRate={setMyRating} />
                <RecommendRow value={myRecommendation} onChange={setMyRecommendation} />
                <TextInput
                  style={styles.composerInput}
                  placeholder="Write a review (optional)"
                  value={myReviewText}
                  onChangeText={setMyReviewText}
                  multiline
                />
                <TouchableOpacity style={styles.postButton} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                  <Text style={styles.postButtonText}>{reviewSubmitting ? "Submitting..." : "Submit review"}</Text>
                </TouchableOpacity>
              </View>
            )}
            {activeTab === "Reviews" && isTeamMember && (
              <Text style={styles.teamHint}>Team members can't review their own Page.</Text>
            )}

            <Text style={styles.sectionTitle}>{activeTab}</Text>
          </View>
        </View>
      }
    />
    <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
      <Ionicons name="chevron-back" size={20} color="#fff" />
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: {
    position: "absolute", left: 14, width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center",
  },
  coverWrap: { height: 150, backgroundColor: "#eee" },
  cover: { width: "100%", height: "100%" },
  changeCoverButton: {
    position: "absolute", right: 10, top: 34, flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
  },
  changeCoverText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  identityStrip: {
    backgroundColor: COLORS.accentInk, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  identityAvatar: { width: 44, height: 44, borderRadius: 14 },
  coverNameLine: { flexDirection: "row", alignItems: "center" },
  identityName: { color: "#fff", fontSize: 16, fontWeight: "800", flexShrink: 1 },
  identityMeta: { color: "#B9C6DC", fontSize: 11.5, fontWeight: "700", marginTop: 3 },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  statStrip: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, marginBottom: 16,
  },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 10 },
  statCellValue: { color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  statCellLabel: { color: COLORS.sub, fontSize: 10, fontWeight: "700", marginTop: 2 },
  statCellDivider: { width: 1, alignSelf: "stretch", backgroundColor: COLORS.border },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  categoryPill: { backgroundColor: COLORS.wash, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  categoryPillText: { color: COLORS.accent, fontSize: 11.5, fontWeight: "600" },
  desc: { color: COLORS.sub, marginTop: 8, fontSize: 14 },
  memberCount: { color: COLORS.sub, fontSize: 12, marginTop: 10 },
  followRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  followButton: { flex: 1, backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  followButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 13.5 },
  followingButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  followingButtonText: { color: COLORS.ink },
  messageButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  messageButtonText: { color: COLORS.ink },
  suspendedBanner: { backgroundColor: "#D32F2F", padding: 14, borderRadius: 10, marginBottom: 4 },
  suspendedBannerTitle: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5, marginBottom: 4 },
  suspendedBannerText: { color: "#fff", fontWeight: "600", fontSize: 13, lineHeight: 18 },
  suspendedBannerReason: { color: "#FFE0E0", fontSize: 12.5, marginTop: 8, fontStyle: "italic" },
  inviteBanner: { backgroundColor: "#E9F8EE", padding: 12, borderRadius: 8, marginTop: 12 },
  inviteBannerText: { color: "#2E7D32", fontWeight: "600", marginBottom: 8 },
  inviteBannerActions: { flexDirection: "row", gap: 10 },
  inviteAcceptButton: { backgroundColor: "#2E7D32", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  inviteAcceptText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
  inviteDeclineButton: { borderWidth: 1, borderColor: "#2E7D32", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  inviteDeclineText: { color: "#2E7D32", fontWeight: "700", fontSize: 12.5 },
  manageRow: { flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" },
  manageButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.wash, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  manageButtonText: { color: COLORS.accent, fontWeight: "700", fontSize: 12.5 },
  tabRow: { flexDirection: "row", marginTop: 22, borderTopWidth: 1, borderTopColor: COLORS.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.sub, fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: COLORS.accent },
  composer: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 4 },
  postAsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  postAsButton: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingVertical: 7, alignItems: "center" },
  postAsButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  postAsText: { fontSize: 12, fontWeight: "700", color: COLORS.sub },
  postAsTextActive: { color: COLORS.accentInk },
  composerInput: { minHeight: 40, fontSize: 15, color: COLORS.ink },
  previewWrap: { marginTop: 10, borderRadius: 8, overflow: "hidden" },
  preview: { width: "100%", height: 180, backgroundColor: "#000" },
  removeButton: {
    position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  photosRow: { marginTop: 10 },
  photoThumbWrap: { width: 72, height: 72, borderRadius: 8, overflow: "hidden", marginRight: 8, backgroundColor: COLORS.wash },
  photoThumb: { width: "100%", height: "100%" },
  removeButtonSmall: {
    position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  attachRow: { flexDirection: "row", gap: 18 },
  attachButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  attachButtonText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  attachButtonTextDisabled: { color: COLORS.sub },
  postButton: { backgroundColor: COLORS.accent, borderRadius: 6, paddingVertical: 8, alignItems: "center", marginTop: 8 },
  postButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  reviewFormLabel: { fontSize: 13, color: COLORS.sub, marginBottom: 8, fontWeight: "600" },
  teamHint: { color: COLORS.sub, fontSize: 12, textAlign: "center", marginTop: 8, fontStyle: "italic" },
  recommendRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 4 },
  recommendButton: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  recommendButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  recommendButtonActiveNeg: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  recommendText: { fontSize: 12, fontWeight: "700", color: COLORS.sub },
  recommendTextActive: { color: "#fff" },
  breakdown: { marginTop: 4, marginBottom: 8 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  breakdownLabel: { width: 26, fontSize: 12, color: COLORS.sub, fontWeight: "600" },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.wash, overflow: "hidden" },
  breakdownFill: { height: "100%", backgroundColor: "#F5A623", borderRadius: 3 },
  breakdownCount: { width: 22, fontSize: 11, color: COLORS.sub, textAlign: "right" },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17 },
  reviewName: { color: COLORS.ink, fontWeight: "700", fontSize: 13.5 },
  reviewContent: { fontSize: 14, color: COLORS.ink, lineHeight: 19, marginTop: 6 },
  replyBox: { backgroundColor: COLORS.wash, borderRadius: 8, padding: 10, marginTop: 10 },
  replyAuthor: { fontSize: 11.5, fontWeight: "700", color: COLORS.accent, marginBottom: 2 },
  replyText: { fontSize: 13, color: COLORS.ink, lineHeight: 18 },
  replyLink: { color: COLORS.accent, fontWeight: "700", fontSize: 12.5, marginTop: 8 },
  replyForm: { marginTop: 8 },
  replyInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 50, textAlignVertical: "top", color: COLORS.ink },
  replyFormActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 6 },
  replyCancelText: { color: COLORS.sub, fontSize: 12.5, fontWeight: "600" },
  replySubmitButton: { backgroundColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  replySubmitText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12.5 },
  empty: { textAlign: "center", color: "#999", marginTop: 10, marginBottom: 20 },
  mediaRow: { flexDirection: "row", gap: 2, paddingHorizontal: 10 },
  mediaCell: { flex: 1, aspectRatio: 1, backgroundColor: "#000", marginBottom: 2, borderRadius: 4, overflow: "hidden" },
  mediaCellMedia: { width: "100%", height: "100%" },
  playBadge: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)",
  },
});
