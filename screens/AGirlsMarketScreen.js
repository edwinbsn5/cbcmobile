import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

export default function AGirlsMarketScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("CreateMarketProduct")}>
          <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
          <Text style={styles.actionLabel}>Create Product</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("MyMarketProducts")}>
          <Ionicons name="pricetags-outline" size={20} color={COLORS.accent} />
          <Text style={styles.actionLabel}>My Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("SavedMarketProducts")}>
          <Ionicons name="heart-outline" size={20} color={COLORS.accent} />
          <Text style={styles.actionLabel}>Saved</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.badge}>✦ A Girls Market ✦</Text>
        <Text style={styles.title}>Shop it. Sell it. Love it.</Text>
        <Text style={styles.subtitle}>Hair, skin, beauty, fashion &amp; more — by women, for women.</Text>
      </View>

      <View style={styles.browseRow}>
        <TouchableOpacity
          style={styles.browseCard}
          onPress={() => navigation.navigate("MarketCategoryChooser", { mediaType: "photo" })}
        >
          <Ionicons name="images-outline" size={30} color={COLORS.accent} />
          <Text style={styles.browseLabel}>Browse by Photos</Text>
          <Text style={styles.browseHint}>Swipe through listings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.browseCard}
          onPress={() => navigation.navigate("MarketCategoryChooser", { mediaType: "video" })}
        >
          <Ionicons name="play-circle-outline" size={30} color={COLORS.accent} />
          <Text style={styles.browseLabel}>Browse by Videos</Text>
          <Text style={styles.browseHint}>Scroll a video feed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  actionBar: { flexDirection: "row", backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  actionButton: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 14 },
  actionLabel: { fontSize: 11.5, fontWeight: "700", color: COLORS.ink },
  hero: { backgroundColor: COLORS.ink, padding: 28, alignItems: "center" },
  badge: { color: "#F5A623", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", fontStyle: "italic", marginTop: 8 },
  subtitle: { color: "#bcd9d2", fontSize: 12.5, marginTop: 6, textAlign: "center", lineHeight: 18 },
  browseRow: { flexDirection: "row", gap: 12, padding: 16 },
  browseCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 20, alignItems: "center", gap: 6 },
  browseLabel: { fontSize: 13.5, fontWeight: "800", color: COLORS.ink, textAlign: "center", marginTop: 4 },
  browseHint: { fontSize: 11, color: COLORS.sub, textAlign: "center" },
});
