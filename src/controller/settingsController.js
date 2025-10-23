// src/controller/settingsController.js

const Settings = require('../models/settings');
const fs = require('fs').promises;
const path = require('path');

const settingsController = {
  // GET /settings - Get current settings
  getSettings: async (req, res) => {
    try {
      const settings = await Settings.getSettings();
      
      return res.status(200).json({
        success: true,
        message: 'Settings retrieved successfully',
        data: settings
      });
    } catch (error) {
      console.error('Get settings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve settings',
        error: error.message
      });
    }
  },

  // PUT /settings - Update settings
  updateSettings: async (req, res) => {
    try {
      console.log('Request body:', req.body);

      const {
        siteName,
        siteUrl,
        timezone,
        dateFormat,
        emailNotifications,
        marketingEmails,
        securityAlerts,
        twoFactorAuth,
        currency,
        paymentMethods,
        youtubeUrl,
        facebookUrl,
        instagramUrl
      } = req.body;

      // Get current settings for partial updates
      const currentSettings = await Settings.getSettings();

      // Prepare update data with only provided fields
      const updateData = {};

      // Update only provided fields
      if (siteName !== undefined) updateData.siteName = siteName.trim();
      if (siteUrl !== undefined) updateData.siteUrl = siteUrl.trim();
      if (timezone !== undefined) updateData.timezone = timezone;
      if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
      if (emailNotifications !== undefined) updateData.emailNotifications = Boolean(emailNotifications);
      if (marketingEmails !== undefined) updateData.marketingEmails = Boolean(marketingEmails);
      if (securityAlerts !== undefined) updateData.securityAlerts = Boolean(securityAlerts);
      if (twoFactorAuth !== undefined) updateData.twoFactorAuth = Boolean(twoFactorAuth);
      if (currency !== undefined) updateData.currency = currency;

      // Handle social links
      if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
      if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl;
      if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl;

      // Handle payment methods array
      if (paymentMethods && Array.isArray(paymentMethods)) {
        updateData.paymentMethods = paymentMethods.filter(method =>
          ['credit_card', 'paypal', 'stripe', 'razorpay'].includes(method)
        );
      }

      // Ensure we have some data to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields provided for update'
        });
      }

      // Update settings
      const updatedSettings = await Settings.updateSettings(updateData);

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: updatedSettings
      });
    } catch (error) {
      console.error('Update settings error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: error.message
      });
    }
  },

  // POST /settings/logo - Upload logo
  uploadLogo: async (req, res) => {
    try {
      const logoFile = req.files?.logo?.[0];
      
      if (!logoFile) {
        return res.status(400).json({
          success: false,
          message: 'Logo file is required'
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(logoFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Please upload PNG, JPG, GIF, or WebP images only.'
        });
      }

      // Validate file size (5MB)
      if (logoFile.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size allowed is 5MB.'
        });
      }

      // Generate new logo URL
      const logoUrl = `/uploads/${logoFile.filename}`;

      // Get current settings to backup old logo
      const currentSettings = await Settings.getSettings();
      const oldLogoUrl = currentSettings.logoUrl;

      // Update settings with new logo URL
      const updatedSettings = await Settings.updateSettings({ logoUrl });

      // Remove old logo file if it exists and is not the default
      if (oldLogoUrl && oldLogoUrl !== '/images/logo.png' && oldLogoUrl.startsWith('/uploads/')) {
        try {
          const oldLogoPath = path.join(__dirname, '../../uploads', path.basename(oldLogoUrl));
          await fs.access(oldLogoPath); // Check if file exists
          await fs.unlink(oldLogoPath); // Delete old logo
          console.log('Old logo deleted:', oldLogoPath);
        } catch (err) {
          console.log('Could not delete old logo:', err.message);
          // Don't fail the request if old logo deletion fails
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Logo uploaded successfully',
        data: {
          logoUrl,
          settings: updatedSettings
        }
      });
    } catch (error) {
      console.error('Upload logo error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload logo',
        error: error.message
      });
    }
  },

  // DELETE /settings/logo - Remove logo (reset to default)
  removeLogo: async (req, res) => {
    try {
      // Get current settings
      const currentSettings = await Settings.getSettings();
      const currentLogoUrl = currentSettings.logoUrl;

      // Reset to default logo
      const defaultLogoUrl = '/images/logo.png';
      const updatedSettings = await Settings.updateSettings({ logoUrl: defaultLogoUrl });

      // Remove current logo file if it's uploaded (not default)
      if (currentLogoUrl && currentLogoUrl !== defaultLogoUrl && currentLogoUrl.startsWith('/uploads/')) {
        try {
          const logoPath = path.join(__dirname, '../../uploads', path.basename(currentLogoUrl));
          await fs.access(logoPath); // Check if file exists
          await fs.unlink(logoPath); // Delete logo
          console.log('Logo file deleted:', logoPath);
        } catch (err) {
          console.log('Could not delete logo file:', err.message);
          // Don't fail the request if logo deletion fails
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Logo reset to default successfully',
        data: updatedSettings
      });
    } catch (error) {
      console.error('Remove logo error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove logo',
        error: error.message
      });
    }
  },

  // POST /settings/reset - Reset all settings to default
  resetSettings: async (req, res) => {
    try {
      // Get current settings to backup logo
      const currentSettings = await Settings.getSettings();
      const currentLogoUrl = currentSettings.logoUrl;

      // Create default settings
      const defaultSettings = {
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
        instagramUrl: ''
      };

      // Update settings to default
      const resetSettings = await Settings.updateSettings(defaultSettings);

      // Remove uploaded logo if exists
      if (currentLogoUrl && currentLogoUrl !== '/images/logo.png' && currentLogoUrl.startsWith('/uploads/')) {
        try {
          const logoPath = path.join(__dirname, '../../uploads', path.basename(currentLogoUrl));
          await fs.access(logoPath);
          await fs.unlink(logoPath);
          console.log('Uploaded logo deleted during reset:', logoPath);
        } catch (err) {
          console.log('Could not delete uploaded logo during reset:', err.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Settings reset to default successfully',
        data: resetSettings
      });
    } catch (error) {
      console.error('Reset settings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to reset settings',
        error: error.message
      });
    }
  }
};

module.exports = settingsController;