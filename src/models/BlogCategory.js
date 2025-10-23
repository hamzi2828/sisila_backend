// BlogCategory.js
const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    bannerUrl: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    platform: {
      type: String,
      enum: ['gymwear', 'gymfolio'],
      default: 'gymwear',
      required: [true, 'Platform is required']
    },
  },
  { timestamps: true }
);

// Virtual for blog count (to be populated when needed)
blogCategorySchema.virtual('blogCount', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// Check if the model already exists before compiling it
module.exports = mongoose.models.BlogCategory || mongoose.model('BlogCategory', blogCategorySchema);
