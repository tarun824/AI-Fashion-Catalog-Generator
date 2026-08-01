import { FiStar, FiTrendingUp, FiPackage, FiZap, FiAward } from "react-icons/fi";

/**
 * ProductBadge Component
 * Displays product status badges (New Arrival, Bestseller, Limited Stock, etc.)
 */
export default function ProductBadge({ type, text, className = "" }) {
  const badges = {
    new: {
      icon: FiZap,
      bgColor: "bg-gradient-to-r from-blue-500 to-blue-600",
      text: text || "New Arrival",
      animation: "animate-pulse",
    },
    bestseller: {
      icon: FiStar,
      bgColor: "bg-gradient-to-r from-amber-500 to-orange-500",
      text: text || "Bestseller",
      animation: "",
    },
    trending: {
      icon: FiTrendingUp,
      bgColor: "bg-gradient-to-r from-pink-500 to-rose-500",
      text: text || "Trending",
      animation: "",
    },
    limited: {
      icon: FiPackage,
      bgColor: "bg-gradient-to-r from-red-500 to-red-600",
      text: text || "Limited Stock",
      animation: "animate-pulse",
    },
    verified: {
      icon: FiAward,
      bgColor: "bg-gradient-to-r from-green-500 to-emerald-600",
      text: text || "Verified",
      animation: "",
    },
  };

  const badge = badges[type] || badges.new;
  const Icon = badge.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-lg ${badge.bgColor} ${badge.animation} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{badge.text}</span>
    </div>
  );
}
