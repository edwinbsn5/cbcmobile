import { useCallback, useState } from "react";
import client from "../api/client";

const EMPTY = { post: [], reel: [], group: [], event: [], product: [] };

/**
 * Shared saved-items state for any screen that renders posts, reels,
 * groups, or events and wants a working Save toggle on each card.
 * Fetches the compact id lookup once (`GET /saved/ids`) rather than each
 * screen's own list endpoint needing to know about saves.
 */
export function useSaved() {
  const [savedIds, setSavedIds] = useState(EMPTY);

  const loadSaved = useCallback(() => {
    client.get("/saved/ids").then((r) => setSavedIds(r.data)).catch(() => {});
  }, []);

  function isSaved(itemType, itemId) {
    return (savedIds[itemType] || []).includes(itemId);
  }

  async function toggleSave(itemType, itemId) {
    const currentlySaved = isSaved(itemType, itemId);
    setSavedIds((prev) => {
      const list = prev[itemType] || [];
      return { ...prev, [itemType]: currentlySaved ? list.filter((id) => id !== itemId) : [...list, itemId] };
    });
    try {
      if (currentlySaved) {
        await client.post(`/saved/${itemType}/${itemId}/remove`);
      } else {
        await client.post("/saved", { itemType, itemId });
      }
    } catch (e) {
      loadSaved(); // revert to server truth if the request failed
    }
  }

  return { savedIds, loadSaved, isSaved, toggleSave };
}
