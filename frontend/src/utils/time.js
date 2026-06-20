// Phase 16: SLA countdown formatting helpers.

// Break a positive seconds count into d/h/m/s parts.
function parts(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

// "2d 3h", "5h 12m", "8m", "30s" — the two most-significant non-zero units.
export function humanizeDuration(seconds) {
  const abs = Math.abs(Math.floor(seconds ?? 0));
  const { days, hours, minutes, seconds: secs } = parts(abs);
  const tokens = [];
  if (days) tokens.push(`${days}d`);
  if (hours) tokens.push(`${hours}h`);
  if (minutes) tokens.push(`${minutes}m`);
  if (secs && tokens.length === 0) tokens.push(`${secs}s`);
  if (tokens.length === 0) return "0m";
  return tokens.slice(0, 2).join(" ");
}

// Human-friendly SLA label.
//   positive remaining -> "5h 12m left"
//   negative remaining -> "Overdue by 2h"
//   null/undefined     -> "—" (clock stopped / no deadline)
export function formatRemaining(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds <= 0) return `Overdue by ${humanizeDuration(seconds)}`;
  return `${humanizeDuration(seconds)} left`;
}
