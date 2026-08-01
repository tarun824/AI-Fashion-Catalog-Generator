import { FiDroplet, FiSun, FiPackage, FiShield } from "react-icons/fi";

/**
 * CareInstructions Component
 * Shows washing, storage, and maintenance instructions with icons
 */
export default function CareInstructions({ fabric = "silk" }) {
  // Care instructions based on fabric type
  const careGuides = {
    silk: {
      wash: ["Dry clean recommended", "Hand wash in cold water if needed", "Use mild detergent"],
      dry: ["Dry in shade", "Avoid direct sunlight", "Do not wring"],
      iron: ["Iron on low heat", "Iron on reverse side", "Use cloth between iron and fabric"],
      store: ["Store in cotton bag", "Avoid plastic bags", "Keep in cool, dry place"],
    },
    cotton: {
      wash: ["Machine wash cold", "Mild detergent", "Separate colors"],
      dry: ["Can tumble dry low", "Air dry preferred", "Avoid over-drying"],
      iron: ["Iron on medium-high heat", "Can iron while damp", "Steam iron works best"],
      store: ["Fold neatly", "Store in breathable bag", "Keep away from moisture"],
    },
    default: {
      wash: ["Follow care label", "Cold water wash", "Gentle detergent"],
      dry: ["Dry flat in shade", "Avoid direct heat", "Do not wring"],
      iron: ["Iron on low-medium heat", "Check fabric first", "Iron on reverse"],
      store: ["Store in breathable bag", "Cool, dry place", "Avoid tight folding"],
    },
  };

  const instructions = careGuides[fabric.toLowerCase()] || careGuides.default;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Care Instructions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Washing */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FiDroplet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">
              Washing
            </h3>
            <ul className="space-y-1">
              {instructions.wash.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Drying */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <FiSun className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">
              Drying
            </h3>
            <ul className="space-y-1">
              {instructions.dry.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ironing */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <FiShield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">
              Ironing
            </h3>
            <ul className="space-y-1">
              {instructions.iron.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Storage */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FiPackage className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">
              Storage
            </h3>
            <ul className="space-y-1">
              {instructions.store.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Additional Tip */}
      <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          <strong>💡 Pro Tip:</strong> For best results and longevity, professional dry cleaning
          is recommended for {fabric} sarees. Always test any cleaning method on a small,
          hidden area first.
        </p>
      </div>
    </div>
  );
}
