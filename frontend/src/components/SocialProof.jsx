import { FiEye, FiTrendingUp, FiClock } from "react-icons/fi";
import { motion } from "framer-motion";

/**
 * SocialProof Component
 * Shows live indicators like views, recent sales, stock alerts
 */
export default function SocialProof({ viewCount, recentSales, lowStock }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* View Count */}
      {viewCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
        >
          <FiEye className="w-4 h-4" />
          <span>{viewCount} viewing now</span>
        </motion.div>
      )}

      {/* Recent Sales */}
      {recentSales > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium"
        >
          <FiTrendingUp className="w-4 h-4" />
          <span>{recentSales} sold in last 24h</span>
        </motion.div>
      )}

      {/* Low Stock Alert */}
      {lowStock && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-sm font-medium animate-pulse"
        >
          <FiClock className="w-4 h-4" />
          <span>Only few left!</span>
        </motion.div>
      )}
    </div>
  );
}
