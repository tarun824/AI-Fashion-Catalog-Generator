import { Link } from "react-router-dom";
import { useState } from "react";

export default function QuickActionsPanel() {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const actions = [
    {
      title: "Smart Staging",
      description: "Auto-group & process multiple images",
      icon: "🎯",
      link: "/admin/smart-staging",
      color: "from-purple-500 to-pink-600",
      hoverColor: "hover:from-purple-600 hover:to-pink-700",
      badge: "NEW",
    },
    {
      title: "Upload Batch",
      description: "Process multiple images with AI",
      icon: "📤",
      link: "/admin/batch-upload",
      color: "from-indigo-500 to-purple-600",
      hoverColor: "hover:from-indigo-600 hover:to-purple-700",
    },
    {
      title: "Add Product",
      description: "Create a new product manually",
      icon: "➕",
      link: "/admin/products/new",
      color: "from-green-500 to-emerald-600",
      hoverColor: "hover:from-green-600 hover:to-emerald-700",
    },
    {
      title: "Search Products",
      description: "Find products by text & colors",
      icon: "🔍",
      link: "/admin/search",
      color: "from-pink-500 to-rose-600",
      hoverColor: "hover:from-pink-600 hover:to-rose-700",
    },
  ];

  const exportOptions = [
    {
      title: "Export All Products",
      description: "Download complete catalog as Excel",
      icon: "📊",
      action: "export-all",
    },
    {
      title: "Export Published Only",
      description: "Download published products",
      icon: "✅",
      action: "export-published",
    },
    {
      title: "Export Low Stock",
      description: "Download inventory alerts",
      icon: "⚠️",
      action: "export-low-stock",
    },
  ];

  const handleExport = (action) => {
    console.log("Export action:", action);
    setShowExportMenu(false);
    // TODO: Implement export functionality
    alert(`Export feature (${action}) coming soon!`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Quick Actions ⚡
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {actions.map((action) => (
          <Link
            key={action.link}
            to={action.link}
            className={`relative group overflow-hidden rounded-xl p-6 bg-gradient-to-br ${action.color} ${action.hoverColor} transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}
          >
            {action.badge && (
              <div className="absolute top-3 right-3 z-20">
                <span className="px-2.5 py-1 text-xs font-bold bg-white text-purple-600 rounded-full shadow-lg animate-pulse">
                  {action.badge}
                </span>
              </div>
            )}
            <div className="relative z-10">
              <div className="text-4xl mb-3">{action.icon}</div>
              <h4 className="text-lg font-bold text-white mb-1">
                {action.title}
              </h4>
              <p className="text-sm text-white/90">{action.description}</p>
            </div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>
        ))}
      </div>

      {/* Export Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Export Data 📥
          </h4>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg hover:from-gray-100 hover:to-gray-200 transition group"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">
                  Export Reports
                </p>
                <p className="text-xs text-gray-500">Download catalog data</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showExportMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
              {exportOptions.map((option) => (
                <button
                  key={option.action}
                  onClick={() => handleExport(option.action)}
                  className="w-full flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b last:border-b-0"
                >
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {option.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="border-t mt-6 pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Bulk Operations 🔧
        </h4>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition group">
            <div className="flex items-center space-x-3">
              <span className="text-xl">🔄</span>
              <span className="text-sm font-medium text-blue-900">
                Bulk Stock Update
              </span>
            </div>
            <span className="text-xs text-blue-600 group-hover:text-blue-700">
              Coming soon
            </span>
          </button>
          <button className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition group">
            <div className="flex items-center space-x-3">
              <span className="text-xl">💰</span>
              <span className="text-sm font-medium text-purple-900">
                Bulk Price Update
              </span>
            </div>
            <span className="text-xs text-purple-600 group-hover:text-purple-700">
              Coming soon
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
