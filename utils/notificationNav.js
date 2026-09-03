import client from "../api/client";

// Shared between the in-app notification list (NotificationsScreen tapping
// a row) and the OS-level push notification tap handler (pushNotifications.js)
// so both resolve a notification's `data.screen` payload to the same screen,
// one place to add a new `screen` value in the future.
export async function navigateForData(navigation, data) {
  if (!data?.screen) return;
  if (data.screen === "Chat" && data.conversationId) {
    navigation.navigate("Chat", { conversationId: data.conversationId });
  } else if (data.screen === "EventDetail" && data.eventId) {
    navigation.navigate("EventDetail", { eventId: data.eventId });
  } else if (data.screen === "GroupDetail" && data.groupId) {
    navigation.navigate("GroupDetail", { groupId: data.groupId, focusPostId: data.postId, focusCommentId: data.commentId });
  } else if (data.screen === "PageDetail" && data.pageId) {
    navigation.navigate("PageDetail", { pageId: data.pageId, focusPostId: data.postId, focusCommentId: data.commentId });
  } else if (data.screen === "Feed" && data.postId) {
    navigation.navigate("MainTabs", { screen: "Home", params: { focusPostId: data.postId, focusCommentId: data.commentId } });
  } else if (data.screen === "Profile" && data.postId) {
    navigation.navigate("Profile", { focusPostId: data.postId, focusCommentId: data.commentId });
  } else if (data.screen === "Reels" && data.reelId) {
    navigation.navigate("Reels", { focusReelId: data.reelId, focusCommentId: data.commentId });
  } else if (data.screen === "StoryViewer" && data.storyId) {
    // Unlike every other target, a story isn't a standalone route — the
    // viewer needs the whole active (non-expired, followed-authors) story
    // groups list plus which author to open on. Fetch it fresh rather than
    // trusting anything cached, since the story may have expired (24h TTL)
    // since the notification was sent.
    try {
      const { data: storyGroups } = await client.get("/stories");
      const group = storyGroups.find((g) => g.stories.some((s) => s.id === data.storyId));
      if (group) {
        navigation.navigate("StoryViewer", { storyGroups, startGroupId: group.author.id });
      } else {
        navigation.navigate("MainTabs", { screen: "Home" });
      }
    } catch (e) {
      navigation.navigate("MainTabs", { screen: "Home" });
    }
  } else if (data.screen === "Wallet") {
    navigation.navigate("Wallet");
  } else if (data.screen === "UserProfile" && data.userId) {
    navigation.navigate("UserProfile", { userId: data.userId });
  } else if (data.screen === "TicketDetail" && data.ticketId) {
    navigation.navigate("TicketDetail", { ticketId: data.ticketId });
  } else if (data.screen === "MarketProductDetail" && data.productId) {
    navigation.navigate("MarketProductDetail", { productId: data.productId });
  } else if (data.screen === "MyMarketProducts") {
    navigation.navigate("MyMarketProducts");
  } else if (data.screen === "InfluencerQuest") {
    navigation.navigate("InfluencerQuest");
  } else if (data.screen === "ChamaDetail" && data.groupId) {
    // The chama.js/collab* notifiers call this param `groupId` (it's the
    // collab group's id, shared with the "project" collab kind) but
    // ChamaDetailScreen itself reads `chamaId` — same value, just renamed
    // here to match what the screen actually expects.
    navigation.navigate("ChamaDetail", { chamaId: data.groupId, focusPostId: data.postId, focusCommentId: data.commentId });
  } else if (data.screen === "ChamaAdmin" && data.groupId) {
    navigation.navigate("ChamaAdmin", { chamaId: data.groupId, tab: data.tab });
  } else if (data.screen === "ChamaProjectDetail" && data.chamaId && data.projectId) {
    navigation.navigate("ChamaProjectDetail", { chamaId: data.chamaId, projectId: data.projectId });
  } else if (data.screen === "Guarantors") {
    navigation.navigate("Guarantors");
  }
}
