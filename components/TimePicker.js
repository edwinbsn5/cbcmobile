import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function parseValue(value) {
  const m = /^(\d{2}):(\d{2})$/.exec(value || "");
  if (!m) return { hour: null, minute: null };
  return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Tap-to-pick Hour/Minute dropdown (24h) — same full-screen sheet pattern as
 * DateOfBirthPicker/EventDatePicker. Reports a single "HH:MM" string via
 * onChange (only once both are picked), matching CreateEventScreen's
 * existing TIME_RE validation and startAt/endAt computation.
 */
export default function TimePicker({ value, onChange }) {
  const initial = useMemo(() => parseValue(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [openField, setOpenField] = useState(null); // "hour" | "minute" | null

  function commit(nextHour, nextMinute) {
    setOpenField(null);
    if (nextHour !== null && nextMinute !== null) onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
  }

  function selectHour(h) {
    setHour(h);
    commit(h, minute);
  }
  function selectMinute(m) {
    setMinute(m);
    commit(hour, m);
  }

  const fields = {
    hour: { title: "Select hour", data: HOURS, isSelected: (h) => h === hour, label: (h) => pad(h), onSelect: selectHour },
    minute: { title: "Select minute", data: MINUTES, isSelected: (m) => m === minute, label: (m) => pad(m), onSelect: selectMinute },
  };
  const active = openField ? fields[openField] : null;

  return (
    <View>
      <View style={styles.triggerRow}>
        <TouchableOpacity style={[styles.trigger, hour !== null && styles.triggerFilled]} onPress={() => setOpenField("hour")}>
          <Text style={[styles.triggerText, hour === null && styles.triggerPlaceholder]}>{hour !== null ? pad(hour) : "HH"}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
        </TouchableOpacity>
        <Text style={styles.colon}>:</Text>
        <TouchableOpacity style={[styles.trigger, minute !== null && styles.triggerFilled]} onPress={() => setOpenField("minute")}>
          <Text style={[styles.triggerText, minute === null && styles.triggerPlaceholder]}>{minute !== null ? pad(minute) : "MM"}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
        </TouchableOpacity>
      </View>

      <Modal visible={!!openField} animationType="slide" onRequestClose={() => setOpenField(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{active?.title}</Text>
            <TouchableOpacity onPress={() => setOpenField(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.ink} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={active?.data || []}
            keyExtractor={(item) => String(item)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listRow} onPress={() => active.onSelect(item)}>
                <Text style={styles.listRowText}>{active.label(item)}</Text>
                {active.isSelected(item) && <Ionicons name="checkmark" size={18} color={COLORS.accent} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  trigger: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.surface,
  },
  triggerFilled: { borderColor: COLORS.accent },
  triggerText: { fontSize: 15, color: COLORS.ink, fontWeight: "600" },
  triggerPlaceholder: { color: COLORS.sub, fontWeight: "400" },
  colon: { fontSize: 18, fontWeight: "800", color: COLORS.sub },
  modalContainer: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 50 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listRowText: { fontSize: 15, color: COLORS.ink },
});