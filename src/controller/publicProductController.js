const publicProductService = require('../services/publicProductService');

const publicProductController = {
  async getLatestProducts(req, res) {
    try {
      const { limit = 10 } = req.query;
      const result = await publicProductService.getLatestProducts(limit);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getRandomProducts(req, res) {
    try {
      const { limit = 10 } = req.query;
      const result = await publicProductService.getRandomProducts(limit);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const result = await publicProductService.getProductById(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { limit = 20, page = 1 } = req.query;
      const result = await publicProductService.getProductsByCategory(category, limit, page);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getFeaturedProducts(req, res) {
    try {
      const { limit = 10 } = req.query;
      const result = await publicProductService.getFeaturedProducts(limit);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async searchProducts(req, res) {
    try {
      const { q, limit = 20, page = 1 } = req.query;
      
      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }
      
      const result = await publicProductService.searchProducts(q, limit, page);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getProductsByCollection(req, res) {
    try {
      const { collectionType, collectionId } = req.params;
      const { limit = 20, page = 1 } = req.query;

      if (!['theme', 'series'].includes(collectionType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid collection type. Must be "theme" or "series"'
        });
      }

      const result = await publicProductService.getProductsByCollection(collectionType, collectionId, limit, page);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getAllPublishedProducts(req, res) {
    try {
      const {
        limit = 50,
        page = 1,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await publicProductService.getAllPublishedProducts(
        limit, 
        page, 
        sortBy, 
        sortOrder
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = publicProductController;