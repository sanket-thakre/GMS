import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const isAdmin = user?.role_name === "Admin" || user?.role_name === "DoM_Admin";
  const isOfficer =
    user?.role_name === "APMC_Officer" ||
    user?.role_name === "DDR_Officer" ||
    user?.role_name === "DoM_Admin" ||
    user?.role_name === "Admin";

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link to="/" className="text-lg font-bold text-blue-600">
            GMS
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
              Port 4000
            </span>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                {/* ── Complainant links (visible to all authenticated users) ── */}
                <Link
                  to="/grievances/new"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  File Grievance
                </Link>
                <Link
                  to="/grievances"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  My Grievances
                </Link>
                {isOfficer && (
                  <Link
                    to="/officer"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    My Tickets
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <Link
                      to="/admin/hierarchy"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Hierarchy
                    </Link>
                    <Link
                      to="/admin/users"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Users
                    </Link>
                    <Link
                      to="/admin/categories"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Categories
                    </Link>
                  </>
                )}
                <span className="text-sm text-gray-500">{user?.full_name}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
