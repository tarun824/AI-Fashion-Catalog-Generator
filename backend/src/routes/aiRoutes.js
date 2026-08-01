import express from 'express';
import multer from 'multer';
import embeddingService from '../services/embeddingService.js';
import aiStylingService from '../services/aiStylingService.js';
import virtualTryOnService from '../services/virtualTryOnService.js';
import Product from '../models/Product.js';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are supported'));
      return;
    }
    cb(null, true);
  },
});

/**
 * POST /visual-search
 * Upload an image and find similar products
 */
router.post('/visual-search', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Generate embedding for uploaded image
    const { embedding, visualDescription } = await embeddingService.generateImageEmbedding(
      req.file.buffer
    );

    // Get all products with embeddings
    const products = await Product.find({
      status: 'active',
      'embeddings.text': { $exists: true, $ne: null },
    })
      .select('name slug thumbnail price colors fabric category occasion embeddings')
      .limit(500) // Limit for performance
      .lean();

    // Find similar products
    const similarProducts = await embeddingService.findSimilarProducts(
      embedding,
      products,
      20 // Top 20 matches
    );

    res.json({
      success: true,
      visualDescription,
      totalMatches: similarProducts.length,
      results: similarProducts.map(({ product, similarityPercent }) => ({
        _id: product._id,
        name: product.name,
        slug: product.slug,
        thumbnail: product.thumbnail,
        price: product.price,
        colors: product.colors,
        fabric: product.fabric,
        category: product.category,
        similarityPercent,
      })),
    });
  } catch (error) {
    console.error('Visual search error:', error);
    res.status(500).json({
      error: 'Visual search failed',
      message: error.message,
    });
  }
});

/**
 * POST /personal-stylist
 * Analyze customer photo and provide personalized recommendations
 */
router.post('/personal-stylist', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    // Analyze customer photo
    const stylingResult = await aiStylingService.analyzeCustomerPhoto(req.file.buffer);

    // Get all active products
    const products = await Product.find({ status: 'active' })
      .select('name slug thumbnail price colors fabric category occasion')
      .limit(200)
      .lean();

    // Get personalized product recommendations
    const recommendedProducts = await aiStylingService.getPersonalizedProducts(
      stylingResult.analysis,
      products,
      20
    );

    res.json({
      success: true,
      analysis: stylingResult.analysis,
      recommendations: stylingResult.recommendations,
      products: recommendedProducts,
    });
  } catch (error) {
    console.error('Personal stylist error:', error);
    res.status(500).json({
      error: 'Styling analysis failed',
      message: error.message,
    });
  }
});

/**
 * POST /virtual-tryon
 * Generate virtual try-on image
 */
router.post('/virtual-tryon', upload.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'product', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files?.selfie || !req.files?.product) {
      return res.status(400).json({ 
        error: 'Both selfie and product images are required' 
      });
    }

    const { productId } = req.body;

    // Get product details
    let productDetails = null;
    if (productId) {
      productDetails = await Product.findById(productId)
        .select('name colors fabric workType')
        .lean();
    }

    // Generate try-on image
    const result = await virtualTryOnService.generateTryOn(
      req.files.selfie[0].buffer,
      req.files.product[0].buffer,
      productDetails
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Virtual try-on error:', error);
    res.status(500).json({
      error: 'Virtual try-on failed',
      message: error.message,
    });
  }
});

/**
 * GET /similar-products/:productId
 * Get similar products based on a specific product
 */
router.get('/similar-products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Get the source product
    const sourceProduct = await Product.findById(productId)
      .select('embeddings name')
      .lean();

    if (!sourceProduct || !sourceProduct.embeddings?.text) {
      return res.status(404).json({ 
        error: 'Product not found or no embeddings available' 
      });
    }

    // Get all products except the source
    const products = await Product.find({
      _id: { $ne: productId },
      status: 'active',
      'embeddings.text': { $exists: true, $ne: null },
    })
      .select('name slug thumbnail price colors fabric category')
      .limit(200)
      .lean();

    // Find similar products
    const similarProducts = await embeddingService.findSimilarProducts(
      sourceProduct.embeddings.text,
      products,
      limit
    );

    res.json({
      success: true,
      sourceProduct: {
        _id: sourceProduct._id,
        name: sourceProduct.name,
      },
      results: similarProducts.map(({ product, similarityPercent }) => ({
        _id: product._id,
        name: product.name,
        slug: product.slug,
        thumbnail: product.thumbnail,
        price: product.price,
        colors: product.colors,
        fabric: product.fabric,
        similarityPercent,
      })),
    });
  } catch (error) {
    console.error('Similar products error:', error);
    res.status(500).json({
      error: 'Failed to find similar products',
      message: error.message,
    });
  }
});

/**
 * GET /recommendations/:productId
 * Get "Complete the Look" recommendations
 */
router.get('/recommendations/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Get the product
    const product = await Product.findById(productId)
      .select('name colors category occasion price')
      .lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find complementary products
    // 1. Different category but same colors/occasion
    const complementary = await Product.find({
      _id: { $ne: productId },
      status: 'active',
      $or: [
        { colors: { $in: product.colors } },
        { occasion: product.occasion },
      ],
      category: { $ne: product.category },
      price: { 
        $gte: product.price * 0.3, 
        $lte: product.price * 0.7 
      },
    })
      .select('name slug thumbnail price category')
      .limit(5)
      .lean();

    res.json({
      success: true,
      recommendations: {
        complementary,
        message: 'Complete your look with these items',
      },
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message,
    });
  }
});

export default router;
