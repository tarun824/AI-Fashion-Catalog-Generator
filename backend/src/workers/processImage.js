import { workerData, parentPort } from "worker_threads";
import OpenAI from "openai";

const {
  apiKey,
  imageBase64,
  prompt,
  model = "gpt-4o-mini",
  descriptionPrompt = "Generate a concise description of this garment.",
} = workerData;

const openai = new OpenAI({
  apiKey,
});

const toDataUrl = (base64) =>
  base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;

const run = async () => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: descriptionPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: toDataUrl(imageBase64),
            },
          },
        ],
      },
    ],
    max_tokens: 800,
  });

  const content = response.choices?.[0]?.message?.content;
  const description = Array.isArray(content)
    ? content
        .map((chunk) => chunk.text ?? chunk)
        .join("\n")
        .trim()
    : (content ?? "").trim();

  // Debug: Log the full AI response
  console.log(
    "[Worker] AI Response (first 500 chars):\n",
    description.substring(0, 500),
  );
  console.log("[Worker] Looking for Colors line...");

  // Parse colors from the description - try multiple formats
  let colors = [];

  // Try format: "Colors: [red, blue, gold]"
  let colorMatch = description.match(/Colors?:\s*\[([^\]]+)\]/i);
  if (colorMatch) {
    console.log("[Worker] Found colors with brackets:", colorMatch[1]);
    colors = colorMatch[1]
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0);
  } else {
    // Try format: "Colors: red, blue, gold" (without brackets)
    colorMatch = description.match(/Colors?:\s*([^\n]+)/i);
    if (colorMatch) {
      console.log("[Worker] Found colors without brackets:", colorMatch[1]);
      colors = colorMatch[1]
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c.length > 0 && !c.includes("list"));
    }
  }

  // FALLBACK: If no Colors line, extract colors mentioned in the text
  if (colors.length === 0) {
    console.log(
      "[Worker] No Colors line found, attempting to extract from description text...",
    );
    const colorKeywords = [
      "maroon",
      "purple",
      "gold",
      "golden",
      "red",
      "blue",
      "navy",
      "green",
      "pink",
      "yellow",
      "orange",
      "black",
      "white",
      "cream",
      "ivory",
      "beige",
      "brown",
      "grey",
      "gray",
      "silver",
      "teal",
      "turquoise",
      "lavender",
      "magenta",
      "coral",
      "peach",
      "mint",
      "olive",
      "burgundy",
      "crimson",
      "scarlet",
      "indigo",
      "violet",
    ];

    const lowerDesc = description.toLowerCase();
    const foundColors = new Set();

    colorKeywords.forEach((color) => {
      // Match whole words or "color palette", "color scheme", etc.
      const regex = new RegExp(`\\b${color}\\b`, "i");
      if (regex.test(lowerDesc)) {
        foundColors.add(color);
      }
    });

    colors = Array.from(foundColors);
    if (colors.length > 0) {
      console.log("[Worker] Extracted colors from text:", colors);
    }
  }

  console.log(
    "[Worker] Final extracted colors:",
    colors.length > 0 ? colors : "No colors detected",
  );

  // Parse category: "Category: Saree"
  let category = "";
  const categoryMatch = description.match(/Category:\s*([^\n]+)/i);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
  }

  // Parse tags: "Tags: silk, festive, wedding"
  let tags = [];
  const tagsMatch = description.match(/Tags:\s*([^\n]+)/i);
  if (tagsMatch) {
    tags = tagsMatch[1]
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
  }

  // Parse approx price: "ApproxPrice: 2499"
  let approxPrice = null;
  const priceMatch = description.match(/ApproxPrice:\s*([\d,]+(?:\.\d+)?)/i);
  if (priceMatch) {
    const parsedPrice = Number(priceMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(parsedPrice)) {
      approxPrice = parsedPrice;
    }
  }

  const matchLine = (label) => {
    const match = description.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
    return match ? match[1].trim() : "";
  };

  const fabric = matchLine("Fabric");
  const borderType = matchLine("BorderType");
  const occasion = matchLine("Occasion");
  const workType = matchLine("WorkType");
  const weightRaw = matchLine("Weight").toLowerCase();
  const weight = ["light", "medium", "heavy"].includes(weightRaw)
    ? weightRaw
    : "";
  const blouseIncluded = /^yes/i.test(matchLine("BlouseIncluded"));

  parentPort.postMessage({
    description,
    colors,
    category,
    tags,
    approxPrice,
    fabric,
    borderType,
    occasion,
    workType,
    weight,
    blouseIncluded,
    tokens: response.usage?.total_tokens ?? null,
  });
};

run().catch((error) => {
  parentPort.postMessage({
    error: error.message ?? "Failed to process image",
  });
});
