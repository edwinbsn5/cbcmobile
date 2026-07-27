import { useCallback, useState } from "react";
import client from "../api/client";

/**
 * Shared reshared-post-ids state for any screen that renders posts and
 * wants a working Reshare pill. Mirrors useSaved's shape/pattern but for a
 * flat list of postIds (only posts can be reshared, unlike save's four item types).
 */
export function useReshared() {
  const [reshareIds, setReshareIds] = useState([]);

  const loadReshared = useCallback(() => {
    client.get("/feed/reshares/mine").then((r) => setReshareIds(r.data)).catch(() => {});
  }, []);

  function isReshared(postId) {
    return reshareIds.includes(postId);
  }

  async function unreshare(postId) {
    setReshareIds((prev) => prev.filter((id) => id !== postId));
    try {
      await client.post(`/feed/${postId}/unreshare`);
    } catch (e) {
      loadReshared(); // revert to server truth if the request failed
    }
  }

  return { reshareIds, loadReshared, isReshared, unreshare };
}
