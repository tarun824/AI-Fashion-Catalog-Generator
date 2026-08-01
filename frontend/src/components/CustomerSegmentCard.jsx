export default function CustomerSegmentCard({
  title,
  count,
  icon,
  color,
  description,
}) {
  const colorClasses = {
    purple: "bg-purple-100 text-purple-800 border-purple-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    green: "bg-green-100 text-green-800 border-green-300",
    red: "bg-red-100 text-red-800 border-red-300",
    gray: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <div className={`border-2 rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-3xl">{icon}</div>
        <div className="text-4xl font-bold">{count}</div>
      </div>
      <div className="text-lg font-semibold mb-1">{title}</div>
      {description && <div className="text-sm opacity-80">{description}</div>}
    </div>
  );
}
