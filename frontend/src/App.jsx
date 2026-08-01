import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { VendorAuthProvider } from "./contexts/VendorAuthContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { DarkModeProvider } from "./contexts/DarkModeContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import VendorProtectedRoute from "./components/VendorProtectedRoute";

// Layouts
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Public Storefront Pages
import PublicHome from "./pages/PublicHome";
import CategoryBrowse from "./pages/CategoryBrowse";
import PublicProductDetail from "./pages/PublicProductDetail";
import PersonalStylist from "./pages/PersonalStylist";

// Admin Pages
import Login from "./pages/Login";
import DashboardOverview from "./pages/DashboardOverview";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProductEdit from "./pages/ProductEdit";
import BatchUploadPage from "./pages/BatchUploadPage";
import SmartStagingPage from "./pages/SmartStagingPage";
import SearchPage from "./pages/SearchPage";
import Integrations from "./pages/Integrations";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import CustomerNew from "./pages/CustomerNew";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import CreateOrder from "./pages/CreateOrder";
import Audits from "./pages/Audits";

// Vendor Pages
import VendorLogin from "./pages/VendorLogin";
import VendorDashboard from "./pages/VendorDashboard";

function App() {
  return (
    <DarkModeProvider>
      <ToastProvider>
        <AuthProvider>
          <VendorAuthProvider>
            <WishlistProvider>
              <BrowserRouter basename="/app/ai-fashion-generator">
                <Routes>
                  {/* PUBLIC STOREFRONT - Main Site with Layout */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<PublicHome />} />
                    <Route path="/browse" element={<CategoryBrowse />} />
                    <Route
                      path="/personal-stylist"
                      element={<PersonalStylist />}
                    />
                    <Route
                      path="/category/:slug"
                      element={<CategoryBrowse />}
                    />
                    <Route
                      path="/products/:slug"
                      element={<PublicProductDetail />}
                    />
                  </Route>

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
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="customers/new" element={<CustomerNew />} />
                    <Route path="customers/:id" element={<CustomerDetail />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/create" element={<CreateOrder />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="batch-upload" element={<BatchUploadPage />} />
                    <Route
                      path="smart-staging"
                      element={<SmartStagingPage />}
                    />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="audits" element={<Audits />} />
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
            </WishlistProvider>
          </VendorAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </DarkModeProvider>
  );
}

export default App;
