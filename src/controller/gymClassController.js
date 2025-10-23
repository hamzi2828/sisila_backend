const GymClass = require('../models/gymClassModel');

// Get all active classes (public endpoint)
const getActiveClasses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || undefined;
    const isFeatured = req.query.isFeatured === 'true' ? true : undefined;

    // Build query filter
    const query = { isActive: true };
    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured;
    }

    // Build the database query with instructor population
    let classesQuery = GymClass.find(query)
      .populate('schedule.instructor', 'name role')
      .sort({ order: 1, createdAt: -1 });

    if (limit) {
      classesQuery = classesQuery.limit(limit);
    }

    const classes = await classesQuery;

    res.status(200).json({
      success: true,
      message: 'Active classes retrieved successfully',
      data: classes
    });
  } catch (error) {
    console.error('Error fetching active classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get featured classes (public endpoint)
const getFeaturedClasses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const classes = await GymClass.getFeaturedClasses(limit);

    res.status(200).json({
      success: true,
      message: 'Featured classes retrieved successfully',
      data: classes
    });
  } catch (error) {
    console.error('Error fetching featured classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get classes by category (public endpoint)
const getClassesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const classes = await GymClass.getClassesByCategory(category);

    res.status(200).json({
      success: true,
      message: 'Classes retrieved successfully',
      data: classes
    });
  } catch (error) {
    console.error('Error fetching classes by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all classes (admin only)
const getAllClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await GymClass.countDocuments();
    const classes = await GymClass.find({})
      .populate('schedule.instructor', 'name role image')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'All classes retrieved successfully',
      data: classes,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching all classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single class by ID
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const gymClass = await GymClass.findById(id)
      .populate('schedule.instructor', 'name role image email phone');

    if (!gymClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Class retrieved successfully',
      data: gymClass
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get class by slug (public endpoint)
const getClassBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const gymClass = await GymClass.findOne({ slug, isActive: true })
      .populate('schedule.instructor', 'name role image email phone social');

    if (!gymClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Class retrieved successfully',
      data: gymClass
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new class
const createClass = async (req, res) => {
  try {
    const {
      name,
      description,
      shortDescription,
      videoUrl,
      videoPoster,
      schedule,
      duration,
      difficulty,
      capacity,
      features,
      requirements,
      category,
      tags,
      isActive,
      isFeatured,
      order,
      price,
      currency
    } = req.body;

    // Handle file uploads
    let thumbnailUrl = req.body.thumbnail;
    let galleryUrls = req.body.gallery || [];

    if (req.files) {
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnailUrl = `/uploads/${req.files.thumbnail[0].filename}`;
      }
      if (req.files.gallery) {
        galleryUrls = req.files.gallery.map(file => `/uploads/${file.filename}`);
      }
    }

    // Parse JSON fields if they're strings
    let parsedSchedule = schedule;
    if (typeof schedule === 'string') {
      try {
        parsedSchedule = JSON.parse(schedule);
      } catch (e) {
        parsedSchedule = [];
      }
    }

    let parsedFeatures = features;
    if (typeof features === 'string') {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (e) {
        parsedFeatures = features.split(',').map(f => f.trim());
      }
    }

    let parsedRequirements = requirements;
    if (typeof requirements === 'string') {
      try {
        parsedRequirements = JSON.parse(requirements);
      } catch (e) {
        parsedRequirements = requirements.split(',').map(r => r.trim());
      }
    }

    let parsedTags = tags;
    if (typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(',').map(t => t.trim());
      }
    }

    const classData = {
      name,
      description,
      shortDescription: shortDescription || undefined,
      thumbnail: thumbnailUrl || undefined,
      videoUrl: videoUrl || undefined,
      videoPoster: videoPoster || undefined,
      gallery: galleryUrls,
      schedule: parsedSchedule || [],
      duration: duration ? parseInt(duration) : undefined,
      difficulty: difficulty || 'All Levels',
      capacity: capacity ? parseInt(capacity) : 20,
      features: parsedFeatures || [],
      requirements: parsedRequirements || [],
      category: category || 'Other',
      tags: parsedTags || [],
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' || isFeatured === true : false,
      order: order ? parseInt(order) : undefined,
      price: price ? parseFloat(price) : 0,
      currency: currency || 'PKR'
    };

    const gymClass = new GymClass(classData);
    await gymClass.save();

    // Populate instructor details
    await gymClass.populate('schedule.instructor', 'name role image');

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: gymClass
    });
  } catch (error) {
    console.error('Error creating class:', error);

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
        message: 'A class with this slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update class
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const gymClass = await GymClass.findById(id);

    if (!gymClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const {
      name,
      description,
      shortDescription,
      videoUrl,
      videoPoster,
      schedule,
      duration,
      difficulty,
      capacity,
      features,
      requirements,
      category,
      tags,
      isActive,
      isFeatured,
      order,
      price,
      currency
    } = req.body;

    // Handle file uploads
    let thumbnailUrl = req.body.thumbnail || gymClass.thumbnail;
    let galleryUrls = req.body.gallery || gymClass.gallery;

    if (req.files) {
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        thumbnailUrl = `/uploads/${req.files.thumbnail[0].filename}`;
      }
      if (req.files.gallery) {
        galleryUrls = req.files.gallery.map(file => `/uploads/${file.filename}`);
      }
    }

    // Parse JSON fields if they're strings
    let parsedSchedule = schedule || gymClass.schedule;
    if (schedule && typeof schedule === 'string') {
      try {
        parsedSchedule = JSON.parse(schedule);
      } catch (e) {
        parsedSchedule = gymClass.schedule;
      }
    }

    let parsedFeatures = features || gymClass.features;
    if (features && typeof features === 'string') {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (e) {
        parsedFeatures = features.split(',').map(f => f.trim());
      }
    }

    let parsedRequirements = requirements || gymClass.requirements;
    if (requirements && typeof requirements === 'string') {
      try {
        parsedRequirements = JSON.parse(requirements);
      } catch (e) {
        parsedRequirements = requirements.split(',').map(r => r.trim());
      }
    }

    let parsedTags = tags || gymClass.tags;
    if (tags && typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(',').map(t => t.trim());
      }
    }

    const updateData = {
      name: name || gymClass.name,
      description: description || gymClass.description,
      shortDescription: shortDescription !== undefined ? shortDescription : gymClass.shortDescription,
      thumbnail: thumbnailUrl,
      videoUrl: videoUrl !== undefined ? videoUrl : gymClass.videoUrl,
      videoPoster: videoPoster !== undefined ? videoPoster : gymClass.videoPoster,
      gallery: galleryUrls,
      schedule: parsedSchedule,
      duration: duration !== undefined ? parseInt(duration) : gymClass.duration,
      difficulty: difficulty || gymClass.difficulty,
      capacity: capacity !== undefined ? parseInt(capacity) : gymClass.capacity,
      features: parsedFeatures,
      requirements: parsedRequirements,
      category: category || gymClass.category,
      tags: parsedTags,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : gymClass.isActive,
      isFeatured: isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true) : gymClass.isFeatured,
      order: order !== undefined ? parseInt(order) : gymClass.order,
      price: price !== undefined ? parseFloat(price) : gymClass.price,
      currency: currency || gymClass.currency
    };

    const updatedClass = await GymClass.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('schedule.instructor', 'name role image');

    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass
    });
  } catch (error) {
    console.error('Error updating class:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Toggle class active status
const toggleClassStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const gymClass = await GymClass.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    ).populate('schedule.instructor', 'name role image');

    if (!gymClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Class ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: gymClass
    });
  } catch (error) {
    console.error('Error updating class status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Toggle class featured status
const toggleClassFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isFeatured must be a boolean value'
      });
    }

    const gymClass = await GymClass.findByIdAndUpdate(
      id,
      { isFeatured },
      { new: true, runValidators: true }
    ).populate('schedule.instructor', 'name role image');

    if (!gymClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Class ${isFeatured ? 'marked as featured' : 'removed from featured'} successfully`,
      data: gymClass
    });
  } catch (error) {
    console.error('Error updating class featured status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class featured status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete class
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const gymClass = await GymClass.findById(id);
    if (!gymClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    await GymClass.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getActiveClasses,
  getFeaturedClasses,
  getClassesByCategory,
  getAllClasses,
  getClassById,
  getClassBySlug,
  createClass,
  updateClass,
  toggleClassStatus,
  toggleClassFeatured,
  deleteClass
};
