// Shared between the in-app notification list (NotificationsScreen tapping
// a row) and the OS-level push notification tap handler (pushNotifications.js)
// so both resolve a notification's `data.screen` payload to the same screen,
// one place to add a new `screen` value in the future.
export function navigateForData(navigation, data) {
  if (!data?.screen) return;
  if (data.screen === "Chat" && data.conversationId) {
    navigation.navigate("Chat", { conversationId: data.conversationId });
  } else if (data.screen === "EventDetail" && data.eventId) {
    navigation.navigate("EventDetail", { eventId: data.eventId });
  } else if (data.screen === "GroupDetail" && data.groupId) {
    navigation.navigate("GroupDetail", { groupId: data.groupId });
  } else if (data.screen === "Wallet") {
    navigation.navigate("Wallet");
  } else if (data.screen === "UserProfile" && data.userId) {
    navigation.navigate("UserProfile", { userId: data.userId });
  } else if (data.screen === "TicketDetail" && data.ticketId) {
    navigation.navigate("TicketDetail", { ticketId: data.ticketId });
  }
}
