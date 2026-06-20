import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listWithSubs } from "../../services/categoryService";
import { createTicket } from "../../services/ticketService";
import FileDropzone from "../../components/FileDropzone";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

export default function NewGrievance() {
  const navigate = useNavigate();

  // ── Category / Subcategory cascading state ──
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [subcategories, setSubcategories] = useState([]);
  const [slaHours, setSlaHours] = useState(null);

  // ── Form fields ──
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [files, setFiles] = useState([]);

  // ── UI state ──
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // { ticket_number, id }

  // ── Load categories once on mount ──
  useEffect(() => {
    let cancelled = false;
    setLoadingCats(true);
    listWithSubs()
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load categories. Please refresh.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derive subcategories when category changes ──
  useEffect(() => {
    if (!selectedCategoryId) {
      setSubcategories([]);
      setSelectedSubcategoryId("");
      setSlaHours(null);
      return;
    }
    const cat = categories.find((c) => c.id === Number(selectedCategoryId));
    setSubcategories(cat?.subcategories || []);
    setSelectedSubcategoryId("");
    setSlaHours(null);
  }, [selectedCategoryId, categories]);

  // ── Show SLA helper when subcategory changes ──
  useEffect(() => {
    if (!selectedSubcategoryId) {
      setSlaHours(null);
      return;
    }
    const sub = subcategories.find(
      (s) => s.id === Number(selectedSubcategoryId)
    );
    setSlaHours(sub?.sla_hours ?? null);
  }, [selectedSubcategoryId, subcategories]);

  // ── Submit handler ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedSubcategoryId) {
      setError("Please select a category and subcategory.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a description of your grievance.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subcategory_id", selectedSubcategoryId);
      formData.append("description", description.trim());
      formData.append("priority", priority);
      files.forEach((file) => formData.append("files", file));

      const res = await createTicket(formData);
      setSuccess({
        ticket_number: res.data.ticket_number,
        id: res.data.id,
      });
    } catch (err) {
      const detail =
        err.response?.data?.detail || "Failed to submit grievance. Try again.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success card ──
  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Grievance Submitted!
          </h2>
          <p className="mt-2 text-gray-500">
            Your ticket number is:
          </p>
          <p className="mt-1 text-lg font-mono font-bold text-blue-600">
            {success.ticket_number}
          </p>
          <p className="mt-3 text-sm text-gray-400">
            You can track the status from your grievances list.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate(`/grievances/${success.id}`)}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
            >
              View Grievance
            </button>
            <button
              onClick={() => navigate("/grievances")}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              My Grievances
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="rounded-2xl bg-white shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900">
          File a New Grievance
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Submit your complaint and we'll route it to the appropriate office.
        </p>

        {/* Error alert */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* ── Category ── */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={loadingCats}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingCats ? "Loading categories…" : "— Select a category —"}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* ── Subcategory ── */}
          <div>
            <label
              htmlFor="subcategory"
              className="block text-sm font-medium text-gray-700"
            >
              Subcategory <span className="text-red-500">*</span>
            </label>
            <select
              id="subcategory"
              value={selectedSubcategoryId}
              onChange={(e) => setSelectedSubcategoryId(e.target.value)}
              disabled={!selectedCategoryId || subcategories.length === 0}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedCategoryId
                  ? "— Select a category first —"
                  : subcategories.length === 0
                  ? "— No subcategories available —"
                  : "— Select a subcategory —"}
              </option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
            {slaHours !== null && (
              <p className="mt-1.5 text-xs text-amber-600 font-medium">
                ⏱ Resolution target: {slaHours} hour{slaHours !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* ── Description ── */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your grievance in detail…"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* ── Priority ── */}
          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700"
            >
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* ── File attachments ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <FileDropzone onFilesChange={setFiles} />
          </div>

          {/* ── Submit ── */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {submitting ? "Submitting…" : "Submit Grievance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
