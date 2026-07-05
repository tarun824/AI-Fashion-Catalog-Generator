/**
 * Color family mappings for fuzzy color search.
 * Maps base color names to their variants and related shades.
 */
const COLOR_FAMILIES = {
  red: ["red", "maroon", "crimson", "ruby", "scarlet", "burgundy", "wine"],
  blue: [
    "blue",
    "navy",
    "sky blue",
    "royal blue",
    "teal",
    "turquoise",
    "azure",
    "indigo",
    "cobalt",
  ],
  green: ["green", "emerald", "olive", "mint", "sage", "forest", "lime"],
  yellow: ["yellow", "gold", "golden", "mustard", "saffron", "amber", "lemon"],
  pink: ["pink", "rose", "magenta", "fuchsia", "coral", "salmon", "blush"],
  purple: ["purple", "violet", "lavender", "plum", "mauve", "lilac", "orchid"],
  orange: ["orange", "peach", "rust", "tangerine", "apricot"],
  brown: ["brown", "tan", "bronze", "copper", "mocha", "chocolate", "chestnut"],
  white: ["white", "cream", "ivory", "pearl", "off-white", "eggshell"],
  black: ["black", "charcoal", "ebony", "jet"],
  grey: ["grey", "gray", "silver", "slate", "ash"],
  beige: ["beige", "taupe", "sand", "khaki", "fawn"],
};

/**
 * Build reverse lookup map: color variant -> base color families
 */
const buildColorMap = () => {
  const map = {};
  Object.entries(COLOR_FAMILIES).forEach(([baseColor, variants]) => {
    variants.forEach((variant) => {
      if (!map[variant]) {
        map[variant] = [];
      }
      map[variant].push(baseColor);
    });
  });
  return map;
};

const VARIANT_TO_FAMILY = buildColorMap();

/**
 * Checks if a detected color matches a search term using fuzzy color family matching.
 * @param {string} searchTerm - The search term (e.g., "blue")
 * @param {string} detectedColor - The color from AI (e.g., "navy")
 * @returns {boolean} True if they match
 */
export const colorsMatch = (searchTerm, detectedColor) => {
  const term = searchTerm.toLowerCase().trim();
  const detected = detectedColor.toLowerCase().trim();

  // Exact match
  if (detected === term || detected.includes(term) || term.includes(detected)) {
    return true;
  }

  // Check if they belong to the same color family
  const termFamilies = VARIANT_TO_FAMILY[term] || [];
  const detectedFamilies = VARIANT_TO_FAMILY[detected] || [];

  // If any family overlaps, they match
  return termFamilies.some((family) => detectedFamilies.includes(family));
};

/**
 * Checks if any of the detected colors match the search query.
 * @param {string} searchQuery - The search query
 * @param {string[]} detectedColors - Array of colors from AI
 * @returns {boolean} True if any color matches
 */
export const matchesColorFamily = (searchQuery, detectedColors) => {
  if (!searchQuery || !detectedColors || detectedColors.length === 0) {
    return false;
  }

  const query = searchQuery.toLowerCase().trim();

  return detectedColors.some((detectedColor) =>
    colorsMatch(query, detectedColor),
  );
};

/**
 * Gets all unique colors from an array of results.
 * @param {Array} results - Array of result objects with colors field
 * @returns {string[]} Sorted unique color names
 */
export const getAllUniqueColors = (results) => {
  const colorSet = new Set();

  results.forEach((result) => {
    if (result.colors && Array.isArray(result.colors)) {
      result.colors.forEach((color) => {
        if (color && color.trim()) {
          colorSet.add(color.toLowerCase().trim());
        }
      });
    }
  });

  return Array.from(colorSet).sort();
};
