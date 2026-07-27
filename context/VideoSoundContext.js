import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { configureVideoAudioModeAsync } from "../services/avAudioMode";

const VideoSoundContext = createContext(null);

// Global, session-level "is sound on for autoplaying videos" flag — starts
// muted. Unmuting one video flips this for every video that autoplays
// afterward (Feed now, Reels/Group Videos/Be the STAR once they adopt this
// same context); muting one flips it back, so the next video scrolled into
// view is muted again too. Not persisted to storage — a fresh app launch
// always starts muted, matching "session" rather than "forever."
export function VideoSoundProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    configureVideoAudioModeAsync();
  }, []);

  const toggleSound = useCallback(() => setSoundEnabled((prev) => !prev), []);

  return <VideoSoundContext.Provider value={{ soundEnabled, toggleSound }}>{children}</VideoSoundContext.Provider>;
}

export const useVideoSound = () => useContext(VideoSoundContext);
