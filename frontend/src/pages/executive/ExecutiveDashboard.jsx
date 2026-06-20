import { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import StatusPieChart from "../../components/charts/StatusPieChart";
import CategoryBarChart from "../../components/charts/CategoryBarChart";
import TrendLineChart from "../../components/charts/TrendLineChart";
import BreachByOfficeChart from "../../components/charts/BreachByOfficeChart";
import {
  getSummary,
  getByStatus,
  getByCategory,
  getBreachesByOffice,
  getTrend,
} from "../../services/analyticsService";

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState(null);
  const [byStatus, setByStatus] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [trend, setTrend] = useState([]);
  const [trendDays, setTrendDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async (days) => {
    setLoading(true);
    setError(null);
    try {
      const [s, st, cat, br, tr] = await Promise.all([
        getSummary(),
        getByStatus(),
        getByCategory(),
        getBreachesByOffice(),
        getTrend(days),
      ]);
      setSummary(s.data);
      setByStatus(st.data);
      setByCategory(cat.data);
      setBreaches(br.data);
      setTrend(tr.data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(trendDays);
  }, []);

  const handleDaysChange = (days) => {
    setTrendDays(days);
    getTrend(days)
      .then((r) => setTrend(r.data))
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={() => fetchAll(trendDays)}
          className="mt-4 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const pending = (summary?.open ?? 0) + (summary?.in_progress ?? 0) + (summary?.escalated ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">System-wide grievance health overview</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Tickets"
          value={summary?.total}
          accent="blue"
          hint="All time"
        />
        <StatCard
          label="Pending"
          value={pending}
          accent="yellow"
          hint="Open + In Progress + Escalated"
        />
        <StatCard
          label="Resolved"
          value={summary?.resolved}
          accent="green"
          hint={
            summary?.avg_resolution_hours != null
              ? `Avg ${summary.avg_resolution_hours}h resolution`
              : undefined
          }
        />
        <StatCard
          label="SLA Breaches"
          value={summary?.breached}
          accent="red"
          hint="Overdue & unresolved"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tickets by Status">
          <StatusPieChart data={byStatus} />
        </ChartCard>

        <ChartCard title="Tickets by Category">
          <CategoryBarChart data={byCategory} />
        </ChartCard>

        <ChartCard title="Ticket Trend">
          <TrendLineChart
            data={trend}
            days={trendDays}
            onDaysChange={handleDaysChange}
          />
        </ChartCard>

        <ChartCard title="SLA Breaches by Office">
          <BreachByOfficeChart data={breaches} />
        </ChartCard>
      </div>
    </div>
  );
}
