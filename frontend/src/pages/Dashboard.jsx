import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-gray-500 mt-2">
        Welcome{user ? `, ${user.full_name}` : ""}. Your workspace is ready.
      </p>
    </div>
  );
}
