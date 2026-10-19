// src/controller/productController.js
const Product = require('../models/product');
const { cleanupUploadedFiles } = require('../helper/upload');
const createProductService = require('../services/products/createProductService');
const updateProductService = require('../services/products/updateProductService');

/**
 * Send a JSON error whose `message` is the real reason (shown as-is in the admin UI).
 * Validation problems -> 400, duplicate slug -> 409, missing product -> 404, anything else -> 500.
 */
function sendProductError(res, error, action) {
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'slug';
    const message = field === 'slug'
      ? 'A product with this name/slug already exists. Please use a different product name.'
      : `A product with this ${field} already exists.`;
    return res.status(409).json({ message, error: 'Duplicate key' });
  }
  if (error && error.name === 'ValidationError') {
    const message = Object.values(error.errors || {})
      .map((e) => (e.kind === 'enum' && e.properties && Array.isArray(e.properties.enumValues)
        ? `Invalid ${e.path} "${e.value}". Allowed values: ${e.properties.enumValues.join(', ')}`
        : e.message))
      .join('. ') || error.message;
    return res.status(400).json({ message, error: 'Validation failed' });
  }
  if (error && error.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${error.path}: ${JSON.stringify(error.value)}`, error: 'Invalid value' });
  }
  if (error && Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: error.message, error: 'Invalid request' });
  }
  console.error(`${action} product error:`, error);
  return res.status(500).json({
    message: `Could not ${action} the product because of a server error: ${error && error.message ? error.message : 'unknown error'}`,
    error: 'Internal server error',
  });
}


const productController = {
  // GET /products - list all products
  listProducts: async (req, res) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });
      return res.status(200).json({ message: 'Products fetched successfully', data: products });
    } catch (error) {
      console.error('List products error:', error);
      return res.status(400).json({ message: 'Error fetching products', error: error.message });
    }
  },

  // GET /products/random - get random products for collection
  getRandomProducts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      // Get all published products with stock > 0
      const products = await Product.find({
        status: 'published',
        stock: { $gt: 0 }
      });
      
      // Shuffle the array and limit the results
      const shuffled = products.sort(() => Math.random() - 0.5).slice(0, limit);
      
      return res.status(200).json({ 
        message: 'Random products fetched successfully', 
        data: shuffled 
      });
    } catch (error) {
      console.error('Get random products error:', error);
      return res.status(400).json({ 
        message: 'Error fetching random products', 
        error: error.message 
      });
    }
  },

  // GET /products/latest - get latest products (public route)
  getLatestProducts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      // Get latest published products sorted by creation date
      const products = await Product.find({
        status: 'published'
      })
      .sort({ createdAt: -1 })
      .limit(limit);
      
      return res.status(200).json({ 
        message: 'Latest products fetched successfully', 
        data: products 
      });
    } catch (error) {
      console.error('Get latest products error:', error);
      return res.status(400).json({ 
        message: 'Error fetching latest products', 
        error: error.message 
      });
    }
  },

  // GET /products/:id - get product by id
  getProductById: async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      return res.status(200).json({ message: 'Product fetched successfully', data: product });
    } catch (error) {
      console.error('Get product error:', error);
      return res.status(400).json({ message: 'Error fetching product', error: error.message });
    }
  },

  // POST /products - create a new product
  createProduct: async (req, res) => {
    const files = req.files || {};
    try {
      const payload = req.body || {};
      const created = await createProductService.createProduct(payload, files);

      return res.status(201).json({
        message: 'Product created successfully',
        data: created
      });
    } catch (error) {
      // The images were already stored before validation ran; remove them so failed saves leave no orphans
      await cleanupUploadedFiles(files);
      return sendProductError(res, error, 'create');
    }
  },

  // PUT /products/:id - update a product
  updateProduct: async (req, res) => {
    const files = req.files || {};
    try {
      const { id } = req.params;
      const payload = req.body || {};
      const updated = await updateProductService.updateProduct(id, payload, files);

      return res.status(200).json({
        message: 'Product updated successfully',
        data: updated
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      return sendProductError(res, error, 'update');
    }
  },

  // DELETE /products/:id - delete a product
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Product.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ message: 'Product not found' });
      return res.status(200).json({ message: 'Product deleted successfully', id });
    } catch (error) {
      console.error('Delete product error:', error);
      return res.status(400).json({ message: 'Error deleting product', error: error.message });
    }
  },
};

module.exports = productController;
