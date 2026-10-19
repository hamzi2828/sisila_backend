// src/model/size.js

const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Helpers to format fields
// Short size codes (s, xl, xxl, 3xl) are upper-cased; anything else ("Free size", "32") keeps its casing.
function capitalizeFirstWord(str) {
  const s = String(str || '').trim();
  if (!s) return s;
  if (/^[a-z0-9]{1,4}$/i.test(s)) return s.toUpperCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Ensure formatting on create/save
sizeSchema.pre('save', function (next) {
  if (this.isModified('name') && typeof this.name === 'string') {
    this.name = capitalizeFirstWord(this.name);
  }
  if (this.isModified('slug') && typeof this.slug === 'string') {
    this.slug = String(this.slug).trim().toLowerCase();
  }
  next();
});

// Ensure formatting on findOneAndUpdate / findByIdAndUpdate
sizeSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;
  if ($set.name && typeof $set.name === 'string') {
    $set.name = capitalizeFirstWord($set.name);
  }
  if ($set.slug && typeof $set.slug === 'string') {
    $set.slug = String($set.slug).trim().toLowerCase();
  }
  if (update.$set) this.setUpdate({ ...update, $set }); else this.setUpdate($set);
  next();
});

module.exports = mongoose.model('Size', sizeSchema);
