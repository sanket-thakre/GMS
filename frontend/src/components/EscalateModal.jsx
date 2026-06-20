import { useState } from "react";
import { escalateTicket } from "../services/ticketService";

export default function EscalateModal({ ticket, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await escalateTicket(ticket.id, { reason: reason.trim() });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to escalate ticket.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Escalate Ticket</h2>
        <p className="text-xs text-gray-500 mb-4">
          Ticket <span className="font-mono font-medium">{ticket.ticket_number}</span> will be
          moved to the parent office and its status will change to{" "}
          <span className="font-medium text-orange-600">Escalated</span>.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-700">
          Current office ID:{" "}
          <span className="font-medium">{ticket.assigned_hierarchy_id}</span> &rarr; will
          escalate to parent office.
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Provide justification for escalation…"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? "Escalating…" : "Escalate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
