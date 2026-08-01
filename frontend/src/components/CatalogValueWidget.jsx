import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function CatalogValueWidget({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
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

  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-IN").format(value);
  };

  const statCards = [
    {
      label: "Total Catalog Value",
      value: formatCurrency(data.totalValue),
      change: `${data.growthPercent > 0 ? "+" : ""}${data.growthPercent}%`,
      changeType: data.growthPercent >= 0 ? "positive" : "negative",
      icon: "💰",
      subtext: `${formatNumber(data.productCount)} products`,
    },
    {
      label: "Added This Month",
      value: data.addedThisMonth,
      change: `${data.addedThisWeek} this week`,
      changeType: "neutral",
      icon: "📈",
      subtext: `${data.addedToday} today`,
    },
    {
      label: "Average Product Value",
      value: formatCurrency(data.avgValue),
      icon: "📊",
      subtext: "Across all products",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Catalog Analytics
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              {stat.change && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    stat.changeType === "positive"
                      ? "bg-green-100 text-green-700"
                      : stat.changeType === "negative"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </p>
            {stat.subtext && (
              <p className="text-xs text-gray-500">{stat.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Product Value Trend (Last 30 Days)
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(value), "Value"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
