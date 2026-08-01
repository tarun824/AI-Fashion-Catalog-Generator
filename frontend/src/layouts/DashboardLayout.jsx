import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import { api } from "../utils/api";

export default function DashboardLayout() {
  const { admin, logout } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Setup progress state
  const [setupProgress, setSetupProgress] = useState(null);
  const [showSetupProgress, setShowSetupProgress] = useState(true);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
    loadSetupProgress();
  }, [location.pathname]); // Reload when navigating

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileSidebarOpen && !e.target.closest('aside') && !e.target.closest('[data-mobile-menu-button]')) {
        setIsMobileSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileSidebarOpen]);

  const loadSetupProgress = async () => {
    try {
      const response = await api.get("/admin/setup/status");
      const data = response.data;
      setSetupProgress(data);

      if (data?.allComplete) {
        const dismissed = localStorage.getItem("sidebarSetupDismissed");
        setShowSetupProgress(dismissed !== "true");
      }
    } catch (error) {
      console.error("Failed to load setup progress:", error);
    }
  };

  const dismissSetupProgress = () => {
    localStorage.setItem("sidebarSetupDismissed", "true");
    setShowSetupProgress(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const navItems = [
    { path: "/admin/dashboard", label: "Overview", icon: "📊" },
    { path: "/admin/products", label: "Products", icon: "👕" },
    { path: "/admin/inventory", label: "Inventory AI", icon: "🤖" },
    { path: "/admin/orders", label: "Orders", icon: "📦" },
    { path: "/admin/customers", label: "Customers", icon: "👥" },
    { path: "/admin/batch-upload", label: "Batch Upload", icon: "📤" },
    { path: "/admin/search", label: "Search", icon: "🔍" },
    { path: "/admin/integrations", label: "Integrations", icon: "🔌" },
  ];

  const isActive = (path) => {
    if (path === "/admin/dashboard") {
      return (
        location.pathname === "/admin/dashboard" ||
        location.pathname === "/admin"
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              data-mobile-menu-button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {isMobileSidebarOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              AI Fashion Catalog
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">
              Admin Dashboard
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {admin?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {admin?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)] relative">
        {/* Mobile Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation - Fixed */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white dark:bg-gray-800 
          border-r border-gray-200 dark:border-gray-700 
          transition-all duration-300 ease-in-out
          flex flex-col h-full overflow-hidden
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links - Scrollable */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Setup Progress Indicator - Fixed at Bottom */}
          {setupProgress && showSetupProgress && !setupProgress.allComplete && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  🎯 Setup Progress
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {setupProgress.progress.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${setupProgress.progress.percentage}%` }}
                />
              </div>

              {/* Quick Stats */}
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {setupProgress.progress.completed} of{" "}
                {setupProgress.progress.total} complete
              </div>

              {/* View Details Button */}
              <Link
                to="/admin/dashboard"
                className="block w-full text-center px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                View Details →
              </Link>
            </div>
          )}

          {/* Completion Badge - Fixed at Bottom */}
          {setupProgress && showSetupProgress && setupProgress.allComplete && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl">🎉</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    All Set!
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Setup complete
                  </p>
                </div>
                <button
                  onClick={dismissSetupProgress}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  title="Dismiss"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area - Scrollable */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
