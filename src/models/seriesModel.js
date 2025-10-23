const mongoose = require('mongoose');

// Sub-schema for gallery images
const galleryImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  href: {
    type: String,
    trim: true
  }
}, { _id: false });

// Sub-schema for subitems
const subitemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  href: {
    type: String,
    trim: true
  }
}, { _id: false });

const seriesSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
    maxlength: 50
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  tagline: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  cover: {
    type: String,
    required: true,
    trim: true
  },
  accent: {
    type: String,
    trim: true,
    default: 'from-stone-900/90 to-stone-500/10'
  },
  subitems: {
    type: [subitemSchema],
    default: []
  },
  gallery: {
    type: [galleryImageSchema],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length >= 4 && arr.length <= 12;
      },
      message: 'Gallery must contain between 4 and 12 images'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes
seriesSchema.index({ id: 1 });
seriesSchema.index({ isActive: 1, order: 1 });
seriesSchema.index({ createdAt: -1 });

// Static method to get all series sorted by order
seriesSchema.statics.getAllSeriesSorted = function() {
  return this.find({}).sort({ order: 1, createdAt: 1 });
};

// Static method to get active series sorted by order
seriesSchema.statics.getActiveSeries = function() {
  return this.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
};

const Series = mongoose.model('Series', seriesSchema);

module.exports = Series;
