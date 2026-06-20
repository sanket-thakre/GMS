import { useState } from "react";
import { updateTicketStatus } from "../services/ticketService";

// Legal next states per current status (mirrors backend _ALLOWED_TRANSITIONS).
const NEXT_STATES = {
  Open: ["In_Progress"],
  In_Progress: ["Resolved"],
  Resolved: ["Closed", "In_Progress"],
  Escalated: [],
  Closed: [],
};

const STATUS_LABELS = {
  In_Progress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

export default function StatusUpdateControl({ ticket, onUpdated }) {
  const nextStates = NEXT_STATES[ticket.status] ?? [];
  const [selectedStatus, setSelectedStatus] = useState(nextStates[0] ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (nextStates.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        No further status updates available for a <strong>{ticket.status.replace("_", " ")}</strong> ticket.
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateTicketStatus(ticket.id, selectedStatus, note || null);
      setSuccess("Status updated successfully.");
      setNote("");
      onUpdated(res.data);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Update Status</h3>

      {success && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {success}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            New Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {nextStates.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add an optional note..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedStatus}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-colors"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {submitting ? "Updating…" : "Update Status"}
        </button>
      </form>
    </div>
  );
}
