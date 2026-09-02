import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function parseValue(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!m) return { day: null, month: null, year: null };
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Tap-to-pick Day/Month/Year dropdown instead of a free-typed "YYYY-MM-DD"
 * box — reports a single "YYYY-MM-DD" string via onChange (only once all
 * three are picked), so callers built around that format (validation
 * regex, the request body) need no changes. `years` is caller-supplied (in
 * whatever order they want listed) since the sensible range differs by
 * context — near-future for an event, past-only for a birth date, or a
 * wide mixed range for something like a meeting date that's backdated as
 * often as scheduled ahead.
 *
 * EventDatePicker and DateOfBirthPicker are thin wrappers around this that
 * just compute their own fixed year range — reach for those two directly
 * when their exact convention applies, or this one directly anywhere else
 * a date field is needed.
 */
export default function DatePicker({ value, onChange, years }) {
  const initial = useMemo(() => parseValue(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [openField, setOpenField] = useState(null); // "day" | "month" | "year" | null

  const dayCount = month && year ? daysInMonth(month, year) : 31;
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  function commit(nextDay, nextMonth, nextYear) {
    setOpenField(null);
    if (nextDay && nextMonth && nextYear) onChange(`${nextYear}-${pad(nextMonth)}-${pad(nextDay)}`);
  }

  function selectDay(d) {
    setDay(d);
    commit(d, month, year);
  }
  function selectMonth(m) {
    // Switching month can overshoot the day (e.g. Jan 31 -> Feb) — clamp it.
    const clampedDay = day && year ? Math.min(day, daysInMonth(m, year)) : day;
    setMonth(m);
    if (clampedDay !== day) setDay(clampedDay);
    commit(clampedDay, m, year);
  }
  function selectYear(y) {
    // Same overshoot case for Feb 29 on a non-leap year.
    const clampedDay = day && month ? Math.min(day, daysInMonth(month, y)) : day;
    setYear(y);
    if (clampedDay !== day) setDay(clampedDay);
    commit(clampedDay, month, y);
  }

  const fields = {
    day: { title: "Select day", data: days, isSelected: (d) => d === day, label: (d) => String(d), onSelect: selectDay },
    month: { title: "Select month", data: MONTHS.map((_, i) => i + 1), isSelected: (m) => m === month, label: (m) => MONTHS[m - 1], onSelect: selectMonth },
    year: { title: "Select year", data: years, isSelected: (y) => y === year, label: (y) => String(y), onSelect: selectYear },
  };
  const active = openField ? fields[openField] : null;

  return (
    <View>
      <View style={styles.triggerRow}>
        <TouchableOpacity style={[styles.trigger, day && styles.triggerFilled]} onPress={() => setOpenField("day")}>
          <Text style={[styles.triggerText, !day && styles.triggerPlaceholder]}>{day || "Day"}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.trigger, month && styles.triggerFilled]} onPress={() => setOpenField("month")}>
          <Text style={[styles.triggerText, !month && styles.triggerPlaceholder]}>{month ? MONTHS[month - 1] : "Month"}</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.sub} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.trigger, year && styles.triggerFilled]} onPress={() => setOpenField("year")}>
          <Text style={[styles.triggerText, !year && styles.triggerPlaceholder]}>{year || "Year"}</Text>
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
  triggerRow: { flexDirection: "row", gap: 8 },
  trigger: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.surface,
  },
  triggerFilled: { borderColor: COLORS.accent },
  triggerText: { fontSize: 15, color: COLORS.ink, fontWeight: "600" },
  triggerPlaceholder: { color: COLORS.sub, fontWeight: "400" },
  modalContainer: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 50 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  listRowText: { fontSize: 15, color: COLORS.ink },
});
