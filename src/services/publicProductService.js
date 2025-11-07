const Product = require('../models/product');

const publicProductService = {
  async getLatestProducts(limit = 10) {
    try {
      const products = await Product.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('-__v');
      
      return {
        success: true,
        data: products,
        count: products.length
      };
    } catch (error) {
      throw new Error(`Failed to fetch latest products: ${error.message}`);
    }
  },

  async getRandomProducts(limit = 10) {
    try {
      const products = await Product.aggregate([
        { $match: { status: 'published' } },
        { $sample: { size: parseInt(limit) } }
      ]);
      
      return {
        success: true,
        data: products,
        count: products.length
      };
    } catch (error) {
      throw new Error(`Failed to fetch random products: ${error.message}`);
    }
  },

  async getProductById(id) {
    try {
      const product = await Product.findOne({ 
        _id: id, 
        status: 'published' 
      }).select('-__v');
      
      if (!product) {
        throw new Error('Product not found or not published');
      }
      
      return {
        success: true,
        data: product
      };
    } catch (error) {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  },

  async getProductsByCategory(category, limit = 20, page = 1) {
    try {
      const skip = (page - 1) * limit;
      
      // Handle both exact match and case-insensitive match with slug format
      const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const products = await Product.find({ 
        $or: [
          { category: { $regex: new RegExp(`^${category}$`, 'i') } },
          { category: { $regex: new RegExp(`^${categoryName}$`, 'i') } },
          { category: category }
        ],
        status: 'published' 
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v');
      
      const total = await Product.countDocuments({ 
        $or: [
          { category: { $regex: new RegExp(`^${category}$`, 'i') } },
          { category: { $regex: new RegExp(`^${categoryName}$`, 'i') } },
          { category: category }
        ],
        status: 'published' 
      });
      
      return {
        success: true,
        data: products,
        count: products.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to fetch products by category: ${error.message}`);
    }
  },

  async getProductsByCollection(collectionType, collectionId, limit = 20, page = 1) {
    try {
      const skip = (page - 1) * limit;

      const products = await Product.find({
        status: 'published',
        collectionType: collectionType,
        collectionId: collectionId
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v');

      const total = await Product.countDocuments({
        status: 'published',
        collectionType: collectionType,
        collectionId: collectionId
      });

      return {
        success: true,
        data: products,
        count: products.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to fetch products by collection: ${error.message}`);
    }
  },

  async getFeaturedProducts(limit = 10) {
    try {
      const products = await Product.find({
        status: 'published',
        isFeatured: true
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('-__v');

      return {
        success: true,
        data: products,
        count: products.length
      };
    } catch (error) {
      throw new Error(`Failed to fetch featured products: ${error.message}`);
    }
  },

  async searchProducts(query, limit = 20, page = 1) {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');
      
      const searchCriteria = {
        status: 'published',
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ]
      };
      
      const products = await Product.find(searchCriteria)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v');
      
      const total = await Product.countDocuments(searchCriteria);
      
      return {
        success: true,
        data: products,
        count: products.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to search products: ${error.message}`);
    }
  },

  async getAllPublishedProducts(limit = 50, page = 1, sortBy = 'createdAt', sortOrder = 'desc') {
    try {
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      const products = await Product.find({ status: 'published' })
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v');
      
      const total = await Product.countDocuments({ status: 'published' });
      
      return {
        success: true,
        data: products,
        count: products.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to fetch all products: ${error.message}`);
    }
  }
};

module.exports = publicProductService;