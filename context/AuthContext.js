import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client, { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      if (token && storedUser) setUser(JSON.parse(storedUser));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async (data) => {
      await AsyncStorage.multiRemove(["token", "user"]);
      setUser(null);
      if (data?.banned) {
        Alert.alert("Account suspended", "Your account has been suspended. Contact support if you think this is a mistake.");
      } else {
        Alert.alert("Session expired", "Please log in again.");
      }
    });
  }, []);

  // Tap & Win's "coming online" coin bonus — fires once per session-restore/
  // login/register; the server silently no-ops if it's already been awarded
  // in the last 24h, so it's safe to call every time `user` becomes set.
  useEffect(() => {
    if (user) client.post("/coins/checkin").catch(() => {});
  }, [user?.id]);

  async function login(email, password) {
    const { data } = await client.post("/auth/login", { email, password });
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  // Email verification is temporarily bypassed server-side (see
  // routes/auth.js) — the account is created and logged in immediately,
  // same response shape as login().
  async function register(name, username, email, password, agreedToTerms) {
    const { data } = await client.post("/auth/register", { name, username, email, password, agreedToTerms });
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }

  async function logout() {
    await AsyncStorage.multiRemove(["token", "user"]);
    setUser(null);
  }

  function updateWalletBalance(balance) {
    setUser((prev) => (prev ? { ...prev, walletBalance: balance } : prev));
  }

  async function updateUser(freshUser) {
    await AsyncStorage.setItem("user", JSON.stringify(freshUser));
    setUser(freshUser);
  }

  // Changing your own password invalidates every previously-issued token
  // for the account server-side (see requireAuth's pca check in
  // services/auth.js) — including the one this very session is using. The
  // change-password response carries a freshly-signed replacement so this
  // call swaps it in before the old one can 401 on the next request.
  async function updateToken(token) {
    await AsyncStorage.setItem("token", token);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateWalletBalance, updateUser, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
