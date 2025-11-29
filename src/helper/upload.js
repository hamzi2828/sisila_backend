// src/helper/upload.js
const multer = require('multer');
const { put, del } = require('@vercel/blob');
const path = require('path');

// Allowed image mime types
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

// File size limit (default 5MB)
const MAX_FILE_MB = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 5);
const MAX_FILE_BYTES = Math.max(1, MAX_FILE_MB) * 1024 * 1024;

// Larger file size limit for hero images (20MB)
const MAX_HERO_FILE_MB = 20;
const MAX_HERO_FILE_BYTES = MAX_HERO_FILE_MB * 1024 * 1024;

// Use memory storage for Vercel Blob uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_BYTES } });

// Hero upload with larger file size limit
const heroUpload = multer({ storage, fileFilter, limits: { fileSize: MAX_HERO_FILE_BYTES } });

/**
 * Upload a buffer to Vercel Blob
 * @param {Buffer} buffer - File buffer
 * @param {string} originalname - Original filename
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>} - Full Vercel Blob URL
 */
async function uploadToBlob(buffer, originalname, mimetype) {
  const timestamp = Date.now();
  const rand = Math.round(Math.random() * 1e9);
  const ext = path.extname(originalname || '').toLowerCase();
  const base = path.basename((originalname || 'file').replace(/\s+/g, '-'), ext);
  const filename = `${timestamp}-${rand}-${base}${ext}`;

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mimetype,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

/**
 * Delete a file from Vercel Blob
 * @param {string} url - Full Vercel Blob URL to delete
 */
async function deleteFromBlob(url) {
  if (!url || !url.includes('blob.vercel-storage.com')) {
    return; // Not a blob URL, skip
  }

  try {
    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    console.error('Error deleting from blob:', error);
  }
}

/**
 * Middleware to upload files to Vercel Blob after multer processes them
 * Transforms req.file and req.files to include blob URLs
 */
function uploadToVercelBlob(req, res, next) {
  return async (err) => {
    if (err) return next(err);

    try {
      // Handle single file upload (req.file)
      if (req.file && req.file.buffer) {
        const url = await uploadToBlob(req.file.buffer, req.file.originalname, req.file.mimetype);
        req.file.blobUrl = url;
        req.file.filename = url; // Replace filename with full URL for backward compatibility
      }

      // Handle multiple files upload (req.files)
      if (req.files) {
        // req.files can be an array or an object with field names as keys
        if (Array.isArray(req.files)) {
          // Array of files
          for (const file of req.files) {
            if (file.buffer) {
              const url = await uploadToBlob(file.buffer, file.originalname, file.mimetype);
              file.blobUrl = url;
              file.filename = url;
            }
          }
        } else {
          // Object with field names as keys
          for (const fieldName of Object.keys(req.files)) {
            const filesArray = req.files[fieldName];
            if (Array.isArray(filesArray)) {
              for (const file of filesArray) {
                if (file.buffer) {
                  const url = await uploadToBlob(file.buffer, file.originalname, file.mimetype);
                  file.blobUrl = url;
                  file.filename = url;
                }
              }
            }
          }
        }
      }

      next();
    } catch (error) {
      console.error('Error uploading to Vercel Blob:', error);
      next(error);
    }
  };
}

/**
 * Create middleware chain for single file upload
 * @param {string} fieldName - Form field name
 */
function uploadSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, uploadToVercelBlob(req, res, next));
  };
}

/**
 * Create middleware chain for array of files
 * @param {string} fieldName - Form field name
 * @param {number} maxCount - Maximum number of files
 */
function uploadArray(fieldName, maxCount) {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, uploadToVercelBlob(req, res, next));
  };
}

/**
 * Create middleware chain for multiple fields
 * @param {Array} fields - Array of {name, maxCount} objects
 */
function uploadFields(fields) {
  return (req, res, next) => {
    upload.fields(fields)(req, res, uploadToVercelBlob(req, res, next));
  };
}

/**
 * Create middleware chain for hero uploads (larger file size)
 * @param {Array} fields - Array of {name, maxCount} objects
 */
function heroUploadFields(fields) {
  return (req, res, next) => {
    heroUpload.fields(fields)(req, res, uploadToVercelBlob(req, res, next));
  };
}

/**
 * Create middleware chain for single hero upload
 * @param {string} fieldName - Form field name
 */
function heroUploadSingle(fieldName) {
  return (req, res, next) => {
    heroUpload.single(fieldName)(req, res, uploadToVercelBlob(req, res, next));
  };
}

/**
 * Helper to get the public URL (returns URL as-is since it's already full URL from Vercel Blob)
 * Kept for backward compatibility - now just returns the URL
 * @param {string} url - The URL from blob upload
 * @returns {string} - The same URL
 */
function toPublicPath(url) {
  // If it's already a full URL (from blob), return as-is
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  // For backward compatibility with old /uploads/ paths
  if (url && url.startsWith('/uploads/')) {
    return url;
  }
  return url;
}

module.exports = {
  upload,
  uploadSingle,
  uploadArray,
  uploadFields,
  heroUploadSingle,
  heroUploadFields,
  uploadToBlob,
  deleteFromBlob,
  toPublicPath,
  ALLOWED_IMAGE_MIME_TYPES,
};
