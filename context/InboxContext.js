import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import client from "../api/client";
import { connectSocket } from "../api/socket";

const InboxContext = createContext(null);

/**
 * Live per-tab + total unread counts for the 5-tab Inbox (Inbox/PAGES/
 * MarketPlace/Events/Groups), used by the header inbox-icon badge
 * from anywhere in the app — mirrors NotificationContext's always-on-socket
 * pattern exactly, just backed by GET /api/inbox/unread-counts instead of
 * /notifications.
 */
export function InboxProvider({ children }) {
  const [counts, setCounts] = useState({ inbox: 0, mtuWako: 0, market: 0, events: 0, groups: 0, total: 0 });
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    const { data } = await client.get("/inbox/unread-counts");
    setCounts(data);
  }, []);

  useEffect(() => {
    let closed = false;
    refresh();

    connectSocket().then((socket) => {
      if (closed) {
        socket.close();
        return;
      }
      socketRef.current = socket;
      // A new message could belong to any of the 5 tabs — cheaper to just
      // re-fetch the small counts payload than to work out which tab
      // client-side from the raw socket event.
      socket.on("message:new", () => refresh());
    });

    return () => {
      closed = true;
      socketRef.current?.close();
    };
  }, [refresh]);

  return (
    <InboxContext.Provider value={{ counts, refresh }}>
      {children}
    </InboxContext.Provider>
  );
}

export const useInbox = () => useContext(InboxContext);
