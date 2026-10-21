import mongoose from "mongoose";
import Order from "../../models/Order.js";
import { ProviderError } from "../core/errors.js";
import { updateApiContext } from "../logging/apiCallContext.js";
import {
  getProviderOrThrow,
  assertCapability,
  requireCredentials,
} from "./credentialStore.js";

/**
 * Report courier + AWB (created via Shiprocket) back to the order's marketplace.
 * Manual, button-driven. Writes marketplace.shipmentConfirmedAt or shipmentConfirmError.
 */
export async function confirmShipmentToMarketplace(orderId, ownerId) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    console.warn(`[Integration:fulfillment] invalid orderId=${orderId}`);
    throw new ProviderError("VALIDATION", "Invalid order id", { status: 400 });
  }
  const order = await Order.findById(orderId);
  if (!order) {
    console.warn(`[Integration:fulfillment] order not found orderId=${orderId}`);
    throw new ProviderError("VALIDATION", "Order not found", { status: 404 });
  }

  const channel = order.marketplace?.channel;
  updateApiContext({
    provider: channel || undefined,
    context: {
      orderId: String(order._id),
      externalOrderId: order.marketplace?.externalOrderId,
    },
  });
  if (!channel || !order.marketplace?.externalOrderId) {
    console.warn(`[Integration:fulfillment] not a marketplace order orderId=${orderId}`);
    throw new ProviderError("VALIDATION", "This order did not come from a marketplace", {
      actionRequired: "Only imported marketplace orders can be confirmed.",
    });
  }
  if (order.marketplace.fulfillmentType === "MARKETPLACE") {
    console.warn(`[Integration:${channel}] confirm skipped orderId=${orderId} reason=marketplace-fulfilled`);
    throw new ProviderError("VALIDATION", "This order is fulfilled by the marketplace; nothing to confirm", {
      actionRequired: "No action needed.",
    });
  }
  const awb = order.shipping?.awbCode;
  const carrierName = order.shipping?.courierName;
  if (!awb || !carrierName) {
    console.warn(`[Integration:${channel}] confirm skipped orderId=${orderId} reason=missing awb/courier`);
    throw new ProviderError("VALIDATION", "Create the Shiprocket shipment and AWB first", {
      actionRequired: "Assign a courier in Shiprocket for this order, then retry.",
      details: { hasAwb: !!awb, hasCourierName: !!carrierName },
    });
  }

  const provider = getProviderOrThrow(channel);
  assertCapability(provider, "confirmShipment");
  const { credentials } = await requireCredentials(channel);

  try {
    const result = await provider.confirmShipment(credentials, order.toObject(), {
      carrierName,
      awb,
      shipDate: order.shipping.shippedAt || order.shipping.lastUpdated || new Date(),
    });
    order.marketplace.shipmentConfirmedAt = new Date();
    order.marketplace.shipmentConfirmError = "";
    order.markModified("marketplace");
    await order.save();
    return {
      ok: true,
      channel,
      orderId: String(order._id),
      confirmedAt: order.marketplace.shipmentConfirmedAt,
      message: result?.message || "Shipment confirmed on marketplace",
    };
  } catch (err) {
    console.warn(
      `[Integration:${channel}] confirmShipment failed orderId=${orderId} ownerId=${ownerId || ""} type=${err.type || "ERROR"} reason=${err.message}`,
    );
    order.marketplace.shipmentConfirmError = String(err.message || "").slice(0, 500);
    order.markModified("marketplace");
    await order.save().catch((e) =>
      console.warn(`[Integration:${channel}] could not persist confirm error orderId=${orderId} reason=${e.message}`),
    );
    throw err;
  }
}

export default { confirmShipmentToMarketplace };
