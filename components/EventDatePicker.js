import React, { useMemo } from "react";
import DatePicker from "./DatePicker";

const YEARS_AHEAD = 2; // events can be scheduled up to 2 years out

/**
 * Thin wrapper around the shared DatePicker with an ascending near-future
 * year range — see DatePicker's own comment for why the range is
 * caller-supplied rather than baked into one shared component.
 */
export default function EventDatePicker({ value, onChange }) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: YEARS_AHEAD + 1 }, (_, i) => currentYear + i),
    [currentYear]
  );
  return <DatePicker value={value} onChange={onChange} years={years} />;
}
