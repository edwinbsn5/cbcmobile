import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import client from "../api/client";
import { navigateForData } from "../utils/notificationNav";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests permission, fetches an Expo push token, and registers it with
 * the backend. Never throws — logs and returns null on failure, since this
 * is expected to fail in this environment (no EAS project configured in
 * app.json's extra.eas.projectId, no physical device) and the rest of the
 * app (the in-app notification list) doesn't depend on it working.
 */
export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) {
      console.log("Push notification permission not granted");
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await client.post("/notifications/register-token", { token });
    return token;
  } catch (err) {
    console.log("Push notification registration skipped:", err.message);
    return null;
  }
}

// Tapping the OS push notification banner itself — as opposed to tapping a
// row inside the in-app NotificationsScreen list, which already navigates
// via the same navigateForData — previously did nothing beyond opening the
// app. This wires that up for both cases Expo distinguishes:
//   - warm/background tap: the app process is already alive, so the regular
//     response listener fires.
//   - cold start tap: the app was fully killed and this tap is what launched
//     it — the listener above never fires for this launch, so
//     getLastNotificationResponseAsync() is checked once on startup instead.
// navigationRef may not be attached to a mounted NavigationContainer yet the
// instant this runs (e.g. a cold-start tap racing the first render), so
// isReady() is checked rather than assuming navigate() is safe to call.
export function registerNotificationResponseHandler(navigationRef) {
  function handleResponse(response) {
    const data = response?.notification?.request?.content?.data;
    if (data && navigationRef.isReady()) navigateForData(navigationRef, data);
  }

  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleResponse(response);
  });

  return Notifications.addNotificationResponseReceivedListener(handleResponse);
}
