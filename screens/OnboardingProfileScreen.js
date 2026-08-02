import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import CAMPUSES from "../data/campuses";
import COUNTIES from "../data/counties";
import CampusPicker from "../components/CampusPicker";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import DateOfBirthPicker from "../components/DateOfBirthPicker";
import { COLORS } from "../theme";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTY_NAMES = COUNTIES.map((c) => c.name);

export default function OnboardingProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser, logout } = useAuth();
  const [gender, setGender] = useState(user?.gender || "");
  const [bio, setBio] = useState(user?.bio || "");
  // Only ever set via CampusPicker's onChange, which only fires on an
  // actual suggestion tap — free-typed text that was never selected can't
  // silently pass validation below.
  const [campus, setCampus] = useState(user?.campus && CAMPUSES.includes(user.campus) ? user.campus : "");
  const [county, setCounty] = useState(user?.county && COUNTY_NAMES.includes(user.county) ? user.county : "");
  const [subCounty, setSubCounty] = useState(user?.subCounty || "");
  const [yearOfJoining, setYearOfJoining] = useState(user?.yearOfJoining ? String(user.yearOfJoining) : "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || "");
  const [submitting, setSubmitting] = useState(false);

  function handleCountyChange(c) {
    setCounty(c);
    setSubCounty("");
  }

  async function handleContinue() {
    if (!gender) return Alert.alert("Gender required", "Select one of the options");
    if (!CAMPUSES.includes(campus)) {
      return Alert.alert("Campus/college required", "Type your campus/college name and select it from the suggestions");
    }
    if (!COUNTY_NAMES.includes(county)) {
      return Alert.alert("County required", "Select your county from the list");
    }
    const countyRow = COUNTIES.find((c) => c.name === county);
    if (!countyRow.subCounties.includes(subCounty)) {
      return Alert.alert("Sub-county required", "Select your sub-county from the list");
    }

    const year = parseInt(yearOfJoining, 10);
    if (!year || year < 1990 || year > new Date().getFullYear() + 1) {
      return Alert.alert("Invalid year", "Enter a reasonable year of joining");
    }
    if (!DATE_RE.test(dateOfBirth)) {
      return Alert.alert("Date of birth required", "Select your day, month, and year of birth");
    }

    setSubmitting(true);
    try {
      const { data } = await client.patch("/auth/me", {
        gender, bio: bio.trim(), campus, county, subCounty, yearOfJoining: year, dateOfBirth,
      });
      await updateUser(data.user);
      navigation.navigate("OnboardingFollow");
    } catch (e) {
      Alert.alert("Couldn't save your profile", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 20 + insets.bottom }}>
      <Text style={styles.title}>Tell us about yourself</Text>
      <Text style={styles.subtitle}>Step 2 of 3 — this appears on your profile</Text>

      <Text style={styles.label}>Gender</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, gender === g && styles.chipActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="A short bio (optional)"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={300}
      />

      <Text style={styles.label}>Campus / College</Text>
      <CampusPicker value={campus} onChange={setCampus} />

      <Text style={styles.label}>County</Text>
      <CountyPicker value={county} onChange={handleCountyChange} />

      <Text style={styles.label}>Sub-county</Text>
      <SubCountyPicker county={county} value={subCounty} onChange={setSubCounty} />

      <Text style={styles.label}>Year of joining</Text>
      <TextInput style={styles.input} placeholder="e.g. 2023" keyboardType="number-pad" value={yearOfJoining} onChangeText={setYearOfJoining} />

      <Text style={styles.label}>Date of birth</Text>
      <DateOfBirthPicker value={dateOfBirth} onChange={setDateOfBirth} />

      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={submitting}>
        {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={logout} style={styles.logoutLink}>
        <Text style={styles.logoutLinkText}>Not you? Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.sub, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, fontSize: 15, color: COLORS.ink },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.ink, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: COLORS.accentInk },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 28 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
  logoutLink: { alignItems: "center", marginTop: 20 },
  logoutLinkText: { color: COLORS.sub, fontSize: 13 },
});
