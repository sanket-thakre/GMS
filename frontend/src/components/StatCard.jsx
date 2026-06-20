export default function StatCard({ label, value, accent = "blue", hint }) {
  const accents = {
    blue: "border-blue-500 text-blue-600",
    green: "border-green-500 text-green-600",
    yellow: "border-yellow-500 text-yellow-600",
    red: "border-red-500 text-red-600",
  };

  return (
    <div className={`bg-white rounded-2xl shadow p-5 border-l-4 ${accents[accent] ?? accents.blue}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-4xl font-bold mt-1 ${accents[accent]?.split(" ")[1]}`}>
        {value ?? "—"}
      </p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
