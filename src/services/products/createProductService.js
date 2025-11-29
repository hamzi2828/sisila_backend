// createProductService.js
const Product = require('../../model/product');
const crypto = require('crypto');

// Helper function to get public path from filename
// Now filename already contains full Vercel Blob URL
const toPublicPath = (filename) => {
  if (!filename) return null;
  // If it's already a full URL, return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  // For backward compatibility with old paths
  return filename;
};

// Helper function to parse JSON if string or return original value
const parseMaybeJSON = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

// Helper function to check if value is a valid number
const isNumber = (value) => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
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

// Process color-specific media files
const processColorMedia = (files, existingColorMedia = {}) => {
  const colorMedia = typeof existingColorMedia === 'object' ? existingColorMedia : {};
  
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
      }
    });
  }
  
  return colorMedia;
};

const createProductService = {
  /**
   * Create a new product with the provided data and files
   * @param {Object} payload - Request body data
   * @param {Object} files - Uploaded files
   * @returns {Promise<Object>} Created product
   */
  createProduct: async (payload, files) => {
    let {
      name,
      slug,
      category,
      price,
      discountedPrice,
      stock,
      status = 'draft',
      thumbnailUrl,
      bannerUrls = [],
      productType = 'single',
      variants = [],
      colorMedia,
      description,
      shortDescription,
      features,
      metaTitle,
      metaDescription,
      metaKeywords,
      metaSchema,
      collectionType = 'none',
      collectionId,
    } = payload;

    // Parse fields that might come as JSON strings via multipart/form-data
    bannerUrls = parseMaybeJSON(bannerUrls) || [];
    variants = parseMaybeJSON(variants) || [];
    colorMedia = parseMaybeJSON(colorMedia);

    // If files were uploaded via Multer fields, map them to URLs
    const thumbFile = Array.isArray(files?.thumbnail) ? files.thumbnail[0] : undefined;
    const bannerFiles = Array.isArray(files?.banners) ? files.banners : [];
    
    // Process color-specific media files if present
    if (files.colorThumbnail || files.colorBanner || payload.existingColorThumbnails || payload.existingColorBanners) {
      console.log('Files received:', Object.keys(files));
      console.log('Processing color media...');
      colorMedia = processColorMedia(files, colorMedia);
      
      // Handle existing color thumbnails (for edit scenarios)
      if (payload.existingColorThumbnails) {
        const thumbsArray = Array.isArray(payload.existingColorThumbnails) 
          ? payload.existingColorThumbnails 
          : [payload.existingColorThumbnails];
          
        thumbsArray.forEach(item => {
          try {
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            if (parsed.color && parsed.url) {
              if (!colorMedia[parsed.color]) colorMedia[parsed.color] = { bannerUrls: [] };
              if (!colorMedia[parsed.color].thumbnailUrl) {
                colorMedia[parsed.color].thumbnailUrl = parsed.url;
              }
            }
          } catch (e) {
            console.error('Error parsing existingColorThumbnails item:', e);
          }
        });
      }
      
      // Handle existing color banners (for edit scenarios)
      if (payload.existingColorBanners) {
        const bannersArray = Array.isArray(payload.existingColorBanners) 
          ? payload.existingColorBanners 
          : [payload.existingColorBanners];
          
        bannersArray.forEach(item => {
          try {
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            if (parsed.color && parsed.urls) {
              if (!colorMedia[parsed.color]) colorMedia[parsed.color] = { bannerUrls: [] };
              const existingBanners = parsed.urls || [];
              const newBanners = colorMedia[parsed.color].bannerUrls || [];
              const existingUrls = existingBanners.filter(url => !newBanners.includes(url));
              colorMedia[parsed.color].bannerUrls = [...existingUrls, ...newBanners].slice(0, 10);
            }
          } catch (e) {
            console.error('Error parsing existingColorBanners item:', e);
          }
        });
      }
      
      console.log('Final processed colorMedia:', colorMedia);
    }

    if (thumbFile) {
      thumbnailUrl = toPublicPath(thumbFile.filename);
    }
    if (bannerFiles.length) {
      const uploadedBanners = bannerFiles.map((f) => toPublicPath(f.filename));
      if (Array.isArray(bannerUrls) && bannerUrls.length) {
        bannerUrls = [...uploadedBanners, ...bannerUrls];
      } else {
        bannerUrls = uploadedBanners;
      }
    }

    // Coerce numeric fields when coming from multipart strings
    if (typeof price === 'string' && price !== '') price = Number(price);
    if (typeof discountedPrice === 'string' && discountedPrice !== '') discountedPrice = Number(discountedPrice);
    if (typeof stock === 'string' && stock !== '') stock = Number(stock);
    
    if (!name || !slug || !category) {
      throw new Error('name, slug and category are required');
    }

    name = String(name).trim();
    slug = String(slug).trim().toLowerCase();
    category = String(category).trim();
    status = ['published', 'draft', 'out_of_stock'].includes(status) ? status : 'draft';

    if (productType === 'variant') {
      if (!Array.isArray(variants) || variants.length === 0) {
        throw new Error('At least one variant is required for variant products');
      }
      
      // Basic validation and ID generation for variants
      variants = variants.map((v, index) => {
        const color = String(v.color || '').trim();
        const size = String(v.size || '').trim();

        return {
          variantId: v.variantId || generateVariantId(name, color, size), // Generate if not provided
          color,
          size,
          price: Number(v.price || 0),
          stock: Number(v.stock || 0),
          sku: v.sku ? String(v.sku).trim() : generateVariantSKU(name, color, size, index), // Generate SKU if not provided
          discountedPrice: typeof v.discountedPrice === 'number' ? Number(v.discountedPrice) : undefined,
        };
      });

      for (const v of variants) {
        if (!v.color || !v.size) {
          throw new Error('Each variant must include color and size');
        }
        if (!isNumber(v.price) || v.price < 0) {
          throw new Error('Variant price must be a non-negative number');
        }
        if (!Number.isInteger(v.stock) || v.stock < 0) {
          throw new Error('Variant stock must be a non-negative integer');
        }
        if (isNumber(v.discountedPrice) && v.discountedPrice > v.price) {
          throw new Error('Variant discountedPrice must be less than or equal to price');
        }
      }

      // Derive stock and base price if not provided
      const derivedStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      const basePrice = isNumber(price) ? price : variants[0]?.price || 0;
      stock = derivedStock;
      price = basePrice;
      
      // For variant product, top-level discountedPrice is optional and ignored by many UIs
      if (isNumber(discountedPrice) && discountedPrice > price) {
        throw new Error('discountedPrice must be less than or equal to price');
      }
    } else {
      // single product validations
      if (!isNumber(price) || price < 0) {
        throw new Error('price must be a non-negative number');
      }
      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error('stock must be a non-negative integer');
      }
      if (isNumber(discountedPrice) && discountedPrice > price) {
        throw new Error('discountedPrice must be less than or equal to price');
      }
    }

    // Enforce banner length on server as well
    if (Array.isArray(bannerUrls) && bannerUrls.length > 5) {
      bannerUrls = bannerUrls.slice(0, 5);
    }

    const doc = {
      name,
      slug,
      category,
      price,
      discountedPrice: isNumber(discountedPrice) ? discountedPrice : undefined,
      stock,
      status,
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : undefined,
      bannerUrls: Array.isArray(bannerUrls) ? bannerUrls.map((u) => String(u)) : [],
      productType: productType === 'variant' ? 'variant' : 'single',
      variants: Array.isArray(variants) ? variants : [],
      description: description ? String(description).trim() : undefined,
      shortDescription: shortDescription ? String(shortDescription).trim() : undefined,
      features: features ? String(features).trim() : undefined,
      metaTitle: metaTitle ? String(metaTitle).trim() : undefined,
      metaDescription: metaDescription ? String(metaDescription).trim() : undefined,
      metaKeywords: metaKeywords ? String(metaKeywords).trim() : undefined,
      metaSchema: metaSchema ? String(metaSchema).trim() : undefined,
      collectionType: ['theme', 'series', 'none'].includes(collectionType) ? collectionType : 'none',
      collectionId: collectionId && collectionType !== 'none' ? String(collectionId).trim() : undefined,
    };

    // Add colorMedia to the document
    if (colorMedia && typeof colorMedia === 'object' && Object.keys(colorMedia).length > 0) {
      console.log('Adding colorMedia to document:', colorMedia);
      doc.colorMedia = colorMedia;
    }

    console.log('Final document before saving:', JSON.stringify(doc, null, 2));
    const created = await Product.create(doc);
    console.log('Created product with colorMedia:', created.colorMedia);
    return created;
  }
};

module.exports = createProductService;