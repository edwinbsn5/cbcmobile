import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../theme";

// Shared tier picker for every Boost*Screen (post/group/page/event/market
// listing) — tiers themselves come from GET /api/boosts/tiers (backend/
// services/boostTiers.js) rather than being hardcoded here, so a future
// price change only ever happens in one place. When freeBoostAvailable is
// true, whichever tier the user picks is shown (and charged) as free —
// they still choose the duration, only the price is waived.
export default function BoostTierPicker({ tiers, value, onChange, freeBoostAvailable, loading }) {
  if (loading) return <ActivityIndicator color={COLORS.accent} style={styles.loading} />;
  if (!tiers?.length) return null;

  return (
    <View style={styles.row}>
      {tiers.map((tier) => {
        const active = value === tier.id;
        return (
          <TouchableOpacity
            key={tier.id}
            style={[styles.card, active && styles.cardActive]}
            onPress={() => onChange(tier.id)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{tier.label}</Text>
            <Text style={[styles.price, active && styles.priceActive]}>
              {freeBoostAvailable ? "Free" : `KES ${tier.costKES}`}
            </Text>
            <Text style={[styles.duration, active && styles.durationActive]}>
              {tier.durationDays === 1 ? "1 day" : tier.durationDays >= 180 ? "6 months" : `${tier.durationDays} days`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 16 },
  row: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 6, alignItems: "center", backgroundColor: COLORS.surface,
  },
  cardActive: { borderColor: COLORS.accent, borderWidth: 2, backgroundColor: COLORS.wash },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.sub, textAlign: "center" },
  labelActive: { color: COLORS.ink },
  price: { fontSize: 16, fontWeight: "800", color: COLORS.ink, marginTop: 6 },
  priceActive: { color: COLORS.accent },
  duration: { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  durationActive: { color: COLORS.sub },
});
