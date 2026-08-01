import Customer from "../models/Customer.js";

/**
 * Order Integration Helper
 * Use these functions when implementing your Order system to automatically
 * create and update customers from orders.
 */

/**
 * Create or update customer from order
 * Call this after successfully creating an order
 *
 * @example
 * // In your order creation route:
 * import { handleOrderCustomer } from "../services/orderCustomerIntegration.js";
 *
 * // After order is created
 * const customer = await handleOrderCustomer(order);
 */
export async function handleOrderCustomer(order) {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      total: orderAmount,
      shippingAddress,
    } = order;

    // Validate required fields
    if (!customerName || !customerPhone || !orderAmount) {
      console.error("Missing required customer data from order");
      return null;
    }

    // Create or update customer
    const customer = await Customer.createOrUpdateFromOrder({
      customerName,
      customerPhone,
      customerEmail,
      orderAmount,
      shippingAddress,
    });

    console.log(`Customer ${customer._id} updated from order ${order._id}`);

    // Run AI analysis in background (don't wait)
    analyzeCustomerInBackground(customer._id);

    return customer;
  } catch (error) {
    console.error("Failed to handle order customer:", error);
    // Don't throw - order should still succeed even if customer update fails
    return null;
  }
}

/**
 * Track product view for customer
 * Call this when a customer views a product on public storefront
 *
 * @example
 * // In PublicProductDetail.jsx or similar:
 * const customerPhone = localStorage.getItem("customerPhone");
 * if (customerPhone) {
 *   await trackCustomerView(customerPhone, product._id, product.category);
 * }
 */
export async function trackCustomerView(customerPhone, productId, category) {
  try {
    const customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) return;

    // Increment products viewed
    customer.behavior.productsViewed += 1;

    // Add category to viewed categories (if not already there)
    if (!customer.behavior.categoriesViewed.includes(category)) {
      customer.behavior.categoriesViewed.push(category);
    }

    // Update last seen
    customer.behavior.lastSeenAt = new Date();

    await customer.save();

    console.log(
      `Tracked view for customer ${customer._id}: product ${productId}`,
    );
  } catch (error) {
    console.error("Failed to track customer view:", error);
    // Silently fail - don't disrupt user experience
  }
}

/**
 * Track cart abandonment
 * Call this when a customer adds to cart but doesn't complete order
 *
 * @example
 * // In your cart/checkout system:
 * setTimeout(() => {
 *   // Check if order was completed
 *   if (!orderCompleted) {
 *     trackCartAbandonment(customerPhone);
 *   }
 * }, 30 * 60 * 1000); // 30 minutes
 */
export async function trackCartAbandonment(customerPhone) {
  try {
    const customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) return;

    customer.behavior.cartAbandonments += 1;
    await customer.save();

    console.log(`Tracked cart abandonment for customer ${customer._id}`);
  } catch (error) {
    console.error("Failed to track cart abandonment:", error);
  }
}

/**
 * Update customer preferences from order
 * Analyze order items to infer customer preferences
 *
 * @example
 * // In your order creation route, after creating customer:
 * await updateCustomerPreferencesFromOrder(customer, orderItems);
 */
export async function updateCustomerPreferencesFromOrder(customer, orderItems) {
  try {
    // Extract fabrics, occasions, and colors from order items
    const fabrics = [];
    const occasions = [];
    const colors = [];

    orderItems.forEach((item) => {
      if (item.product) {
        // Extract fabric
        if (item.product.attributes?.fabric) {
          fabrics.push(item.product.attributes.fabric);
        }

        // Extract occasion
        if (item.product.attributes?.occasion) {
          occasions.push(item.product.attributes.occasion);
        }

        // Extract colors
        if (item.product.colors && Array.isArray(item.product.colors)) {
          colors.push(...item.product.colors);
        }
      }
    });

    // Update preferences (merge with existing)
    const existingFabrics = customer.preferences.preferredFabrics || [];
    const existingOccasions = customer.preferences.preferredOccasions || [];
    const existingColors = customer.preferences.preferredColors || [];

    customer.preferences.preferredFabrics = [
      ...new Set([...existingFabrics, ...fabrics]),
    ];
    customer.preferences.preferredOccasions = [
      ...new Set([...existingOccasions, ...occasions]),
    ];
    customer.preferences.preferredColors = [
      ...new Set([...existingColors, ...colors]),
    ];

    await customer.save();

    console.log(`Updated preferences for customer ${customer._id}`);
  } catch (error) {
    console.error("Failed to update customer preferences:", error);
  }
}

/**
 * Analyze customer in background (non-blocking)
 */
async function analyzeCustomerInBackground(customerId) {
  try {
    // Import here to avoid circular dependency
    const { analyzeCustomer } = await import("./customerAI.js");
    await analyzeCustomer(customerId);
  } catch (error) {
    console.error("Background customer analysis failed:", error);
  }
}

/**
 * Get or create customer by phone
 * Useful for WhatsApp orders or phone orders
 *
 * @example
 * // In WhatsApp order handler:
 * const customer = await getOrCreateCustomer({
 *   phone: whatsappPhone,
 *   name: customerName,
 *   source: "whatsapp"
 * });
 */
export async function getOrCreateCustomer(customerData) {
  const { phone, name, email, source = "website" } = customerData;

  if (!phone || !name) {
    throw new Error("Phone and name are required");
  }

  // Check if customer exists
  let customer = await Customer.findOne({ phone });

  if (customer) {
    // Update name and email if provided
    if (name) customer.name = name;
    if (email && !customer.email) customer.email = email;
    await customer.save();
  } else {
    // Create new customer
    customer = await Customer.create({
      name,
      phone,
      email,
      source,
    });
  }

  return customer;
}

/**
 * Find customer by phone or email
 */
export async function findCustomer({ phone, email }) {
  if (!phone && !email) {
    throw new Error("Phone or email is required");
  }

  const query = [];
  if (phone) query.push({ phone });
  if (email) query.push({ email });

  return Customer.findOne({ $or: query });
}

/**
 * Bulk import customers from existing orders
 * Run this once to populate customer database from existing orders
 *
 * @example
 * // In a migration script or admin endpoint:
 * import { bulkImportFromOrders } from "./services/orderCustomerIntegration.js";
 * import Order from "./models/Order.js";
 *
 * const orders = await Order.find({});
 * const results = await bulkImportFromOrders(orders);
 * console.log(`Imported ${results.created} customers, updated ${results.updated}`);
 */
export async function bulkImportFromOrders(orders) {
  const results = {
    total: orders.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const order of orders) {
    try {
      const customer = await handleOrderCustomer(order);
      if (customer) {
        if (customer.totalOrders === 1) {
          results.created++;
        } else {
          results.updated++;
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        orderId: order._id,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Example usage in Order creation route:
 *
 * import { handleOrderCustomer, updateCustomerPreferencesFromOrder } from "../services/orderCustomerIntegration.js";
 *
 * router.post("/orders", async (req, res) => {
 *   try {
 *     // 1. Create order
 *     const order = await Order.create({
 *       customerName: req.body.customerName,
 *       customerPhone: req.body.customerPhone,
 *       customerEmail: req.body.customerEmail,
 *       items: req.body.items,
 *       total: req.body.total,
 *       shippingAddress: req.body.shippingAddress
 *     });
 *
 *     // 2. Create/update customer from order
 *     const customer = await handleOrderCustomer(order);
 *
 *     // 3. Update customer preferences from order items
 *     if (customer) {
 *       await updateCustomerPreferencesFromOrder(customer, order.items);
 *     }
 *
 *     res.status(201).json({ order, customer });
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 */
