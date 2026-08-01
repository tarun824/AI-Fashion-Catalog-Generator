import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivityWidget({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Activity 📋
        </h3>
        <div className="text-center py-8">
          <span className="text-4xl mb-3 block">📭</span>
          <p className="text-gray-600">No recent activity to display</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type, action) => {
    if (type === "product") {
      if (action === "uploaded") return "📤";
      if (action === "edited") return "✏️";
      return "📦";
    }
    if (type === "job") {
      if (action === "completed") return "✅";
      if (action === "processing") return "⚙️";
      return "🔄";
    }
    return "📋";
  };

  const getActivityColor = (type, status) => {
    if (type === "product") {
      if (status === "published") return "bg-green-50 border-green-200";
      if (status === "draft") return "bg-yellow-50 border-yellow-200";
      return "bg-gray-50 border-gray-200";
    }
    if (type === "job") {
      if (status === "completed") return "bg-green-50 border-green-200";
      if (status === "processing") return "bg-blue-50 border-blue-200";
      if (status === "failed") return "bg-red-50 border-red-200";
      return "bg-gray-50 border-gray-200";
    }
    return "bg-gray-50 border-gray-200";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Recent Activity 📋
      </h3>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {data.map((activity, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg border ${getActivityColor(activity.type, activity.status)} transition hover:shadow-sm`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl flex-shrink-0">
                {getActivityIcon(activity.type, activity.action)}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    {activity.type === "product" && activity.slug ? (
                      <Link
                        to={`/admin/products/${activity.slug}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600 block"
                      >
                        {activity.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ml-2 flex-shrink-0 ${
                      activity.status === "published" ||
                      activity.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : activity.status === "draft" ||
                            activity.status === "processing"
                          ? "bg-blue-100 text-blue-700"
                          : activity.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                  {activity.metadata && (
                    <div className="flex items-center space-x-2">
                      {activity.metadata.vendor && (
                        <span className="text-gray-600">
                          by {activity.metadata.vendor}
                        </span>
                      )}
                      {activity.metadata.price && (
                        <span className="font-medium text-gray-700">
                          ₹
                          {new Intl.NumberFormat("en-IN").format(
                            activity.metadata.price,
                          )}
                        </span>
                      )}
                      {activity.metadata.progress !== undefined && (
                        <span className="font-medium text-blue-600">
                          {activity.metadata.progress}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all activity →
          </button>
        </div>
      )}
    </div>
  );
}
