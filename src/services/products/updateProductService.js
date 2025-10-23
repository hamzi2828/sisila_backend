// updateProductService.js
const path = require('path');
const crypto = require('crypto');
const Product = require(path.resolve(__dirname, '../../models/Product'));

// Helper function to convert uploaded filename to public path
const toPublicPath = (filename) => {
  if (!filename) return null;
  return `/uploads/${filename}`;
};

// Generate unique variant ID
const generateVariantId = (productName, color, size) => {
  // Create a readable but unique ID format: PRODUCT_COLOR_SIZE_RANDOM
  const productCode = productName.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
  const colorCode = color.substring(0, 3).toUpperCase();
  const sizeCode = size.charAt(0).toUpperCase();
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `${productCode}-${colorCode}-${sizeCode}-${randomSuffix}`;
};

// Generate SKU for variant
const generateVariantSKU = (productName, color, size, index) => {
  const productCode = productName.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
  const colorCode = color.substring(0, 3).toUpperCase();
  const sizeCode = size.charAt(0).toUpperCase();
  const variantNumber = String(index + 1).padStart(2, '0');

  return `${productCode}-${colorCode}-${sizeCode}-${variantNumber}`;
};

const updateProductService = {
  /**
   * Update a product with new data and files
   * @param {string} id - Product ID
   * @param {Object} payload - Request body data
   * @param {Object} files - Uploaded files
   * @returns {Promise<Object>} Updated product
   */
  updateProduct: async (id, payload, files) => {
    // Initialize colorMedia from payload
    let colorMedia = null;
    
    // Parse colorMedia if it's a string
    if (typeof payload.colorMedia === 'string') {
      try {
        colorMedia = JSON.parse(payload.colorMedia);
        console.log('Parsed colorMedia:', colorMedia);
      } catch (error) {
        console.error('Failed to parse colorMedia JSON:', error);
        colorMedia = null;
      }
    } else if (payload.colorMedia && typeof payload.colorMedia === 'object') {
      colorMedia = payload.colorMedia;
    }
    
    // Process new color-specific media files
    if (files.colorThumbnail || files.colorBanner) {
      console.log('Processing color-specific files...');
      
      // Initialize colorMedia if not already present
      if (!colorMedia) colorMedia = {};
      
      // Process color thumbnails
      if (files.colorThumbnail) {
        const thumbFiles = Array.isArray(files.colorThumbnail) ? files.colorThumbnail : [files.colorThumbnail];
        thumbFiles.forEach(file => {
          // Extract color from filename (format: color_originalname.ext)
          const colorMatch = file.originalname.match(/^([^_]+)_/);
          if (colorMatch) {
            const color = colorMatch[1];
            if (!colorMedia[color]) colorMedia[color] = { bannerUrls: [] };
            colorMedia[color].thumbnailUrl = toPublicPath(file.filename);
            console.log(`Added thumbnail for color ${color}: ${file.filename}`);
          }
        });
      }
      
      // Process color banners
      if (files.colorBanner) {
        const bannerFiles = Array.isArray(files.colorBanner) ? files.colorBanner : [files.colorBanner];
        bannerFiles.forEach(file => {
          // Extract color from filename
          const colorMatch = file.originalname.match(/^([^_]+)_/);
          if (colorMatch) {
            const color = colorMatch[1];
            if (!colorMedia[color]) colorMedia[color] = { bannerUrls: [] };
            if (!colorMedia[color].bannerUrls) colorMedia[color].bannerUrls = [];
            
            // Add new banner URL to existing banners
            const newBannerUrl = toPublicPath(file.filename);
            colorMedia[color].bannerUrls.push(newBannerUrl);
            console.log(`Added banner for color ${color}: ${file.filename}`);
          }
        });
      }
    }
    
    // Process existingColorThumbnails and existingColorBanners
    // These come as arrays of JSON strings, so we need to parse them
    if (payload.existingColorThumbnails && !colorMedia) {
      colorMedia = {};
    }
    
    if (payload.existingColorThumbnails) {
      const thumbsArray = Array.isArray(payload.existingColorThumbnails) 
        ? payload.existingColorThumbnails 
        : [payload.existingColorThumbnails];
        
      thumbsArray.forEach(item => {
        try {
          const parsed = typeof item === 'string' ? JSON.parse(item) : item;
          if (parsed.color && parsed.url) {
            if (!colorMedia[parsed.color]) colorMedia[parsed.color] = { bannerUrls: [] };
            // Only set if we don't have a new thumbnail for this color
            if (!colorMedia[parsed.color].thumbnailUrl) {
              colorMedia[parsed.color].thumbnailUrl = parsed.url;
            }
          }
        } catch (e) {
          console.error('Error parsing existingColorThumbnails item:', e);
        }
      });
    }
    
    if (payload.existingColorBanners) {
      const bannersArray = Array.isArray(payload.existingColorBanners) 
        ? payload.existingColorBanners 
        : [payload.existingColorBanners];
        
      bannersArray.forEach(item => {
        try {
          const parsed = typeof item === 'string' ? JSON.parse(item) : item;
          if (parsed.color && parsed.urls) {
            if (!colorMedia[parsed.color]) colorMedia[parsed.color] = { bannerUrls: [] };
            // Merge existing banners with any new ones (put existing first)
            const existingBanners = parsed.urls || [];
            const newBanners = colorMedia[parsed.color].bannerUrls || [];
            // Filter out existing URLs to avoid duplicates
            const existingUrls = existingBanners.filter(url => !newBanners.includes(url));
            colorMedia[parsed.color].bannerUrls = [...existingUrls, ...newBanners].slice(0, 5);
          }
        } catch (e) {
          console.error('Error parsing existingColorBanners item:', e);
        }
      });
    }

    // Build updates object
    const updates = {};
    
    if (typeof payload.name !== 'undefined') updates.name = String(payload.name).trim();
    if (typeof payload.slug !== 'undefined') updates.slug = String(payload.slug).trim().toLowerCase();
    if (typeof payload.category !== 'undefined') updates.category = String(payload.category).trim();
    if (typeof payload.price !== 'undefined') updates.price = Number(payload.price);
    if (typeof payload.discountedPrice !== 'undefined') {
      updates.discountedPrice = payload.discountedPrice === null ? undefined : Number(payload.discountedPrice);
    }
    if (typeof payload.stock !== 'undefined') updates.stock = Number(payload.stock);
    if (typeof payload.status !== 'undefined') updates.status = String(payload.status);
    if (typeof payload.featured !== 'undefined') updates.featured = payload.featured === 'true' || payload.featured === true;
    
    // Handle description fields
    if (typeof payload.description !== 'undefined') {
      updates.description = payload.description ? String(payload.description).trim() : undefined;
    }
    if (typeof payload.shortDescription !== 'undefined') {
      updates.shortDescription = payload.shortDescription ? String(payload.shortDescription).trim() : undefined;
    }
    if (typeof payload.features !== 'undefined') {
      updates.features = payload.features ? String(payload.features).trim() : undefined;
    }

    // Handle SEO fields
    if (typeof payload.metaTitle !== 'undefined') {
      updates.metaTitle = payload.metaTitle ? String(payload.metaTitle).trim() : undefined;
    }
    if (typeof payload.metaDescription !== 'undefined') {
      updates.metaDescription = payload.metaDescription ? String(payload.metaDescription).trim() : undefined;
    }
    if (typeof payload.metaKeywords !== 'undefined') {
      updates.metaKeywords = payload.metaKeywords ? String(payload.metaKeywords).trim() : undefined;
    }
    if (typeof payload.metaSchema !== 'undefined') {
      updates.metaSchema = payload.metaSchema ? String(payload.metaSchema).trim() : undefined;
    }
    
    // Handle thumbnail - check for new upload or existing
    if (files.thumbnail && files.thumbnail[0]) {
      updates.thumbnailUrl = toPublicPath(files.thumbnail[0].filename);
    } else if (payload.existingThumbnail) {
      updates.thumbnailUrl = payload.existingThumbnail;
    } else if (typeof payload.thumbnailUrl !== 'undefined') {
      updates.thumbnailUrl = payload.thumbnailUrl ? String(payload.thumbnailUrl).trim() : undefined;
    }
    
    // Handle banner images
    if (files.banners && files.banners.length > 0) {
      const uploadedBanners = files.banners.map(f => toPublicPath(f.filename));
      
      let existingBanners = [];
      if (payload.existingBanners) {
        try {
          existingBanners = JSON.parse(payload.existingBanners);
          if (!Array.isArray(existingBanners)) existingBanners = [];
        } catch (e) {
          console.error('Error parsing existingBanners:', e);
        }
      }
      
      updates.bannerUrls = [...existingBanners, ...uploadedBanners].slice(0, 5);
    } else if (payload.existingBanners) {
      try {
        updates.bannerUrls = JSON.parse(payload.existingBanners);
        if (!Array.isArray(updates.bannerUrls)) updates.bannerUrls = [];
        updates.bannerUrls = updates.bannerUrls.slice(0, 5).map(u => String(u));
      } catch (e) {
        console.error('Error parsing existingBanners:', e);
        updates.bannerUrls = [];
      }
    } else if (typeof payload.bannerUrls !== 'undefined') {
      updates.bannerUrls = Array.isArray(payload.bannerUrls) 
        ? payload.bannerUrls.slice(0, 5).map((u) => String(u)) 
        : [];
    }
    
    if (typeof payload.productType !== 'undefined') {
      updates.productType = payload.productType === 'variant' ? 'variant' : 'single';
    }
    
    // Parse variants if it's a string
    if (typeof payload.variants === 'string') {
      try {
        updates.variants = JSON.parse(payload.variants);
        console.log('Parsed variants:', updates.variants);
      } catch (error) {
        console.error('Failed to parse variants JSON:', error);
        updates.variants = [];
      }
    } else if (Array.isArray(payload.variants)) {
      updates.variants = payload.variants;
    }

    // Process variants to ensure they have variantId and sku
    if (Array.isArray(updates.variants) && updates.variants.length > 0) {
      const productName = updates.name || payload.name || 'Product';

      updates.variants = updates.variants.map((variant, index) => {
        // Generate variantId if missing
        if (!variant.variantId) {
          variant.variantId = generateVariantId(productName, variant.color, variant.size);
        }

        // Generate SKU if missing
        if (!variant.sku) {
          variant.sku = generateVariantSKU(productName, variant.color, variant.size, index);
        }

        // Ensure numeric fields are numbers
        variant.price = Number(variant.price) || 0;
        variant.stock = Number(variant.stock) || 0;
        if (variant.discountedPrice !== undefined) {
          variant.discountedPrice = Number(variant.discountedPrice) || undefined;
        }

        return variant;
      });

      console.log('Processed variants with variantId:', updates.variants);
    }
    
    // Handle colorMedia for MongoDB Map type
    if (colorMedia && typeof colorMedia === 'object' && Object.keys(colorMedia).length > 0) {
      console.log('Creating MongoDB Map from colorMedia object');
      try {
        // Convert to Map format that MongoDB expects
        const colorMediaMap = new Map();
        
        Object.entries(colorMedia).forEach(([key, value]) => {
          console.log(`Adding to Map - key: ${key}, value:`, value);
          colorMediaMap.set(key, value);
        });
        
        console.log('Final Map size:', colorMediaMap.size);
        updates.colorMedia = colorMediaMap;
      } catch (error) {
        console.error('Error creating MongoDB Map:', error);
      }
    }
    
    console.log('Final updates object:', {
      ...updates,
      colorMedia: updates.colorMedia ? `Map with ${updates.colorMedia.size} entries` : 'not set'
    });

    // Update the product in database
    const updated = await Product.findByIdAndUpdate(
      id, 
      { $set: updates }, 
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      throw new Error('Product not found');
    }
    
    return updated;
  }
};

module.exports = updateProductService;