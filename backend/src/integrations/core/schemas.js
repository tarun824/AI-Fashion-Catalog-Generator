/**
 * Normalized shapes every provider must return/accept.
 *
 * @typedef {Object} NormalizedOrderItem
 * @property {string|null} externalItemId
 * @property {string} externalSku
 * @property {string} name
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} subtotal
 *
 * @typedef {Object} NormalizedOrder
 * @property {string} channel                 "amazon" | "flipkart" | "myntra" | ...
 * @property {string} externalOrderId         unique per channel
 * @property {string|null} externalShipmentId Flipkart shipmentId etc.
 * @property {Date} placedAt
 * @property {Date|null} dispatchByDate
 * @property {"SELLER"|"MARKETPLACE"} fulfillmentType  MARKETPLACE = FBA/FBF, do not ship ourselves
 * @property {"new"|"cancelled"|"shipped"|"delivered"|"returned"} status
 * @property {{name:string, phone:string, email:string, address:{line1:string,line2:string,city:string,state:string,pincode:string,country:string}}} customer
 * @property {boolean} addressRedacted        true => cannot ship yet (Amazon PII)
 * @property {{method:"COD"|"Prepaid"|"Other", total:number, currency:string}} payment
 * @property {NormalizedOrderItem[]} items
 * @property {{itemsTotal:number, shipping:number, discount:number, total:number}} pricing
 * @property {Object} raw                     original payload, stored for debugging
 *
 * @typedef {Object} NormalizedListing
 * @property {string} sku
 * @property {string} name
 * @property {string} description
 * @property {number|null} mrp
 * @property {number|null} sellingPrice
 * @property {string} currency
 * @property {string[]} images                public image URLs
 * @property {{fabric:string, colors:string[], occasion:string, workType:string, borderType:string, blouseIncluded:boolean, weight:string}} attributes
 * @property {number} stock                   summed over variants
 * @property {{size:string,color:string,sku:string,stock:number}[]} variants
 * @property {string} category
 * @property {Object} overrides               marketplace-only fields supplied by the user (HSN, country of origin, product_id...)
 */

export const ORDER_STATUSES = [
  "new",
  "cancelled",
  "shipped",
  "delivered",
  "returned",
];
export const FULFILLMENT_TYPES = ["SELLER", "MARKETPLACE"];
export const PAYMENT_METHODS = ["COD", "Prepaid", "Other"];

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * @param {NormalizedOrder} order
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateNormalizedOrder(order) {
  const errors = [];
  if (!order || typeof order !== "object") {
    return { valid: false, errors: ["order is not an object"] };
  }
  if (!order.channel || typeof order.channel !== "string")
    errors.push("channel is required");
  if (!order.externalOrderId || typeof order.externalOrderId !== "string")
    errors.push("externalOrderId is required");
  if (!ORDER_STATUSES.includes(order.status))
    errors.push(`status must be one of ${ORDER_STATUSES.join(",")}`);
  if (!FULFILLMENT_TYPES.includes(order.fulfillmentType))
    errors.push("fulfillmentType must be SELLER or MARKETPLACE");
  if (
    !(order.placedAt instanceof Date) ||
    Number.isNaN(order.placedAt.getTime())
  )
    errors.push("placedAt must be a valid Date");
  if (!order.customer || typeof order.customer !== "object")
    errors.push("customer is required");
  if (!order.payment || !PAYMENT_METHODS.includes(order.payment.method))
    errors.push("payment.method must be COD, Prepaid or Other");
  if (!Array.isArray(order.items) || order.items.length === 0) {
    errors.push("items must be a non-empty array");
  } else {
    order.items.forEach((it, i) => {
      if (!it.externalSku) errors.push(`items[${i}].externalSku is required`);
      if (!isNum(it.quantity) || it.quantity < 1)
        errors.push(`items[${i}].quantity must be >= 1`);
      if (!isNum(it.unitPrice) || it.unitPrice < 0)
        errors.push(`items[${i}].unitPrice must be >= 0`);
    });
  }
  if (!order.pricing || !isNum(order.pricing.total))
    errors.push("pricing.total must be a number");
  return { valid: errors.length === 0, errors };
}

export default { validateNormalizedOrder };
