// src/model/settings.js

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // General Settings
    siteName: { 
      type: String, 
      required: true, 
      trim: true, 
      default: 'GymWear' 
    },
    siteUrl: { 
      type: String, 
      required: true, 
      trim: true, 
      default: 'https://gymwear.example.com' 
    },
    logoUrl: { 
      type: String, 
      default: '/images/logo.png',
      trim: true 
    },
    timezone: { 
      type: String, 
      default: 'UTC+05:00',
      trim: true 
    },
    dateFormat: { 
      type: String, 
      default: 'MM/DD/YYYY',
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      trim: true 
    },
    
    // Notification Settings
    emailNotifications: { 
      type: Boolean, 
      default: true 
    },
    marketingEmails: { 
      type: Boolean, 
      default: false 
    },
    securityAlerts: { 
      type: Boolean, 
      default: true 
    },
    
    // Security Settings
    twoFactorAuth: { 
      type: Boolean, 
      default: false 
    },
    
    // Billing Settings
    currency: { 
      type: String, 
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY'],
      trim: true 
    },
    paymentMethods: [{
      type: String,
      enum: ['credit_card', 'paypal', 'stripe', 'razorpay'],
      default: ['credit_card', 'paypal']
    }],

    // Social Media Links
    youtubeUrl: {
      type: String,
      trim: true,
      default: ''
    },
    facebookUrl: {
      type: String,
      trim: true,
      default: ''
    },
    instagramUrl: {
      type: String,
      trim: true,
      default: ''
    },

    // Additional metadata
    isActive: { 
      type: Boolean, 
      default: true 
    },
    version: { 
      type: String, 
      default: '1.0.0' 
    }
  },
  { 
    timestamps: true,
    collection: 'settings' 
  }
);

// Index for faster queries
settingsSchema.index({ isActive: 1 });

// Static method to get or create settings
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ isActive: true }).lean();
  
  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      siteName: 'GymWear',
      siteUrl: 'https://gymwear.example.com',
      logoUrl: '/images/logo.png',
      timezone: 'UTC+05:00',
      dateFormat: 'MM/DD/YYYY',
      emailNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
      twoFactorAuth: false,
      currency: 'USD',
      paymentMethods: ['credit_card', 'paypal'],
      youtubeUrl: '',
      facebookUrl: '',
      instagramUrl: '',
      isActive: true
    });
  }
  
  return settings;
};

// Static method to update settings
settingsSchema.statics.updateSettings = async function(updateData) {
  let settings = await this.findOne({ isActive: true });
  
  if (!settings) {
    // Create new settings if none exist
    settings = new this(updateData);
  } else {
    // Update existing settings
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        settings[key] = updateData[key];
      }
    });
  }
  
  await settings.save();
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);