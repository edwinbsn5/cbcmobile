import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import { COLORS } from "../theme";

export default function AGirlsMarketScreen({ navigation }) {
  const [pendingMediaType, setPendingMediaType] = useState(null);
  const [county, setCounty] = useState("");
  const [subCounty, setSubCounty] = useState("");

  function browse(mediaType) {
    setCounty("");
    setSubCounty("");
    setPendingMediaType(mediaType);
  }

  function confirmLocation() {
    navigation.navigate("MarketCategoryChooser", { mediaType: pendingMediaType, county, subCounty });
    setPendingMediaType(null);
  }

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
        <TouchableOpacity style={styles.browseCard} onPress={() => browse("photo")}>
          <Ionicons name="images-outline" size={30} color={COLORS.accent} />
          <Text style={styles.browseLabel}>Browse by Photos</Text>
          <Text style={styles.browseHint}>Swipe through listings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.browseCard} onPress={() => browse("video")}>
          <Ionicons name="play-circle-outline" size={30} color={COLORS.accent} />
          <Text style={styles.browseLabel}>Browse by Videos</Text>
          <Text style={styles.browseHint}>Scroll a video feed</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!pendingMediaType} transparent animationType="fade" onRequestClose={() => setPendingMediaType(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPendingMediaType(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Where do you want to shop?</Text>
            <Text style={styles.locationHint}>Pick a county and sub-county to see listings from sellers there</Text>
            <Text style={styles.locationLabel}>County</Text>
            <CountyPicker value={county} onChange={(c) => { setCounty(c); setSubCounty(""); }} />
            <Text style={styles.locationLabel}>Sub-county</Text>
            <SubCountyPicker county={county} value={subCounty} onChange={setSubCounty} />
            <TouchableOpacity
              style={[styles.locationButton, (!county || !subCounty) && styles.locationButtonDisabled]}
              onPress={confirmLocation}
              disabled={!county || !subCounty}
            >
              <Text style={styles.locationButtonText}>Browse</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6, color: COLORS.ink },
  locationHint: { fontSize: 12, color: COLORS.sub, marginBottom: 14 },
  locationLabel: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub, marginBottom: 6, marginTop: 10 },
  locationButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 18 },
  locationButtonDisabled: { opacity: 0.5 },
  locationButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 14 },
});
