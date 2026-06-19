import { useState, useEffect, useCallback } from "react";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "../../services/categoryService";

// ── SLA Badge Component ─────────────────────────────────────────────
function SlaBadge({ hours }) {
  let colorClasses;
  if (hours <= 12) {
    colorClasses = "bg-red-100 text-red-700 border-red-200";
  } else if (hours <= 24) {
    colorClasses = "bg-amber-100 text-amber-700 border-amber-200";
  } else {
    colorClasses = "bg-green-100 text-green-700 border-green-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}
    >
      {hours}h
    </span>
  );
}

// ── Alert Component ─────────────────────────────────────────────────
function Alert({ type, message, onClose }) {
  if (!message) return null;

  const styles = {
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };

  return (
    <div
      className={`mb-4 px-4 py-3 rounded-lg border flex items-center justify-between ${styles[type]}`}
    >
      <span className="text-sm">{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-lg leading-none opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export default function CategoryManagement() {
  // ── State ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  // Category form
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryCreating, setCategoryCreating] = useState(false);

  // Inline edit state for categories
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // Subcategory form
  const [newSubName, setNewSubName] = useState("");
  const [newSubSlaHours, setNewSubSlaHours] = useState("");
  const [subCreating, setSubCreating] = useState(false);

  // Inline edit state for subcategories
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubSlaHours, setEditSubSlaHours] = useState("");

  // ── Auto-dismiss alert after 4 seconds ────────────────────────────
  useEffect(() => {
    if (alert.message) {
      const timer = setTimeout(() => setAlert({ type: "", message: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // ── Load categories on mount ──────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listCategories();
      setCategories(res.data);
    } catch {
      setAlert({ type: "error", message: "Failed to load categories" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Load subcategories when selected category changes ─────────────
  const fetchSubcategories = useCallback(async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      setSubLoading(true);
      const res = await listSubcategories(categoryId);
      setSubcategories(res.data);
    } catch {
      setAlert({ type: "error", message: "Failed to load subcategories" });
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubcategories(selectedCategoryId);
  }, [selectedCategoryId, fetchSubcategories]);

  // ── Category Handlers ─────────────────────────────────────────────
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setCategoryCreating(true);
      await createCategory({ name: newCategoryName.trim() });
      setNewCategoryName("");
      setAlert({ type: "success", message: "Category created successfully" });
      await fetchCategories();
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to create category";
      setAlert({ type: "error", message: msg });
    } finally {
      setCategoryCreating(false);
    }
  };

  const handleStartEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
  };

  const handleSaveEditCategory = async (id) => {
    if (!editCategoryName.trim()) return;
    try {
      await updateCategory(id, { name: editCategoryName.trim() });
      setEditingCategoryId(null);
      setEditCategoryName("");
      setAlert({ type: "success", message: "Category updated successfully" });
      await fetchCategories();
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to update category";
      setAlert({ type: "error", message: msg });
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    try {
      await deleteCategory(id);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
        setSubcategories([]);
      }
      setAlert({ type: "success", message: "Category deleted successfully" });
      await fetchCategories();
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to delete category";
      setAlert({ type: "error", message: msg });
    }
  };

  // ── Subcategory Handlers ──────────────────────────────────────────
  const handleCreateSubcategory = async (e) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubSlaHours || !selectedCategoryId) return;

    try {
      setSubCreating(true);
      await createSubcategory(selectedCategoryId, {
        name: newSubName.trim(),
        sla_hours: parseInt(newSubSlaHours, 10),
      });
      setNewSubName("");
      setNewSubSlaHours("");
      setAlert({
        type: "success",
        message: "Subcategory created successfully",
      });
      await fetchSubcategories(selectedCategoryId);
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to create subcategory";
      setAlert({ type: "error", message: msg });
    } finally {
      setSubCreating(false);
    }
  };

  const handleStartEditSub = (sub) => {
    setEditingSubId(sub.id);
    setEditSubName(sub.name);
    setEditSubSlaHours(String(sub.sla_hours));
  };

  const handleSaveEditSub = async (id) => {
    if (!editSubName.trim() || !editSubSlaHours) return;
    try {
      await updateSubcategory(id, {
        name: editSubName.trim(),
        sla_hours: parseInt(editSubSlaHours, 10),
      });
      setEditingSubId(null);
      setAlert({
        type: "success",
        message: "Subcategory updated successfully",
      });
      await fetchSubcategories(selectedCategoryId);
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to update subcategory";
      setAlert({ type: "error", message: msg });
    }
  };

  const handleDeleteSubcategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subcategory?"))
      return;

    try {
      await deleteSubcategory(id);
      setAlert({
        type: "success",
        message: "Subcategory deleted successfully",
      });
      await fetchSubcategories(selectedCategoryId);
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to delete subcategory";
      setAlert({ type: "error", message: msg });
    }
  };

  // ── Derived ───────────────────────────────────────────────────────
  const selectedCategory = categories.find(
    (c) => c.id === selectedCategoryId
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Category Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage grievance categories and subcategories with SLA deadlines.
        </p>
      </div>

      {/* Alert */}
      <Alert
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ type: "", message: "" })}
      />

      {/* Loading spinner */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Panel: Categories ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Categories
              </h2>

              {/* Add Category Form */}
              <form onSubmit={handleCreateCategory} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    disabled={categoryCreating}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {categoryCreating ? (
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>
              </form>

              {/* Category List */}
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-sm">No categories yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        if (editingCategoryId !== cat.id) {
                          setSelectedCategoryId(cat.id);
                        }
                      }}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        selectedCategoryId === cat.id
                          ? "ring-2 ring-blue-500 bg-blue-50"
                          : "hover:bg-gray-50 border border-transparent hover:border-gray-200"
                      }`}
                    >
                      {editingCategoryId === cat.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) =>
                              setEditCategoryName(e.target.value)
                            }
                            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveEditCategory(cat.id);
                              if (e.key === "Escape")
                                setEditingCategoryId(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEditCategory(cat.id);
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryId(null);
                            }}
                            className="text-gray-400 hover:text-gray-600 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {cat.name}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditCategory(cat);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="Edit category"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(cat.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete category"
                            >
                              🗑️
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Subcategories ──────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow p-6">
              {selectedCategory ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                      Subcategories —{" "}
                      <span className="text-blue-600">
                        {selectedCategory.name}
                      </span>
                    </h2>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {subcategories.length} item
                      {subcategories.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* SLA Legend */}
                  <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      ≤12h (Critical)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      13–24h (Moderate)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      &gt;24h (Low)
                    </span>
                  </div>

                  {/* Add Subcategory Form */}
                  <form
                    onSubmit={handleCreateSubcategory}
                    className="mb-4 flex items-end gap-3 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300"
                  >
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        placeholder="Subcategory name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        SLA (hours)
                      </label>
                      <input
                        type="number"
                        value={newSubSlaHours}
                        onChange={(e) => setNewSubSlaHours(e.target.value)}
                        placeholder="e.g. 12"
                        min={1}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={subCreating}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {subCreating ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                      ) : (
                        "+ Add"
                      )}
                    </button>
                  </form>

                  {/* Subcategory Table */}
                  {subLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    </div>
                  ) : subcategories.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-3xl mb-2">📋</div>
                      <p className="text-sm">
                        No subcategories yet. Add one above.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SLA (hours)
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {subcategories.map((sub) => (
                            <tr
                              key={sub.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              {editingSubId === sub.id ? (
                                <>
                                  <td className="px-4 py-3">
                                    <input
                                      type="text"
                                      value={editSubName}
                                      onChange={(e) =>
                                        setEditSubName(e.target.value)
                                      }
                                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleSaveEditSub(sub.id);
                                        if (e.key === "Escape")
                                          setEditingSubId(null);
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      value={editSubSlaHours}
                                      onChange={(e) =>
                                        setEditSubSlaHours(e.target.value)
                                      }
                                      min={1}
                                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() =>
                                        handleSaveEditSub(sub.id)
                                      }
                                      className="text-green-600 hover:text-green-800 text-sm font-medium mr-2"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingSubId(null)}
                                      className="text-gray-400 hover:text-gray-600 text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-3 text-sm text-gray-800">
                                    {sub.name}
                                  </td>
                                  <td className="px-4 py-3">
                                    <SlaBadge hours={sub.sla_hours} />
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => handleStartEditSub(sub)}
                                      className="text-gray-400 hover:text-blue-600 text-sm mr-3"
                                      title="Edit subcategory"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteSubcategory(sub.id)
                                      }
                                      className="text-gray-400 hover:text-red-600 text-sm"
                                      title="Delete subcategory"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="text-5xl mb-3">👈</div>
                  <h3 className="text-lg font-medium text-gray-500">
                    Select a category
                  </h3>
                  <p className="text-sm mt-1">
                    Choose a category from the left panel to manage its
                    subcategories.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
