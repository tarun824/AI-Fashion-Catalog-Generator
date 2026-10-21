import Order from "../../models/Order.js";
import Product from "../../models/Product.js";
import { getOrCreateCustomer } from "../../services/orderCustomerIntegration.js";
import { validateNormalizedOrder } from "../core/schemas.js";

const MAX_RAW_BYTES = 100 * 1024;

const STATUS_MAP = {
  new: "pending",
  cancelled: "cancelled",
  shipped: "shipped",
  delivered: "delivered",
  returned: "returned",
};

const log = (providerId, msg) =>
  console.warn(`[Integration:${providerId}] ${msg}`);

function capRaw(raw) {
  if (raw == null) return undefined;
  try {
    const size = Buffer.byteLength(JSON.stringify(raw));
    if (size > MAX_RAW_BYTES) return { truncated: true, bytes: size };
    return raw;
  } catch {
    return { truncated: true, unserializable: true };
  }
}

/**
 * Resolve an external SKU to a Product: channelListings.externalSku, then
 * Product.sku, then variants.sku. Returns lean product or null.
 */
export async function resolveProduct(channel, externalSku, cache = new Map()) {
  if (!externalSku) return null;
  const key = `${channel}::${externalSku}`;
  if (cache.has(key)) return cache.get(key);

  const base = { deletedAt: null };
  const select = "_id sku name";
  let product = await Product.findOne({
    ...base,
    channelListings: { $elemMatch: { channel, externalSku } },
  })
    .select(select)
    .lean();
  if (!product) {
    product = await Product.findOne({ ...base, sku: externalSku })
      .select(select)
      .lean();
  }
  if (!product) {
    product = await Product.findOne({ ...base, "variants.sku": externalSku })
      .select(select)
      .lean();
  }
  cache.set(key, product || null);
  return product || null;
}

const hasUsablePhone = (phone) => String(phone || "").replace(/\D/g, "").length >= 10;

/**
 * Idempotently upsert normalized marketplace orders into Order.
 * Stock is NOT decremented here (Phase 4).
 *
 * @param {{providerId:string, normalizedOrders:import("../core/schemas.js").NormalizedOrder[], ownerId?:any}} params
 * @returns {Promise<{imported:number, updated:number, skipped:number, needsMapping:number, warnings:string[]}>}
 */
export async function importOrders({ providerId, normalizedOrders, ownerId }) {
  const result = {
    imported: 0,
    updated: 0,
    skipped: 0,
    needsMapping: 0,
    warnings: [],
  };
  const warn = (msg) => {
    log(providerId, msg);
    result.warnings.push(msg);
  };
  const productCache = new Map();

  for (const n of normalizedOrders || []) {
    const orderRef = n?.externalOrderId;
    try {
      const { valid, errors } = validateNormalizedOrder(n);
      if (!valid) {
        result.skipped++;
        warn(`skipped order externalOrderId=${orderRef} reason=invalid: ${errors.join("; ")}`);
        continue;
      }
      if (n.channel !== providerId) {
        result.skipped++;
        warn(`skipped order externalOrderId=${orderRef} reason=channel mismatch (${n.channel} != ${providerId})`);
        continue;
      }

      const existing = await Order.findOne({
        "marketplace.channel": n.channel,
        "marketplace.externalOrderId": n.externalOrderId,
      });

      // Resolve items to products
      let anyUnmapped = false;
      const resolved = [];
      for (const it of n.items) {
        const product = await resolveProduct(n.channel, it.externalSku, productCache);
        if (!product) {
          anyUnmapped = true;
          console.warn(
            `[Integration:${providerId}] unmapped item externalOrderId=${orderRef} externalSku=${it.externalSku}`,
          );
        }
        resolved.push({ it, product });
      }

      if (existing) {
        const changed = applyUpdate(existing, n, resolved);
        if (changed) {
          await existing.save();
          result.updated++;
        } else {
          result.skipped++;
          console.warn(
            `[Integration:${providerId}] no changes externalOrderId=${orderRef} orderId=${existing._id} reason=already up to date`,
          );
        }
        if (existing.marketplace?.needsMapping) result.needsMapping++;
        continue;
      }

      // Customer linking (CRM record). Never log the phone/address.
      if (hasUsablePhone(n.customer?.phone) && n.customer?.name) {
        try {
          await getOrCreateCustomer({
            phone: n.customer.phone,
            name: n.customer.name,
            email: n.customer.email || undefined,
            source: "other",
          });
        } catch (err) {
          warn(`customer link failed externalOrderId=${orderRef} reason=${err.message}`);
        }
      } else {
        console.warn(
          `[Integration:${providerId}] customer link skipped externalOrderId=${orderRef} reason=missing/redacted phone or name`,
        );
      }

      const order = new Order(buildOrderDoc(n, resolved, anyUnmapped, ownerId));
      await order.save();
      result.imported++;
      if (anyUnmapped) result.needsMapping++;
    } catch (err) {
      result.skipped++;
      if (err?.code === 11000) {
        warn(`skipped order externalOrderId=${orderRef} reason=duplicate key (concurrent import)`);
      } else {
        warn(`skipped order externalOrderId=${orderRef} reason=${err.message}`);
      }
    }
  }

  return result;
}

function buildOrderDoc(n, resolved, anyUnmapped, ownerId) {
  const method = n.payment.method === "COD" ? "COD" : "Other";
  const isPrepaid = n.payment.method === "Prepaid";
  const total = Number(n.pricing?.total ?? n.payment.total ?? 0);
  const phone = hasUsablePhone(n.customer?.phone) ? n.customer.phone : "REDACTED";
  const status = STATUS_MAP[n.status] || "pending";

  return {
    customer: {
      name: n.customer?.name || "Marketplace Customer",
      phone,
      email: n.customer?.email || "",
      address: {
        line1: n.customer?.address?.line1 || "",
        line2: n.customer?.address?.line2 || "",
        city: n.customer?.address?.city || "",
        state: n.customer?.address?.state || "",
        pincode: n.customer?.address?.pincode || "",
        country: n.customer?.address?.country || "India",
      },
    },
    items: resolved.map(({ it, product }) => ({
      productId: product?._id || null,
      sku: product?.sku || it.externalSku,
      name: it.name || product?.name || it.externalSku,
      quantity: it.quantity,
      price: it.unitPrice,
      subtotal: it.subtotal ?? it.quantity * it.unitPrice,
    })),
    pricing: {
      subtotal: Number(n.pricing?.itemsTotal ?? 0),
      discount: Number(n.pricing?.discount ?? 0),
      shippingCharge: Number(n.pricing?.shipping ?? 0),
      total,
    },
    payment: {
      method,
      status: isPrepaid ? "paid" : "pending",
      paidAmount: isPrepaid ? total : 0,
      paidAt: isPrepaid ? n.placedAt : null,
    },
    status,
    source: n.channel,
    notes: `Imported from ${n.channel} order ${n.externalOrderId}`,
    createdBy: ownerId || undefined,
    createdAt: n.placedAt,
    marketplace: {
      channel: n.channel,
      externalOrderId: n.externalOrderId,
      externalShipmentId: n.externalShipmentId || null,
      fulfillmentType: n.fulfillmentType,
      dispatchByDate: n.dispatchByDate || null,
      addressRedacted: !!n.addressRedacted,
      needsMapping: anyUnmapped,
      status: n.status,
      syncedAt: new Date(),
      rawPayload: capRaw(n.raw),
    },
  };
}

/**
 * Apply a re-fetched order to an existing doc without overwriting local edits.
 * Only touches: marketplace.* metadata, cancellation, still-unmapped items,
 * and the address when it was redacted at import time and is now available.
 * @returns {boolean} whether anything changed
 */
function applyUpdate(order, n, resolved) {
  let changed = false;
  const m = order.marketplace;

  const set = (obj, key, val) => {
    const cur = obj[key];
    const same =
      cur instanceof Date && val instanceof Date
        ? cur.getTime() === val.getTime()
        : cur === val;
    if (!same) {
      obj[key] = val;
      changed = true;
    }
  };

  set(m, "status", n.status);
  if (n.externalShipmentId) set(m, "externalShipmentId", n.externalShipmentId);
  if (n.dispatchByDate) {
    const cur = m.dispatchByDate ? new Date(m.dispatchByDate).getTime() : null;
    if (cur !== n.dispatchByDate.getTime()) {
      m.dispatchByDate = n.dispatchByDate;
      changed = true;
    }
  }

  // Address was redacted at import and is now present: fill it in
  if (m.addressRedacted && !n.addressRedacted) {
    order.customer.address = {
      line1: n.customer?.address?.line1 || "",
      line2: n.customer?.address?.line2 || "",
      city: n.customer?.address?.city || "",
      state: n.customer?.address?.state || "",
      pincode: n.customer?.address?.pincode || "",
      country: n.customer?.address?.country || "India",
    };
    if (hasUsablePhone(n.customer?.phone) && !hasUsablePhone(order.customer.phone)) {
      order.customer.phone = n.customer.phone;
    }
    if (n.customer?.name && order.customer.name === "Marketplace Customer") {
      order.customer.name = n.customer.name;
    }
    m.addressRedacted = false;
    changed = true;
  }

  // Link items that were unmapped and now resolve
  resolved.forEach(({ it, product }) => {
    if (!product) return;
    const item = order.items.find(
      (i) => !i.productId && (i.sku === it.externalSku || i.sku === product.sku),
    );
    if (item) {
      item.productId = product._id;
      item.sku = product.sku;
      changed = true;
    }
  });
  const stillUnmapped = order.items.some((i) => !i.productId);
  if (m.needsMapping !== stillUnmapped) {
    m.needsMapping = stillUnmapped;
    changed = true;
  }

  // Marketplace-side cancellation wins unless already delivered/cancelled
  if (
    n.status === "cancelled" &&
    !["cancelled", "delivered"].includes(order.status)
  ) {
    order.status = "cancelled";
    order.notes = `${order.notes || ""}\nCancelled on ${n.channel}`.trim();
    changed = true;
  }

  if (changed) {
    m.syncedAt = new Date();
    const raw = capRaw(n.raw);
    if (raw !== undefined) m.rawPayload = raw;
    order.markModified("marketplace");
  }
  return changed;
}

export default { importOrders, resolveProduct };
