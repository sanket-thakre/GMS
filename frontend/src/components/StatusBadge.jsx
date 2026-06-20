/**
 * StatusBadge — reusable colour-coded pill for ticket statuses.
 *
 * Colour mapping (per Phase 12 spec):
 *   Open        → gray
 *   In_Progress → blue
 *   Escalated   → amber
 *   Resolved    → green
 *   Closed      → slate
 */

const STATUS_STYLES = {
  Open: "bg-gray-100 text-gray-700 ring-gray-300",
  In_Progress: "bg-blue-100 text-blue-700 ring-blue-300",
  Escalated: "bg-amber-100 text-amber-700 ring-amber-300",
  Resolved: "bg-green-100 text-green-700 ring-green-300",
  Closed: "bg-slate-100 text-slate-700 ring-slate-300",
};

const DISPLAY_LABELS = {
  Open: "Open",
  In_Progress: "In Progress",
  Escalated: "Escalated",
  Resolved: "Resolved",
  Closed: "Closed",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Open;
  const label = DISPLAY_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
