import { useEffect, useState } from "react";
import { listCategories } from "../services/categoryService";

const STATUSES = ["Open", "In_Progress", "Escalated", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const EMPTY = {
  status: "",
  priority: "",
  category_id: "",
  date_from: "",
  date_to: "",
};

/**
 * Reusable filter bar. Emits a single cleaned filters object via onChange
 * whenever any control changes (search is debounced). Empty fields are omitted.
 */
export default function TicketFilters({ onChange }) {
  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);

  // Load categories for the Category select.
  useEffect(() => {
    let active = true;
    listCategories()
      .then((res) => active && setCategories(res.data))
      .catch(() => active && setCategories([]));
    return () => {
      active = false;
    };
  }, []);

  // Debounce the search box, then emit the combined, cleaned filter set.
  useEffect(() => {
    const handle = setTimeout(() => {
      const merged = { ...filters, search };
      const cleaned = Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== "" && v != null),
      );
      onChange?.(cleaned);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, search]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const clear = () => {
    setFilters(EMPTY);
    setSearch("");
  };

  const selectCls =
    "rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Status
        <select value={filters.status} onChange={set("status")} className={selectCls}>
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Priority
        <select value={filters.priority} onChange={set("priority")} className={selectCls}>
          <option value="">All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-gray-500">
        Category
        <select value={filters.category_id} onChange={set("category_id")} className={selectCls}>
          <option value="">All</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-gray-500">
        From
        <input type="date" value={filters.date_from} onChange={set("date_from")} className={selectCls} />
      </label>

      <label className="flex flex-col gap-1 text-xs text-gray-500">
        To
        <input type="date" value={filters.date_to} onChange={set("date_to")} className={selectCls} />
      </label>

      <label className="flex flex-1 flex-col gap-1 text-xs text-gray-500" style={{ minWidth: "180px" }}>
        Search
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ticket # or description"
          className={selectCls}
        />
      </label>

      <button
        type="button"
        onClick={clear}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        Clear
      </button>
    </div>
  );
}
