import { createNavigationContainerRef } from "@react-navigation/native";

// Module-level singleton so both App.js (attaches it to NavigationContainer)
// and the push-notification response handler (navigates from outside any
// component, when a notification is tapped) can reach the same navigator.
export const navigationRef = createNavigationContainerRef();
