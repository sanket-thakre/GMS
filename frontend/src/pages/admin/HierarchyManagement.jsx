import React, { useState, useEffect } from "react";
import { hierarchyService } from "../../services/hierarchyService";

const HierarchyNode = ({ node, onEdit, onDelete }) => {
  const getBadgeColor = (level) => {
    switch (level) {
      case "DoM": return "bg-purple-100 text-purple-700";
      case "DDR": return "bg-blue-100 text-blue-700";
      case "APMC": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="ml-6 pl-4 border-l border-gray-200 my-2">
      <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getBadgeColor(node.level)}`}>
            {node.level}
          </span>
          <span className="text-sm font-medium text-gray-700">{node.name}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(node)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
          <button onClick={() => onDelete(node.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Delete</button>
        </div>
      </div>
      {node.children && node.children.map(child => (
        <HierarchyNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default function HierarchyManagement() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState({ name: "", level: "APMC", parent_id: "" });
  const [editingNode, setEditingNode] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [treeRes, listRes] = await Promise.all([
        hierarchyService.getTree(),
        hierarchyService.listHierarchies()
      ]);
      setTree(treeRes.data);
      setOffices(listRes.data);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load hierarchy data" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (editingNode) {
        await hierarchyService.updateHierarchy(editingNode.id, form);
      } else {
        await hierarchyService.createHierarchy(form);
      }
      setForm({ name: "", level: "APMC", parent_id: "" });
      setEditingNode(null);
      await loadData();
      setMessage({ type: "success", text: "Office saved successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "An error occurred" });
    }
  };

  const handleEdit = (node) => {
    setEditingNode(node);
    setForm({ name: node.name, level: node.level, parent_id: node.parent_id || "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this office? This will fail if it has children or assigned users.")) return;
    try {
      await hierarchyService.deleteHierarchy(id);
      await loadData();
      setMessage({ type: "success", text: "Office deleted" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Deletion failed" });
    }
  };

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Hierarchy Management</h1>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">{editingNode ? "Edit Office" : "Create New Office"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Office Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Level</label>
              <select 
                value={form.level} 
                onChange={e => setForm({...form, level: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="DoM">DoM</option>
                <option value="DDR">DDR</option>
                <option value="APMC">APMC</option>
                <option value="DML">DML</option>
                <option value="PML">PML</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Parent Office</label>
              <select 
                value={form.parent_id} 
                onChange={e => setForm({...form, parent_id: e.target.value})}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">None (Root)</option>
                {offices.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.level})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
                {editingNode ? "Update Office" : "Create Office"}
              </button>
              {editingNode && (
                <button type="button" onClick={() => {setEditingNode(null); setForm({name: "", level: "APMC", parent_id: ""})}} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Office Tree</h2>
          <div className="overflow-auto max-h-[70vh]">
            {tree.length === 0 ? (
              <div className="text-center p-10 text-gray-500">No offices created yet.</div>
            ) : (
              tree.map(root => <HierarchyNode key={root.id} node={root} onEdit={handleEdit} onDelete={handleDelete} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
