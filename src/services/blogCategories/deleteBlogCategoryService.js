// deleteBlogCategoryService.js
const path = require('path');
const BlogCategory = require(path.resolve(__dirname, '../../models/BlogCategory'));
const Blog = require(path.resolve(__dirname, '../../models/blogModel'));
const mongoose = require('mongoose');

/**
 * Service for deleting a blog category
 * @param {String} categoryId - The ID of the blog category to delete
 * @returns {Promise<Object>} - Result of the deletion operation
 */
const deleteBlogCategoryService = async (categoryId) => {
  try {
    // Validate required fields
    if (!categoryId) {
      throw new Error('Blog category ID is required');
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error('Invalid blog category ID format');
    }

    // Check if the category exists
    const category = await BlogCategory.findById(categoryId);
    if (!category) {
      throw new Error('Blog category not found');
    }

    // Refuse to delete a category that blogs still reference (drafts included).
    // Blogs store their category in `categoryId` (see models/blogModel.js).
    const blogCount = await Blog.countDocuments({ categoryId: category._id });
    if (blogCount > 0) {
      throw new Error(
        `Cannot delete category: it is used in ${blogCount} blog(s). Move those blogs to another category or delete them first.`
      );
    }

    // Delete the category
    const result = await BlogCategory.findByIdAndDelete(categoryId);
    
    return { success: true, message: 'Blog category deleted successfully', data: result };
  } catch (error) {
    console.error('Error in deleteBlogCategoryService:', error);
    throw error;
  }
};

module.exports = deleteBlogCategoryService;
