// src/routes/allRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const auth = require('../middleware/auth');
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
const packageController = require('../controller/packageController');
const packageRegistrationController = require('../controller/packageRegistrationController');
const { uploadSingle, uploadArray, uploadFields, heroUploadFields, toPublicPath } = require('../helper/upload');

// Map each HTTP method to the corresponding controller function
router.post('/user/login', userController.loginUser);
router.post('/user/signup', userController.createUser);
router.post('/user/google-login', userController.googleLoginUser);
router.put('/update/user', auth, userController.updateUser);
router.delete('/user', auth, userController.deleteUser);
router.get('/userDetailForProfile', auth, userController.getUserDetailForProfile);
router.get('/get/allUsers', auth, userController.getAllUsers);

// Google OAuth 2.0 redirect flow
router.get('/auth/google', userController.startGoogleOAuth);
router.get('/auth/google/callback', userController.googleOAuthCallback);

// Admin operations by ID
router.put('/update/status/:id', auth, userController.updateUserStatusById);
router.put('/update/role/:id', auth, userController.updateUserRoleById);
router.delete('/delete/:id', auth, userController.deleteUserById);

// Category routes
router.get('/categories/featured-with-products', categoryController.listFeaturedCategoriesWithProducts);
router.get('/categories/public', categoryController.listCategories); // Public route for popular categories
router.get('/categories', categoryController.listCategories);
router.post('/categories', auth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), categoryController.createCategory);
router.put('/categories/:id', auth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), categoryController.updateCategory);
router.delete('/categories/:id', auth, categoryController.deleteCategory);

// Color routes
router.get('/colors', auth, colorController.listColors);
router.post('/colors', auth, colorController.createColor);
router.put('/colors/:id', auth, colorController.updateColor);
router.delete('/colors/:id', auth, colorController.deleteColor);

// Size routes
router.get('/sizes', auth, sizeController.listSizes);
router.post('/sizes', auth, sizeController.createSize);
router.put('/sizes/:id', auth, sizeController.updateSize);
router.delete('/sizes/:id', auth, sizeController.deleteSize);

// Product routes
router.get('/products/random', productController.getRandomProducts); // Public route for random products
router.get('/products/latest', productController.getLatestProducts); // Public route for latest products
router.get('/products', productController.listProducts);
router.get('/products/:id', auth, productController.getProductById);
// Accept multipart form-data with fields: thumbnail (1), banners (up to 10), colorThumbnail (multiple), colorBanner (multiple)
router.post(
  '/products',
  auth,
  uploadFields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'banners', maxCount: 10 },
    { name: 'colorThumbnail', maxCount: 10 }, // Allow multiple color thumbnails
    { name: 'colorBanner', maxCount: 20 },    // Allow multiple color banners
  ]),
  productController.createProduct
);
router.put('/products/:id', auth, uploadFields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'banners', maxCount: 10 },
    { name: 'colorThumbnail', maxCount: 10 }, // Allow multiple color thumbnails
    { name: 'colorBanner', maxCount: 20 },    // Allow multiple color banners
  ]), productController.updateProduct);
  
router.delete('/products/:id', auth, productController.deleteProduct);

// Blog Category routes
router.get('/blog-categories', blogCategoryController.getAllCategories);
router.get('/blog-categories/with-count', blogCategoryController.getCategoriesWithCount);
router.get('/blog-categories/:id', blogCategoryController.getCategoryById);
router.post('/blog-categories', auth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), blogCategoryController.createCategory);
router.put('/blog-categories/:id', auth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), blogCategoryController.updateCategory);
router.patch('/blog-categories/:id/toggle-active', auth, blogCategoryController.toggleCategoryActive);
router.patch('/blog-categories/:id/toggle-featured', auth, blogCategoryController.toggleCategoryFeatured);
router.delete('/blog-categories/:id', auth, blogCategoryController.deleteCategory);

// Blog routes
router.get('/blogs', blogController.getAllBlogs);
router.get('/blogs/featured', blogController.getFeaturedBlogs);
router.get('/blogs/featured-categories', blogController.getFeaturedCategoriesWithBlogs);
router.get('/blogs/slug/:slug', blogController.getBlogBySlug);
router.get('/blogs/:id', blogController.getBlogById);
router.post(
  '/blogs',
  auth,
  uploadFields([
    { name: 'image', maxCount: 1 },      // Cover image (required)
    { name: 'thumbnail', maxCount: 1 }   // Thumbnail (optional)
  ]),
  blogController.createBlog
);
router.put(
  '/blogs/:id',
  auth,
  uploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  blogController.updateBlog
);
router.delete('/blogs/:id', auth, blogController.deleteBlog);
router.patch('/blogs/:id/views', blogController.incrementViews);
router.patch('/blogs/:id/featured', auth, blogController.toggleFeatured);
router.patch('/blogs/:id/status', auth, blogController.toggleStatus);
router.get('/categories/:categoryId/blogs', blogController.getBlogsByCategory);

// Author routes
router.get('/authors', authorController.getAllAuthors);
router.get('/authors/dropdown', authorController.getAuthorsForDropdown);
router.get('/authors/:id', authorController.getAuthorById);
router.post('/authors', auth, uploadFields([{ name: 'avatar', maxCount: 1 }]), authorController.createAuthor);
router.put('/authors/:id', auth, uploadFields([{ name: 'avatar', maxCount: 1 }]), authorController.updateAuthor);
router.patch('/authors/:id/toggle-active', auth, authorController.toggleAuthorActive);
router.delete('/authors/:id', auth, authorController.deleteAuthor);

// Blog Hero routes
router.get('/blog-hero/active', blogHeroController.getActiveHero); // Public route
router.get('/blog-hero', auth, blogHeroController.getAllHeroes);
router.get('/blog-hero/:id', auth, blogHeroController.getHeroById);
router.post('/blog-hero', auth, heroUploadFields([{ name: 'backgroundImage', maxCount: 1 }]), blogHeroController.createHero);
router.put('/blog-hero/:id', auth, heroUploadFields([{ name: 'backgroundImage', maxCount: 1 }]), blogHeroController.updateHero);
router.delete('/blog-hero/:id', auth, blogHeroController.deleteHero);
router.patch('/blog-hero/:id/toggle-active', auth, blogHeroController.toggleActiveStatus);
router.post('/blog-hero/upload-image', auth, heroUploadFields([{ name: 'image', maxCount: 1 }]), blogHeroController.uploadImage);

// Settings routes
router.get('/settings', auth, settingsController.getSettings);
router.put('/settings', auth, settingsController.updateSettings);
router.post('/settings/logo', auth, uploadFields([{ name: 'logo', maxCount: 1 }]), settingsController.uploadLogo);
router.delete('/settings/logo', auth, settingsController.removeLogo);
router.post('/settings/reset', auth, settingsController.resetSettings);

// Hero Slide routes
router.get('/hero-slides/active', heroSlideController.getActiveSlides); // Public route
router.get('/hero-slides', auth, heroSlideController.getAllSlides);
router.get('/hero-slides/:id', auth, heroSlideController.getSlideById);
router.post('/hero-slides', auth, uploadSingle('image'), heroSlideController.createSlide);
router.put('/hero-slides/:id', auth, uploadSingle('image'), heroSlideController.updateSlide);
router.patch('/hero-slides/:id/status', auth, heroSlideController.toggleSlideStatus);
router.patch('/hero-slides/:id/order', auth, heroSlideController.updateSlideOrder);
router.delete('/hero-slides/:id', auth, heroSlideController.deleteSlide);

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
router.post('/api/payment/create-payment-intent', paymentController.createPaymentIntent);
router.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);
router.get('/api/payment/verify/:sessionId', auth, paymentController.verifyPayment);
router.get('/api/payment/stripe-public-key', paymentController.getPublicKey);
router.get('/api/payment/orders', auth, paymentController.getOrders);
router.get('/api/payment/orders/:orderId', auth, paymentController.getOrderById);
router.get('/api/payment/getAllOrders', auth, paymentController.getAllOrders);
router.put('/api/payment/orders/:orderId/status', auth, paymentController.updateOrderStatus);
router.post('/api/payment/orders/:orderId/refund', auth, paymentController.refundOrder);


// Payment and Order Management Routes for Gymfolio (Package Subscriptions)
const gymfolioPaymentController = require('../controller/gymfolioPaymentController');

router.post('/api/gymfolio/payment/create-package-checkout-session', auth, gymfolioPaymentController.createPackageCheckoutSession);
router.get('/api/gymfolio/payment/verify/:sessionId', auth, gymfolioPaymentController.verifyPackagePayment);
router.get('/api/gymfolio/payment/stripe-public-key', gymfolioPaymentController.getPublicKey);
router.post('/api/gymfolio/payment/webhook', express.raw({ type: 'application/json' }), gymfolioPaymentController.handleWebhook);
router.get('/api/gymfolio/orders', auth, gymfolioPaymentController.getUserOrders);
router.get('/api/gymfolio/orders/:orderId', auth, gymfolioPaymentController.getOrderById);
router.get('/api/gymfolio/getAllOrders', auth, gymfolioPaymentController.getAllOrders);
router.put('/api/gymfolio/orders/:orderId/status', auth, gymfolioPaymentController.updateOrderStatus);
router.post('/api/gymfolio/orders/:orderId/cancel', auth, gymfolioPaymentController.cancelSubscription);
router.get('/api/gymfolio/subscription/status', auth, gymfolioPaymentController.getSubscriptionStatus);


const publicProductController = require('../controller/publicProductController');
const newsletterController = require('../controller/newsletterController');
// Public Product Routes - No authentication required
router.get('/api/public/products', publicProductController.getAllPublishedProducts);
router.get('/api/public/products/latest', publicProductController.getLatestProducts);
router.get('/api/public/products/random', publicProductController.getRandomProducts);
router.get('/api/public/products/featured', publicProductController.getFeaturedProducts);
router.get('/api/public/products/search', publicProductController.searchProducts);
router.get('/api/public/products/:id', publicProductController.getProductById);
router.get('/api/public/products/category/:category', publicProductController.getProductsByCategory);

// Newsletter routes
router.post('/api/newsletter/subscribe', newsletterController.subscribe);
router.post('/api/newsletter/unsubscribe', newsletterController.unsubscribe);
router.get('/api/newsletter/stats', auth, newsletterController.getStats);
router.get('/api/newsletter/subscribers', auth, newsletterController.getAllSubscribers);

// Contact routes
router.post('/api/contact/submit', contactController.submitContact); // Public route
router.get('/api/contact', auth, contactController.getAllContacts); // Admin only
router.get('/api/contact/stats', auth, contactController.getContactStats); // Admin only
router.get('/api/contact/:id', auth, contactController.getContactById); // Admin only
router.put('/api/contact/:id/status', auth, contactController.updateContactStatus); // Admin only
router.put('/api/contact/:id/priority', auth, contactController.updateContactPriority); // Admin only
router.post('/api/contact/:id/note', auth, contactController.addAdminNote); // Admin only
router.put('/api/contact/:id/assign', auth, contactController.assignContact); // Admin only
router.put('/api/contact/:id/response-sent', auth, contactController.markResponseSent); // Admin only
router.delete('/api/contact/:id', auth, contactController.deleteContact); // Admin only

// Package routes
router.get('/packages/active', packageController.getActivePackages); // Public route
router.get('/packages', auth, packageController.getAllPackages); // Admin only
router.get('/packages/:id', auth, packageController.getPackageById); // Admin only
router.post('/packages', auth, packageController.createPackage); // Admin only
router.put('/packages/:id', auth, packageController.updatePackage); // Admin only
router.patch('/packages/:id/status', auth, packageController.togglePackageStatus); // Admin only
router.patch('/packages/:id/order', auth, packageController.updatePackageOrder); // Admin only
router.delete('/packages/:id', auth, packageController.deletePackage); // Admin only

// Package Registration routes
router.post('/package-registrations', packageRegistrationController.createRegistration); // Public route
router.get('/package-registrations/stats', auth, packageRegistrationController.getRegistrationStats); // Admin only
router.get('/package-registrations', auth, packageRegistrationController.getAllRegistrations); // Admin only
router.get('/package-registrations/:id', auth, packageRegistrationController.getRegistrationById); // Admin only
router.put('/package-registrations/:id/status', auth, packageRegistrationController.updateRegistrationStatus); // Admin only
router.delete('/package-registrations/:id', auth, packageRegistrationController.deleteRegistration); // Admin only

// Trainer routes
const trainerController = require('../controller/trainerController');
router.get('/trainers/active', trainerController.getActiveTrainers); // Public route
router.get('/trainers/featured', trainerController.getFeaturedTrainers); // Public route
router.get('/trainers/slug/:slug', trainerController.getTrainerBySlug); // Public route
router.get('/trainers', auth, trainerController.getAllTrainers); // Admin only
router.get('/trainers/:id', auth, trainerController.getTrainerById); // Admin only
router.post('/trainers', auth, uploadSingle('image'), trainerController.createTrainer); // Admin only
router.put('/trainers/:id', auth, uploadSingle('image'), trainerController.updateTrainer); // Admin only
router.patch('/trainers/:id/status', auth, trainerController.toggleTrainerStatus); // Admin only
router.patch('/trainers/:id/featured', auth, trainerController.toggleTrainerFeatured); // Admin only
router.delete('/trainers/:id', auth, trainerController.deleteTrainer); // Admin only

// Gym Class routes
const gymClassController = require('../controller/gymClassController');
router.get('/gym-classes/active', gymClassController.getActiveClasses); // Public route
router.get('/gym-classes/featured', gymClassController.getFeaturedClasses); // Public route
router.get('/gym-classes/category/:category', gymClassController.getClassesByCategory); // Public route
router.get('/gym-classes/slug/:slug', gymClassController.getClassBySlug); // Public route
router.get('/gym-classes', auth, gymClassController.getAllClasses); // Admin only
router.get('/gym-classes/:id',  gymClassController.getClassById); // Admin only
router.post('/gym-classes', auth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), gymClassController.createClass); // Admin only
router.put('/gym-classes/:id', auth, uploadFields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), gymClassController.updateClass); // Admin only
router.patch('/gym-classes/:id/status', auth, gymClassController.toggleClassStatus); // Admin only
router.patch('/gym-classes/:id/featured', auth, gymClassController.toggleClassFeatured); // Admin only
router.delete('/gym-classes/:id', auth, gymClassController.deleteClass); // Admin only

module.exports = router;
