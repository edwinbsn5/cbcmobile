import React, { useMemo } from "react";
import DatePicker from "./DatePicker";

const MIN_AGE = 13;
const MAX_AGE = 100;

/**
 * Thin wrapper around the shared DatePicker with a descending birth-year
 * range (most recently eligible year first, oldest last) — see
 * DatePicker's own comment for why the range is caller-supplied rather
 * than baked into one shared component.
 */
export default function DateOfBirthPicker({ value, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => currentYear - MIN_AGE - i),
    [currentYear]
  );
  return <DatePicker value={value} onChange={onChange} years={years} />;
}
