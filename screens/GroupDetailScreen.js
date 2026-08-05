import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import AdCard from "../components/AdCard";
import AdMobBanner from "../components/AdMobBanner";
import Avatar from "../components/Avatar";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

const TABS = ["Feed", "Blogs", "Videos", "Reviews"];

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

function ReviewCard({ review }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar uri={review.author?.avatar} name={review.author?.name} style={styles.reviewAvatar} />
        <View>
          <Text style={styles.reviewName}>{review.author?.name}</Text>
          <StarRow value={review.rating} size={12} />
        </View>
      </View>
      {!!review.content && <Text style={styles.reviewContent}>{review.content}</Text>}
    </View>
  );
}

// One row of the Videos tab's 3-column grid. No server-side thumbnail
// generation exists anywhere in this codebase (reels don't have one
// either) — each cell renders the video itself, paused on its first frame,
// with a play badge overlay standing in for a real thumbnail.
function VideoGridRow({ row, onPress }) {
  return (
    <View style={styles.videoRow}>
      {row.map((item, i) => (
        <TouchableOpacity key={item.id} style={styles.videoCell} onPress={() => onPress(i)} activeOpacity={0.85}>
          <Video source={{ uri: item.mediaUrl }} style={styles.videoCellMedia} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
          <View style={styles.videoPlayBadge}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      ))}
      {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <View key={`pad-${i}`} style={styles.videoCell} />)}
    </View>
  );
}

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user, updateWalletBalance } = useAuth();
  const [group, setGroup] = useState(null);
  const [mySub, setMySub] = useState(null);
  const [activeTab, setActiveTab] = useState("Feed");
  const [posts, setPosts] = useState([]);
  // Arriving via a "commented on your group post" notification tap. If this
  // screen was already in the nav stack (e.g. the user browsed here earlier),
  // navigate() brings it back into focus with new params WITHOUT remounting
  // it, so these have to be picked up from route.params in an effect rather
  // than a useState initializer, which only ever runs once on mount.
  const [focusPostId, setFocusPostId] = useState(null);
  const [focusCommentId, setFocusCommentId] = useState(null);
  useEffect(() => {
    if (route.params?.focusPostId) {
      setFocusPostId(route.params.focusPostId);
      setFocusCommentId(route.params.focusCommentId ?? null);
    }
  }, [route.params?.focusPostId, route.params?.focusCommentId]);
  const listRef = useRef(null);
  const [blogs, setBlogs] = useState([]);
  const [reviews, setReviews] = useState({ items: [], avgRating: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [changingCover, setChangingCover] = useState(false);

  const [composerText, setComposerText] = useState("");
  const [posting, setPosting] = useState(false);
  const [media, setMedia] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [blogTitle, setBlogTitle] = useState("");
  const [blogText, setBlogText] = useState("");
  const [blogMedia, setBlogMedia] = useState(null);
  const [blogPhotos, setBlogPhotos] = useState([]);
  const [blogUploading, setBlogUploading] = useState(false);
  const [blogPosting, setBlogPosting] = useState(false);

  const [videos, setVideos] = useState([]);
  const [videoCaption, setVideoCaption] = useState("");
  const [videoMedia, setVideoMedia] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoPosting, setVideoPosting] = useState(false);

  const [myRating, setMyRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const { isSaved, toggleSave, loadSaved } = useSaved();

  const isMember = !!mySub?.subscribed || group?.adminId === user?.id;
  const isAdmin = group?.adminId === user?.id;

  async function load() {
    const [groupRes, subRes, reviewsRes] = await Promise.all([
      client.get(`/groups/${groupId}`),
      client.get(`/groups/${groupId}/my-subscription`),
      client.get(`/groups/${groupId}/reviews`),
    ]);
    setGroup(groupRes.data);
    setMySub(subRes.data);
    setReviews(reviewsRes.data);
    loadSaved();

    const mine = reviewsRes.data.items.find((r) => r.userId === user?.id);
    if (mine) {
      setMyRating(mine.rating);
      setMyReviewText(mine.content || "");
    }

    const member = !!subRes.data.subscribed || groupRes.data.adminId === user?.id;
    if (member) {
      const [postsRes, blogsRes, videosRes] = await Promise.all([
        client.get(`/groups/${groupId}/posts`),
        client.get(`/groups/${groupId}/blogs`),
        client.get(`/groups/${groupId}/videos`),
      ]);
      setPosts(postsRes.data);
      setBlogs(blogsRes.data);
      setVideos(videosRes.data);
    } else {
      setPosts([]);
      setBlogs([]);
      setVideos([]);
    }
  }

  useEffect(() => {
    load()
      .catch((e) => Alert.alert("Couldn't load group", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  async function handleSubscribe(tier) {
    setSubscribing(tier.id);
    try {
      const { data } = await client.post(`/groups/${groupId}/subscribe`, { tierId: tier.id });
      updateWalletBalance(data.walletBalance);
      Alert.alert("Subscribed!", data.message);
      load();
    } catch (e) {
      if (e.response?.status === 402) {
        Alert.alert(
          "Insufficient wallet balance",
          `You need KES ${e.response.data.shortfall} more. Top up your wallet first.`,
          [{ text: "Top up now", onPress: () => navigation.navigate("Wallet") }, { text: "Cancel" }]
        );
      } else {
        Alert.alert("Subscription failed", e.response?.data?.error || e.message);
      }
    } finally {
      setSubscribing(null);
    }
  }

  async function pickMedia({ imagesOnly = false, videosOnly = false } = {}) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach media");
      return null;
    }
    const mediaTypes = imagesOnly
      ? ImagePicker.MediaTypeOptions.Images
      : videosOnly
      ? ImagePicker.MediaTypeOptions.Videos
      : ImagePicker.MediaTypeOptions.All;
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

  // A post is either the single video/text post already supported, or 1-10
  // photos — never both, matching the feed's swipe-carousel/single-video
  // split. selectionLimit: 10 mirrors the backend's per-post photo cap.
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

  async function handleAttachPhotos() {
    const picked = await pickMultiplePhotos();
    if (!picked.length) return;
    setMedia(null);
    setPhotos((prev) => {
      const combined = [...prev, ...picked];
      if (combined.length > 10) Alert.alert("Too many photos", "Only the first 10 photos were kept");
      return combined.slice(0, 10);
    });
  }

  async function handleAttachVideo() {
    const picked = await pickMedia({ videosOnly: true });
    if (!picked) return;
    setPhotos([]);
    setMedia(picked);
  }

  async function handleBlogAttachPhotos() {
    const picked = await pickMultiplePhotos();
    if (!picked.length) return;
    setBlogMedia(null);
    setBlogPhotos((prev) => {
      const combined = [...prev, ...picked];
      if (combined.length > 10) Alert.alert("Too many photos", "Only the first 10 photos were kept");
      return combined.slice(0, 10);
    });
  }

  async function handleBlogAttachVideo() {
    const picked = await pickMedia({ videosOnly: true });
    if (!picked) return;
    setBlogPhotos([]);
    setBlogMedia(picked);
  }

  async function handlePost() {
    if (!composerText.trim() && !media && !photos.length) return;
    setPosting(true);
    try {
      let mediaUrl = null;
      let thumbnailUrl = null;
      let type = "text";
      let photoUrls;
      if (photos.length) {
        setUploading(true);
        photoUrls = await uploadMultiplePhotos(photos);
        setUploading(false);
      } else if (media) {
        setUploading(true);
        const uploaded = await uploadMedia(media);
        mediaUrl = uploaded.url;
        type = uploaded.type;
        thumbnailUrl = uploaded.thumbnailUrl;
        setUploading(false);
      }
      await client.post(`/groups/${groupId}/posts`, { content: composerText.trim(), type, mediaUrl, thumbnailUrl, photoUrls });
      setComposerText("");
      setMedia(null);
      setPhotos([]);
      load();
    } catch (e) {
      Alert.alert("Couldn't post", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setPosting(false);
    }
  }

  async function handlePublishBlog() {
    if (!blogTitle.trim()) return Alert.alert("Title required", "Give your blog post a title");
    setBlogPosting(true);
    try {
      let mediaUrl = null;
      let thumbnailUrl = null;
      let type = "text";
      let photoUrls;
      if (blogPhotos.length) {
        setBlogUploading(true);
        photoUrls = await uploadMultiplePhotos(blogPhotos);
        setBlogUploading(false);
      } else if (blogMedia) {
        setBlogUploading(true);
        const uploaded = await uploadMedia(blogMedia);
        mediaUrl = uploaded.url;
        type = uploaded.type;
        thumbnailUrl = uploaded.thumbnailUrl;
        setBlogUploading(false);
      }
      await client.post(`/groups/${groupId}/blogs`, { title: blogTitle.trim(), content: blogText.trim(), type, mediaUrl, thumbnailUrl, photoUrls });
      setBlogTitle("");
      setBlogText("");
      setBlogMedia(null);
      setBlogPhotos([]);
      load();
    } catch (e) {
      Alert.alert("Couldn't publish", e.response?.data?.error || e.message);
    } finally {
      setBlogUploading(false);
      setBlogPosting(false);
    }
  }

  async function handlePublishVideo() {
    if (!videoMedia) return Alert.alert("Video required", "Pick a video to upload");
    setVideoPosting(true);
    try {
      setVideoUploading(true);
      const uploaded = await uploadMedia(videoMedia);
      setVideoUploading(false);
      await client.post(`/groups/${groupId}/videos`, { mediaUrl: uploaded.url, thumbnailUrl: uploaded.thumbnailUrl, content: videoCaption.trim() });
      setVideoCaption("");
      setVideoMedia(null);
      load();
    } catch (e) {
      Alert.alert("Couldn't upload video", e.response?.data?.error || e.message);
    } finally {
      setVideoUploading(false);
      setVideoPosting(false);
    }
  }

  async function handleReact(postId, reaction) {
    try {
      await client.post(`/groups/${groupId}/posts/${postId}/react`, { reaction });
      load();
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleDeletePost(postId) {
    try {
      await client.delete(`/groups/${groupId}/posts/${postId}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  async function handleSubmitReview() {
    if (myRating < 1) return Alert.alert("Pick a rating", "Tap a star to rate this group");
    setReviewSubmitting(true);
    try {
      await client.post(`/groups/${groupId}/reviews`, { rating: myRating, content: myReviewText.trim() });
      load();
    } catch (e) {
      Alert.alert("Couldn't submit review", e.response?.data?.error || e.message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleChangeCover() {
    const localMedia = await pickMedia({ imagesOnly: true });
    if (!localMedia) return;
    setChangingCover(true);
    try {
      const uploaded = await uploadMedia(localMedia);
      const { data } = await client.patch(`/groups/${groupId}/cover`, { coverUrl: uploaded.url });
      setGroup((prev) => ({ ...prev, coverUrl: data.coverUrl }));
    } catch (e) {
      Alert.alert("Couldn't update cover", e.response?.data?.error || e.message);
    } finally {
      setChangingCover(false);
    }
  }

  useEffect(() => {
    if (!focusPostId || activeTab !== "Feed" || !posts.length) return;
    const index = posts.findIndex((item) => item.id === focusPostId);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    }
    setFocusPostId(null);
    setFocusCommentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, activeTab, focusPostId]);

  if (loading || !group) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  // Videos render as a 3-column grid rather than one card per row, so the
  // shared FlatList (which stays single-column for every other tab) is fed
  // pre-chunked rows of up to 3 videos each instead of one video per item.
  const videoRows = [];
  for (let i = 0; i < videos.length; i += 3) videoRows.push(videos.slice(i, i + 3));

  const tabData =
    activeTab === "Reviews" ? reviews.items : activeTab === "Blogs" ? blogs : activeTab === "Videos" ? videoRows : posts;

  return (
    <FlatList
      ref={listRef}
      style={styles.container}
      data={tabData}
      keyExtractor={(item, i) => (activeTab === "Videos" ? `Videos-row-${i}` : `${activeTab}-${item.kind || "x"}-${item.id}-${i}`)}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.15 }), 300);
      }}
      renderItem={({ item, index }) => {
        if (activeTab === "Reviews") return <ReviewCard review={item} />;
        if (activeTab === "Videos") {
          return (
            <VideoGridRow
              row={item}
              onPress={(colIndex) => navigation.navigate("GroupVideoPlayer", { groupId, startIndex: index * 3 + colIndex })}
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
          <Text style={styles.empty}>{isMember ? "No reviews yet — be the first!" : "No reviews yet"}</Text>
        ) : isMember ? (
          <Text style={styles.empty}>
            {activeTab === "Blogs" ? "No blog posts yet" : activeTab === "Videos" ? "No videos yet" : "No posts yet — be the first to post!"}
          </Text>
        ) : null
      }
      ListHeaderComponent={
        <View>
          <View>
            <Image source={{ uri: group.coverUrl }} style={styles.cover} contentFit="cover" />
            {isAdmin && (
              <TouchableOpacity style={styles.changeCoverButton} onPress={handleChangeCover} disabled={changingCover}>
                <Ionicons name="camera-outline" size={13} color="#fff" />
                <Text style={styles.changeCoverText}>{changingCover ? "Uploading..." : "Change cover"}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.desc}>{group.description}</Text>
            <Text style={styles.admin}>Admin: {group.admin?.name}</Text>

            {isAdmin && (
              <TouchableOpacity style={styles.boostRow} onPress={() => navigation.navigate("BoostGroup", { group })}>
                <Text style={styles.boostText}>📣 Boost this group</Text>
              </TouchableOpacity>
            )}

            <View style={styles.ratingRow}>
              <StarRow value={Math.round(group.avgRating)} size={14} />
              <Text style={styles.ratingText}>
                {group.reviewCount > 0
                  ? `${group.avgRating.toFixed(1)} · ${group.reviewCount} review${group.reviewCount === 1 ? "" : "s"}`
                  : "No reviews yet"}
              </Text>
            </View>

            {group.status === "pending" && (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingBannerText}>⏳ Awaiting admin approval — only you can see this group until then</Text>
              </View>
            )}
            {group.status === "rejected" && (
              <View style={styles.rejectedBanner}>
                <Text style={styles.rejectedBannerText}>This group was not approved. Contact support for details.</Text>
              </View>
            )}

            {mySub?.subscribed && (
              <View style={styles.activeBanner}>
                <Text style={styles.activeBannerText}>
                  ✓ Active subscription until {new Date(mySub.subscription.expiresAt).toLocaleDateString()}
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Membership tiers</Text>
            {group.tiers.map((tier) => (
              <View key={tier.id} style={styles.tierCard}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierPrice}>KES {tier.priceKES}/{tier.periodDays}d</Text>
                </View>
                {tier.perks.map((perk, i) => (
                  <Text key={i} style={styles.perk}>• {perk}</Text>
                ))}
                <TouchableOpacity
                  style={[styles.subscribeButton, group.adminId === user?.id && styles.disabledButton]}
                  disabled={group.adminId === user?.id || subscribing === tier.id}
                  onPress={() => handleSubscribe(tier)}
                >
                  <Text style={styles.subscribeButtonText}>
                    {group.adminId === user?.id
                      ? "You're the admin"
                      : subscribing === tier.id
                      ? "Processing..."
                      : mySub?.subscribed
                      ? "Renew / switch tier"
                      : "Subscribe from wallet"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.tabRow}>
              {TABS.map((t) => (
                <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
                  <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === "Feed" &&
              (isMember ? (
                <View style={styles.composer}>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Share something with the group..."
                    value={composerText}
                    onChangeText={setComposerText}
                    multiline
                  />
                  {media && (
                    <View style={styles.previewWrap}>
                      <Video source={{ uri: media.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                      <TouchableOpacity style={styles.removeButton} onPress={() => setMedia(null)}>
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
                      {photos.map((p, i) => (
                        <View key={i} style={styles.photoThumbWrap}>
                          <Image source={{ uri: p.uri }} style={styles.photoThumb} contentFit="cover" />
                          <TouchableOpacity style={styles.removeButtonSmall} onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}>
                            <Ionicons name="close" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.attachRow}>
                    <TouchableOpacity style={styles.attachButton} onPress={handleAttachPhotos} disabled={posting || uploading || !!media}>
                      <Ionicons name="images-outline" size={18} color={media ? COLORS.sub : COLORS.accent} />
                      <Text style={[styles.attachButtonText, media && styles.attachButtonTextDisabled]}>
                        {photos.length ? `Add more photos (${photos.length}/10)` : "Add photos"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attachButton} onPress={handleAttachVideo} disabled={posting || uploading || photos.length > 0}>
                      <Ionicons name="videocam-outline" size={18} color={photos.length ? COLORS.sub : COLORS.accent} />
                      <Text style={[styles.attachButtonText, photos.length > 0 && styles.attachButtonTextDisabled]}>Add video</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.postButton}
                    onPress={handlePost}
                    disabled={posting || uploading || (!composerText.trim() && !media && !photos.length)}
                  >
                    <Text style={styles.postButtonText}>{uploading ? "Uploading..." : posting ? "Posting..." : "Post"}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.lockedBox}>
                  <Text style={styles.lockedText}>
                    🔒 This group's posts are private to subscribers. Subscribe to a tier above to view and post here.
                  </Text>
                </View>
              ))}

            {activeTab === "Blogs" &&
              (!isMember ? (
                <View style={styles.lockedBox}>
                  <Text style={styles.lockedText}>🔒 The blog is private to subscribers. Subscribe to a tier above to read it.</Text>
                </View>
              ) : isAdmin ? (
                <View style={styles.composer}>
                  <TextInput style={styles.blogTitleInput} placeholder="Blog post title" value={blogTitle} onChangeText={setBlogTitle} />
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Write your post..."
                    value={blogText}
                    onChangeText={setBlogText}
                    multiline
                  />
                  {blogMedia && (
                    <View style={styles.previewWrap}>
                      <Video source={{ uri: blogMedia.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                      <TouchableOpacity style={styles.removeButton} onPress={() => setBlogMedia(null)}>
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {blogPhotos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
                      {blogPhotos.map((p, i) => (
                        <View key={i} style={styles.photoThumbWrap}>
                          <Image source={{ uri: p.uri }} style={styles.photoThumb} contentFit="cover" />
                          <TouchableOpacity style={styles.removeButtonSmall} onPress={() => setBlogPhotos((prev) => prev.filter((_, idx) => idx !== i))}>
                            <Ionicons name="close" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.attachRow}>
                    <TouchableOpacity style={styles.attachButton} onPress={handleBlogAttachPhotos} disabled={blogPosting || blogUploading || !!blogMedia}>
                      <Ionicons name="images-outline" size={18} color={blogMedia ? COLORS.sub : COLORS.accent} />
                      <Text style={[styles.attachButtonText, blogMedia && styles.attachButtonTextDisabled]}>
                        {blogPhotos.length ? `Add more photos (${blogPhotos.length}/10)` : "Add photos"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attachButton} onPress={handleBlogAttachVideo} disabled={blogPosting || blogUploading || blogPhotos.length > 0}>
                      <Ionicons name="videocam-outline" size={18} color={blogPhotos.length ? COLORS.sub : COLORS.accent} />
                      <Text style={[styles.attachButtonText, blogPhotos.length > 0 && styles.attachButtonTextDisabled]}>Add video</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.postButton}
                    onPress={handlePublishBlog}
                    disabled={blogPosting || blogUploading || !blogTitle.trim()}
                  >
                    <Text style={styles.postButtonText}>{blogUploading ? "Uploading..." : blogPosting ? "Publishing..." : "Publish"}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.blogReadOnlyHint}>Only the group admin can publish blog posts.</Text>
              ))}

            {activeTab === "Videos" &&
              (!isMember ? (
                <View style={styles.lockedBox}>
                  <Text style={styles.lockedText}>🔒 Videos are private to subscribers. Subscribe to a tier above to watch them.</Text>
                </View>
              ) : isAdmin ? (
                <View style={styles.composer}>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Add a caption (optional)"
                    value={videoCaption}
                    onChangeText={setVideoCaption}
                    multiline
                  />
                  {videoMedia && (
                    <View style={styles.previewWrap}>
                      <Video source={{ uri: videoMedia.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                      <TouchableOpacity style={styles.removeButton} onPress={() => setVideoMedia(null)}>
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.attachButton}
                    onPress={async () => setVideoMedia(await pickMedia({ videosOnly: true }))}
                    disabled={videoPosting || videoUploading}
                  >
                    <Ionicons name="videocam-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.attachButtonText}>Add video</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.postButton}
                    onPress={handlePublishVideo}
                    disabled={videoPosting || videoUploading || !videoMedia}
                  >
                    <Text style={styles.postButtonText}>{videoUploading ? "Uploading..." : videoPosting ? "Publishing..." : "Upload video"}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.blogReadOnlyHint}>Only the group admin can upload videos.</Text>
              ))}

            {activeTab === "Reviews" && isMember && (
              <View style={styles.composer}>
                <Text style={styles.reviewFormLabel}>Your rating</Text>
                <StarRow value={myRating} size={28} onRate={setMyRating} />
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

            <Text style={styles.sectionTitle}>
              {activeTab === "Feed" ? "Group posts" : activeTab === "Blogs" ? "Blog" : activeTab === "Videos" ? "Videos" : "Reviews"}
            </Text>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  cover: { width: "100%", height: 160, backgroundColor: "#eee" },
  changeCoverButton: {
    position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
  },
  changeCoverText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  body: { padding: 16 },
  name: { color: COLORS.ink, fontSize: 22, fontWeight: "800" },
  desc: { color: COLORS.sub, marginTop: 6, fontSize: 14 },
  admin: { color: COLORS.sub, fontSize: 12, marginTop: 8 },
  boostRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  boostText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  ratingText: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  activeBanner: { backgroundColor: "#E9F8EE", padding: 10, borderRadius: 8, marginTop: 12 },
  activeBannerText: { color: "#2E7D32", fontWeight: "600" },
  pendingBanner: { backgroundColor: "#FFF3CD", padding: 10, borderRadius: 8, marginTop: 12 },
  pendingBannerText: { color: "#856404", fontWeight: "600" },
  rejectedBanner: { backgroundColor: "#F8D7DA", padding: 10, borderRadius: 8, marginTop: 12 },
  rejectedBannerText: { color: "#721C24", fontWeight: "600" },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  tierCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12 },
  tierHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  tierName: { color: COLORS.ink, fontSize: 16, fontWeight: "700" },
  tierPrice: { fontSize: 15, fontWeight: "700", color: COLORS.accent },
  perk: { color: COLORS.sub, marginBottom: 2 },
  subscribeButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  disabledButton: { backgroundColor: "#BCC0C4" },
  subscribeButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  tabRow: { flexDirection: "row", marginTop: 22, borderTopWidth: 1, borderTopColor: COLORS.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.sub, fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: COLORS.accent },
  composer: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 4 },
  blogTitleInput: { fontSize: 16, fontWeight: "700", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.bg, marginBottom: 8, color: COLORS.ink },
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
  lockedBox: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", marginTop: 4 },
  lockedText: { color: COLORS.sub, fontSize: 13, lineHeight: 19, textAlign: "center" },
  blogReadOnlyHint: { color: COLORS.sub, fontSize: 12, textAlign: "center", marginTop: 4, fontStyle: "italic" },
  reviewFormLabel: { fontSize: 13, color: COLORS.sub, marginBottom: 8, fontWeight: "600" },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17 },
  reviewName: { color: COLORS.ink, fontWeight: "700", fontSize: 13.5 },
  reviewContent: { fontSize: 14, color: COLORS.ink, lineHeight: 19 },
  empty: { textAlign: "center", color: "#999", marginTop: 10, marginBottom: 20 },
  videoRow: { flexDirection: "row", gap: 2, paddingHorizontal: 10 },
  videoCell: { flex: 1, aspectRatio: 9 / 16, backgroundColor: "#000", marginBottom: 2, borderRadius: 4, overflow: "hidden" },
  videoCellMedia: { width: "100%", height: "100%" },
  videoPlayBadge: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)",
  },
});
