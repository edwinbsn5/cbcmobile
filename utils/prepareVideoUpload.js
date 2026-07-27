import { Compressor } from "react-native-compressor";
import * as FileSystem from "expo-file-system";

// Keep in sync with MAX_UPLOAD_BYTES in backend/routes/upload.js and
// client_max_body_size in backend/deploy/nginx.conf.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// Compresses a picked video asset and validates its final size, so a 413
// from the server (oversized upload) turns into a friendly in-app error
// instead — most phone-camera videos shrink well under the limit here.
// Returns { uri, mimeType, fileName } ready to hand to FormData, or throws
// an Error with a message safe to show the user directly.
export async function prepareVideoUpload(asset) {
  const fileName = asset.fileName || "video.mp4";
  let uri = asset.uri;

  try {
    uri = await Compressor.compress(asset.uri, {
      compressionMethod: "auto",
    });
  } catch {
    // Compression is a best-effort optimization — if it fails (e.g.
    // unsupported codec), fall back to uploading the original file and let
    // the size check below decide whether that's still acceptable.
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists && info.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video is too large (max ${Math.floor(MAX_VIDEO_BYTES / (1024 * 1024))}MB). Try a shorter clip.`);
  }

  return { uri, mimeType: "video/mp4", fileName };
}