// src/controller/productDetailController.js

const Product = require('../models/product');
const mongoose = require('mongoose');

// Get product detail by ID or slug (public endpoint - no auth required)
const getProductDetail = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    
    let query = {};
    
    // Check if it's a valid ObjectId or use as slug
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      query._id = idOrSlug;
    } else {
      query.slug = idOrSlug;
    }
    
    // Only show published products to public
    query.status = 'published';
    
    const product = await Product.findOne(query).lean();
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Transform the product data for frontend consumption
    const transformedProduct = {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      discountedPrice: product.discountedPrice,
      category: product.category,
      brand: product.brand,
      sku: product.sku,
      thumbnailUrl: product.thumbnailUrl,
      bannerUrls: product.bannerUrls || [],
      colorMedia: product.colorMedia || {},
      variants: product.variants || [],
      tags: product.tags || [],
      features: product.features || [],
      specifications: product.specifications || {},
      status: product.status,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity || 0,
      weight: product.weight,
      dimensions: product.dimensions,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
    
    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      product: transformedProduct
    });
    
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product details'
    });
  }
};

// Get related products based on category and tags (public endpoint)
const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 4;
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    // Get the current product to find related ones
    const currentProduct = await Product.findById(productId);
    
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Find related products based on category and tags
    const relatedQuery = {
      _id: { $ne: productId },
      status: 'published',
      $or: [
        { category: currentProduct.category },
        { tags: { $in: currentProduct.tags || [] } }
      ]
    };
    
    const relatedProducts = await Product.find(relatedQuery)
      .select('_id name slug price discountedPrice thumbnailUrl category brand inStock')
      .limit(limit)
      .lean();
    
    res.status(200).json({
      success: true,
      message: 'Related products retrieved successfully',
      products: relatedProducts,
      total: relatedProducts.length
    });
    
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch related products'
    });
  }
};

// Get products by category (public endpoint)
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 8;
    const excludeId = req.query.exclude;
    
    const query = {
      category: { $regex: new RegExp(category, 'i') }, // Case-insensitive match
      status: 'published'
    };
    
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: excludeId };
    }
    
    const products = await Product.find(query)
      .select('_id name slug price discountedPrice thumbnailUrl category brand stock featured colorMedia productType variants')
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    
    // Add inStock computed field for frontend compatibility
    const productsWithStock = products.map(product => ({
      ...product,
      inStock: product.stock > 0,
      stockQuantity: product.stock
    }));
    
    const total = await Product.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: 'Category products retrieved successfully',
      products: productsWithStock,
      total
    });
    
  } catch (error) {
    console.error('Error fetching category products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category products'
    });
  }
};

// Search products with filters (public endpoint)
const searchProducts = async (req, res) => {
  try {
    const {
      q = '',
      category,
      minPrice,
      maxPrice,
      brand,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build search query
    const query = {
      status: 'published'
    };
    
    // Text search
    if (q && q.trim()) {
      query.$text = { $search: q.trim() };
    }
    
    // Category filter
    if (category) {
      query.category = { $regex: new RegExp(category, 'i') };
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Brand filter
    if (brand) {
      query.brand = { $regex: new RegExp(brand, 'i') };
    }
    
    // Stock filter
    if (inStock !== undefined) {
      query.inStock = inStock === 'true';
    }
    
    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute search
    const products = await Product.find(query)
      .select('_id name slug price discountedPrice thumbnailUrl category brand inStock stockQuantity tags')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    
    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      products,
      total,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    });
    
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products'
    });
  }
};

// Get featured/popular products (public endpoint)
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    // Get featured products first, then fill with high stock or recent products
    const featuredProducts = await Product.find({
      status: 'published',
      featured: true,
      stock: { $gt: 0 }
    })
      .select('_id name slug price discountedPrice thumbnailUrl category brand stock featured')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // If we need more products to reach the limit, get additional products
    let allProducts = [...featuredProducts];
    if (featuredProducts.length < limit) {
      const remainingLimit = limit - featuredProducts.length;
      const additionalProducts = await Product.find({
        status: 'published',
        stock: { $gt: 0 },
        _id: { $nin: featuredProducts.map(p => p._id) } // Exclude already selected featured products
      })
        .select('_id name slug price discountedPrice thumbnailUrl category brand stock featured')
        .sort({ stock: -1, createdAt: -1 }) // Sort by stock then recency
        .limit(remainingLimit)
        .lean();
      
      allProducts = [...featuredProducts, ...additionalProducts];
    }
    
    res.status(200).json({
      success: true,
      message: 'Featured products retrieved successfully',
      products: allProducts,
      total: allProducts.length
    });
    
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products'
    });
  }
};

// Get products with highest ratings (public endpoint)
const getTopRatedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    // For now, we'll sort by a combination of factors
    // In future, you can integrate with a reviews system
    const products = await Product.find({
      status: 'published',
      inStock: true
    })
      .select('_id name slug price discountedPrice thumbnailUrl category brand inStock stockQuantity')
      .sort({ stockQuantity: -1, createdAt: -1 }) // Sort by stock and recency for now
      .limit(limit)
      .lean();
    
    res.status(200).json({
      success: true,
      message: 'Top rated products retrieved successfully',
      products,
      total: products.length
    });
    
  } catch (error) {
    console.error('Error fetching top rated products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top rated products'
    });
  }
};

// Get product categories with count (public endpoint)
const getProductCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          sampleImage: { $first: '$thumbnailUrl' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Product categories retrieved successfully',
      categories: categories.map(cat => ({
        name: cat._id,
        count: cat.count,
        priceRange: {
          min: cat.minPrice,
          max: cat.maxPrice
        },
        image: cat.sampleImage
      }))
    });
    
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product categories'
    });
  }
};

module.exports = {
  getProductDetail,
  getRelatedProducts,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  getTopRatedProducts,
  getProductCategories
};