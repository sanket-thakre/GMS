import { useNavigate } from "react-router-dom";
import SlaIndicator from "./SlaIndicator";

const STATUS_COLORS = {
  Open: "bg-blue-100 text-blue-700",
  In_Progress: "bg-yellow-100 text-yellow-700",
  Escalated: "bg-orange-100 text-orange-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-sky-100 text-sky-700",
  High: "bg-amber-100 text-amber-700",
  Critical: "bg-red-100 text-red-700",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status?.replace("_", " ")}
    </span>
  );
}

// Phase 16: legend explaining the SLA dot colors, shown above the table.
const LEGEND = [
  { label: "On track", dot: "bg-green-500" },
  { label: "Due soon", dot: "bg-amber-500" },
  { label: "Critical", dot: "bg-red-500" },
  { label: "Breached", dot: "bg-red-700" },
];

function SlaLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-1 pb-2 text-xs text-gray-500">
      <span className="font-medium text-gray-400">SLA:</span>
      {LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function TicketTable({ tickets, basePath = "/officer/tickets" }) {
  const navigate = useNavigate();

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">No tickets found.</div>
    );
  }

  return (
    <div>
      <SlaLegend />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Ticket #</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Subcategory</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Priority</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Due</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {tickets.map((t) => (
            <tr
              key={t.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`${basePath}/${t.id}`)}
            >
              <td className="px-4 py-3 font-mono font-medium text-gray-800">{t.ticket_number}</td>
              <td className="px-4 py-3 text-gray-600">{t.subcategory_name ?? t.subcategory_id}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority] ?? ""}`}
                >
                  {t.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(t.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-gray-500">
                <SlaIndicator
                  slaStatus={t.sla_status}
                  secondsRemaining={t.time_remaining_seconds}
                />
                <div className="text-xs text-gray-400 mt-0.5">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}
                </div>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`${basePath}/${t.id}`);
                  }}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
