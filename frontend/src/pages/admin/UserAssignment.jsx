import React, { useState, useEffect } from "react";
import { userService } from "../../services/userService";

export default function UserAssignment() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: "", hierarchy_id: "", unassigned: false });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.listUsers(filters);
      setUsers(res.data);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (userId, payload) => {
    setMessage(null);
    try {
      await userService.assignUser(userId, payload);
      await loadUsers();
      setMessage({ type: "success", text: "User updated successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Assignment failed" });
    }
  };

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">User Office Assignment</h1>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Role</label>
          <input 
            type="text" 
            value={filters.role} 
            onChange={e => setFilters({...filters, role: e.target.value})}
            className="p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. APMC_Officer"
          />
        </div>
        <div className="flex items-center gap-2 h-10">
          <input 
            type="checkbox" 
            id="unassigned" 
            checked={filters.unassigned} 
            onChange={e => setFilters({...filters, unassigned: e.target.checked})}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="unassigned" className="text-sm text-gray-600 cursor-pointer">Show unassigned only</label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-10 text-center text-gray-500">No users found.</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{user.role_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.hierarchy_name || <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => {
                        const officeId = prompt("Enter Hierarchy ID to assign (leave empty for None):");
                        if (officeId !== null) handleAssign(user.id, { hierarchy_id: officeId || null });
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Assign Office
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
