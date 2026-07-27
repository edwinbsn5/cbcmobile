import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions, ActivityIndicator, Image } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useVideoSound } from "../context/VideoSoundContext";
import { useAppIsActive } from "../hooks/useAppIsActive";
import { clampAspectRatio } from "../utils/videoAspect";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * Shared Facebook-style video player — Feed inline cards and the fullscreen
 * "Watch" overlay both render this, just with a different `variant`. Does
 * not know about FlatLists, viewability, or navigation: the caller fully
 * resolves `isActive` (this is THE one video that should be playing) and
 * `shouldMount` (this video is near enough to the active one to deserve a
 * real, buffering <Video> instead of an inert placeholder box — see
 * FeedScreen's ±1-of-active-index windowing). `variant` only controls
 * chrome/sizing, never core playback logic: "card" (rounded, feed-style,
 * with margin), "hero" (flush edge-to-edge, aspect-ratio sized — a
 * dedicated video-detail-page header, e.g. Be the STAR's submission
 * detail), or "fullscreen" (fills the screen, Reels/Watch-style).
 *
 * `isActive` being `undefined` (not merely `false`) is a distinct signal:
 * it means the caller isn't participating in viewport-tracked autoplay at
 * all (this component is also reused, via PostCard, by ProfileScreen/
 * UserProfileScreen/GroupDetailScreen's plain post lists/grids, which have
 * no single-active-video concept). In that mode this falls back to
 * always-mounted, tap-to-play-manually, starting paused — the same
 * "nothing plays until you tap it" behavior those screens had before this
 * component existed, just with the new overlay instead of native controls.
 */
export default function FeedVideoPlayer({ uri, poster, isActive, shouldMount, onPressBody, variant = "card" }) {
  const { soundEnabled, toggleSound } = useVideoSound();
  const appIsActive = useAppIsActive();
  const tracksViewport = isActive !== undefined;
  const [userPaused, setUserPaused] = useState(!tracksViewport);
  const [naturalRatio, setNaturalRatio] = useState(null);
  const [status, setStatus] = useState({ positionMillis: 0, durationMillis: 0 });
  const [isReady, setIsReady] = useState(false);
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    // Scrolling a video back into view always resumes autoplay rather than
    // leaving it stuck on a previous manual pause. Only applies in
    // viewport-tracked mode — manual mode's pause state is entirely
    // user-driven.
    if (tracksViewport && isActive && !wasActiveRef.current) setUserPaused(false);
    wasActiveRef.current = isActive;
  }, [isActive, tracksViewport]);

  const { displayRatio, needsBlur } = clampAspectRatio(naturalRatio);
  const effectiveShouldMount = shouldMount !== undefined ? shouldMount : tracksViewport ? isActive : true;
  const shouldPlay = tracksViewport ? isActive && appIsActive && !userPaused : appIsActive && !userPaused;
  const isMuted = !soundEnabled;
  const progress = status.durationMillis > 0 ? status.positionMillis / status.durationMillis : 0;

  useEffect(() => {
    setIsReady(false);
  }, [uri]);

  useEffect(() => {
    // The <Video> below only exists while effectiveShouldMount is true (see
    // FeedScreen's ±1-of-active-index windowing) — once it unmounts, the
    // next mount is a brand new player that hasn't fired onReadyForDisplay
    // yet, so the loading spinner needs to show again rather than staying
    // stuck on the previous mount's "ready" state.
    if (!effectiveShouldMount) setIsReady(false);
  }, [effectiveShouldMount]);

  function handlePlaybackStatusUpdate(s) {
    if (!s.isLoaded) return;
    setStatus({ positionMillis: s.positionMillis || 0, durationMillis: s.durationMillis || 0 });
  }

  function handleReadyForDisplay(event) {
    setIsReady(true);
    const naturalSize = event?.naturalSize;
    if (naturalSize?.width && naturalSize?.height) {
      setNaturalRatio(naturalSize.width / naturalSize.height);
    }
  }

  const containerStyle =
    variant === "fullscreen"
      ? styles.fullscreenContainer
      : variant === "hero"
      ? [styles.heroContainer, { aspectRatio: displayRatio }]
      : [styles.cardContainer, { aspectRatio: displayRatio }];

  return (
    <View style={containerStyle}>
      {effectiveShouldMount ? (
        <>
          {needsBlur && (
            <>
              <Video
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                isMuted
                isLooping
                shouldPlay={shouldPlay}
              />
              <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
            </>
          )}
          <Video
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            isMuted={isMuted}
            shouldPlay={shouldPlay}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onReadyForDisplay={handleReadyForDisplay}
            usePoster={!!poster}
            posterSource={poster ? { uri: poster } : undefined}
          />
        </>
      ) : poster ? (
        <Image source={{ uri: poster }} style={[StyleSheet.absoluteFill, styles.poster]} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}

      {effectiveShouldMount && !isReady && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]} pointerEvents="none">
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      <Pressable style={StyleSheet.absoluteFill} onPress={onPressBody}>
        <View style={styles.centerButtonWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.centerButton}
            onPress={() => setUserPaused((p) => !p)}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name={shouldPlay ? "pause" : "play"} size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBar} pointerEvents="box-none">
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <View style={styles.bottomRow} pointerEvents="box-none">
            <Text style={styles.timestamp}>
              {formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}
            </Text>
            <TouchableOpacity style={styles.muteButton} onPress={toggleSound} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { width: "100%", backgroundColor: "#000", borderRadius: 8, marginBottom: 8, overflow: "hidden" },
  heroContainer: { width: "100%", backgroundColor: "#000" },
  fullscreenContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: "#000" },
  placeholder: { backgroundColor: "#000" },
  poster: { width: "100%", height: "100%" },
  loadingOverlay: { alignItems: "center", justifyContent: "center" },
  centerButtonWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  centerButton: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingBottom: 6 },
  progressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#fff" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  timestamp: { color: "#fff", fontSize: 11, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3 },
  muteButton: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
});
