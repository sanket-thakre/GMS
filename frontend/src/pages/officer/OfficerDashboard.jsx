import { useState, useEffect, useCallback } from "react";
import { listTickets } from "../../services/ticketService";
import TicketTable from "../../components/TicketTable";

const STATUS_OPTIONS = ["", "Open", "In_Progress", "Escalated", "Resolved", "Closed"];
const PRIORITY_OPTIONS = ["", "Low", "Medium", "High", "Critical"];

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

export default function OfficerDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await listTickets(params);
      setTickets(res.data);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Derive stat counts from current page data (backend scopes to officer's office).
  const counts = tickets.reduce(
    (acc, t) => {
      if (t.status === "Open") acc.open++;
      if (t.status === "In_Progress") acc.inProgress++;
      if (t.status === "Escalated") acc.escalated++;
      if (t.due_date) {
        const hoursLeft = (new Date(t.due_date) - new Date()) / 36e5;
        if (hoursLeft >= 0 && hoursLeft < 24) acc.dueSoon++;
      }
      return acc;
    },
    { open: 0, inProgress: 0, escalated: 0, dueSoon: 0 }
  );

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Officer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage grievance tickets assigned to your office.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open" value={counts.open} color="border-blue-200 bg-blue-50" />
        <StatCard label="In Progress" value={counts.inProgress} color="border-yellow-200 bg-yellow-50" />
        <StatCard label="Escalated" value={counts.escalated} color="border-orange-200 bg-orange-50" />
        <StatCard label="Due Soon (24h)" value={counts.dueSoon} color="border-red-200 bg-red-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace("_", " ") : "All Statuses"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={handleFilterChange(setPriorityFilter)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p || "All Priorities"}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setStatusFilter(""); setPriorityFilter(""); setPage(1); }}
          className="text-xs text-gray-500 hover:text-gray-700 underline self-end pb-1"
        >
          Clear filters
        </button>
      </div>

      {/* Ticket table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-4">{error}</div>
      ) : (
        <TicketTable tickets={tickets} />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        <span className="text-gray-500">Page {page}</span>
        <button
          disabled={tickets.length < 20}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
