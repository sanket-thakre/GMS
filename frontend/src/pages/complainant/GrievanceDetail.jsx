import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getTicket } from "../../services/ticketService";
import StatusBadge from "../../components/StatusBadge";

/**
 * GrievanceDetail — full detail view for a single ticket.
 *
 * Sections:
 *   • Header (ticket number + status badge)
 *   • Details grid (description, priority, category, office, dates)
 *   • Attachments gallery
 *   • Timeline placeholder (Phase 19)
 */

const API_ORIGIN = `http://${window.location.hostname}:4010`;

const PRIORITY_COLORS = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageType(contentType) {
  return contentType?.startsWith("image/");
}

export default function GrievanceDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTicket(id)
      .then((res) => {
        if (!cancelled) setTicket(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          const status = err.response?.status;
          if (status === 404) {
            setError("Grievance not found.");
          } else if (status === 403) {
            setError("You do not have permission to view this grievance.");
          } else {
            setError("Failed to load grievance details. Please try again.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
        <Link
          to="/grievances"
          className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to My Grievances
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  const attachments = ticket.attachments || [];

  return (
    <div className="mx-auto max-w-4xl py-6 space-y-6">
      {/* ── Back link ── */}
      <Link
        to="/grievances"
        className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
      >
        <svg
          className="mr-1 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to My Grievances
      </Link>

      {/* ── Header card ── */}
      <div className="rounded-2xl bg-white shadow-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono">
              {ticket.ticket_number}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Filed on {formatDateTime(ticket.created_at)}
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* ── Details grid ── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <DetailRow label="Priority">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                PRIORITY_COLORS[ticket.priority] || ""
              }`}
            >
              {ticket.priority}
            </span>
          </DetailRow>

          <DetailRow label="Subcategory ID">
            {ticket.subcategory_id}
          </DetailRow>

          <DetailRow label="Assigned Office ID">
            {ticket.assigned_hierarchy_id}
          </DetailRow>

          <DetailRow label="Due Date">
            <span
              className={
                ticket.due_date && new Date(ticket.due_date) < new Date()
                  ? "text-red-600 font-semibold"
                  : ""
              }
            >
              {formatDateTime(ticket.due_date)}
            </span>
          </DetailRow>

          {ticket.resolved_at && (
            <DetailRow label="Resolved At">
              {formatDateTime(ticket.resolved_at)}
            </DetailRow>
          )}
        </div>

        {/* ── Description ── */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700">Description</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
            {ticket.description || "No description provided."}
          </p>
        </div>
      </div>

      {/* ── Attachments ── */}
      <div className="rounded-2xl bg-white shadow-lg p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900">Attachments</h2>
        {attachments.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            No attachments were uploaded with this grievance.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {attachments.map((att) => {
              const fullUrl = `${API_ORIGIN}${att.url}`;
              return isImageType(att.content_type) ? (
                <a
                  key={att.id}
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <img
                    src={fullUrl}
                    alt={att.file_name}
                    className="h-32 w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <p className="truncate px-2 py-1.5 text-xs text-gray-500">
                    {att.file_name}
                  </p>
                </a>
              ) : (
                <a
                  key={att.id}
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <svg
                    className="h-10 w-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <p className="mt-2 truncate text-xs text-gray-500 max-w-full text-center">
                    {att.file_name}
                  </p>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Timeline placeholder (Phase 19) ── */}
      <div className="rounded-2xl bg-white shadow-lg p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900">Timeline</h2>
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 p-4">
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
          <p className="text-sm text-gray-500">
            Detailed activity timeline will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Small helper component for the detail grid rows. */
function DetailRow({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-800">{children}</dd>
    </div>
  );
}
