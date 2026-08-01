import { Link } from "react-router-dom";

export default function InventoryAlertsWidget({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
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
      {/* Stock Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⚠️</span>
            <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
              Urgent
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Out of Stock</p>
          <p className="text-3xl font-bold text-red-600">
            {data.outOfStockCount || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📦</span>
            <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-700">
              Warning
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Low Stock</p>
          <p className="text-3xl font-bold text-yellow-600">
            {data.lowStockCount || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <span className="text-2xl mb-2 block">💰</span>
          <p className="text-sm text-gray-600 mb-1">Stock Value</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(data.totalStockValue || 0)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <span className="text-2xl mb-2 block">📊</span>
          <p className="text-sm text-gray-600 mb-1">Total Units</p>
          <p className="text-xl font-bold text-blue-600">
            {new Intl.NumberFormat("en-IN").format(data.totalStockUnits || 0)}
          </p>
        </div>
      </div>

      {/* Out of Stock Products */}
      {data.outOfStock && data.outOfStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🚨 Out of Stock
            </h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
              {data.outOfStock.length} items
            </span>
          </div>
          <div className="space-y-2">
            {data.outOfStock.slice(0, 5).map((product) => (
              <Link
                key={product.slug}
                to={`/admin/products/${product.slug}`}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition group"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-red-600">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {product.status}
                  </p>
                </div>
                <span className="text-xs font-bold text-red-600">0 units</span>
              </Link>
            ))}
            {data.outOfStock.length > 5 && (
              <p className="text-xs text-center text-gray-500 pt-2">
                +{data.outOfStock.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Low Stock Products */}
      {data.lowStock && data.lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              ⚠️ Low Stock
            </h3>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium">
              {data.lowStock.length} items
            </span>
          </div>
          <div className="space-y-2">
            {data.lowStock.slice(0, 5).map((product) => (
              <Link
                key={product.slug}
                to={`/admin/products/${product.slug}`}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition group"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-yellow-600">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Threshold: {product.threshold} units
                  </p>
                </div>
                <span className="text-xs font-bold text-yellow-600">
                  {product.stock} units
                </span>
              </Link>
            ))}
            {data.lowStock.length > 5 && (
              <p className="text-xs text-center text-gray-500 pt-2">
                +{data.lowStock.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Overstocked Products */}
      {data.overStocked && data.overStocked.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📦 Overstocked Items
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
              AI Suggestion
            </span>
          </div>
          <div className="space-y-2">
            {data.overStocked.slice(0, 3).map((product) => (
              <Link
                key={product.slug}
                to={`/admin/products/${product.slug}`}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition group"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Value: {formatCurrency(product.value)}
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {product.stock} units
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts */}
      {(!data.lowStock || data.lowStock.length === 0) &&
        (!data.outOfStock || data.outOfStock.length === 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <span className="text-4xl mb-3 block">✅</span>
            <p className="text-lg font-medium text-gray-900 mb-2">All Clear!</p>
            <p className="text-sm text-gray-600">
              No inventory alerts at this time.
            </p>
          </div>
        )}
    </div>
  );
}
