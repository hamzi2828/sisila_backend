// src/controller/categoryController.js
const Category = require('../models/category');

const categoryController = {
  // GET /categories - list all categories
  listCategories: async (req, res) => {
    try {
      const categories = await Category.find().sort({ createdAt: -1 });
      return res.status(200).json({ message: 'Categories fetched successfully', data: categories });
    } catch (error) {
      console.error('List categories error:', error);
      return res.status(400).json({ message: 'Error fetching categories', error: error.message });
    }
  },
  listFeaturedCategoriesWithProducts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const Product = require('../models/product');
      
      // Get featured categories that are active
      const categories = await Category.find({ 
        featured: true, 
        active: true 
      }).limit(limit).sort({ createdAt: -1 });
      
      // For each category, get some products
      const categoriesWithProducts = await Promise.all(
        categories.map(async (category) => {
          const products = await Product.find({
            category: category.name, // Use category name instead of _id
            status: 'published',
            stock: { $gt: 0 }
          }).limit(6); // Get 6 products per category
          
          return {
            ...category.toObject(),
            products: products
          };
        })
      );
      
      return res.status(200).json({ 
        message: 'Featured categories with products fetched successfully', 
        data: categoriesWithProducts 
      });
    } catch (error) {
      console.error('List featured categories with products error:', error);
      return res.status(400).json({ message: 'Error fetching featured categories with products', error: error.message });
    }
  },

  // POST /categories - create a new category
  createCategory: async (req, res) => {
    try {
      let { name, slug, description = '', active = true, featured = false } = req.body || {};

      if (!name || !slug) {
        return res.status(400).json({ message: 'name and slug are required' });
      }

      name = String(name).trim();
      slug = String(slug).trim().toLowerCase();
      description = String(description || '').trim();
      active = Boolean(active);
      featured = Boolean(featured);

      // Handle file uploads
      const thumbnailFile = req.files?.thumbnail?.[0];
      const bannerFile = req.files?.banner?.[0];

      const categoryData = {
        name,
        slug,
        description,
        active,
        featured,
        thumbnailUrl: thumbnailFile ? `/uploads/${thumbnailFile.filename}` : null,
        bannerUrl: bannerFile ? `/uploads/${bannerFile.filename}` : null
      };

      const created = await Category.create(categoryData);
      return res.status(201).json({ message: 'Category created successfully', data: created });
    } catch (error) {
      if (error && error.code === 11000) {
        return res.status(409).json({ message: 'Slug already exists' });
      }
      console.error('Create category error:', error);
      return res.status(400).json({ message: 'Error creating category', error: error.message });
    }
  },

  // PUT /categories/:id - update a category
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};

      const updates = {};
      if (typeof payload.name !== 'undefined') updates.name = String(payload.name).trim();
      if (typeof payload.slug !== 'undefined') updates.slug = String(payload.slug).trim().toLowerCase();
      if (typeof payload.description !== 'undefined') updates.description = String(payload.description || '').trim();
      if (typeof payload.active !== 'undefined') updates.active = Boolean(payload.active);
      if (typeof payload.featured !== 'undefined') updates.featured = Boolean(payload.featured);

      // Handle file uploads
      const thumbnailFile = req.files?.thumbnail?.[0];
      const bannerFile = req.files?.banner?.[0];

      if (thumbnailFile) {
        updates.thumbnailUrl = `/uploads/${thumbnailFile.filename}`;
      }
      if (bannerFile) {
        updates.bannerUrl = `/uploads/${bannerFile.filename}`;
      }

      const updated = await Category.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ message: 'Category not found' });
      }

      return res.status(200).json({ message: 'Category updated successfully', data: updated });
    } catch (error) {
      if (error && error.code === 11000) {
        return res.status(409).json({ message: 'Slug already exists' });
      }
      console.error('Update category error:', error);
      return res.status(400).json({ message: 'Error updating category', error: error.message });
    }
  },

  // DELETE /categories/:id - delete a category
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Category.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Category not found' });
      }
      return res.status(200).json({ message: 'Category deleted successfully', id });
    } catch (error) {
      console.error('Delete category error:', error);
      return res.status(400).json({ message: 'Error deleting category', error: error.message });
    }
  },
};

module.exports = categoryController;
