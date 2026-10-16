// src/routes/allRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
// Admin-only routes: signed in AND role === 'admin' (checked against the database).
const adminAuth = [auth, requireAdmin];
const categoryController = require('../controller/categoryController');
const colorController = require('../controller/colorController');
const sizeController = require('../controller/sizeController');
const productController = require('../controller/productController');
const blogCategoryController = require('../controller/blogCategoryController');
const blogController = require('../controller/blogController');
const authorController = require('../controller/authorController');
const settingsController = require('../controller/settingsController');
const heroSlideController = require('../controller/heroSlideController');
const blogHeroController = require('../controller/blogHeroController');
const productDetailController = require('../controller/productDetailController');
const cartController = require('../controller/cartController');
const wishlistController = require('../controller/wishlistController');
const contactController = require('../controller/contactController');
const { uploadSingle, uploadArray, uploadFields, heroUploadFields, toPublicPath } = require('../helper/upload');

// Map each HTTP method to the corresponding controller function
router.post('/user/login', userController.loginUser);
router.post('/user/signup', userController.createUser);
router.post('/user/google-login', userController.googleLoginUser);
router.put('/update/user', auth, userController.updateUser);
router.delete('/user', auth, userController.deleteUser);
router.get('/userDetailForProfile', auth, userController.getUserDetailForProfile);
router.get('/get/allUsers', adminAuth, userController.getAllUsers);

// Google OAuth 2.0 redirect flow
router.get('/auth/google', userController.startGoogleOAuth);
router.get('/auth/google/callback', userController.googleOAuthCallback);

// Admin operations by ID
router.put('/update/status/:id', adminAuth, userController.updateUserStatusById);
router.put('/update/role/:id', adminAuth, userController.updateUserRoleById);
router.delete('/delete/:id', adminAuth, userController.deleteUserById);

// Category routes
router.get('/categories/featured-with-products', categoryController.listFeaturedCategoriesWithProducts);
router.get('/categories/public', categoryController.listCategories); // Public route for popular categories
router.get('/categories', categoryController.listCategories);
router.post('/categories', adminAuth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), categoryController.createCategory);
router.put('/categories/:id', adminAuth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), categoryController.updateCategory);
router.delete('/categories/:id', adminAuth, categoryController.deleteCategory);

// Color routes
router.get('/colors', adminAuth, colorController.listColors);
router.post('/colors', adminAuth, colorController.createColor);
router.put('/colors/:id', adminAuth, colorController.updateColor);
router.delete('/colors/:id', adminAuth, colorController.deleteColor);

// Size routes
router.get('/sizes', adminAuth, sizeController.listSizes);
router.post('/sizes', adminAuth, sizeController.createSize);
router.put('/sizes/:id', adminAuth, sizeController.updateSize);
router.delete('/sizes/:id', adminAuth, sizeController.deleteSize);

// Product routes
router.get('/products/random', productController.getRandomProducts); // Public route for random products
router.get('/products/latest', productController.getLatestProducts); // Public route for latest products
router.get('/products', productController.listProducts);
router.get('/products/:id', adminAuth, productController.getProductById);
// Accept multipart form-data with fields: thumbnail (1), banners (up to 10), colorThumbnail (multiple), colorBanner (multiple)
router.post(
  '/products',
  adminAuth,
  uploadFields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'banners', maxCount: 10 },
    { name: 'colorThumbnail', maxCount: 10 }, // Allow multiple color thumbnails
    { name: 'colorBanner', maxCount: 20 },    // Allow multiple color banners
  ]),
  productController.createProduct
);
router.put('/products/:id', adminAuth, uploadFields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'banners', maxCount: 10 },
    { name: 'colorThumbnail', maxCount: 10 }, // Allow multiple color thumbnails
    { name: 'colorBanner', maxCount: 20 },    // Allow multiple color banners
  ]), productController.updateProduct);
  
router.delete('/products/:id', adminAuth, productController.deleteProduct);

// Blog Category routes
router.get('/blog-categories', blogCategoryController.getAllCategories);
router.get('/blog-categories/with-count', blogCategoryController.getCategoriesWithCount);
router.get('/blog-categories/:id', blogCategoryController.getCategoryById);
router.post('/blog-categories', adminAuth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), blogCategoryController.createCategory);
router.put('/blog-categories/:id', adminAuth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), blogCategoryController.updateCategory);
router.patch('/blog-categories/:id/toggle-active', adminAuth, blogCategoryController.toggleCategoryActive);
router.patch('/blog-categories/:id/toggle-featured', adminAuth, blogCategoryController.toggleCategoryFeatured);
router.delete('/blog-categories/:id', adminAuth, blogCategoryController.deleteCategory);

// Blog routes
router.get('/blogs', blogController.getAllBlogs);
router.get('/blogs/featured', blogController.getFeaturedBlogs);
router.get('/blogs/featured-categories', blogController.getFeaturedCategoriesWithBlogs);
router.get('/blogs/slug/:slug', blogController.getBlogBySlug);
router.get('/blogs/:id', blogController.getBlogById);
router.post(
  '/blogs',
  adminAuth,
  uploadFields([
    { name: 'image', maxCount: 1 },      // Cover image (required)
    { name: 'thumbnail', maxCount: 1 }   // Thumbnail (optional)
  ]),
  blogController.createBlog
);
router.put(
  '/blogs/:id',
  adminAuth,
  uploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  blogController.updateBlog
);
router.delete('/blogs/:id', adminAuth, blogController.deleteBlog);
router.patch('/blogs/:id/views', blogController.incrementViews);
router.patch('/blogs/:id/featured', adminAuth, blogController.toggleFeatured);
router.patch('/blogs/:id/status', adminAuth, blogController.toggleStatus);
router.get('/categories/:categoryId/blogs', blogController.getBlogsByCategory);

// Author routes
router.get('/authors', authorController.getAllAuthors);
router.get('/authors/dropdown', authorController.getAuthorsForDropdown);
router.get('/authors/:id', authorController.getAuthorById);
router.post('/authors', adminAuth, uploadFields([{ name: 'avatar', maxCount: 1 }]), authorController.createAuthor);
router.put('/authors/:id', adminAuth, uploadFields([{ name: 'avatar', maxCount: 1 }]), authorController.updateAuthor);
router.patch('/authors/:id/toggle-active', adminAuth, authorController.toggleAuthorActive);
router.delete('/authors/:id', adminAuth, authorController.deleteAuthor);

// Blog Hero routes
router.get('/blog-hero/active', blogHeroController.getActiveHero); // Public route
router.get('/blog-hero', adminAuth, blogHeroController.getAllHeroes);
router.get('/blog-hero/:id', adminAuth, blogHeroController.getHeroById);
router.post('/blog-hero', adminAuth, heroUploadFields([{ name: 'backgroundImage', maxCount: 1 }]), blogHeroController.createHero);
router.put('/blog-hero/:id', adminAuth, heroUploadFields([{ name: 'backgroundImage', maxCount: 1 }]), blogHeroController.updateHero);
router.delete('/blog-hero/:id', adminAuth, blogHeroController.deleteHero);
router.patch('/blog-hero/:id/toggle-active', adminAuth, blogHeroController.toggleActiveStatus);
router.post('/blog-hero/upload-image', adminAuth, heroUploadFields([{ name: 'image', maxCount: 1 }]), blogHeroController.uploadImage);

// Settings routes
router.get('/settings', adminAuth, settingsController.getSettings);
router.put('/settings', adminAuth, settingsController.updateSettings);
router.post('/settings/logo', adminAuth, uploadFields([{ name: 'logo', maxCount: 1 }]), settingsController.uploadLogo);
router.delete('/settings/logo', adminAuth, settingsController.removeLogo);
router.post('/settings/reset', adminAuth, settingsController.resetSettings);

// Hero Slide routes
router.get('/hero-slides/active', heroSlideController.getActiveSlides); // Public route
router.get('/hero-slides', adminAuth, heroSlideController.getAllSlides);
router.get('/hero-slides/:id', adminAuth, heroSlideController.getSlideById);
router.post('/hero-slides', adminAuth, uploadSingle('image'), heroSlideController.createSlide);
router.put('/hero-slides/:id', adminAuth, uploadSingle('image'), heroSlideController.updateSlide);
router.patch('/hero-slides/:id/status', adminAuth, heroSlideController.toggleSlideStatus);
router.patch('/hero-slides/:id/order', adminAuth, heroSlideController.updateSlideOrder);
router.delete('/hero-slides/:id', adminAuth, heroSlideController.deleteSlide);

// Product Detail routes (Public - No authentication required)
router.get('/product-detail/:idOrSlug', productDetailController.getProductDetail);
router.get('/product-detail/:productId/related', productDetailController.getRelatedProducts);
router.get('/products-by-category/:category', productDetailController.getProductsByCategory);
router.get('/products/search', productDetailController.searchProducts);
router.get('/products/featured', productDetailController.getFeaturedProducts);
router.get('/products/top-rated', productDetailController.getTopRatedProducts);
router.get('/product-categories', productDetailController.getProductCategories);

// Cart routes (Authentication required)
router.post('/api/cart', auth, cartController.addToCart);
router.get('/api/cart', auth, cartController.getCart);
router.put('/api/cart/item/:itemId', auth, cartController.updateCartItem);
router.delete('/api/cart/item/:itemId', auth, cartController.removeFromCart);
router.delete('/api/cart', auth, cartController.clearCart);

// Wishlist routes (Authentication required)
router.get('/api/wishlist', auth, wishlistController.getWishlist);
router.post('/api/wishlist', auth, wishlistController.addToWishlist);
router.delete('/api/wishlist/:productId', auth, wishlistController.removeFromWishlist);
router.delete('/api/wishlist', auth, wishlistController.clearWishlist);



// Payment and Order Management Routes for gymwear
const paymentController = require('../controller/paymentController');

router.post('/api/payment/create-checkout-session', auth, paymentController.createCheckoutSession);
router.post('/api/payment/cod-order', auth, paymentController.createCodOrder);
router.post('/api/orders/track', paymentController.trackOrder);
router.post('/api/payment/create-payment-intent', paymentController.createPaymentIntent);
router.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);
router.get('/api/payment/verify/:sessionId', auth, paymentController.verifyPayment);
router.get('/api/payment/stripe-public-key', paymentController.getPublicKey);
router.get('/api/payment/orders', auth, paymentController.getOrders);
router.get('/api/payment/orders/:orderId', auth, paymentController.getOrderById);
router.get('/api/payment/getAllOrders', adminAuth, paymentController.getAllOrders);
router.put('/api/payment/orders/:orderId/status', adminAuth, paymentController.updateOrderStatus);
router.post('/api/payment/orders/:orderId/refund', adminAuth, paymentController.refundOrder);

const publicProductController = require('../controller/publicProductController');
const newsletterController = require('../controller/newsletterController');
// Public Product Routes - No authentication required
router.get('/api/public/products', publicProductController.getAllPublishedProducts);
router.get('/api/public/products/latest', publicProductController.getLatestProducts);
router.get('/api/public/products/random', publicProductController.getRandomProducts);
router.get('/api/public/products/featured', publicProductController.getFeaturedProducts);
router.get('/api/public/products/search', publicProductController.searchProducts);
router.get('/api/public/products/collection/:collectionType/:collectionId', publicProductController.getProductsByCollection);
router.get('/api/public/products/category/:category', publicProductController.getProductsByCategory);
router.get('/api/public/products/:id', publicProductController.getProductById);

// Newsletter routes
router.post('/api/newsletter/subscribe', newsletterController.subscribe);
router.post('/api/newsletter/unsubscribe', newsletterController.unsubscribe);
router.get('/api/newsletter/stats', adminAuth, newsletterController.getStats);
router.get('/api/newsletter/subscribers', adminAuth, newsletterController.getAllSubscribers);

// Contact routes
router.post('/api/contact/submit', contactController.submitContact); // Public route
router.get('/api/contact', adminAuth, contactController.getAllContacts); // Admin only
router.get('/api/contact/stats', adminAuth, contactController.getContactStats); // Admin only
router.get('/api/contact/:id', adminAuth, contactController.getContactById); // Admin only
router.put('/api/contact/:id/status', adminAuth, contactController.updateContactStatus); // Admin only
router.put('/api/contact/:id/priority', adminAuth, contactController.updateContactPriority); // Admin only
router.post('/api/contact/:id/note', adminAuth, contactController.addAdminNote); // Admin only
router.put('/api/contact/:id/assign', adminAuth, contactController.assignContact); // Admin only
router.put('/api/contact/:id/response-sent', adminAuth, contactController.markResponseSent); // Admin only
router.delete('/api/contact/:id', adminAuth, contactController.deleteContact); // Admin only

// Theme routes
const themeController = require('../controller/themeController');
router.get('/themes/active', themeController.getActiveThemes); // Public route
router.get('/themes', adminAuth, themeController.getAllThemes); // Admin only
router.get('/themes/:id', adminAuth, themeController.getThemeById); // Admin only
router.post('/themes', adminAuth, themeController.createTheme); // Admin only
router.put('/themes/:id', adminAuth, themeController.updateTheme); // Admin only
router.patch('/themes/:id/status', adminAuth, themeController.toggleThemeStatus); // Admin only
router.patch('/themes/:id/order', adminAuth, themeController.updateThemeOrder); // Admin only
router.delete('/themes/:id', adminAuth, themeController.deleteTheme); // Admin only

// Series routes
const seriesController = require('../controller/seriesController');
router.get('/series/active', seriesController.getActiveSeries); // Public route
router.get('/series', adminAuth, seriesController.getAllSeries); // Admin only
router.get('/series/:id', adminAuth, seriesController.getSeriesById); // Admin only
router.post('/series', adminAuth, seriesController.createSeries); // Admin only
router.put('/series/:id', adminAuth, seriesController.updateSeries); // Admin only
router.patch('/series/:id/status', adminAuth, seriesController.toggleSeriesStatus); // Admin only
router.patch('/series/:id/order', adminAuth, seriesController.updateSeriesOrder); // Admin only
router.delete('/series/:id', adminAuth, seriesController.deleteSeries); // Admin only

module.exports = router;
