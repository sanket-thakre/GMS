import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const RANGE_OPTIONS = [7, 30, 90];

export default function TrendLineChart({ data, days, onDaysChange }) {
  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        {RANGE_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => onDaysChange(d)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              days === d
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-500 border-gray-300 hover:border-blue-400"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {!data || data.length === 0 ? (
        <p className="text-center text-gray-400 py-16">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Created"
            />
            <Line
              type="monotone"
              dataKey="resolved"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="Resolved"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
