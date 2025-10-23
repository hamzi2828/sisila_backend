const Theme = require('../models/themeModel');

// Get all active themes (public endpoint)
const getActiveThemes = async (req, res) => {
  try {
    const themes = await Theme.getActiveThemes();

    res.status(200).json({
      success: true,
      message: 'Active themes retrieved successfully',
      data: themes
    });
  } catch (error) {
    console.error('Error fetching active themes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active themes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all themes (admin only)
const getAllThemes = async (req, res) => {
  try {
    const themes = await Theme.find({}).sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: 'All themes retrieved successfully',
      data: themes
    });
  } catch (error) {
    console.error('Error fetching all themes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch themes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single theme by ID
const getThemeById = async (req, res) => {
  try {
    const { id } = req.params;
    const theme = await Theme.findById(id);

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Theme retrieved successfully',
      data: theme
    });
  } catch (error) {
    console.error('Error fetching theme:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch theme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new theme
const createTheme = async (req, res) => {
  try {
    const {
      id,
      title,
      tagline,
      description,
      cover,
      accent,
      gallery,
      isActive,
      order
    } = req.body;

    // Validate gallery
    if (!gallery || !Array.isArray(gallery) || gallery.length < 4 || gallery.length > 12) {
      return res.status(400).json({
        success: false,
        message: 'Gallery must contain between 4 and 12 images'
      });
    }

    const themeData = {
      id,
      title,
      tagline,
      description,
      cover,
      accent: accent || undefined,
      gallery,
      isActive: isActive !== undefined ? isActive : true,
      order: order ? parseInt(order) : undefined
    };

    const theme = new Theme(themeData);
    await theme.save();

    res.status(201).json({
      success: true,
      message: 'Theme created successfully',
      data: theme
    });
  } catch (error) {
    console.error('Error creating theme:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Theme with this ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create theme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update theme
const updateTheme = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      tagline,
      description,
      cover,
      accent,
      gallery,
      isActive,
      order
    } = req.body;

    const theme = await Theme.findById(id);
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    // Validate gallery if provided
    if (gallery && (!Array.isArray(gallery) || gallery.length < 4 || gallery.length > 12)) {
      return res.status(400).json({
        success: false,
        message: 'Gallery must contain between 4 and 12 images'
      });
    }

    const updateData = {
      title: title || theme.title,
      tagline: tagline || theme.tagline,
      description: description || theme.description,
      cover: cover || theme.cover,
      accent: accent !== undefined ? accent : theme.accent,
      gallery: gallery || theme.gallery,
      isActive: isActive !== undefined ? isActive : theme.isActive,
      order: order !== undefined ? parseInt(order) : theme.order
    };

    const updatedTheme = await Theme.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Theme updated successfully',
      data: updatedTheme
    });
  } catch (error) {
    console.error('Error updating theme:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update theme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Toggle theme active status
const toggleThemeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const theme = await Theme.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Theme ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: theme
    });
  } catch (error) {
    console.error('Error updating theme status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update theme status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update theme order
const updateThemeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { order } = req.body;

    if (typeof order !== 'number' || order < 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must be a non-negative number'
      });
    }

    const theme = await Theme.findByIdAndUpdate(
      id,
      { order },
      { new: true, runValidators: true }
    );

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Theme order updated successfully',
      data: theme
    });
  } catch (error) {
    console.error('Error updating theme order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update theme order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete theme
const deleteTheme = async (req, res) => {
  try {
    const { id } = req.params;

    const theme = await Theme.findById(id);
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      });
    }

    await Theme.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting theme:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete theme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getActiveThemes,
  getAllThemes,
  getThemeById,
  createTheme,
  updateTheme,
  toggleThemeStatus,
  updateThemeOrder,
  deleteTheme
};
