const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const Order = require('../models/order');
const Cart = require('../models/cartModel');

const paymentController = {
  async createCheckoutSession(req, res) {
    try {
      console.log('🔍 PAYMENT DEBUG: Create checkout session called');
      console.log('🔍 PAYMENT DEBUG: Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🔍 PAYMENT DEBUG: req.user:', JSON.stringify(req.user, null, 2));

      const { cartItems, shippingAddress, billingAddress } = req.body;
      const userId = req.user ? (req.user._id || req.user.id) : null;

      console.log('💾 USER ID DEBUG: req.user._id:', req.user ? req.user._id : 'no req.user');
      console.log('💾 USER ID DEBUG: req.user.id:', req.user ? req.user.id : 'no req.user');
      console.log('💾 USER ID DEBUG: Final userId:', userId);
      console.log('🔍 PAYMENT DEBUG: CartItems received:', JSON.stringify(cartItems, null, 2));

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      if (!shippingAddress) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address is required'
        });
      }

      const session = await paymentService.createCheckoutSession(
        userId,
        cartItems,
        shippingAddress,
        billingAddress || shippingAddress
      );

      res.status(200).json({
        success: true,
        sessionId: session.sessionId,
        url: session.url
      });
    } catch (error) {
      console.error('Error in createCheckoutSession:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create checkout session'
      });
    }
  },

  async createPaymentIntent(req, res) {
    try {
      const { amount, currency, metadata } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      const result = await paymentService.createPaymentIntent(
        amount,
        currency || 'usd',
        metadata || {}
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in createPaymentIntent:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment intent'
      });
    }
  },

  async handleWebhook(req, res) {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing stripe signature'
      });
    }

    try {
      const result = await paymentService.handleWebhook(signature, req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  async verifyPayment(req, res) {
    try {
      console.log('🔍 VERIFY DEBUG: Verify payment called');
      console.log('🔍 VERIFY DEBUG: req.user:', JSON.stringify(req.user, null, 2));
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const session = await paymentService.getCheckoutSession(sessionId);

      if (session.payment_status === 'paid') {
        const order = await Order.findOne({ stripeSessionId: sessionId });

        res.status(200).json({
          success: true,
          paid: true,
          order: order,
          session: {
            id: session.id,
            payment_status: session.payment_status,
            customer_email: session.customer_email,
            amount_total: session.amount_total / 100
          }
        });
      } else {
        res.status(200).json({
          success: true,
          paid: false,
          session: {
            id: session.id,
            payment_status: session.payment_status
          }
        });
      }
    } catch (error) {
      console.error('Error in verifyPayment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify payment'
      });
    }
  },

  async getOrders(req, res) {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      const result = await orderService.getUserOrders(userId, {
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getOrders:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch orders'
      });
    }
  },

  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const result = await orderService.getOrderById(orderId, userId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getOrderById:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch order'
      });
    }
  },

  async getAllOrders(req, res) {
    try {
      const { status, page = 1, limit = 50, search } = req.query;

      const result = await orderService.getAllOrders({
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getAllOrders:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch all orders'
      });
    }
  },

  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const result = await orderService.updateOrderStatus(orderId, status);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update order status'
      });
    }
  },

  async refundOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { amount, reason } = req.body;

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (!order.stripePaymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'No payment intent found for this order'
        });
      }

      if (order.paymentStatus === 'refunded') {
        return res.status(400).json({
          success: false,
          message: 'Order has already been refunded'
        });
      }

      const refundAmount = amount || order.total;
      const result = await paymentService.refundPayment(
        order.stripePaymentIntentId,
        refundAmount
      );

      if (result.success) {
        order.paymentStatus = 'refunded';
        order.orderStatus = 'refunded';
        order.refundedAt = new Date();
        if (reason) {
          order.notes = `Refund reason: ${reason}`;
        }
        await order.save();
      }

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        refund: result
      });
    } catch (error) {
      console.error('Error in refundOrder:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process refund'
      });
    }
  },

  async getPublicKey(req, res) {
    try {
      res.status(200).json({
        success: true,
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY
      });
    } catch (error) {
      console.error('Error in getPublicKey:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get public key'
      });
    }
  }
};

module.exports = paymentController;