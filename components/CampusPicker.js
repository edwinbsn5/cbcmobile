import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import CAMPUSES from "../data/campuses";
import { COLORS } from "../theme";

const MAX_SUGGESTIONS = 8;

/**
 * Type-to-filter campus/college picker. `value` is only ever set by the
 * caller in response to `onChange` being fired from an actual suggestion
 * tap — free-typed text that's never selected leaves `value` untouched, so
 * callers that require a confirmed selection can validate
 * `CAMPUSES.includes(value)` before proceeding.
 */
export default function CampusPicker({ value, onChange, placeholder = "Start typing to search..." }) {
  const [query, setQuery] = useState(value || "");

  const showSuggestions = query.length > 0 && query !== value;
  const suggestions = showSuggestions
    ? CAMPUSES.filter((c) => c.toLowerCase().includes(query.toLowerCase())).slice(0, MAX_SUGGESTIONS)
    : [];

  function handleQueryChange(text) {
    setQuery(text);
    if (text !== value) onChange("");
  }

  function select(c) {
    onChange(c);
    setQuery(c);
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={query}
        onChangeText={handleQueryChange}
        autoCapitalize="words"
      />
      {showSuggestions && (
        <View style={styles.suggestionBox}>
          {suggestions.length === 0 ? (
            <Text style={styles.noSuggestions}>No matches — keep typing or check spelling</Text>
          ) : (
            suggestions.map((c) => (
              <TouchableOpacity key={c} style={styles.suggestionRow} onPress={() => select(c)}>
                <Text style={styles.suggestionText}>{c}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, fontSize: 15, color: COLORS.ink, backgroundColor: COLORS.surface },
  suggestionBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4, backgroundColor: COLORS.surface },
  suggestionRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.bg },
  suggestionText: { fontSize: 14, color: COLORS.ink },
  noSuggestions: { padding: 12, color: COLORS.sub, fontSize: 13 },
});
