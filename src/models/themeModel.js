const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  href: {
    type: String,
    trim: true
  }
}, { _id: true });

const themeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Theme ID is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  tagline: {
    type: String,
    required: [true, 'Tagline is required'],
    trim: true,
    maxlength: [200, 'Tagline cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  cover: {
    type: String,
    required: [true, 'Cover image is required']
  },
  accent: {
    type: String,
    trim: true,
    default: 'from-stone-900/90 to-stone-500/10'
  },
  gallery: {
    type: [galleryImageSchema],
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
    min: [0, 'Order cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
themeSchema.index({ isActive: 1, order: 1 });
themeSchema.index({ id: 1 });

// Static method to get active themes sorted by order
themeSchema.statics.getActiveThemes = function() {
  return this.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
};

// Pre-save middleware to handle order
themeSchema.pre('save', async function(next) {
  if (this.isNew && this.order === 0) {
    const lastTheme = await this.constructor.findOne({}).sort({ order: -1 });
    this.order = lastTheme ? lastTheme.order + 1 : 1;
  }
  next();
});

const Theme = mongoose.model('Theme', themeSchema);

module.exports = Theme;
