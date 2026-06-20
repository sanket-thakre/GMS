import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTicket } from "../../services/ticketService";
import { useAuth } from "../../context/AuthContext";
import StatusUpdateControl from "../../components/StatusUpdateControl";
import EscalateModal from "../../components/EscalateModal";
import TransferModal from "../../components/TransferModal";

const STATUS_COLORS = {
  Open: "bg-blue-100 text-blue-700",
  In_Progress: "bg-yellow-100 text-yellow-700",
  Escalated: "bg-orange-100 text-orange-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-600",
};

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

const TERMINAL_STATUSES = new Set(["Resolved", "Closed"]);
const ADMIN_ROLES = new Set(["Admin", "DoM_Admin"]);

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  useEffect(() => {
    setLoading(true);
    getTicket(id)
      .then((res) => setTicket(res.data))
      .catch((err) => setError(err.response?.data?.detail ?? "Failed to load ticket."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleActionSuccess = (updatedTicket, label) => {
    setTicket(updatedTicket);
    setShowEscalate(false);
    setShowTransfer(false);
    setActionToast(label);
    setTimeout(() => setActionToast(null), 4000);
  };

  const canActOnTicket = ticket && user && (
    ADMIN_ROLES.has(user.role_name) ||
    ticket.assigned_hierarchy_id === user.hierarchy_id
  );
  const actionsVisible = ticket && !TERMINAL_STATUSES.has(ticket.status) && canActOnTicket;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4">{error}</div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="space-y-4">
      {/* Success toast */}
      {actionToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg">
          {actionToast}
        </div>
      )}

      {/* Back nav */}
      <button
        onClick={() => navigate("/officer")}
        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Back to Dashboard
      </button>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900 font-mono">{ticket.ticket_number}</h1>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] ?? "bg-gray-100"}`}
        >
          {ticket.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ticket details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Core info */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Ticket Information</h2>
            <InfoRow label="Ticket #" value={ticket.ticket_number} />
            <InfoRow label="Status" value={ticket.status.replace("_", " ")} />
            <InfoRow label="Priority" value={ticket.priority} />
            <InfoRow label="Subcategory ID" value={ticket.subcategory_id} />
            <InfoRow label="Assigned Office ID" value={ticket.assigned_hierarchy_id} />
            <InfoRow label="Complainant ID" value={ticket.complainant_id} />
            <InfoRow
              label="Created"
              value={new Date(ticket.created_at).toLocaleString()}
            />
            <InfoRow
              label="Due Date"
              value={ticket.due_date ? new Date(ticket.due_date).toLocaleString() : "—"}
            />
            {ticket.resolved_at && (
              <InfoRow
                label="Resolved At"
                value={new Date(ticket.resolved_at).toLocaleString()}
              />
            )}
          </div>

          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {ticket.description ?? "No description provided."}
            </p>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Attachments</h2>
              <ul className="space-y-2">
                {ticket.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">📎</span>
                    <a
                      href={`http://${window.location.hostname}:4010${a.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {a.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline placeholder — Phase 19 */}
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-5 text-center text-sm text-gray-400">
            Activity Timeline — coming in Phase 19
          </div>
        </div>

        {/* Right: Status update + future escalation controls */}
        <div className="space-y-4">
          <StatusUpdateControl ticket={ticket} onUpdated={setTicket} />

          {/* Actions: Escalate / Transfer */}
          {actionsVisible ? (
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Actions</h3>
              <button
                onClick={() => setShowEscalate(true)}
                className="w-full py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
              >
                Escalate to Parent Office
              </button>
              <button
                onClick={() => setShowTransfer(true)}
                className="w-full py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                Transfer to Another Office
              </button>
            </div>
          ) : ticket && TERMINAL_STATUSES.has(ticket.status) ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">
              Actions unavailable for {ticket.status.replace("_", " ")} tickets.
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {showEscalate && ticket && (
        <EscalateModal
          ticket={ticket}
          onClose={() => setShowEscalate(false)}
          onSuccess={(updated) =>
            handleActionSuccess(updated, "Ticket escalated successfully.")
          }
        />
      )}
      {showTransfer && ticket && (
        <TransferModal
          ticket={ticket}
          onClose={() => setShowTransfer(false)}
          onSuccess={(updated) =>
            handleActionSuccess(updated, "Ticket transferred successfully.")
          }
        />
      )}
    </div>
  );
}
