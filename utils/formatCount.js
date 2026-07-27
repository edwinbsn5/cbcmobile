export function formatCount(n) {
  const value = n || 0;
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const v = value / 1000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`;
  }
  const v = value / 1_000_000;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
}
