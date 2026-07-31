import React from "react";
import { Ionicons } from "@expo/vector-icons";

const TIER_COLORS = { blue: "#1DA1F2", gold: "#D4A62A" };

// Verified tick for Influencer Quest tiers — rendered next to a name
// wherever it appears (feed posts, profile headers). Purely visual;
// eligibility is entirely server-side (users.is_student_leader /
// influencer_tier — see services/influencerQuest.js). `tier` accepts the
// badge color ('blue'|'gold') from a profile's influencerQuest.badge field;
// callers that only have the plain isStudentLeader boolean (e.g. feed post
// authors, which don't carry full tier info) omit it and get the original
// blue color as a safe default.
export default function VerifiedBadge({ size = 15, tier = "blue" }) {
  return <Ionicons name="checkmark-circle" size={size} color={TIER_COLORS[tier] || TIER_COLORS.blue} />;
}
