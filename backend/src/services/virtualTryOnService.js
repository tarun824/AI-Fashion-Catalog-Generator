import OpenAI from 'openai';
import embeddingService from './embeddingService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Virtual Try-On Service
 * Generates AI-powered try-on visualizations
 */
class VirtualTryOnService {
  /**
   * Generate try-on image using AI
   * Currently uses DALL-E for image generation
   * 
   * For production, consider:
   * - Fal.ai (better quality, cheaper)
   * - Replicate (Stable Diffusion)
   * - Azure AI (enterprise-grade)
   */
  async generateTryOn(personImageBuffer, productImageBuffer, productDetails) {
    try {
      // Prepare images
      const personImage = await embeddingService.prepareImageForAnalysis(personImageBuffer, 512);
      const productImage = await embeddingService.prepareImageForAnalysis(productImageBuffer, 512);

      // Analyze both images first
      const personAnalysis = await this.analyzePersonImage(personImage);
      const productAnalysis = await this.analyzeProductImage(productImage);

      // Generate descriptive prompt for try-on
      const prompt = this.buildTryOnPrompt(personAnalysis, productAnalysis, productDetails);

      // Use DALL-E to generate the try-on image
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      return {
        imageUrl: response.data[0].url,
        prompt: prompt,
        personAnalysis,
        productAnalysis,
      };
    } catch (error) {
      console.error('Virtual try-on generation failed:', error.message);
      throw new Error('Failed to generate try-on image');
    }
  }

  /**
   * Analyze person image to extract key features
   */
  async analyzePersonImage(base64Image) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this person briefly: skin tone, hair color, face shape, approximate age. Be concise (max 50 words).',
            },
            {
              type: 'image_url',
              image_url: { url: base64Image },
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  }

  /**
   * Analyze product image
   */
  async analyzeProductImage(base64Image) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this saree: colors, patterns, borders, pallu design, fabric texture. Be specific (max 50 words).',
            },
            {
              type: 'image_url',
              image_url: { url: base64Image },
            },
          ],
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  }

  /**
   * Build descriptive prompt for DALL-E
   */
  buildTryOnPrompt(personDescription, productDescription, productDetails) {
    return `Professional fashion photography: ${personDescription} wearing a beautiful Indian saree. ${productDescription}. The saree is elegantly draped in traditional style. Proper pleats at the waist, pallu over the shoulder. Studio lighting, plain background, full body shot, photorealistic, high quality, detailed fabric texture visible, professional fashion catalog style.`;
  }

  /**
   * Simple composite (fallback if AI generation fails)
   * NOT photorealistic, just for demo purposes
   */
  async simpleComposite(personImageBuffer, productImageBuffer) {
    // This would require additional image processing libraries
    // For MVP, we rely on AI generation
    throw new Error('Simple composite not implemented - use AI generation');
  }
}

export default new VirtualTryOnService();
