require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { mongoose, ensureConnection } = require('./src/config/mongo');
const app = express();
const port = process.env.PORT || 4000;
const allRoutes = require('./src/routes/allRoutes');

const dashboardRoutes = require('./src/routes/dashboardRoutes');

// CORS: allow the storefront domains to access the backend
const { ALLOWED_ORIGINS } = require('./src/config/origins');
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

// Parse JSON (but not for webhook endpoint)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    next();
  } else {
    express.json({ limit: '50mb' })(req, res, next);
  }
});

// Also add urlencoded parser for form data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically (must match path in helper/upload.js)
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Middleware to ensure MongoDB connection for serverless environments
app.use('/api', async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (error) {
    console.error('Failed to ensure MongoDB connection:', error);
    res.status(503).json({
      error: 'Database connection failed',
      message: 'Please try again in a moment'
    });
  }
});


// Dashboard routes (authentication required)
app.use('/dashboard', async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (error) {
    console.error('Failed to ensure MongoDB connection:', error);
    res.status(503).json({
      error: 'Database connection failed',
      message: 'Please try again in a moment'
    });
  }
}, dashboardRoutes);

// Add the same middleware for other routes that need database
app.use('/', async (req, res, next) => {
  // Skip for static routes and non-database routes
  if (req.path.startsWith('/uploads') || req.path === '/' || req.path === '/health') {
    return next();
  }
  try {
    await ensureConnection();
    next();
  } catch (error) {
    console.error('Failed to ensure MongoDB connection:', error);
    res.status(503).json({
      error: 'Database connection failed',
      message: 'Please try again in a moment'
    });
  }
});

// Welcome route
app.get('/', (req, res) => {
  try {
    const mongoose = require('mongoose');

    res.json({
      message: 'Welcome to Silsila API',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error in welcome route:', error);
    res.status(500).json({
      message: 'Welcome to Silsila API',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isDbConnected = mongoose.connection.readyState === 1;

    res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'healthy' : 'unhealthy',
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Protected routes (authentication required for most)
app.use('/', async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (error) {
    console.error('Failed to ensure MongoDB connection:', error);
    res.status(503).json({
      error: 'Database connection failed',
      message: 'Please try again in a moment'
    });
  }
}, allRoutes);

// Global error handler for Multer and other errors.
// Always answer with JSON that has a human-readable `message`, so the admin UI can show the real reason.
const { MAX_FILE_MB } = require('./src/helper/upload');
const MULTER_FIELD_LABELS = {
  thumbnail: 'thumbnail',
  banners: 'banner',
  colorThumbnail: 'colour thumbnail',
  colorBanner: 'colour banner',
  banner: 'banner',
  image: 'image',
  backgroundImage: 'background image',
  avatar: 'avatar',
  logo: 'logo',
};
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const knownField = Object.prototype.hasOwnProperty.call(MULTER_FIELD_LABELS, error.field);
  const fieldLabel = knownField ? MULTER_FIELD_LABELS[error.field] : 'uploaded';

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      // upload.js sets maxFileMb to the limit of the uploader that rejected the file (e.g. 20 MB for hero images)
      message: `The ${fieldLabel} image is too large (max ${error.maxFileMb || MAX_FILE_MB} MB per image). Please use a smaller image.`,
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE' && error.field && !knownField) {
    return res.status(400).json({
      error: 'Unexpected file',
      message: `Unexpected file field "${error.field}".`,
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files',
      message: `Too many ${fieldLabel} images were sent in one request. Please remove some images and try again.`,
    });
  }

  if (error.name === 'MulterError') {
    return res.status(400).json({
      error: 'Upload error',
      message: `Image upload failed: ${error.message}`,
    });
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(415).json({ error: 'Unsupported file type', message: error.message });
  }

  if (error.code === 'BLOB_UPLOAD_FAILED') {
    return res.status(502).json({ error: 'Image storage error', message: error.message });
  }

  // Body parser errors (JSON/urlencoded bodies above the configured limit, malformed JSON)
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large', message: 'The request is too large.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON', message: 'The request body is not valid JSON.' });
  }

  // Default error handler
  console.error(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : 'Request error',
    message: error.message || 'Something went wrong',
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

