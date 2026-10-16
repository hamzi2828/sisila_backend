const stripe = require('../config/stripe');
const Order = require('../models/order');
const Product = require('../models/product');
const Cart = require('../models/cartModel');
const { storefrontOrigin } = require('../config/origins');

// Store currency and shipping rules (kept in sync with the storefront's src/lib/formatPrice.ts).
const CURRENCY = 'pkr';
const FREE_SHIPPING_THRESHOLD = 5000;
const STANDARD_SHIPPING_FEE = 250;
const EXPRESS_SHIPPING_FEE = 500;

function shippingCostFor(subtotal, method) {
  if (method === 'express') return EXPRESS_SHIPPING_FEE;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
}

function shippingRate(name, amount, minDays, maxDays) {
  return {
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: { amount: Math.round(amount * 100), currency: CURRENCY },
      display_name: name,
      delivery_estimate: {
        minimum: { unit: 'business_day', value: minDays },
        maximum: { unit: 'business_day', value: maxDays },
      },
    },
  };
}


// Stripe caps each metadata value at 500 characters, so long values are split across keys.
function packMeta(prefix, value) {
  const out = {};
  for (let i = 0, n = 0; i < value.length; i += 490, n++) out[`${prefix}_${n}`] = value.slice(i, i + 490);
  return out;
}

function unpackMeta(metadata, prefix) {
  let value = '';
  for (let n = 0; metadata[`${prefix}_${n}`] !== undefined; n++) value += metadata[`${prefix}_${n}`];
  return value;
}

// Resolve cart lines against the database so prices, names and variant details are authoritative.
async function priceCartLines(lines) {
  const items = [];
  for (const line of lines) {
    const product = await Product.findById(line.productId);
    if (!product || product.status !== 'published') continue;
    const wanted = line.variantId;
    const variant = wanted
      ? (product.variants || []).find((v) => v.variantId === wanted || String(v._id) === wanted)
      : null;
    items.push({
      product,
      variantId: (variant && variant.variantId) || wanted || 'default',
      sku: (variant && variant.sku) || line.sku || product.slug,
      quantity: Math.max(1, parseInt(line.quantity, 10) || 1),
      price: variant ? (variant.discountedPrice || variant.price) : (product.discountedPrice || product.price),
      size: (variant && variant.size) || 'One Size',
      color: (variant && variant.color) || 'Default',
    });
  }
  return items;
}

class PaymentService {
  async createCheckoutSession(userId, cartItems, shippingAddress, billingAddress, requestOrigin) {
    const origin = storefrontOrigin(requestOrigin);
    try {
      const items = await priceCartLines(cartItems.map((item) => ({
        productId: item.productId || (item.product && item.product._id) || item.product,
        variantId: item.variantId,
        sku: item.sku,
        quantity: item.quantity,
      })));
      if (items.length === 0) throw new Error('None of the items in your cart are available');

      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const orderNumber = await Order.generateOrderNumber();
      const cartCode = items.map((i) => `${i.product._id}~${i.variantId}~${i.quantity}`).join('|');

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: items.map((i) => ({
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: i.product.name,
              description: [i.color !== 'Default' && i.color, i.size !== 'One Size' && i.size].filter(Boolean).join(' / ') || undefined,
              images: i.product.thumbnailUrl ? [i.product.thumbnailUrl] : [],
            },
            unit_amount: Math.round(i.price * 100),
          },
          quantity: i.quantity,
        })),
        mode: 'payment',
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/payment`,
        customer_email: shippingAddress.email,
        metadata: {
          userId: userId ? userId.toString() : 'guest',
          orderNumber,
          ...packMeta('cart', cartCode),
          ...packMeta('ship', JSON.stringify(shippingAddress)),
        },
        shipping_options: [
          shippingRate(
            subtotal >= FREE_SHIPPING_THRESHOLD ? 'Free standard delivery' : 'Standard delivery',
            shippingCostFor(subtotal, 'standard'), 3, 5
          ),
          shippingRate('Express delivery', EXPRESS_SHIPPING_FEE, 1, 2),
        ],
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

  async createPaymentIntent(amount, currency = CURRENCY, metadata = {}) {
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

  // Cash on Delivery: build the order from the user's saved cart with prices taken from the
  // database (never from the client), then clear the cart.
  async createCodOrder(userId, shippingAddress, shippingMethod = 'standard') {
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      throw Object.assign(new Error('Your cart is empty'), { status: 400 });
    }

    const items = [];
    for (const item of cart.items) {
      const product = item.productId;
      if (!product || product.status !== 'published') continue;
      const wanted = item.variant && item.variant.variantId;
      const variant = wanted
        ? (product.variants || []).find((v) => v.variantId === wanted || String(v._id) === wanted)
        : null;
      const unitPrice = variant
        ? (variant.discountedPrice || variant.price)
        : (product.discountedPrice || product.price);
      items.push({
        product: product._id,
        variantId: (variant && variant.variantId) || wanted || 'default',
        sku: (variant && variant.sku) || (item.variant && item.variant.variantSku) || product.slug,
        quantity: item.quantity,
        price: unitPrice,
        size: (variant && variant.size) || 'One Size',
        color: (variant && variant.color) || 'Default',
      });
    }
    if (items.length === 0) {
      throw Object.assign(new Error('None of the items in your cart are available'), { status: 400 });
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = shippingCostFor(subtotal, shippingMethod);
    const order = await Order.create({
      user: userId,
      orderNumber: await Order.generateOrderNumber(),
      items,
      shippingAddress,
      billingAddress: shippingAddress,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      subtotal,
      shippingCost,
      tax: 0,
      total: subtotal + shippingCost,
      notes: shippingMethod === 'express' ? 'Express delivery' : 'Standard delivery',
    });

    cart.items = [];
    await cart.save();
    return order;
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

  // Save the order for a paid Checkout Session. Called from the webhook and from the success
  // page's verify call, so it must be idempotent: the first caller saves, later callers get the same order.
  async handleCheckoutSessionCompleted(session) {
    const existing = await Order.findOne({ stripeSessionId: session.id });
    if (existing) return existing;
    if (session.payment_status !== 'paid') return null;

    const metadata = session.metadata || {};
    const userId = metadata.userId && metadata.userId !== 'guest' ? metadata.userId : null;
    const lines = unpackMeta(metadata, 'cart').split('|').filter(Boolean).map((code) => {
      const [productId, variantId, quantity] = code.split('~');
      return { productId, variantId: variantId === 'default' ? undefined : variantId, quantity };
    });
    const items = await priceCartLines(lines);
    const shippingAddress = JSON.parse(unpackMeta(metadata, 'ship') || '{}');

    const shippingCost = session.shipping_cost ? session.shipping_cost.amount_total / 100 : 0;
    const total = session.amount_total / 100;
    try {
      const order = await Order.create({
        user: userId,
        orderNumber: metadata.orderNumber || await Order.generateOrderNumber(),
        items: items.map(({ product, ...rest }) => ({ ...rest, product: product._id })),
        shippingAddress,
        billingAddress: shippingAddress,
        paymentMethod: 'stripe',
        paymentStatus: 'completed',
        orderStatus: 'processing',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        subtotal: total - shippingCost,
        shippingCost,
        tax: 0,
        total,
      });
      if (userId) await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
      return order;
    } catch (error) {
      // Webhook and success page raced; the other one already saved this order.
      if (error.code === 11000) return Order.findOne({ stripeSessionId: session.id });
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