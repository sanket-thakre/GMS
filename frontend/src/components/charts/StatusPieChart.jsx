import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STATUS_HEX = {
  Open: "#3b82f6",
  In_Progress: "#eab308",
  Escalated: "#f97316",
  Resolved: "#22c55e",
  Closed: "#9ca3af",
};

export default function StatusPieChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-400 py-16">No data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ label, percent }) =>
            `${label} (${(percent * 100).toFixed(0)}%)`
          }
        >
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={STATUS_HEX[entry.key] ?? "#6b7280"}
            />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [v, "Tickets"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
