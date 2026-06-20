import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Dashboard — role-aware landing page with quick-link cards.
 */

const QUICK_LINKS = [
  {
    to: "/grievances/new",
    label: "File a Grievance",
    description: "Submit a new complaint to the appropriate office.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "bg-blue-50 text-blue-600",
    roles: null, // visible to everyone
  },
  {
    to: "/grievances",
    label: "My Grievances",
    description: "Track and manage your filed grievances.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    color: "bg-green-50 text-green-600",
    roles: null,
  },
  {
    to: "/officer",
    label: "Officer Dashboard",
    description: "View and manage tickets assigned to your office.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    color: "bg-purple-50 text-purple-600",
    roles: ["APMC_Officer", "DDR_Officer", "DoM_Admin", "Admin"],
  },
  {
    to: "/admin/hierarchy",
    label: "Manage Hierarchy",
    description: "Configure the office hierarchy tree.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    color: "bg-amber-50 text-amber-600",
    roles: ["Admin", "DoM_Admin"],
  },
  {
    to: "/admin/categories",
    label: "Manage Categories",
    description: "Configure grievance categories and subcategories.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    color: "bg-teal-50 text-teal-600",
    roles: ["Admin", "DoM_Admin"],
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const roleName = user?.role_name;

  const visibleLinks = QUICK_LINKS.filter(
    (link) => link.roles === null || link.roles.includes(roleName)
  );

  return (
    <div className="py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Welcome{user ? `, ${user.full_name}` : ""}. Your workspace is ready.
        </p>
      </div>

      {/* ── Quick-link cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex items-start gap-4 rounded-xl bg-white p-5 shadow hover:shadow-md transition-shadow"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${link.color}`}
            >
              {link.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {link.label}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">
                {link.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
