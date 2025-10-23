const Series = require('../models/seriesModel');

/**
 * Get all active series (public endpoint)
 */
const getActiveSeries = async (req, res) => {
  try {
    const series = await Series.getActiveSeries();
    res.status(200).json({
      success: true,
      message: 'Active series retrieved successfully',
      data: series
    });
  } catch (error) {
    console.error('Error fetching active series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active series',
      error: error.message
    });
  }
};

/**
 * Get all series (admin only)
 */
const getAllSeries = async (req, res) => {
  try {
    const series = await Series.getAllSeriesSorted();
    res.status(200).json({
      success: true,
      message: 'All series retrieved successfully',
      data: series
    });
  } catch (error) {
    console.error('Error fetching all series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve series',
      error: error.message
    });
  }
};

/**
 * Get single series by ID
 */
const getSeriesById = async (req, res) => {
  try {
    const { id } = req.params;
    const series = await Series.findById(id);

    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Series retrieved successfully',
      data: series
    });
  } catch (error) {
    console.error('Error fetching series by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve series',
      error: error.message
    });
  }
};

/**
 * Create new series
 */
const createSeries = async (req, res) => {
  try {
    const { id, title, tagline, description, cover, accent, subitems, gallery, isActive, order } = req.body;

    // Check if series with this ID already exists
    const existingSeries = await Series.findOne({ id });
    if (existingSeries) {
      return res.status(400).json({
        success: false,
        message: 'Series with this ID already exists'
      });
    }

    const newSeries = new Series({
      id,
      title,
      tagline,
      description,
      cover,
      accent,
      subitems: subitems || [],
      gallery,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await newSeries.save();

    res.status(201).json({
      success: true,
      message: 'Series created successfully',
      data: newSeries
    });
  } catch (error) {
    console.error('Error creating series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create series',
      error: error.message
    });
  }
};

/**
 * Update series
 */
const updateSeries = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow changing the unique 'id' field
    delete updateData.id;

    const updatedSeries = await Series.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSeries) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Series updated successfully',
      data: updatedSeries
    });
  } catch (error) {
    console.error('Error updating series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update series',
      error: error.message
    });
  }
};

/**
 * Toggle series active status
 */
const toggleSeriesStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const updatedSeries = await Series.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!updatedSeries) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Series ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedSeries
    });
  } catch (error) {
    console.error('Error toggling series status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update series status',
      error: error.message
    });
  }
};

/**
 * Update series order
 */
const updateSeriesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { order } = req.body;

    if (typeof order !== 'number' || order < 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must be a non-negative number'
      });
    }

    const updatedSeries = await Series.findByIdAndUpdate(
      id,
      { order },
      { new: true }
    );

    if (!updatedSeries) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Series order updated successfully',
      data: updatedSeries
    });
  } catch (error) {
    console.error('Error updating series order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update series order',
      error: error.message
    });
  }
};

/**
 * Delete series
 */
const deleteSeries = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSeries = await Series.findByIdAndDelete(id);

    if (!deletedSeries) {
      return res.status(404).json({
        success: false,
        message: 'Series not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Series deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting series:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete series',
      error: error.message
    });
  }
};

module.exports = {
  getActiveSeries,
  getAllSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  toggleSeriesStatus,
  updateSeriesOrder,
  deleteSeries
};
