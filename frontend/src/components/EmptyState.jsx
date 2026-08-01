import { Link } from "react-router-dom";

/**
 * EmptyState Component
 * Reusable component for showing empty states with actionable CTAs
 */
export default function EmptyState({
  icon = "📦",
  title,
  description,
  actions = [],
  children,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className="text-6xl mb-4">{icon}</div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          {description}
        </p>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="space-y-3 w-full max-w-md">
          {actions.map((action, index) => (
            <ActionButton key={index} {...action} />
          ))}
        </div>
      )}

      {/* Custom children */}
      {children}
    </div>
  );
}

/**
 * ActionButton Component
 * Renders different action button styles based on type
 */
function ActionButton({
  type = "primary",
  icon,
  label,
  subtitle,
  onClick,
  link,
  external = false,
}) {
  const baseClasses =
    "flex items-center gap-3 w-full p-4 rounded-xl transition-all duration-200 text-left";

  const typeClasses = {
    primary:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
    secondary:
      "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md",
    tertiary:
      "bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
  };

  const content = (
    <>
      {/* Icon */}
      {icon && (
        <div
          className={`text-3xl flex-shrink-0 ${
            type === "primary" ? "" : "opacity-80"
          }`}
        >
          {icon}
        </div>
      )}

      {/* Text */}
      <div className="flex-1">
        <div
          className={`font-semibold ${type === "primary" ? "text-white" : ""}`}
        >
          {label}
        </div>
        {subtitle && (
          <div
            className={`text-sm mt-0.5 ${
              type === "primary"
                ? "text-indigo-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Arrow */}
      <svg
        className={`w-5 h-5 flex-shrink-0 ${
          type === "primary" ? "text-white" : "text-gray-400 dark:text-gray-500"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </>
  );

  const className = `${baseClasses} ${typeClasses[type]}`;

  // External link
  if (external && link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  // Internal link
  if (link) {
    return (
      <Link to={link} className={className}>
        {content}
      </Link>
    );
  }

  // Button with onClick
  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}
