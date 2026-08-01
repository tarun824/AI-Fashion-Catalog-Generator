import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import { authMiddleware } from "../middleware/auth.js";
import { logOrderCreated } from "../utils/auditLogger.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/admin/orders
 * List orders with pagination and filters
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      paymentMethod: req.query.paymentMethod,
      source: req.query.source,
      vendorId: req.query.vendorId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      minTotal: req.query.minTotal,
      maxTotal: req.query.maxTotal,
      sortBy: req.query.sortBy || "createdAt",
      order: req.query.order || "desc",
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await Order.searchOrders(filters);

    res.json({
      success: true,
      data: result.results,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("List orders error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
});

/**
 * GET /api/admin/orders/stats
 * Get order statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const stats = await Order.getStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Order stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch order statistics",
    });
  }
});

/**
 * GET /api/admin/orders/:id
 * Get single order by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("vendorId", "businessName email")
      .populate("items.productId", "sku name images");

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch order",
    });
  }
});

/**
 * POST /api/admin/orders
 * Create new order (manual order creation)
 */
router.post("/", async (req, res) => {
  try {
    const {
      customer,
      items,
      pricing,
      payment,
      shipping,
      source,
      notes,
      internalNotes,
      vendorId,
    } = req.body;

    // Validate required fields
    if (!customer?.name || !customer?.phone) {
      return res.status(400).json({
        success: false,
        error: "Customer name and phone are required",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Order must have at least one item",
      });
    }

    // Validate items and calculate subtotals
    for (const item of items) {
      if (
        !item.sku ||
        !item.name ||
        !item.quantity ||
        item.price === undefined
      ) {
        return res.status(400).json({
          success: false,
          error: "Each item must have sku, name, quantity, and price",
        });
      }

      // Calculate subtotal for each item (required by schema)
      item.subtotal = item.quantity * item.price;
    }

    // Find or create customer
    let customerDoc = await Customer.findOne({ phone: customer.phone });

    if (!customerDoc) {
      // Create new customer
      customerDoc = new Customer({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || undefined,
        addresses: customer.address
          ? [
              {
                label: "Default",
                street: customer.address.line1 || "",
                city: customer.address.city || "",
                state: customer.address.state || "",
                pincode: customer.address.pincode || "",
                country: customer.address.country || "India",
                isDefault: true,
              },
            ]
          : [],
        source: source || "manual",
        tags: ["manual-order"],
      });

      await customerDoc.save();
      console.log(
        `✓ Created new customer: ${customerDoc.name} (${customerDoc.phone})`,
      );
    } else {
      // Update existing customer's address if provided and different
      if (customer.address && customer.address.line1) {
        const hasAddress = customerDoc.addresses.some(
          (addr) =>
            addr.street === customer.address.line1 &&
            addr.pincode === customer.address.pincode,
        );

        if (!hasAddress) {
          customerDoc.addresses.push({
            label: "Order Address",
            street: customer.address.line1,
            city: customer.address.city || "",
            state: customer.address.state || "",
            pincode: customer.address.pincode || "",
            country: customer.address.country || "India",
            isDefault: customerDoc.addresses.length === 0,
          });
          await customerDoc.save();
          console.log(`✓ Added new address for customer: ${customerDoc.name}`);
        }
      }
    }

    // Create order with customer reference
    const order = new Order({
      customer: {
        _id: customerDoc._id,
        name: customerDoc.name,
        phone: customerDoc.phone,
        email: customerDoc.email || customer.email,
        address: customer.address || {},
      },
      items,
      pricing: pricing || {},
      payment: payment || {},
      shipping: shipping || {},
      source: source || "manual",
      notes: notes || "",
      internalNotes: internalNotes || "",
      vendorId: vendorId || null,
      createdBy: req.admin.id,
    });

    await order.save();

    // Log order creation
    logOrderCreated(order, req.admin, req);

    // Update customer metrics
    customerDoc.totalOrders += 1;
    customerDoc.totalSpent += pricing?.total || 0;
    customerDoc.averageOrderValue =
      customerDoc.totalSpent / customerDoc.totalOrders;
    customerDoc.lastOrderDate = new Date();

    // Update customer type based on orders
    if (customerDoc.totalOrders >= 10) {
      customerDoc.customerType = "vip";
    } else if (customerDoc.totalOrders >= 3) {
      customerDoc.customerType = "regular";
    }

    await customerDoc.save();

    res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create order",
    });
  }
});

/**
 * PATCH /api/admin/orders/:id
 * Update order details
 */
router.patch("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const allowedUpdates = [
      "customer",
      "items",
      "pricing",
      "payment",
      "shipping",
      "notes",
      "internalNotes",
      "vendorId",
    ];

    // Update allowed fields
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        order[field] = req.body[field];
      }
    }

    await order.save();

    res.json({
      success: true,
      data: order,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update order",
    });
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid values: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    await order.updateStatus(status, note, req.admin.id);

    res.json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update order status",
    });
  }
});

/**
 * PATCH /api/admin/orders/:id/payment
 * Update payment status
 */
router.patch("/:id/payment", async (req, res) => {
  try {
    const { status, paidAmount, transactionId, method } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Payment status is required",
      });
    }

    const validStatuses = ["pending", "paid", "failed", "refunded", "partial"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment status. Valid values: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    await order.updatePayment(status, paidAmount, transactionId);

    // Update payment method if provided
    if (method) {
      order.payment.method = method;
      await order.save();
    }

    res.json({
      success: true,
      data: order,
      message: `Payment status updated to ${status}`,
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update payment status",
    });
  }
});

/**
 * POST /api/admin/orders/bulk-status
 * Update status for multiple orders
 */
router.post("/bulk-status", async (req, res) => {
  try {
    const { ids, status, note } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Order IDs array is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Status is required",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid values: ${validStatuses.join(", ")}`,
      });
    }

    // Update all orders
    const orders = await Order.find({ _id: { $in: ids } });

    for (const order of orders) {
      await order.updateStatus(status, note, req.admin.id);
    }

    res.json({
      success: true,
      message: `${orders.length} order(s) updated to ${status}`,
    });
  } catch (error) {
    console.error("Bulk status update error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update orders",
    });
  }
});

/**
 * DELETE /api/admin/orders/:id
 * Delete/Cancel order
 */
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Don't allow deletion of delivered orders
    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        error: "Cannot delete delivered orders",
      });
    }

    // Soft delete by marking as cancelled
    await order.updateStatus(
      "cancelled",
      "Order cancelled by admin",
      req.admin.id,
    );

    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel order",
    });
  }
});

/**
 * GET /api/admin/orders/:id/invoice
 * Generate simple invoice HTML
 */
router.get("/:id/invoice", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("vendorId", "businessName email");

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Simple invoice HTML
    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { font-size: 32px; color: #333; }
    .header p { color: #666; margin-top: 5px; }
    .order-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .order-info div { flex: 1; }
    .order-info h3 { margin-bottom: 10px; color: #333; font-size: 14px; text-transform: uppercase; }
    .order-info p { margin: 5px 0; color: #666; font-size: 14px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    .items-table th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .items-table td { font-size: 14px; }
    .items-table .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
    <p>Fashion E-Commerce Platform</p>
  </div>

  <div class="order-info">
    <div>
      <h3>Order Information</h3>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
      <p><strong>Payment:</strong> ${order.payment.status.toUpperCase()} (${order.payment.method})</p>
    </div>
    <div>
      <h3>Customer Details</h3>
      <p><strong>${order.customer.name}</strong></p>
      <p>${order.customer.phone}</p>
      ${order.customer.email ? `<p>${order.customer.email}</p>` : ""}
      <p style="margin-top: 10px;">
        ${order.customer.address.line1 || ""}<br>
        ${order.customer.address.line2 ? order.customer.address.line2 + "<br>" : ""}
        ${order.customer.address.city ? order.customer.address.city + ", " : ""}
        ${order.customer.address.state || ""} ${order.customer.address.pincode || ""}<br>
        ${order.customer.address.country || ""}
      </p>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Price</th>
        <th class="text-right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${order.items
        .map(
          (item) => `
        <tr>
          <td>${item.sku}</td>
          <td>${item.name}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₹${item.price.toFixed(2)}</td>
          <td class="text-right">₹${item.subtotal.toFixed(2)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>₹${order.pricing.subtotal.toFixed(2)}</span>
    </div>
    ${
      order.pricing.discount > 0
        ? `
    <div class="totals-row">
      <span>Discount:</span>
      <span>-₹${order.pricing.discount.toFixed(2)}</span>
    </div>
    `
        : ""
    }
    ${
      order.pricing.tax > 0
        ? `
    <div class="totals-row">
      <span>Tax:</span>
      <span>₹${order.pricing.tax.toFixed(2)}</span>
    </div>
    `
        : ""
    }
    ${
      order.pricing.shippingCharge > 0
        ? `
    <div class="totals-row">
      <span>Shipping:</span>
      <span>₹${order.pricing.shippingCharge.toFixed(2)}</span>
    </div>
    `
        : ""
    }
    <div class="totals-row total">
      <span>TOTAL:</span>
      <span>₹${order.pricing.total.toFixed(2)}</span>
    </div>
  </div>

  ${
    order.notes
      ? `
  <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #333;">
    <strong>Notes:</strong> ${order.notes}
  </div>
  `
      : ""
  }

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>For any queries, please contact our support team.</p>
  </div>

  <script>
    // Auto-print on load (optional)
    // window.print();
  </script>
</body>
</html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(invoiceHTML);
  } catch (error) {
    console.error("Generate invoice error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate invoice",
    });
  }
});

export default router;
