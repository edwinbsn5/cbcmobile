import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, ScrollView, Animated, Dimensions, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { COLORS } from "../theme";

const PANEL_WIDTH = Math.round(Dimensions.get("window").width * 0.78);

// Home stays one-tap-only in the bottom bar. Tap & Win and Be the STAR are
// also one tap away down there, but are deliberately duplicated here too
// (by explicit request) for easier access from the menu as well.
const FEATURE_ITEMS = [
  { icon: "person-circle-outline", label: "My Profile", screen: "Profile" },
  { icon: "add-circle-outline", label: "Add to Story", screen: "CreateStory" },
  { icon: "film-outline", label: "Reels", screen: "Reels" },
  { icon: "game-controller-outline", label: "Tap & Win", screen: "MainTabs", params: { screen: "SpinWinTab" } },
  { icon: "star-outline", label: "Be the STAR", screen: "BeTheStar" },
  { icon: "megaphone-outline", label: "My Sponsored Posts", screen: "MySponsoredPosts" },
  { icon: "trending-up-outline", label: "My Boosted Groups", screen: "MyBoostedGroups" },
  { icon: "people-outline", label: "Groups", screen: "Groups" },
  { icon: "calendar-outline", label: "Events", screen: "Events" },
  { icon: "chatbubble-outline", label: "Inbox", screen: "Inbox" },
  { icon: "wallet-outline", label: "Wallet", screen: "Wallet" },
  { icon: "bookmark-outline", label: "Saved", screen: "Saved" },
  { icon: "briefcase-outline", label: "Jobs Board", screen: "Jobs" },
  { icon: "school-outline", label: "Student Leaders", screen: "StudentLeaders" },
];

const SETTINGS_ITEMS = [
  { icon: "settings-outline", label: "Account Settings", screen: "AccountSettings" },
  { icon: "shield-checkmark-outline", label: "Privacy", screen: "PrivacySettings" },
  { icon: "alert-circle-outline", label: "Child Safety", screen: "ChildSafety" },
  { icon: "help-buoy-outline", label: "Support", screen: "Support" },
];

export default function SideMenu({ visible, onClose, navigation }) {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -PANEL_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  function go(screen, params) {
    onClose();
    navigation.navigate(screen, params);
  }

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { onClose(); logout(); } },
    ]);
  }

  if (!mounted) return null;

  return (
    <Modal transparent visible={true} animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.panel, { width: PANEL_WIDTH, transform: [{ translateX }] }]}>
          <TouchableOpacity style={styles.header} onPress={() => go("Profile")}>
            <Avatar uri={user?.avatar} name={user?.name} style={styles.avatar} />
            <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </TouchableOpacity>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              {FEATURE_ITEMS.map((item) => (
                <TouchableOpacity key={item.label} style={styles.row} onPress={() => go(item.screen, item.params)}>
                  <Ionicons name={item.icon} size={20} color={COLORS.accent} style={styles.rowIcon} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              {SETTINGS_ITEMS.map((item) => (
                <TouchableOpacity key={item.screen} style={styles.row} onPress={() => go(item.screen)}>
                  <Ionicons name={item.icon} size={20} color={COLORS.sub} style={styles.rowIcon} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={styles.rowIcon} />
            <Text style={[styles.rowLabel, styles.logoutLabel]}>Log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: { position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: COLORS.surface, paddingTop: 56, paddingHorizontal: 16 },
  header: { marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  name: { fontSize: 17, fontWeight: "700" },
  email: { color: COLORS.sub, fontSize: 13, marginTop: 2 },
  section: { marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  rowIcon: { width: 28 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  logoutLabel: { color: "#D32F2F" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 8 },
  scrollArea: { flex: 1 },
});
