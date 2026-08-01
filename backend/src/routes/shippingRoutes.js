/**
 * Shipping Routes - Shiprocket Integration
 * Complete shipping management API
 */

import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import shiprocketService from "../services/shiprocketService.js";
import Order from "../models/Order.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/admin/shipping/create-order
 * Create order in Shiprocket
 */
router.post("/create-order", async (req, res) => {
  try {
    const { orderId, pickupLocation } = req.body;

    // Get order from database
    const order = await Order.findById(orderId).populate("customer");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if already created in Shiprocket
    if (order.shipping?.shiprocketOrderId) {
      return res.status(200).json({
        success: true,
        message: "Order already created in Shiprocket",
        alreadyExists: true,
        data: {
          shiprocketOrderId: order.shipping.shiprocketOrderId,
          shipmentId: order.shipping.shipmentId,
          status: order.shipping.status,
        },
      });
    }

    // Create in Shiprocket
    const shipment = await shiprocketService.createOrder(order, pickupLocation);

    // Update order with Shiprocket details and clear any errors
    order.shipping = {
      ...order.shipping,
      shiprocketOrderId: shipment.shiprocketOrderId,
      shipmentId: shipment.shipmentId,
      status: shipment.status,
      createdAt: new Date(),
      lastError: null, // Clear error on success
    };
    await order.save();

    res.json({
      success: true,
      message: "Order created in Shiprocket successfully",
      data: shipment,
    });
  } catch (error) {
    console.error("Error creating Shiprocket order:", error);

    // Save error to order if orderId exists
    try {
      if (req.body.orderId) {
        const order = await Order.findById(req.body.orderId);
        if (order) {
          order.shipping = {
            ...order.shipping,
            lastError: {
              message: error.message,
              stage: "create_order",
              timestamp: new Date(),
              details: {
                stack: error.stack,
                orderId: req.body.orderId,
              },
            },
          };
          await order.save();
        }
      }
    } catch (saveError) {
      console.error("Error saving error to order:", saveError);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/shipping/courier-rates/:orderId
 * Get available couriers and rates
 */
router.get("/courier-rates/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.shipping?.shiprocketOrderId) {
      return res.status(400).json({
        error: "Order not yet created in Shiprocket. Create order first.",
      });
    }

    const couriers = await shiprocketService.getCourierRates(
      order.shipping.shiprocketOrderId,
    );

    res.json({
      success: true,
      couriers,
    });
  } catch (error) {
    console.error("Error fetching courier rates:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/shipping/assign-courier
 * Assign courier and generate AWB
 */
router.post("/assign-courier", async (req, res) => {
  try {
    const { orderId, courierId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.shipping?.shipmentId) {
      return res.status(400).json({ error: "Shipment ID not found" });
    }

    // Assign courier
    const awbDetails = await shiprocketService.assignCourier(
      order.shipping.shipmentId,
      courierId,
    );

    // Update order and clear any errors
    order.shipping = {
      ...order.shipping,
      ...awbDetails,
      courierAssignedAt: new Date(),
      lastError: null, // Clear error on success
    };
    order.status = "processing";
    await order.save();

    res.json({
      success: true,
      message: "Courier assigned successfully",
      data: awbDetails,
    });
  } catch (error) {
    console.error("❌ Error assigning courier:", error);
    console.error("❌ error.isShiprocketError:", error.isShiprocketError);
    console.error("❌ error.message:", error.message);
    console.error("❌ error.errorType:", error.errorType);
    console.error("❌ error.actionRequired:", error.actionRequired);

    // Save error to order if orderId exists
    try {
      if (req.body.orderId) {
        const order = await Order.findById(req.body.orderId);
        if (order) {
          order.shipping = {
            ...order.shipping,
            lastError: {
              message: error.message,
              stage: "assign_courier",
              timestamp: new Date(),
              details: {
                errorType: error.errorType,
                actionRequired: error.actionRequired,
                orderId: req.body.orderId,
              },
            },
          };
          await order.save();
        }
      }
    } catch (saveError) {
      console.error("Error saving error to order:", saveError);
    }

    // Handle Shiprocket-specific errors
    if (error.isShiprocketError) {
      const errorResponse = {
        error: error.message,
        errorType: error.errorType,
        actionRequired: error.actionRequired,
        details: error.originalError,
      };
      console.error("✅ Sending Shiprocket error response:", errorResponse);
      return res.status(error.statusCode || 400).json(errorResponse);
    }

    // Generic error
    const genericResponse = {
      error: error.message || "Failed to assign courier",
    };
    console.error("✅ Sending generic error response:", genericResponse);
    res.status(500).json(genericResponse);
  }
});

/**
 * POST /api/admin/shipping/generate-label
 * Generate shipping label
 */
router.post("/generate-label", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.shipping?.shipmentId) {
      return res.status(400).json({ error: "Shipment not created yet" });
    }

    if (!order.shipping?.awbCode) {
      return res.status(400).json({ error: "Courier not assigned yet" });
    }

    // Generate label
    const label = await shiprocketService.generateLabel(
      order.shipping.shipmentId,
    );

    // Update order
    order.shipping = {
      ...order.shipping,
      labelUrl: label.labelUrl,
      labelGeneratedAt: new Date(),
    };
    await order.save();

    res.json({
      success: true,
      message: "Label generated successfully",
      data: label,
    });
  } catch (error) {
    console.error("Error generating label:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/shipping/schedule-pickup
 * Schedule courier pickup
 */
router.post("/schedule-pickup", async (req, res) => {
  try {
    const { orderId, pickupDate } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.shipping?.shipmentId) {
      return res.status(400).json({ error: "Shipment not created yet" });
    }

    // Use provided date or next available date
    const date = pickupDate || shiprocketService.getNextPickupDate();

    // Schedule pickup
    const pickup = await shiprocketService.schedulePickup(
      order.shipping.shipmentId,
      date,
    );

    // Update order and clear any errors
    order.shipping = {
      ...order.shipping,
      ...pickup,
      pickupScheduledAt: new Date(),
      lastError: null, // Clear error on success
    };
    order.status = "processing";
    await order.save();

    res.json({
      success: true,
      message: "Pickup scheduled successfully",
      data: pickup,
    });
  } catch (error) {
    console.error("Error scheduling pickup:", error);

    // Save error to order if orderId exists
    try {
      if (req.body.orderId) {
        const order = await Order.findById(req.body.orderId);
        if (order) {
          order.shipping = {
            ...order.shipping,
            lastError: {
              message: error.message,
              stage: "schedule_pickup",
              timestamp: new Date(),
              details: {
                orderId: req.body.orderId,
              },
            },
          };
          await order.save();
        }
      }
    } catch (saveError) {
      console.error("Error saving error to order:", saveError);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/shipping/track/:orderId
 * Track shipment
 */
router.get("/track/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.shipping?.awbCode) {
      return res.status(400).json({ error: "Shipment not yet dispatched" });
    }

    // Get tracking info
    const tracking = await shiprocketService.trackShipment(
      order.shipping.awbCode,
    );

    res.json({
      success: true,
      tracking,
    });
  } catch (error) {
    console.error("Error tracking shipment:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/shipping/cancel
 * Cancel shipment
 */
router.post("/cancel", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.shipping?.awbCode) {
      return res.status(400).json({ error: "No shipment to cancel" });
    }

    // Cancel shipment
    const result = await shiprocketService.cancelShipment(
      order.shipping.awbCode,
    );

    // Update order
    order.shipping.cancelled = true;
    order.shipping.cancelledAt = new Date();
    order.status = "cancelled";
    await order.save();

    res.json({
      success: true,
      message: "Shipment cancelled successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error cancelling shipment:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/shipping/one-click-ship
 * Complete shipping flow in one call (auto-select cheapest courier)
 */
router.post("/one-click-ship", async (req, res) => {
  try {
    const { orderId, pickupLocation } = req.body;

    const order = await Order.findById(orderId).populate("customer");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Step 1: Create order in Shiprocket
    let shipment;
    if (!order.shipping?.shiprocketOrderId) {
      shipment = await shiprocketService.createOrder(order, pickupLocation);
      order.shipping = {
        ...order.shipping,
        shiprocketOrderId: shipment.shiprocketOrderId,
        shipmentId: shipment.shipmentId,
      };
      await order.save();
    }

    // Step 2: Get courier rates
    const couriers = await shiprocketService.getCourierRates(
      order.shipping.shiprocketOrderId,
    );

    if (couriers.length === 0) {
      return res
        .status(400)
        .json({ error: "No couriers available for this location" });
    }

    // Auto-select cheapest courier (or recommended)
    const selectedCourier =
      couriers.find((c) => c.isRecommended) || couriers[0];

    // Step 3: Assign courier
    const awbDetails = await shiprocketService.assignCourier(
      order.shipping.shipmentId,
      selectedCourier.courierId,
    );

    order.shipping = {
      ...order.shipping,
      ...awbDetails,
    };
    await order.save();

    // Step 4: Generate label
    const label = await shiprocketService.generateLabel(
      order.shipping.shipmentId,
    );

    order.shipping.labelUrl = label.labelUrl;
    await order.save();

    // Step 5: Schedule pickup for tomorrow
    const pickupDate = shiprocketService.getNextPickupDate();
    const pickup = await shiprocketService.schedulePickup(
      order.shipping.shipmentId,
      pickupDate,
    );

    order.shipping = {
      ...order.shipping,
      ...pickup,
    };
    order.status = "processing";
    await order.save();

    res.json({
      success: true,
      message: "Order shipped successfully!",
      data: {
        orderNumber: order.orderNumber,
        awbCode: order.shipping.awbCode,
        courierName: order.shipping.courierName,
        pickupDate: order.shipping.pickupScheduledDate,
        labelUrl: order.shipping.labelUrl,
        estimatedDelivery: selectedCourier.estimatedDays,
      },
    });
  } catch (error) {
    console.error("Error in one-click shipping:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/shipping/bulk-ship
 * Ship multiple orders at once
 */
router.post("/bulk-ship", async (req, res) => {
  try {
    const { orderIds, pickupLocation } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "Order IDs array required" });
    }

    const results = [];
    const errors = [];

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId).populate("customer");
        if (!order) {
          errors.push({ orderId, error: "Order not found" });
          continue;
        }

        // Use one-click ship logic for each order
        const shipment = await shiprocketService.createOrder(
          order,
          pickupLocation,
        );
        order.shipping = {
          ...order.shipping,
          shiprocketOrderId: shipment.shiprocketOrderId,
          shipmentId: shipment.shipmentId,
        };

        const couriers = await shiprocketService.getCourierRates(
          shipment.shiprocketOrderId,
        );
        const selectedCourier = couriers[0];

        const awbDetails = await shiprocketService.assignCourier(
          shipment.shipmentId,
          selectedCourier.courierId,
        );

        order.shipping = { ...order.shipping, ...awbDetails };
        order.status = "processing";
        await order.save();

        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          awbCode: awbDetails.awbCode,
          courierName: awbDetails.courierName,
        });
      } catch (error) {
        errors.push({ orderId, error: error.message });
      }
    }

    // Generate labels for all shipped orders
    const shipmentIds = results
      .map(
        (r) =>
          results.find((order) => order._id.toString() === r.orderId)?.shipping
            ?.shipmentId,
      )
      .filter(Boolean);

    let bulkLabelUrl = null;
    if (shipmentIds.length > 0) {
      const labels = await shiprocketService.generateLabel(shipmentIds);
      bulkLabelUrl = labels.labelUrl;
    }

    res.json({
      success: true,
      message: `Shipped ${results.length} of ${orderIds.length} orders`,
      shipped: results,
      errors,
      bulkLabelUrl,
    });
  } catch (error) {
    console.error("Error in bulk shipping:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/shipping/pickup-locations
 * Get list of configured pickup locations from Shiprocket
 */
router.get("/pickup-locations", async (req, res) => {
  try {
    const result = await shiprocketService.getPickupLocations();
    res.json(result);
  } catch (error) {
    console.error("Error fetching pickup locations:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
