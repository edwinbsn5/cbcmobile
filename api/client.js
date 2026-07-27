import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Production backend hosted on VPS behind HTTPS.
export const API_BASE_URL = "https://campusbiasharaclub.com/api";
// The same host's web root (no /api) — used for links to server-rendered
// pages like the Privacy Policy / Terms & Conditions (routes/legal.js).
export const WEB_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const client = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Any 401 (missing/invalid/expired token, or requireAuth's "Account no
// longer exists" for a deleted user) means the locally-cached session is no
// longer valid server-side — AuthContext registers a handler here so that
// forces a coherent logout instead of every screen silently failing its own
// calls forever (the cached user/token never gets cleared on its own,
// nothing re-validates it against the server except each call 401ing).
// A ban is a distinct 403 shape (requireAuth sets `banned: true`) — same
// "you're logged out" handling, but the handler shows a different message
// for it than for a plain invalid/expired session.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.data?.banned) {
      unauthorizedHandler?.(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default client;
