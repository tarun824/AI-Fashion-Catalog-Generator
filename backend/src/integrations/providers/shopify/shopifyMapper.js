import { COD_HINTS, DEFAULT_CURRENCY } from "./shopifyConfig.js";

/**
 * PURE mapping, no network, no logging of PII.
 * Field names follow the Shopify Admin REST Order resource
 * (https://shopify.dev/docs/api/admin-rest/latest/resources/order).
 */

const num = (v, d = 0) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : d;
};
const str = (v) => (v == null ? "" : String(v).trim());

export function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Shopify has no order-level status enum; derive ours from cancelled_at / fulfillment_status. */
export function mapStatus(order) {
  if (order.cancelled_at) return "cancelled";
  const fs = str(order.fulfillment_status).toLowerCase();
  if (fs === "fulfilled") return "delivered" === fs ? "delivered" : "shipped";
  if (fs === "partial") return "shipped";
  return "new";
}

/**
 * Shopify has no native COD flag. Heuristic: gateway names, tags and note
 * attributes are checked for "cash on delivery" / "cod". Defaults to Prepaid
 * with a warning so the admin can verify manually.
 * @returns {{method:"COD"|"Prepaid", guessed:boolean}}
 */
export function detectPaymentMethod(order) {
  const haystack = [
    ...(Array.isArray(order.payment_gateway_names) ? order.payment_gateway_names : []),
    str(order.tags),
    ...(Array.isArray(order.note_attributes) ? order.note_attributes.map((a) => `${a?.name}:${a?.value}`) : []),
  ]
    .join(" ")
    .toLowerCase();
  const isCod = COD_HINTS.some((hint) => haystack.includes(hint));
  return { method: isCod ? "COD" : "Prepaid", guessed: !isCod };
}

function mapAddress(addr) {
  if (!addr) return null;
  return {
    line1: str(addr.address1),
    line2: str(addr.address2),
    city: str(addr.city),
    state: str(addr.province),
    pincode: str(addr.zip),
    country: str(addr.country) || "India",
  };
}

/**
 * Map ONE Shopify order to a NormalizedOrder.
 * @returns {{order: object, warnings: string[]}}
 */
export function toNormalizedOrder(shopifyOrder) {
  const warnings = [];
  const ref = str(shopifyOrder.name) || str(shopifyOrder.id);

  const items = (Array.isArray(shopifyOrder.line_items) ? shopifyOrder.line_items : []).map((li) => {
    const quantity = Math.max(1, num(li.quantity, 1));
    const unitPrice = num(li.price);
    return {
      externalItemId: li.id != null ? str(li.id) : null,
      externalSku: str(li.sku),
      name: str(li.title || li.name),
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
    };
  }).filter((it) => it.externalSku || it.name);

  if (!items.length) {
    warnings.push(`Shopify order ${ref}: no line items with SKU/title`);
  }
  const missingSku = items.some((it) => !it.externalSku);
  if (missingSku) {
    warnings.push(`Shopify order ${ref}: one or more line items have no SKU set in Shopify`);
  }

  const addr = shopifyOrder.shipping_address || shopifyOrder.billing_address || null;
  if (!addr) warnings.push(`Shopify order ${ref}: no shipping address`);
  const customerName =
    str(addr?.name) ||
    [shopifyOrder.customer?.first_name, shopifyOrder.customer?.last_name].filter(Boolean).join(" ");
  const phone = str(addr?.phone) || str(shopifyOrder.phone) || str(shopifyOrder.customer?.phone);
  if (!phone) warnings.push(`Shopify order ${ref}: no phone number on the order`);

  const { method, guessed } = detectPaymentMethod(shopifyOrder);
  if (guessed && str(shopifyOrder.financial_status).toLowerCase() === "pending") {
    warnings.push(`Shopify order ${ref}: could not detect COD vs Prepaid, defaulted to Prepaid. Check manually`);
  }

  const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const shipping = num(shopifyOrder.total_shipping_price_set?.shop_money?.amount);
  const discount = num(shopifyOrder.total_discounts);
  const total = num(shopifyOrder.total_price, itemsTotal + shipping - discount);

  const placedAt = parseDate(shopifyOrder.created_at) || new Date(0);
  if (placedAt.getTime() === 0) warnings.push(`Shopify order ${ref}: missing created_at`);

  const order = {
    channel: "shopify",
    externalOrderId: str(shopifyOrder.id),
    externalShipmentId: null,
    placedAt,
    dispatchByDate: null,
    fulfillmentType: "SELLER",
    status: mapStatus(shopifyOrder),
    customer: {
      name: customerName || "Customer",
      phone,
      email: str(shopifyOrder.email || shopifyOrder.contact_email),
      address: mapAddress(addr) || {
        line1: "", line2: "", city: "", state: "", pincode: "", country: "India",
      },
    },
    addressRedacted: !addr,
    payment: { method, total, currency: str(shopifyOrder.currency) || DEFAULT_CURRENCY },
    items,
    pricing: { itemsTotal, shipping, discount, total },
    raw: { id: shopifyOrder.id, name: shopifyOrder.name },
  };

  return { order, warnings };
}

export default { toNormalizedOrder, mapStatus, detectPaymentMethod, parseDate };
