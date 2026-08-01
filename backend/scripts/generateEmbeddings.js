/**
 * Generate Embeddings Script
 * Batch process all products to generate AI embeddings for visual search
 * 
 * Usage: node scripts/generateEmbeddings.js
 */

import '../src/config/database.js';
import { connectDatabase } from '../src/config/database.js';
import Product from '../src/models/Product.js';
import embeddingService from '../src/services/embeddingService.js';
import { getImageBuffer } from '../src/services/imageStorage.js';

async function generateEmbeddingsForAllProducts() {
  try {
    console.log('🚀 Starting embedding generation...\n');

    // Connect to database
    await connectDatabase();

    // Get all active products without embeddings
    const products = await Product.find({
      status: 'active',
      $or: [
        { 'embeddings.text': { $exists: false } },
        { 'embeddings.text': null },
      ],
    })
      .select('_id name thumbnail images description colors fabric category occasion workType')
      .lean();

    console.log(`📦 Found ${products.length} products to process\n`);

    if (products.length === 0) {
      console.log('✅ All products already have embeddings!');
      process.exit(0);
    }

    let processed = 0;
    let failed = 0;

    for (const product of products) {
      try {
        console.log(`Processing: ${product.name} (${product._id})`);

        // Generate text embedding from product attributes
        const productText = embeddingService.generateProductText(product);
        const textEmbedding = await embeddingService.generateTextEmbedding(productText);

        // Try to generate image embedding if product has images
        let imageEmbedding = null;
        if (product.thumbnail) {
          try {
            const imageBuffer = await getImageBuffer(product.thumbnail);
            const result = await embeddingService.generateImageEmbedding(imageBuffer);
            imageEmbedding = result.embedding;
            console.log(`  ✓ Generated image embedding (visual description captured)`);
          } catch (imgError) {
            console.log(`  ⚠️ Image embedding failed: ${imgError.message}`);
          }
        }

        // Update product with embeddings
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              'embeddings.text': textEmbedding,
              ...(imageEmbedding && { 'embeddings.clip': imageEmbedding }),
            },
          }
        );

        processed++;
        console.log(`  ✅ Success (${processed}/${products.length})\n`);

        // Rate limiting - wait between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        failed++;
        console.error(`  ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully processed: ${processed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((processed / products.length) * 100).toFixed(1)}%`);

    console.log('\n✨ Embedding generation complete!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
generateEmbeddingsForAllProducts();
