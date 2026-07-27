import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

// True only while the app is actually in the foreground. Both "background"
// and "inactive" (iOS's transitional state — control center, an incoming
// call banner, etc.) count as not-active, so video playback pauses for
// either rather than just a full background transition.
export function useAppIsActive() {
  const [isActive, setIsActive] = useState(AppState.currentState === "active");
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appState.current = nextState;
      setIsActive(nextState === "active");
    });
    return () => subscription.remove();
  }, []);

  return isActive;
}
