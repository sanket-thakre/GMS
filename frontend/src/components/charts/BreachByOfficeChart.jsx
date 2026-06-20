import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function BreachByOfficeChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-400 py-16">No data yet</p>;
  }

  const sorted = [...data].sort((a, b) => b.breached - a.breached);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="office_name"
          width={130}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(v, name) =>
            name === "breach_rate"
              ? [`${(v * 100).toFixed(1)}%`, "Breach Rate"]
              : [v, name === "breached" ? "Breached" : "Total"]
          }
        />
        <Bar dataKey="total" fill="#bfdbfe" radius={[0, 4, 4, 0]} name="total" />
        <Bar dataKey="breached" radius={[0, 4, 4, 0]} name="breached">
          {sorted.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.breach_rate > 0.5 ? "#dc2626" : "#f97316"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
