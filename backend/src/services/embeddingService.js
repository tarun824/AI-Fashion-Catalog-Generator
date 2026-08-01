import { configDotenv } from "dotenv";
import OpenAI from "openai";
import sharp from "sharp";

configDotenv();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Embedding Service
 * Handles AI embeddings for visual search and recommendations
 */
class EmbeddingService {
  /**
   * Generate text embedding for product description
   * Uses OpenAI text-embedding-3-small (1536 dimensions)
   */
  async generateTextEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Text embedding generation failed:", error.message);
      throw new Error("Failed to generate text embedding");
    }
  }

  /**
   * Generate image embedding using OpenAI Vision
   * Returns a numerical embedding vector
   */
  async generateImageEmbedding(imageBuffer) {
    try {
      // Convert image to base64
      const base64Image = await this.prepareImageForAnalysis(imageBuffer);

      // Use GPT-4 Vision to get image features
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this garment image and describe: 1) Primary colors (3-5), 2) Fabric texture (silk/cotton/chiffon etc), 3) Pattern type (solid/printed/embroidered/woven), 4) Style elements (borders/pallu/work), 5) Occasion suitability. Be concise and specific.",
              },
              {
                type: "image_url",
                image_url: { url: base64Image },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const description = response.choices[0].message.content;

      // Generate text embedding from the visual description
      const embedding = await this.generateTextEmbedding(description);

      return {
        embedding,
        visualDescription: description,
      };
    } catch (error) {
      console.error("Image embedding generation failed:", error.message);
      throw new Error("Failed to generate image embedding");
    }
  }

  /**
   * Prepare image for AI analysis
   * Resize and convert to base64 data URL
   */
  async prepareImageForAnalysis(imageBuffer, maxSize = 512) {
    try {
      // Resize image to reduce API costs
      const resizedBuffer = await sharp(imageBuffer)
        .resize(maxSize, maxSize, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Convert to base64 data URL
      const base64 = resizedBuffer.toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error("Image preparation failed:", error.message);
      throw new Error("Failed to prepare image");
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * Returns a value between -1 and 1 (higher = more similar)
   */
  cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      throw new Error("Invalid vectors for similarity calculation");
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find similar products by comparing embeddings
   * Returns products sorted by similarity score
   */
  async findSimilarProducts(queryEmbedding, products, topK = 10) {
    const similarities = products
      .map((product) => {
        if (
          !product.embeddings?.text ||
          !Array.isArray(product.embeddings.text)
        ) {
          return null;
        }

        const similarity = this.cosineSimilarity(
          queryEmbedding,
          product.embeddings.text,
        );

        return {
          product,
          similarity,
          similarityPercent: Math.round(similarity * 100),
        };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return similarities;
  }

  /**
   * Generate product embedding from all its attributes
   * Combines title, description, colors, fabric, etc.
   */
  generateProductText(product) {
    const parts = [
      product.name || "",
      product.description?.full || "",
      product.category || "",
      product.fabric || "",
      product.colors?.join(" ") || "",
      product.occasion || "",
      product.workType || "",
    ];

    return parts.filter(Boolean).join(" ");
  }
}

export default new EmbeddingService();
