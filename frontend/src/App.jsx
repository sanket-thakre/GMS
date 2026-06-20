import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HierarchyManagement from "./pages/admin/HierarchyManagement";
import UserAssignment from "./pages/admin/UserAssignment";
import CategoryManagement from "./pages/admin/CategoryManagement";
import OfficerDashboard from "./pages/officer/OfficerDashboard";
import TicketDetail from "./pages/officer/TicketDetail";

const OFFICER_ROLES = ["APMC_Officer", "DDR_Officer", "DoM_Admin", "Admin"];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hierarchy"
            element={
              <ProtectedRoute allowedRoles={["Admin", "DoM_Admin"]}>
                <HierarchyManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["Admin", "DoM_Admin"]}>
                <UserAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={["Admin", "DoM_Admin"]}>
                <CategoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer"
            element={
              <ProtectedRoute allowedRoles={OFFICER_ROLES}>
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/tickets/:id"
            element={
              <ProtectedRoute allowedRoles={OFFICER_ROLES}>
                <TicketDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
