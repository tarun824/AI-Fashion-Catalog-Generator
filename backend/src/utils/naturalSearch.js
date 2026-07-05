const COLORS = [
  "red", "blue", "navy", "maroon", "gold", "golden", "green", "pink",
  "purple", "orange", "yellow", "cream", "white", "black", "grey", "gray",
  "beige", "teal", "turquoise", "lavender", "magenta", "coral", "peach",
  "mint", "olive", "burgundy", "crimson", "scarlet", "indigo", "violet",
  "royal blue", "silver", "ivory", "brown",
];

const FABRICS = [
  "silk", "kanjivaram", "banarasi", "organza", "cotton", "linen",
  "georgette", "chiffon", "tissue", "handloom", "soft silk", "cotton silk",
];

const OCCASIONS = [
  "bridal", "wedding", "festive", "party", "office", "daily", "casual",
];

const CATEGORIES = [
  "saree", "sari", "kurta", "shirt", "t-shirt", "dress", "jacket", "jeans",
  "skirt", "lehenga", "suit",
];

/**
 * Parses a free-text query like "blue organza under 4000 for bridal" into
 * structured filters compatible with Product.searchProducts().
 */
export function parseNaturalQuery(query) {
  if (!query || typeof query !== "string") {
    return {};
  }

  const lower = query.toLowerCase();
  const filters = {};
  let remaining = lower;

  // Price constraints: "under 4000", "below ₹4000", "less than 4,000"
  const maxPriceMatch = lower.match(
    /(?:under|below|less than|upto|up to)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)/,
  );
  if (maxPriceMatch) {
    filters.maxPrice = Number(maxPriceMatch[1].replace(/,/g, ""));
    remaining = remaining.replace(maxPriceMatch[0], " ");
  }

  const minPriceMatch = lower.match(
    /(?:above|over|more than)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)/,
  );
  if (minPriceMatch) {
    filters.minPrice = Number(minPriceMatch[1].replace(/,/g, ""));
    remaining = remaining.replace(minPriceMatch[0], " ");
  }

  // Colors (multi-word first so "royal blue" isn't split into "blue")
  const foundColors = [];
  [...COLORS].sort((a, b) => b.length - a.length).forEach((color) => {
    const regex = new RegExp(`\\b${color}\\b`, "i");
    if (regex.test(remaining)) {
      foundColors.push(color);
      remaining = remaining.replace(regex, " ");
    }
  });
  if (foundColors.length > 0) {
    filters.colors = foundColors;
  }

  // Fabric
  const fabricMatch = FABRICS.find((fabric) =>
    new RegExp(`\\b${fabric}\\b`, "i").test(remaining),
  );
  if (fabricMatch) {
    filters.fabric = fabricMatch;
    remaining = remaining.replace(new RegExp(`\\b${fabricMatch}\\b`, "i"), " ");
  }

  // Occasion
  const occasionMatch = OCCASIONS.find((occasion) =>
    new RegExp(`\\b${occasion}\\b`, "i").test(remaining),
  );
  if (occasionMatch) {
    filters.occasion = occasionMatch === "wedding" ? "bridal" : occasionMatch;
    remaining = remaining.replace(
      new RegExp(`\\b${occasionMatch}\\b`, "i"),
      " ",
    );
  }

  // Category
  const categoryMatch = CATEGORIES.find((category) =>
    new RegExp(`\\b${category}\\b`, "i").test(remaining),
  );
  if (categoryMatch) {
    filters.category = categoryMatch === "sari" ? "saree" : categoryMatch;
    remaining = remaining.replace(
      new RegExp(`\\b${categoryMatch}\\b`, "i"),
      " ",
    );
  }

  // Whatever text is left (minus filler words) becomes the free-text search
  const stopWords = new Set(["for", "with", "and", "the", "a", "an", "in"]);
  const leftoverText = remaining
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word))
    .join(" ")
    .trim();

  if (leftoverText) {
    filters.text = leftoverText;
  }

  return filters;
}
