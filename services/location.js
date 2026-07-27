import * as Location from "expo-location";
import client from "../api/client";

/**
 * Requests foreground location permission and, if granted, saves the
 * device's current coordinates to the user's profile for "Comrades
 * Nearby". Never throws — logs and returns null on failure (permission
 * denied, location services off, emulator with no GPS, etc.), since the
 * rest of the app works fine without it; the carousel just won't appear
 * for this user until it succeeds.
 */
export async function registerLocationAsync() {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const requested = await Location.requestForegroundPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) {
      console.log("Location permission not granted");
      return null;
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await client.patch("/auth/me", {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    return position.coords;
  } catch (err) {
    console.log("Location registration skipped:", err.message);
    return null;
  }
}
