// src/services/blogs/deleteBlogService.js
const Blog = require('../../models/blogModel');
const mongoose = require('mongoose');
const { deleteFromBlob } = require('../../helper/upload');

/**
 * Delete a blog by ID with cleanup
 * @param {String} blogId - Blog ID to delete
 * @param {Boolean} deleteFiles - Whether to delete associated files (default: true)
 * @returns {Promise<Object>} Deletion result
 */
const deleteBlogService = async (blogId, deleteFiles = true) => {
  try {
    // Validate blog ID
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      throw new Error('Invalid blog ID format');
    }
    
    // Find the blog first to get file paths
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      throw new Error('Blog not found');
    }
    
    // Store file paths before deletion
    const filesToDelete = [];
    if (blog.image) {
      filesToDelete.push(blog.image);
    }
    if (blog.thumbnail) {
      filesToDelete.push(blog.thumbnail);
    }
    
    // Delete the blog from database
    await Blog.findByIdAndDelete(blogId);
    
    // Delete associated files if requested
    if (deleteFiles && filesToDelete.length > 0) {
      const deletionResults = await deleteAssociatedFiles(filesToDelete);
      
      return {
        success: true,
        message: 'Blog deleted successfully',
        deletedBlog: {
          id: blog._id,
          title: blog.title,
          slug: blog.slug
        },
        filesDeleted: deletionResults
      };
    }
    
    return {
      success: true,
      message: 'Blog deleted successfully',
      deletedBlog: {
        id: blog._id,
        title: blog.title,
        slug: blog.slug
      }
    };
  } catch (error) {
    throw new Error(`Failed to delete blog: ${error.message}`);
  }
};

/**
 * Delete multiple blogs by IDs
 * @param {Array<String>} blogIds - Array of blog IDs to delete
 * @param {Boolean} deleteFiles - Whether to delete associated files
 * @returns {Promise<Object>} Bulk deletion result
 */
const deleteBulkBlogsService = async (blogIds, deleteFiles = true) => {
  try {
    // Validate all blog IDs
    const validIds = blogIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      throw new Error('No valid blog IDs provided');
    }
    
    // Find all blogs to get file paths
    const blogs = await Blog.find({ _id: { $in: validIds } });
    
    if (blogs.length === 0) {
      throw new Error('No blogs found with provided IDs');
    }
    
    // Collect all file paths
    const filesToDelete = [];
    blogs.forEach(blog => {
      if (blog.image) filesToDelete.push(blog.image);
      if (blog.thumbnail) filesToDelete.push(blog.thumbnail);
    });
    
    // Delete all blogs from database
    const deleteResult = await Blog.deleteMany({ _id: { $in: validIds } });
    
    // Delete associated files if requested
    let filesDeleted = [];
    if (deleteFiles && filesToDelete.length > 0) {
      filesDeleted = await deleteAssociatedFiles(filesToDelete);
    }
    
    return {
      success: true,
      message: `${deleteResult.deletedCount} blog(s) deleted successfully`,
      deletedCount: deleteResult.deletedCount,
      deletedBlogs: blogs.map(blog => ({
        id: blog._id,
        title: blog.title,
        slug: blog.slug
      })),
      filesDeleted
    };
  } catch (error) {
    throw new Error(`Failed to delete blogs: ${error.message}`);
  }
};

/**
 * Delete associated files from Vercel Blob storage
 * @param {Array<String>} fileUrls - Array of file URLs to delete
 * @returns {Promise<Array>} Results of file deletion attempts
 */
const deleteAssociatedFiles = async (fileUrls) => {
  const results = [];

  for (const fileUrl of fileUrls) {
    try {
      // Only delete if it's a blob URL
      if (fileUrl && fileUrl.includes('blob.vercel-storage.com')) {
        await deleteFromBlob(fileUrl);
        results.push({
          path: fileUrl,
          deleted: true
        });
      } else {
        // Not a blob URL, skip but report
        results.push({
          path: fileUrl,
          deleted: false,
          error: 'Not a blob URL, skipped'
        });
      }
    } catch (error) {
      results.push({
        path: fileUrl,
        deleted: false,
        error: error.message
      });
    }
  }

  return results;
};

module.exports = {
  deleteBlogService,
  deleteBulkBlogsService
};