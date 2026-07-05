import { Navigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";

export default function VendorProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useVendorAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/vendor/login" replace />;
  }

  return children;
}
