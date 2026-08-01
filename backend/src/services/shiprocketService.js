/**
 * Shiprocket Integration Service
 * Complete shipping automation with all API endpoints
 *
 * Features:
 * - Authentication & token management
 * - Order creation & management
 * - Courier rate comparison
 * - Label generation
 * - Real-time tracking
 * - Pickup scheduling
 * - Return management
 */

import axios from "axios";

class ShiprocketService {
  constructor() {
    this.baseURL =
      process.env.SHIPROCKET_API_BASE ||
      "https://apiv2.shiprocket.in/v1/external";
    this.email = process.env.SHIPROCKET_EMAIL;
    this.password = process.env.SHIPROCKET_PASSWORD;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Get authentication token (auto-refreshes if expired)
   */
  async getAuthToken() {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: this.email,
        password: this.password,
      });

      this.token = response.data.token;
      // Token expires in 10 days, refresh after 9 days
      this.tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;

      console.log("✓ Shiprocket authenticated successfully");
      return this.token;
    } catch (error) {
      console.error(
        "Shiprocket authentication failed:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to authenticate with Shiprocket");
    }
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(method, endpoint, data = null) {
    const token = await this.getAuthToken();

    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(
        `Shiprocket API Error [${method} ${endpoint}]:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Create Shiprocket order from our order data
   *
   * @param {Object} order - Our order object
   * @param {Object} pickupLocation - Pickup address (default: "Primary")
   * @returns {Object} - Shiprocket order response
   */
  async createOrder(order, pickupLocation = "Primary") {
    // Prepare order items
    const orderItems = order.items.map((item) => ({
      name: item.productName || "Fashion Item",
      sku: item.productId || item.sku || "NO-SKU",
      units: item.quantity || 1,
      selling_price: item.price || 0,
      discount: item.discount || 0,
      tax: item.tax || 0,
      hsn: item.hsn || "",
    }));

    // Calculate dimensions and weight
    const dimensions = this.calculateDimensions(order.items);

    // Prepare Shiprocket order payload
    const payload = {
      order_id: order.orderNumber,
      order_date: order.createdAt.toISOString().replace("T", " ").split(".")[0],
      pickup_location: pickupLocation,
      channel_id: "",
      comment: order.notes || "",
      billing_customer_name: order.customer.name,
      billing_last_name: "",
      billing_address: order.shippingAddress.address,
      billing_address_2: order.shippingAddress.address2 || "",
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.pincode,
      billing_state: order.shippingAddress.state,
      billing_country: order.shippingAddress.country || "India",
      billing_email: order.customer.email || "",
      billing_phone: order.customer.phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      shipping_charges: order.shippingCharges || 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: order.discount || 0,
      sub_total: order.totalAmount,
      length: dimensions.length,
      breadth: dimensions.breadth,
      height: dimensions.height,
      weight: dimensions.weight,
    };

    try {
      const response = await this.apiRequest(
        "POST",
        "/orders/create/adhoc",
        payload,
      );

      return {
        success: true,
        shiprocketOrderId: response.order_id,
        shipmentId: response.shipment_id,
        status: response.status,
        statusCode: response.status_code,
        channelOrderId: response.channel_order_id,
      };
    } catch (error) {
      throw new Error(`Failed to create Shiprocket order: ${error.message}`);
    }
  }

  /**
   * Get available couriers and rates for an order
   *
   * @param {String} shiprocketOrderId - Shiprocket order ID
   * @returns {Array} - Available couriers with rates
   */
  async getCourierRates(shiprocketOrderId) {
    try {
      const response = await this.apiRequest(
        "GET",
        `/courier/serviceability?order_id=${shiprocketOrderId}`,
      );

      const couriers = response.data?.available_courier_companies || [];

      // Sort by freight charge (cheapest first)
      return couriers
        .sort((a, b) => {
          const costA =
            parseFloat(a.freight_charge) + parseFloat(a.cod_charges || 0);
          const costB =
            parseFloat(b.freight_charge) + parseFloat(b.cod_charges || 0);
          return costA - costB;
        })
        .map((courier) => ({
          courierId: courier.courier_company_id,
          courierName: courier.courier_name,
          freightCharge: parseFloat(courier.freight_charge),
          codCharges: parseFloat(courier.cod_charges || 0),
          totalCharge:
            parseFloat(courier.freight_charge) +
            parseFloat(courier.cod_charges || 0),
          estimatedDays: courier.estimated_delivery_days,
          rating: courier.rating || "N/A",
          codAvailable: courier.cod === 1,
          description: courier.description || "",
          suppresDate: courier.suppres_date || null,
          edd: courier.edd || null,
          isRecommended: courier.is_recommended || false,
          isSurface: courier.is_surface || false,
          pickupPerformance: courier.pickup_performance || null,
        }));
    } catch (error) {
      throw new Error(`Failed to get courier rates: ${error.message}`);
    }
  }

  /**
   * Assign courier to shipment and generate AWB
   *
   * @param {String} shipmentId - Shiprocket shipment ID
   * @param {Number} courierId - Selected courier company ID
   * @returns {Object} - AWB details
   */
  async assignCourier(shipmentId, courierId) {
    try {
      const response = await this.apiRequest("POST", "/courier/assign/awb", {
        shipment_id: shipmentId,
        courier_id: courierId,
      });

      return {
        success: true,
        awbCode: response.awb_code,
        courierName: response.courier_name,
        assignedDate: response.awb_assigned_date,
        pickupScheduledDate: response.pickup_scheduled_date,
        appliedWeight: response.applied_weight,
        shipmentId: response.shipment_id,
        courierId: response.courier_company_id,
      };
    } catch (error) {
      throw new Error(`Failed to assign courier: ${error.message}`);
    }
  }

  /**
   * Generate shipping label PDF
   *
   * @param {Array} shipmentIds - Array of shipment IDs
   * @returns {Object} - Label URL and creation status
   */
  async generateLabel(shipmentIds) {
    try {
      const response = await this.apiRequest(
        "POST",
        "/courier/generate/label",
        {
          shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds],
        },
      );

      return {
        success: response.label_created === 1,
        labelUrl: response.label_url,
        notFound: response.not_found || [],
      };
    } catch (error) {
      throw new Error(`Failed to generate label: ${error.message}`);
    }
  }

  /**
   * Schedule pickup for shipments
   *
   * @param {Array} shipmentIds - Array of shipment IDs
   * @param {String} pickupDate - Pickup date (YYYY-MM-DD)
   * @returns {Object} - Pickup details
   */
  async schedulePickup(shipmentIds, pickupDate) {
    try {
      const response = await this.apiRequest(
        "POST",
        "/orders/schedule-pickup",
        {
          shipment_id: Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds],
          pickup_date: pickupDate,
        },
      );

      return {
        success: true,
        pickupScheduledDate: response.pickup_scheduled_date,
        pickupTokenNumber: response.pickup_token_number,
        status: response.status,
      };
    } catch (error) {
      throw new Error(`Failed to schedule pickup: ${error.message}`);
    }
  }

  /**
   * Track shipment by AWB code
   *
   * @param {String} awbCode - AWB tracking number
   * @returns {Object} - Tracking details
   */
  async trackShipment(awbCode) {
    try {
      const response = await this.apiRequest(
        "GET",
        `/courier/track/awb/${awbCode}`,
      );

      const tracking = response.tracking_data;

      return {
        awbCode: tracking.awb_code,
        courierName: tracking.courier_name,
        shipmentStatus: tracking.shipment_status,
        currentStatus: tracking.current_status,
        deliveredDate: tracking.delivered_date,
        destination: tracking.destination,
        origin: tracking.origin,
        estimatedDeliveryDate: tracking.edd,
        scans: (tracking.shipment_track || []).map((scan) => ({
          date: scan.date,
          activity: scan.activity,
          location: scan.location,
          status: scan.sr_status_label,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to track shipment: ${error.message}`);
    }
  }

  /**
   * Cancel shipment
   *
   * @param {Array} awbCodes - Array of AWB codes to cancel
   * @returns {Object} - Cancellation result
   */
  async cancelShipment(awbCodes) {
    try {
      const response = await this.apiRequest(
        "POST",
        "/orders/cancel/shipment/awbs",
        {
          awbs: Array.isArray(awbCodes) ? awbCodes : [awbCodes],
        },
      );

      return {
        success: true,
        message: response.message,
      };
    } catch (error) {
      throw new Error(`Failed to cancel shipment: ${error.message}`);
    }
  }

  /**
   * Request return pickup
   *
   * @param {String} orderId - Original order ID
   * @param {Object} returnDetails - Return details
   * @returns {Object} - Return pickup details
   */
  async createReturn(orderId, returnDetails) {
    try {
      const response = await this.apiRequest("POST", "/orders/create/return", {
        order_id: orderId,
        order_date: returnDetails.orderDate,
        pickup_customer_name: returnDetails.customerName,
        pickup_last_name: "",
        pickup_address: returnDetails.address,
        pickup_city: returnDetails.city,
        pickup_pincode: returnDetails.pincode,
        pickup_state: returnDetails.state,
        pickup_country: returnDetails.country || "India",
        pickup_email: returnDetails.email || "",
        pickup_phone: returnDetails.phone,
        pickup_isd_code: "91",
        order_items: returnDetails.items,
        length: returnDetails.dimensions?.length || 25,
        breadth: returnDetails.dimensions?.breadth || 20,
        height: returnDetails.dimensions?.height || 5,
        weight: returnDetails.dimensions?.weight || 0.5,
      });

      return {
        success: true,
        returnOrderId: response.order_id,
        shipmentId: response.shipment_id,
        status: response.status,
      };
    } catch (error) {
      throw new Error(`Failed to create return: ${error.message}`);
    }
  }

  /**
   * Get COD remittance details
   *
   * @param {String} startDate - Start date (YYYY-MM-DD)
   * @param {String} endDate - End date (YYYY-MM-DD)
   * @returns {Array} - Remittance transactions
   */
  async getCODRemittance(startDate, endDate) {
    try {
      const response = await this.apiRequest(
        "GET",
        `/accounts/statements?start_date=${startDate}&end_date=${endDate}`,
      );

      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to get COD remittance: ${error.message}`);
    }
  }

  /**
   * Calculate package dimensions based on items
   * (Helper function - can be customized per business)
   */
  calculateDimensions(items) {
    // Default dimensions for fashion items (can be overridden)
    let length = 30; // cm
    let breadth = 25; // cm
    let height = 5; // cm
    let weight = 0.5; // kg

    // Adjust based on number of items
    const itemCount = items.reduce(
      (sum, item) => sum + (item.quantity || 1),
      0,
    );

    if (itemCount > 1) {
      height = 5 + (itemCount - 1) * 2; // Stack items
      weight = 0.5 * itemCount;
    }

    // Cap dimensions
    if (height > 20) height = 20;
    if (weight > 5) weight = 5;

    return { length, breadth, height, weight };
  }

  /**
   * Get next available pickup date (excluding Sundays)
   */
  getNextPickupDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Skip if Sunday (0 = Sunday)
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  /**
   * Handle webhook from Shiprocket
   * Updates order status based on shipment updates
   */
  async handleWebhook(webhookData) {
    try {
      const {
        awb,
        order_id,
        shipment_status,
        current_status,
        delivered_date,
        scans,
      } = webhookData;

      console.log(
        `📦 Shiprocket Webhook: Order ${order_id}, Status: ${current_status}`,
      );

      return {
        awb,
        orderId: order_id,
        shipmentStatus: shipment_status,
        currentStatus: current_status,
        deliveredDate: delivered_date,
        latestScan: scans?.[scans.length - 1],
      };
    } catch (error) {
      console.error("Error handling Shiprocket webhook:", error);
      throw error;
    }
  }
}

// Export singleton instance
export default new ShiprocketService();
