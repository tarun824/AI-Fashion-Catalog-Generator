export default function VendorInsightsWidget({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded"></div>
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

  const insightCards = [
    {
      icon: "👥",
      label: "Total Vendors",
      value: data.totalVendors || 0,
      color: "from-blue-50 to-indigo-50",
      borderColor: "border-blue-100",
    },
    {
      icon: "🆕",
      label: "New This Month",
      value: data.newVendorsThisMonth || 0,
      color: "from-green-50 to-emerald-50",
      borderColor: "border-green-100",
      badge: "Growth",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      icon: "📦",
      label: "Avg Products/Vendor",
      value: data.avgProductsPerVendor || 0,
      color: "from-purple-50 to-pink-50",
      borderColor: "border-purple-100",
    },
    {
      icon: "💼",
      label: "Vendor Catalog Value",
      value: formatCurrency(data.totalVendorValue || 0),
      color: "from-amber-50 to-orange-50",
      borderColor: "border-amber-100",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Vendor Insights 🤝
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {insightCards.map((card, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${card.color} rounded-lg p-4 border ${card.borderColor}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              {card.badge && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Tip: Vendor Growth
            </p>
            <p className="text-xs text-gray-600">
              {data.newVendorsThisMonth > 0
                ? `Great! ${data.newVendorsThisMonth} new vendors joined this month. Keep engaging!`
                : "Consider reaching out to potential vendors to grow your catalog."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
