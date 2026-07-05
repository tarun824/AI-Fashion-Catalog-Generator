import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get("/admin/products/stats/summary");
      setStats(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        Error loading stats: {error}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Products",
      value: stats?.total || 0,
      icon: "📦",
      color: "bg-blue-500",
    },
    {
      label: "Published",
      value: stats?.byStatus?.published || 0,
      icon: "✅",
      color: "bg-green-500",
    },
    {
      label: "Drafts",
      value: stats?.byStatus?.draft || 0,
      icon: "📝",
      color: "bg-yellow-500",
    },
    {
      label: "Archived",
      value: stats?.byStatus?.archived || 0,
      icon: "📁",
      color: "bg-gray-500",
    },
  ];

  const quickActions = [
    {
      title: "Upload Batch",
      description: "Upload multiple images for AI processing",
      link: "/admin/batch-upload",
      icon: "📤",
      color: "bg-indigo-500",
    },
    {
      title: "View Products",
      description: "Browse and manage your product catalog",
      link: "/admin/products",
      icon: "👕",
      color: "bg-purple-500",
    },
    {
      title: "Search",
      description: "Search products by text and colors",
      link: "/admin/search",
      icon: "🔍",
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back! 👋
        </h2>
        <p className="text-gray-600">
          Here's an overview of your fashion catalog
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`${stat.color} text-white p-3 rounded-lg text-2xl`}
              >
                {stat.icon}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.link}
              to={action.link}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
            >
              <div
                className={`${action.color} text-white p-3 rounded-lg text-3xl inline-block mb-4`}
              >
                {action.icon}
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition">
                {action.title}
              </h4>
              <p className="text-gray-600 text-sm">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Getting Started
        </h3>
        <div className="space-y-4 text-gray-600">
          <p className="flex items-start space-x-2">
            <span className="text-green-500 mt-1">✓</span>
            <span>
              <strong>Upload images:</strong> Go to Batch Upload to process
              multiple garment images at once
            </span>
          </p>
          <p className="flex items-start space-x-2">
            <span className="text-green-500 mt-1">✓</span>
            <span>
              <strong>AI processing:</strong> Images are analyzed automatically
              to extract descriptions and colors
            </span>
          </p>
          <p className="flex items-start space-x-2">
            <span className="text-green-500 mt-1">✓</span>
            <span>
              <strong>Manage products:</strong> Edit, publish, or archive
              products from the Products page
            </span>
          </p>
          <p className="flex items-start space-x-2">
            <span className="text-green-500 mt-1">✓</span>
            <span>
              <strong>Search & filter:</strong> Find products by text, colors,
              tags, and more
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
