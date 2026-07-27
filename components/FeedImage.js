import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import { clampAspectRatio } from "../utils/videoAspect";

// Single-photo feed media — mirrors FeedVideoPlayer's approach: measure the
// image's real dimensions and size the box to its (clamped) aspect ratio,
// instead of cropping every photo into one fixed-height box regardless of
// whether it's landscape, square, or a tall vertical shot.
export default function FeedImage({ uri, style }) {
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w && h) setRatio(w / h);
      },
      () => {} // keep the DEFAULT_RATIO fallback if measurement fails
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const { displayRatio } = clampAspectRatio(ratio);

  return <Image source={{ uri }} style={[style, { width: "100%", aspectRatio: displayRatio }]} resizeMode="cover" />;
}