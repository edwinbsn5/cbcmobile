import React from "react";
import { Ionicons } from "@expo/vector-icons";

// Blue verified badge for approved Student Leaders — rendered next to their
// name wherever it appears (feed posts, profile headers). Purely visual;
// eligibility is entirely server-side (users.is_student_leader).
export default function VerifiedBadge({ size = 15 }) {
  return <Ionicons name="checkmark-circle" size={size} color="#1DA1F2" />;
}
