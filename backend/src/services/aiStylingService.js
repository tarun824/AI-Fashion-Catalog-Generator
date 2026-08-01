import OpenAI from "openai";
import embeddingService from "./embeddingService.js";

// Lazy-loaded OpenAI client (initialized on first use, after dotenv loads)
let openai = null;
const getOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

/**
 * AI Styling Service
 * Analyzes customer photos and provides personalized recommendations
 */
class AIStylingService {
  /**
   * Color recommendations based on skin tone
   */
  colorTheory = {
    fair: {
      best: [
        "Jewel Tones",
        "Pastels",
        "Royal Blue",
        "Emerald Green",
        "Wine",
        "Coral",
      ],
      avoid: ["Pale Yellow", "Beige"],
      description:
        "Rich jewel tones and soft pastels complement fair skin beautifully",
    },
    wheatish: {
      best: [
        "Earth Tones",
        "Warm Colors",
        "Mustard",
        "Olive Green",
        "Burnt Orange",
        "Deep Red",
      ],
      avoid: ["Neon Colors", "Very Light Pastels"],
      description:
        "Warm earthy tones and rich colors enhance wheatish complexions",
    },
    dusky: {
      best: [
        "Bright Colors",
        "White",
        "Gold",
        "Hot Pink",
        "Electric Blue",
        "Orange",
      ],
      avoid: ["Very Dark Colors", "Brown"],
      description:
        "Vibrant bright colors and metallics look stunning on dusky skin",
    },
  };

  /**
   * Fabric recommendations based on body type
   */
  fabricRecommendations = {
    petite: {
      best: ["Chiffon", "Georgette", "Light Silk"],
      avoid: ["Heavy Kanjeevaram", "Thick Cotton"],
      description:
        "Light, flowing fabrics create graceful drapes without overwhelming",
    },
    average: {
      best: ["All Fabrics", "Silk", "Cotton", "Georgette"],
      avoid: [],
      description:
        "Most fabrics work well, choose based on occasion and preference",
    },
    "plus-size": {
      best: ["Structured Silk", "Cotton Silk", "Soft Georgette"],
      avoid: ["Very Clingy Fabrics", "Too Stiff Fabrics"],
      description:
        "Structured fabrics with good drape create elegant silhouettes",
    },
  };

  /**
   * Analyze customer photo using AI
   * Extracts skin tone, body type, face shape
   */
  async analyzeCustomerPhoto(imageBuffer) {
    try {
      const base64Image =
        await embeddingService.prepareImageForAnalysis(imageBuffer);

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional fashion stylist specializing in Indian ethnic wear. Analyze the person in the photo and provide styling recommendations.

Return your analysis in this EXACT JSON format:
{
  "skinTone": "fair" | "wheatish" | "dusky",
  "bodyType": "petite" | "average" | "plus-size",
  "faceShape": "oval" | "round" | "square" | "heart",
  "estimatedAge": "20s" | "30s" | "40s" | "50+",
  "stylePersona": "traditional" | "modern" | "fusion",
  "confidence": 0.8
}

Be objective and professional. Focus on what will help them look their best.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this person for fashion styling recommendations.",
              },
              {
                type: "image_url",
                image_url: { url: base64Image },
              },
            ],
          },
        ],
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Add recommendations based on analysis
      const recommendations = this.generateRecommendations(analysis);

      return {
        analysis,
        recommendations,
      };
    } catch (error) {
      console.error("Photo analysis failed:", error.message);
      throw new Error("Failed to analyze photo");
    }
  }

  /**
   * Generate personalized recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const skinTone = analysis.skinTone || "wheatish";
    const bodyType = analysis.bodyType || "average";

    const colorRecs = this.colorTheory[skinTone] || this.colorTheory.wheatish;
    const fabricRecs =
      this.fabricRecommendations[bodyType] ||
      this.fabricRecommendations.average;

    return {
      colors: {
        recommended: colorRecs.best,
        avoid: colorRecs.avoid,
        reason: colorRecs.description,
      },
      fabrics: {
        recommended: fabricRecs.best,
        avoid: fabricRecs.avoid,
        reason: fabricRecs.description,
      },
      styles: this.getStyleRecommendations(analysis),
      occasions: this.getOccasionRecommendations(analysis),
    };
  }

  /**
   * Get style recommendations based on persona and body type
   */
  getStyleRecommendations(analysis) {
    const recommendations = [];

    if (analysis.bodyType === "petite") {
      recommendations.push("Small prints and minimal borders work best");
      recommendations.push("Avoid heavy pallu work that can overwhelm");
    }

    if (analysis.bodyType === "plus-size") {
      recommendations.push("Vertical patterns create a slimming effect");
      recommendations.push("Structured draping looks more elegant");
    }

    if (analysis.stylePersona === "modern") {
      recommendations.push("Contemporary pre-stitched sarees for ease");
      recommendations.push("Fusion styles with crop tops");
    }

    if (analysis.stylePersona === "traditional") {
      recommendations.push("Classic silk sarees with traditional borders");
      recommendations.push("Temple jewelry complements beautifully");
    }

    return recommendations;
  }

  /**
   * Recommend occasions based on age and style
   */
  getOccasionRecommendations(analysis) {
    const occasions = {
      "20s": ["Wedding Guest", "Cocktail", "Mehendi", "Sangeet"],
      "30s": ["Formal Events", "Office Wear", "Festive", "Wedding"],
      "40s": ["Formal Events", "Festive", "Traditional Functions"],
      "50+": ["Traditional Functions", "Formal Events", "Festive"],
    };

    return occasions[analysis.estimatedAge] || occasions["30s"];
  }

  /**
   * Filter products based on styling recommendations
   */
  async getPersonalizedProducts(analysis, allProducts, limit = 20) {
    const recommendations = this.generateRecommendations(analysis);

    // Score each product based on recommendations
    const scoredProducts = allProducts.map((product) => {
      let score = 0;

      // Check color match
      const productColors = product.colors || [];
      const recommendedColors = recommendations.colors.recommended.map((c) =>
        c.toLowerCase(),
      );

      const colorMatch = productColors.some((color) =>
        recommendedColors.some(
          (rec) =>
            rec.includes(color.toLowerCase()) ||
            color.toLowerCase().includes(rec),
        ),
      );
      if (colorMatch) score += 3;

      // Check fabric match
      const productFabric = (product.fabric || "").toLowerCase();
      const recommendedFabrics = recommendations.fabrics.recommended.map((f) =>
        f.toLowerCase(),
      );

      if (recommendedFabrics.some((fab) => productFabric.includes(fab))) {
        score += 2;
      }

      // Check occasion match
      const productOccasion = (product.occasion || "").toLowerCase();
      const recommendedOccasions = recommendations.occasions.map((o) =>
        o.toLowerCase(),
      );

      if (recommendedOccasions.some((occ) => productOccasion.includes(occ))) {
        score += 1;
      }

      return { product, score };
    });

    // Sort by score and return top matches
    return scoredProducts
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.product);
  }
}

export default new AIStylingService();
