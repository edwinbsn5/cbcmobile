import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./client";

const SOCKET_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

// Creates a fresh, already-connecting socket authenticated with the stored
// JWT. Callers own the returned socket's lifecycle (call .close() when done).
export async function connectSocket() {
  const token = await AsyncStorage.getItem("token");
  return io(SOCKET_ORIGIN, { auth: { token } });
}
