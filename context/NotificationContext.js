import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import client from "../api/client";
import { connectSocket } from "../api/socket";

const NotificationContext = createContext(null);

/**
 * The one place in this app with a global, always-on socket connection for
 * a live badge — unlike Chat's inbox unread count (which just reloads on
 * screen focus), a notification bell's whole point is showing a live count
 * from anywhere in the app.
 */
export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    const { data } = await client.get("/notifications");
    setUnreadCount(data.filter((n) => !n.readAt).length);
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
      socket.on("notification:new", (notification) => {
        setUnreadCount((c) => c + 1);
        setLastNotification(notification);
      });
    });

    return () => {
      closed = true;
      socketRef.current?.close();
    };
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh, lastNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
