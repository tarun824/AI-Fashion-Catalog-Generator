import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { VendorAuthProvider } from "./contexts/VendorAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import VendorProtectedRoute from "./components/VendorProtectedRoute";

// Public Storefront Pages
import PublicHome from "./pages/PublicHome";
import CategoryBrowse from "./pages/CategoryBrowse";
import PublicProductDetail from "./pages/PublicProductDetail";

// Admin Pages
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProductEdit from "./pages/ProductEdit";
import BatchUploadPage from "./pages/BatchUploadPage";
import SearchPage from "./pages/SearchPage";

// Vendor Pages
import VendorLogin from "./pages/VendorLogin";
import VendorDashboard from "./pages/VendorDashboard";

function App() {
  return (
    <AuthProvider>
      <VendorAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC STOREFRONT - Main Site */}
            <Route path="/" element={<PublicHome />} />
            <Route path="/browse" element={<CategoryBrowse />} />
            <Route path="/category/:slug" element={<CategoryBrowse />} />
            <Route path="/product/:slug" element={<PublicProductDetail />} />

            {/* ADMIN PORTAL - Authentication */}
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/login"
              element={<Navigate to="/admin/login" replace />}
            />

            {/* ADMIN PORTAL - Dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="products/:id/edit" element={<ProductEdit />} />
              <Route path="batch-upload" element={<BatchUploadPage />} />
              <Route path="search" element={<SearchPage />} />
            </Route>

            {/* Legacy admin routes redirect */}
            <Route
              path="/dashboard"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
              path="/dashboard/*"
              element={<Navigate to="/admin/dashboard" replace />}
            />

            {/* VENDOR PORTAL */}
            <Route path="/vendor/login" element={<VendorLogin />} />
            <Route
              path="/vendor"
              element={
                <VendorProtectedRoute>
                  <VendorDashboard />
                </VendorProtectedRoute>
              }
            />

            {/* 404 - Redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </VendorAuthProvider>
    </AuthProvider>
  );
}

export default App;
