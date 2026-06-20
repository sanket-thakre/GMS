import { useState, useEffect } from "react";
import { hierarchyService } from "../services/hierarchyService";
import { transferTicket } from "../services/assignmentService";

export default function TransferModal({ ticket, onClose, onSuccess }) {
  const [offices, setOffices] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loadingOffices, setLoadingOffices] = useState(true);

  useEffect(() => {
    hierarchyService
      .listHierarchies()
      .then((res) => {
        // Exclude the ticket's current office from options.
        const filtered = res.data.filter((o) => o.id !== ticket.assigned_hierarchy_id);
        setOffices(filtered);
        if (filtered.length > 0) setSelectedId(String(filtered[0].id));
      })
      .catch(() => setError("Failed to load offices."))
      .finally(() => setLoadingOffices(false));
  }, [ticket.assigned_hierarchy_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await transferTicket(ticket.id, {
        hierarchy_id: Number(selectedId),
        reason: reason.trim() || null,
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to transfer ticket.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Transfer Ticket</h2>
        <p className="text-xs text-gray-500 mb-4">
          Move <span className="font-mono font-medium">{ticket.ticket_number}</span> to a
          different office.
        </p>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Target Office <span className="text-red-500">*</span>
            </label>
            {loadingOffices ? (
              <div className="text-xs text-gray-400 py-2">Loading offices…</div>
            ) : offices.length === 0 ? (
              <div className="text-xs text-gray-500 py-2">No other offices available.</div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.level})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why you are transferring this ticket…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500"
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
              disabled={submitting || !selectedId || offices.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? "Transferring…" : "Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
