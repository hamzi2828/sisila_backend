const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  variant: {
    variantId: String,  // Unique variant identifier
    variantSku: String,
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field on save
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries (userId already has unique index from schema definition)
cartSchema.index({ 'items.productId': 1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;