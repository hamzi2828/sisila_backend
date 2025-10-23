const stripe = require('../config/stripe');
const Order = require('../models/order');
const Product = require('../models/product');
const Cart = require('../models/cartModel');

class PaymentService {
  async createCheckoutSession(userId, cartItems, shippingAddress, billingAddress) {
    try {
      const lineItems = await this.prepareLineItems(cartItems);

      const orderNumber = await Order.generateOrderNumber();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.FRONTEND_ORIGIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_ORIGIN}/checkout/cancel`,
        customer_email: shippingAddress.email,
        metadata: {
          userId: userId ? userId.toString() : 'guest',
          orderNumber: orderNumber,
          shippingAddress: JSON.stringify(shippingAddress),
          billingAddress: JSON.stringify(billingAddress),
          cartItems: JSON.stringify(cartItems.map(item => ({
            productId: item.productId || item.product._id || item.product,
            variantId: item.variantId,
            sku: item.sku,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            price: item.price
          })))
        },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 0,
                currency: 'usd',
              },
              display_name: 'Free shipping',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 5,
                },
                maximum: {
                  unit: 'business_day',
                  value: 7,
                },
              },
            },
          },
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 1500,
                currency: 'usd',
              },
              display_name: 'Express shipping',
              delivery_estimate: {
                minimum: {
                  unit: 'business_day',
                  value: 1,
                },
                maximum: {
                  unit: 'business_day',
                  value: 3,
                },
              },
            },
          },
        ],
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  async prepareLineItems(cartItems) {
    const lineItems = [];

    for (const item of cartItems) {
      const product = item.product.name ? item.product : await Product.findById(item.product);

      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: `Size: ${item.size}, Color: ${item.color}`,
            images: product.images && product.images.length > 0 ? [product.images[0]] : [],
            metadata: {
              productId: product._id.toString(),
              size: item.size,
              color: item.color
            }
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      });
    }

    return lineItems;
  }

  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: metadata
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  async handleWebhook(signature, payload) {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  async handleCheckoutSessionCompleted(session) {
    try {
      const metadata = session.metadata;
      const shippingAddress = JSON.parse(metadata.shippingAddress);
      const billingAddress = JSON.parse(metadata.billingAddress);
      const cartItems = JSON.parse(metadata.cartItems);
      const userId = metadata.userId !== 'guest' ? metadata.userId : null;

      console.log('💾 DATABASE SAVE DEBUG:');
      console.log('- Metadata userId:', metadata.userId);
      console.log('- Parsed userId:', userId);
      console.log('- Will save to database as user:', userId);

      const orderItems = [];
      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (product) {
          const orderItem = {
            product: product._id,
            variantId: item.variantId,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
            color: item.color
          };
          orderItems.push(orderItem);
        }
      }

      const shippingCost = session.shipping_cost ? session.shipping_cost.amount_total / 100 : 0;
      const subtotal = (session.amount_total / 100) - shippingCost;
      const tax = subtotal * 0.08;

      const order = new Order({
        user: userId,
        orderNumber: metadata.orderNumber,
        items: orderItems,
        shippingAddress: shippingAddress,
        billingAddress: billingAddress,
        paymentMethod: 'stripe',
        paymentStatus: 'completed',
        orderStatus: 'processing',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        subtotal: subtotal,
        shippingCost: shippingCost,
        tax: tax,
        total: session.amount_total / 100
      });

      console.log('💾 FINAL CHECK - Order user field before saving:', order.user);

      await order.save();

      console.log('✅ Order saved with user:', order.user);

      if (userId) {
        const cartUpdateResult = await Cart.findOneAndUpdate(
          { userId: userId },
          { $set: { items: [] } }
        );
        console.log(`Cart cleared for user ${userId}`, cartUpdateResult ? 'Success' : 'Cart not found');
      } else {
        console.log('Guest order - no cart to clear');
      }

      console.log(`Order ${order.orderNumber} created successfully for ${userId ? 'user ' + userId : 'guest'}`);
    } catch (error) {
      console.error('Error handling checkout session completion:', error);
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
      if (order) {
        order.paymentStatus = 'completed';
        order.orderStatus = 'processing';
        await order.save();

        // Clear cart as backup (should already be cleared in checkout session)
        if (order.user) {
          await Cart.findOneAndUpdate(
            { userId: order.user },
            { $set: { items: [] } }
          );
          console.log(`Cart cleared for user ${order.user} (backup)`);
        }

        console.log(`Payment succeeded for order ${order.orderNumber}`);
      }
    } catch (error) {
      console.error('Error handling payment intent succeeded:', error);
    }
  }

  async handlePaymentIntentFailed(paymentIntent) {
    try {
      const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
      if (order) {
        order.paymentStatus = 'failed';
        order.orderStatus = 'cancelled';
        order.cancelledAt = new Date();
        await order.save();
        console.log(`Payment failed for order ${order.orderNumber}`);
      }
    } catch (error) {
      console.error('Error handling payment intent failed:', error);
    }
  }

  async handleChargeRefunded(charge) {
    try {
      const order = await Order.findOne({ stripePaymentIntentId: charge.payment_intent });
      if (order) {
        order.paymentStatus = 'refunded';
        order.orderStatus = 'refunded';
        order.refundedAt = new Date();
        await order.save();
        console.log(`Order ${order.orderNumber} refunded`);
      }
    } catch (error) {
      console.error('Error handling charge refunded:', error);
    }
  }

  async getCheckoutSession(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error('Error retrieving checkout session:', error);
      throw new Error(`Failed to retrieve checkout session: ${error.message}`);
    }
  }

  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  async refundPayment(paymentIntentId, amount = null) {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);
      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();