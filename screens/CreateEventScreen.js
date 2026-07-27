import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";
import EventDatePicker from "../components/EventDatePicker";
import TimePicker from "../components/TimePicker";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export default function CreateEventScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [cover, setCover] = useState(null); // { uri, mimeType, fileName }
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handlePickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to add a cover photo");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    setCover({ uri: asset.uri, mimeType, fileName: asset.fileName || `cover.${mimeType.split("/")[1]}` });
  }

  async function handleCreate() {
    if (!name.trim()) return Alert.alert("Name required", "Give your event a name");
    if (!DATE_RE.test(date)) return Alert.alert("Date required", "Select the day, month, and year");
    if (!TIME_RE.test(time)) return Alert.alert("Start time required", "Select the start hour and minute");
    if (!TIME_RE.test(endTime)) return Alert.alert("End time required", "Select the hour and minute the event ends");

    const startDate = new Date(`${date}T${time}:00`);
    if (isNaN(startDate.getTime())) return Alert.alert("Invalid date/time", "Check the date and time you entered");
    const startAt = startDate.getTime();
    if (startAt <= Date.now()) return Alert.alert("Pick a future time", "Events must start in the future");

    // An end time earlier than the start time means it runs past midnight
    // (e.g. start 22:00, end 01:00) — roll it to the following day.
    let endAt = new Date(`${date}T${endTime}:00`).getTime();
    if (endAt <= startAt) endAt += DAY_MS;

    setSubmitting(true);
    try {
      let coverUrl;
      if (cover) {
        setUploading(true);
        const form = new FormData();
        form.append("file", { uri: cover.uri, name: cover.fileName, type: cover.mimeType });
        const { data: uploaded } = await client.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
        coverUrl = uploaded.url;
        setUploading(false);
      }

      const { data } = await client.post("/events", {
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        coverUrl,
        startAt,
        endAt,
      });
      navigation.replace("EventDetail", { eventId: data.id });
    } catch (e) {
      Alert.alert("Couldn't create event", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  const busy = submitting || uploading;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Event name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Founders Meetup" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What's this event about?" multiline />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Venue or address" />

        <Text style={styles.label}>Cover photo</Text>
        {cover ? (
          <View style={styles.coverPreviewWrap}>
            <Image source={{ uri: cover.uri }} style={styles.coverPreview} resizeMode="cover" />
            <TouchableOpacity style={styles.removeCoverButton} onPress={() => setCover(null)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover}>
            <Ionicons name="image-outline" size={26} color={COLORS.accent} />
            <Text style={styles.coverPickerText}>Choose a cover photo</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Date</Text>
        <EventDatePicker value={date} onChange={setDate} />

        <Text style={styles.label}>Start time</Text>
        <TimePicker value={time} onChange={setTime} />

        <Text style={styles.label}>End time</Text>
        <TimePicker value={endTime} onChange={setEndTime} />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={busy}>
          {busy ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Create event</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  coverPicker: {
    height: 120, alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 10, backgroundColor: COLORS.bg,
  },
  coverPickerText: { color: COLORS.accent, fontWeight: "700", fontSize: 14 },
  coverPreviewWrap: { height: 140, borderRadius: 10, overflow: "hidden", backgroundColor: "#000" },
  coverPreview: { width: "100%", height: "100%" },
  removeCoverButton: {
    position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
});