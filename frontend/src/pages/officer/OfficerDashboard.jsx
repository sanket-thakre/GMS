import { useState, useEffect, useCallback } from "react";
import { listTickets } from "../../services/ticketService";
import TicketTable from "../../components/TicketTable";
import TicketFilters from "../../components/TicketFilters";
import Pagination from "../../components/Pagination";

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
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({});

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend already scopes the list to the officer's office by role.
      const res = await listTickets({ ...filters, page, page_size: pageSize });
      setTickets(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
      setTotalPages(res.data.total_pages ?? 1);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset to first page whenever filters change.
  const handleFiltersChange = useCallback((next) => {
    setFilters(next);
    setPage(1);
  }, []);

  // Derive stat counts from the current page (backend scopes to officer's office).
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Officer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage grievance tickets assigned to your office.</p>
      </div>

      {/* Stat cards (current page) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open" value={counts.open} color="border-blue-200 bg-blue-50" />
        <StatCard label="In Progress" value={counts.inProgress} color="border-yellow-200 bg-yellow-50" />
        <StatCard label="Escalated" value={counts.escalated} color="border-orange-200 bg-orange-50" />
        <StatCard label="Due Soon (24h)" value={counts.dueSoon} color="border-red-200 bg-red-50" />
      </div>

      {/* Filters (reused from Phase 13) */}
      <TicketFilters onChange={handleFiltersChange} />

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

      {/* Pagination (reused from Phase 13) */}
      {!loading && !error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
