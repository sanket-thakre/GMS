import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listMyTickets } from "../../services/ticketService";
import StatusBadge from "../../components/StatusBadge";

/**
 * MyGrievances — paginated list of the current user's filed tickets.
 *
 * On mobile: stacked cards.  On md+: a standard table.
 */

const PRIORITY_COLORS = {
  Low: "text-gray-500",
  Medium: "text-blue-600",
  High: "text-orange-600",
  Critical: "text-red-600",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

export default function MyGrievances() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchTickets = (p = 1) => {
    setLoading(true);
    setError(null);
    listMyTickets({ page: p, page_size: 15, sort_by: "created_at", order: "desc" })
      .then((res) => {
        const data = res.data;
        setTickets(data.items);
        setPage(data.page);
        setTotalPages(data.total_pages);
        setTotal(data.total);
      })
      .catch(() => setError("Failed to load your grievances. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets(1);
  }, []);

  // ── Loading spinner ──
  if (loading && tickets.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Error alert ──
  if (error && tickets.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!loading && tickets.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v7.5m2.25-6.466a9.016 9.016 0 00-3.461-.203c-1.153.132-2.29.393-3.289.779m8.25-1.576a9.004 9.004 0 012.25 1.576m-10.5-1.576v5.22m0 0a8.978 8.978 0 003.75 1.056 8.978 8.978 0 003.75-1.056m-7.5 0H5.25A2.25 2.25 0 013 18.75V5.25A2.25 2.25 0 015.25 3h5.94"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">No grievances yet</h2>
          <p className="mt-2 text-gray-500">
            You haven't filed any grievances yet. Get started by filing your
            first one.
          </p>
          <Link
            to="/grievances/new"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
          >
            File a Grievance
          </Link>
        </div>
      </div>
    );
  }

  // ── Ticket list ──
  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Grievances</h1>
          <p className="text-sm text-gray-500">
            {total} grievance{total !== 1 ? "s" : ""} filed
          </p>
        </div>
        <Link
          to="/grievances/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Grievance
        </Link>
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Desktop table (md+) ── */}
      <div className="hidden md:block overflow-hidden rounded-xl bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Ticket #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Due
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-sm">
                  <Link
                    to={`/grievances/${t.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {t.ticket_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <span>{t.category_name || "—"}</span>
                  {t.subcategory_name && (
                    <span className="text-gray-400">
                      {" "}
                      / {t.subcategory_name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={t.status} />
                </td>
                <td
                  className={`px-4 py-3 text-sm font-medium ${
                    PRIORITY_COLORS[t.priority] || ""
                  }`}
                >
                  {t.priority}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDate(t.created_at)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDateTime(t.due_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (< md) ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {tickets.map((t) => (
          <Link
            key={t.id}
            to={`/grievances/${t.id}`}
            className="block rounded-xl bg-white p-4 shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-600 text-sm">
                {t.ticket_number}
              </span>
              <StatusBadge status={t.status} />
            </div>
            <p className="mt-1 text-sm text-gray-700">
              {t.category_name || "—"}
              {t.subcategory_name && (
                <span className="text-gray-400"> / {t.subcategory_name}</span>
              )}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span
                className={`font-medium ${
                  PRIORITY_COLORS[t.priority] || ""
                }`}
              >
                {t.priority}
              </span>
              <span>{formatDate(t.created_at)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => fetchTickets(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchTickets(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
