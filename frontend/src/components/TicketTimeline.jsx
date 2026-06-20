import { useState, useEffect } from "react";
import { getAuditTrail } from "../services/ticketService";
import { relativeTime } from "../utils/time";

/**
 * TicketTimeline — vertical timeline showing the chronological audit trail
 * for a ticket. Used in both the officer TicketDetail and complainant
 * GrievanceDetail pages.
 *
 * Props:
 *   ticketId (number) — the ticket whose audit trail to fetch.
 */

// ── Action type → colour mapping ──
const ACTION_COLORS = {
  Created: {
    dot: "bg-gray-400",
    bg: "bg-gray-50",
    text: "text-gray-700",
  },
  Status_Changed: {
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  Escalated: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  Transferred: {
    dot: "bg-slate-500",
    bg: "bg-slate-50",
    text: "text-slate-700",
  },
  Resolved: {
    dot: "bg-green-500",
    bg: "bg-green-50",
    text: "text-green-700",
  },
  Closed: {
    dot: "bg-slate-700",
    bg: "bg-slate-100",
    text: "text-slate-800",
  },
  Comment_Added: {
    dot: "bg-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-700",
  },
};

const DEFAULT_COLOR = {
  dot: "bg-gray-400",
  bg: "bg-gray-50",
  text: "text-gray-700",
};

// ── Human-readable action labels ──
const ACTION_LABELS = {
  Created: "Ticket created",
  Status_Changed: "Status changed",
  Escalated: "Escalated",
  Transferred: "Transferred",
  Resolved: "Ticket resolved",
  Closed: "Ticket closed",
  Comment_Added: "Comment added",
};

function formatFullDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Build a human-readable description for an audit entry.
 * Shows "previous → new" when both states exist.
 */
function buildDescription(entry) {
  const { action_type, previous_state, new_state } = entry;

  // Strip appended notes/reasons for cleaner display
  const cleanState = (s) => {
    if (!s) return null;
    const pipeIdx = s.indexOf(" | ");
    return pipeIdx > -1 ? s.substring(0, pipeIdx) : s;
  };

  const prev = cleanState(previous_state);
  const next = cleanState(new_state);

  // Extract note/reason if appended
  const noteMatch = new_state?.match(/\| (?:Note|Reason): (.+)$/);
  const note = noteMatch?.[1];

  let desc = ACTION_LABELS[action_type] || action_type;

  if (prev && next) {
    desc += `: ${prev} → ${next}`;
  } else if (next) {
    desc += `: ${next}`;
  }

  return { desc, note };
}

export default function TicketTimeline({ ticketId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prevTicketId, setPrevTicketId] = useState(null);

  if (ticketId !== prevTicketId) {
    setPrevTicketId(ticketId);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    getAuditTrail(ticketId)
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load timeline.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  // ── Empty state ──
  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
        <svg
          className="h-5 w-5 text-gray-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-gray-500">No history yet.</p>
      </div>
    );
  }

  // ── Timeline ──
  return (
    <div className="relative border-l-2 border-gray-200 pl-6 space-y-6">
      {entries.map((entry) => {
        const colors = ACTION_COLORS[entry.action_type] || DEFAULT_COLOR;
        const { desc, note } = buildDescription(entry);

        return (
          <div key={entry.id} className="relative">
            {/* Dot on the timeline line */}
            <div
              className={`absolute -left-[calc(1.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${colors.dot}`}
            />

            {/* Entry card */}
            <div className={`rounded-lg ${colors.bg} px-4 py-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${colors.text}`}>
                    {desc}
                  </p>
                  {note && (
                    <p className="mt-1 text-xs text-gray-500 italic">
                      "{note}"
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    by{" "}
                    <span className="font-medium text-gray-600">
                      {entry.actor_name}
                    </span>
                  </p>
                </div>
                <span
                  className="shrink-0 text-xs text-gray-400 whitespace-nowrap"
                  title={formatFullDate(entry.timestamp)}
                >
                  {relativeTime(entry.timestamp)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
