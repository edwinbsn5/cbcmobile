import { useRef, useState } from "react";

/**
 * Tracks which single row index in a FlatList counts as "the active video"
 * — the one that should autoplay. Generalizes the currentIndex pattern
 * already used in ReelsScreen.js/GroupVideoPlayerScreen.js with one
 * addition: `isEligible`, needed for any list that mixes video rows with
 * other content (Feed's posts/ads/reshares/nearby-carousel). Reels/
 * GroupVideoPlayer's lists are 100% video, so their default (accept
 * everything) reproduces their exact current behavior if they adopt this
 * hook later.
 *
 * RN doesn't guarantee `viewableItems` arrives sorted by index, so this
 * sorts explicitly before picking the first eligible candidate.
 */
export function useSingleActiveVideo({ threshold = 50, isEligible = () => true } = {}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: threshold }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const candidates = viewableItems.filter((v) => isEligible(v.item)).sort((a, b) => a.index - b.index);
    setActiveIndex(candidates.length ? candidates[0].index : -1);
  }).current;

  return { activeIndex, viewabilityConfig, onViewableItemsChanged };
}
