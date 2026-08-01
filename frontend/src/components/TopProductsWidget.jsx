import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];

export default function TopProductsWidget({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Top Products by Value */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Top Products by Value 💎
        </h3>
        <div className="space-y-3">
          {data.topProducts?.map((product, idx) => (
            <Link
              key={product._id}
              to={`/admin/products/${product.slug || product._id}`}
              className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition group"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-lg font-bold text-indigo-600">
                #{idx + 1}
              </div>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No img</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
                  {product.name}
                </p>
                <p className="text-xs text-gray-500">
                  {product.fabric || "No fabric"} •{" "}
                  {product.occasion || "No occasion"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(product.price?.amount || 0)}
                </p>
                {product.colors?.names && (
                  <p className="text-xs text-gray-500">
                    {product.colors.names.slice(0, 2).join(", ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Sales by Fabric */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Distribution by Fabric 🧵
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.fabricStats?.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => [
                value,
                name === "count" ? "Products" : "Value",
              ]}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sales by Occasion */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Distribution by Occasion 🎉
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.occasionStats?.slice(0, 6)}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => entry.name}
                  labelLine={false}
                >
                  {data.occasionStats?.slice(0, 6).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="ml-4 space-y-2">
            {data.occasionStats?.slice(0, 6).map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center space-x-2 text-sm"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                ></div>
                <span className="text-gray-700">
                  {item.name} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Top Categories 📂
        </h3>
        <div className="space-y-3">
          {data.categoryStats?.map((category) => (
            <div
              key={category.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {category.name}
                </p>
                <p className="text-xs text-gray-500">
                  {category.count} products
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(category.value)}
                </p>
                <p className="text-xs text-gray-500">
                  Avg: {formatCurrency(category.avgValue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
