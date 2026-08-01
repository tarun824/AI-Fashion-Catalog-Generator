import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SizeGuideModal Component
 * Shows size and measurement guide for sarees
 */
export default function SizeGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("measurements");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#8B2635] to-[#a12e40] px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Size & Fit Guide</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
            <button
              onClick={() => setActiveTab("measurements")}
              className={`px-6 py-3 font-semibold border-b-2 transition ${
                activeTab === "measurements"
                  ? "border-[#8B2635] text-[#8B2635] dark:text-red-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Measurements
            </button>
            <button
              onClick={() => setActiveTab("care")}
              className={`px-6 py-3 font-semibold border-b-2 transition ${
                activeTab === "care"
                  ? "border-[#8B2635] text-[#8B2635] dark:text-red-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              How to Drape
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {activeTab === "measurements" && (
              <div className="space-y-6">
                {/* Standard Measurements */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    Standard Saree Measurements
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Saree Length
                      </span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        5.5 meters (550 cm)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Saree Width
                      </span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        1.15 meters (115 cm)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        Blouse Piece
                      </span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        0.8 meters (80 cm)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Size Chart */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    Blouse Size Chart
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-bold text-gray-900 dark:text-white">
                            Size
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-bold text-gray-900 dark:text-white">
                            Bust (inches)
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-bold text-gray-900 dark:text-white">
                            Waist (inches)
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-bold text-gray-900 dark:text-white">
                            Hip (inches)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            S
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            32-34
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            26-28
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            34-36
                          </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            M
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            36-38
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            30-32
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            38-40
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            L
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            40-42
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            34-36
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            42-44
                          </td>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            XL
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            44-46
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            38-40
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            46-48
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                    💡 Measurement Tips
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• Measure over your undergarments</li>
                    <li>• Keep the tape measure snug but not tight</li>
                    <li>• For best fit, get professionally tailored blouse</li>
                    <li>• Saree length works for height 5'2" to 5'8"</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "care" && (
              <div className="space-y-6">
                {/* Draping Steps */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Classic Nivi Drape (5 Simple Steps)
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        step: 1,
                        title: "Tuck the Saree",
                        desc: "Start from your right hip, tuck the plain end into your petticoat and wrap around once, tucking all along.",
                      },
                      {
                        step: 2,
                        title: "Make the Pleats",
                        desc: "From the tucked end, make 5-7 pleats (width: 5-6 inches each). Hold them together at waist level.",
                      },
                      {
                        step: 3,
                        title: "Tuck the Pleats",
                        desc: "Tuck the pleats into the petticoat slightly to the left of your navel. Ensure they face left and fall evenly.",
                      },
                      {
                        step: 4,
                        title: "Drape Around",
                        desc: "Take the remaining fabric, wrap it around your waist from right to left, and bring it over your left shoulder.",
                      },
                      {
                        step: 5,
                        title: "Final Pallu Pleats",
                        desc: "Make neat pleats with the pallu (decorative end) and pin it on your left shoulder.",
                      },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className="flex gap-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#8B2635] text-white font-bold flex items-center justify-center">
                          {item.step}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video Link */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700 p-4 rounded-xl text-center">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    🎥 Watch video tutorial for visual guide
                  </p>
                  <button className="text-[#8B2635] dark:text-red-400 font-bold text-sm hover:underline">
                    View Step-by-Step Video →
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
