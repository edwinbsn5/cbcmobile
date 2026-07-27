import * as WebBrowser from "expo-web-browser";

// SFSafariViewController on iOS / Chrome Custom Tabs on Android — a
// dismissible overlay with its own "Done" button that returns straight to
// the app, instead of kicking the user out to the external browser app.
export function openInAppBrowser(url) {
  if (!url) return;
  WebBrowser.openBrowserAsync(url).catch(() => {});
}
