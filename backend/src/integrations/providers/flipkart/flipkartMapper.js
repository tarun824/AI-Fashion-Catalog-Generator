import { STATUS_MAP, DEFAULTS, PRODUCT_ID_MIN, PRODUCT_ID_MAX } from "./flipkartConfig.js";

/**
 * PURE mapping, no network, no logging of PII.
 * Field names for shipment/detail payloads follow the Flipkart Order API v3 shapes
 * seen in docs; every optional lookup is tolerant. TODO(verify) against live payloads.
 */

const num = (v, d = 0) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : d;
};
const str = (v) => (v == null ? "" : String(v).trim());

/** Accepts epoch ms/seconds (number or numeric string) or ISO strings. */
export function parseDate(v) {
  if (v == null || v === "") return null;
  let d;
  if (typeof v === "number" || /^\d+$/.test(String(v))) {
    const n = Number(v);
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else {
    d = new Date(v);
  }
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapStatus(flipkartStatus) {
  const key = str(flipkartStatus).toUpperCase();
  return STATUS_MAP[key] || "new";
}

/** FBF / serviceProfile other than NON_FBF => Flipkart ships it, we must not. */
export function mapFulfillmentType(shipment, items) {
  const shipType = str(shipment?.shipmentType).toUpperCase();
  if (shipType.includes("FBF") && !shipType.includes("NON")) return "MARKETPLACE";
  const profiles = items
    .map((i) => str(i.serviceProfile || shipment?.serviceProfile).toUpperCase())
    .filter(Boolean);
  if (profiles.some((p) => p !== "NON_FBF")) return "MARKETPLACE";
  return "SELLER";
}

/** @returns {"COD"|"Prepaid"|null} null when no signal found. TODO(verify) field names. */
export function detectPaymentMethod(shipment, detail, items) {
  const candidates = [
    detail?.paymentType,
    detail?.paymentMethod,
    detail?.payment?.type,
    detail?.payment?.method,
    shipment?.paymentType,
    shipment?.paymentMethod,
    ...items.flatMap((i) => [i.paymentType, i.paymentMethod]),
  ]
    .map(str)
    .filter(Boolean);
  for (const c of candidates) {
    if (/cod|cash/i.test(c)) return "COD";
    if (/prepaid|online|upi|card|net/i.test(c)) return "Prepaid";
  }
  const flags = [detail?.isCod, detail?.cod, shipment?.isCod, shipment?.cod, ...items.map((i) => i.isCod ?? i.cod)];
  for (const f of flags) {
    if (f === true || f === "true") return "COD";
    if (f === false || f === "false") return "Prepaid";
  }
  return null;
}

function findDetailShipment(shipment, shipmentDetail) {
  if (!shipmentDetail) return null;
  if (Array.isArray(shipmentDetail.shipments)) {
    return shipmentDetail.shipments.find((s) => str(s.shipmentId) === str(shipment.shipmentId)) || null;
  }
  return shipmentDetail;
}

/** Merge filter item with detail item (matched by orderItemId); detail wins. */
function mergedItems(shipment, detail) {
  const base = Array.isArray(shipment.orderItems) ? shipment.orderItems : [];
  const extra = Array.isArray(detail?.orderItems) ? detail.orderItems : [];
  const byId = new Map(extra.map((i) => [str(i.orderItemId), i]));
  const merged = base.map((i) => ({ ...i, ...(byId.get(str(i.orderItemId)) || {}) }));
  for (const e of extra) {
    if (!base.some((b) => str(b.orderItemId) === str(e.orderItemId))) merged.push(e);
  }
  return merged;
}

/**
 * Map ONE Flipkart shipment (+ its detail) to a NormalizedOrder.
 * externalOrderId = Flipkart orderId; externalShipmentId = this shipmentId.
 * @returns {{order: object, warnings: string[]}}
 */
export function toNormalizedOrderWithWarnings(shipment, shipmentDetail = null, opts = {}) {
  const warnings = [];
  const detail = findDetailShipment(shipment, shipmentDetail);
  const items = mergedItems(shipment, detail);
  const first = items[0] || {};
  const orderId = str(first.orderId || shipment.orderId || detail?.orderId);
  const shipmentId = str(shipment.shipmentId) || null;
  const ref = orderId || shipmentId || "unknown";

  const normItems = items.map((it) => {
    const pc = it.priceComponents || {};
    const quantity = Math.max(1, num(it.quantity, 1));
    // TODO(verify): sellingPrice treated as per-unit price; totalPrice as line total.
    const unitPrice = num(pc.sellingPrice, num(pc.totalPrice) / quantity);
    return {
      externalItemId: str(it.orderItemId) || null,
      externalSku: str(it.sku || it.SKU),
      name: str(it.title || it.productTitle || it.sku),
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
      _shipping: num(pc.shippingCharge),
      _customerPrice: num(pc.customerPrice, null),
    };
  });

  const itemsTotal = normItems.reduce((s, i) => s + i.subtotal, 0);
  const shipping = normItems.reduce((s, i) => s + i._shipping, 0);
  const hasCustomerTotal = normItems.length > 0 && normItems.every((i) => i._customerPrice != null);
  const total = hasCustomerTotal ? normItems.reduce((s, i) => s + i._customerPrice, 0) : itemsTotal + shipping;
  const discount = Math.max(0, itemsTotal + shipping - total);
  const cleanItems = normItems.map(({ _shipping, _customerPrice, ...rest }) => rest);

  if (items.some((i) => i.hold === true || i.hold === "true")) {
    warnings.push(`Flipkart order ${ref} is on hold; do not ship until Flipkart releases it`);
  }

  let method = detectPaymentMethod(shipment, detail, items);
  if (!method) {
    method = "Prepaid";
    warnings.push(`Flipkart order ${ref}: payment type not provided by API, defaulted to Prepaid. Check COD manually`);
  }

  const addr = detail?.deliveryAddress || detail?.shippingAddress || shipment.deliveryAddress || null;
  const buyer = detail?.buyerDetails || shipment.buyerDetails || {};
  const nameFromAddr = [addr?.firstName, addr?.lastName].filter(Boolean).join(" ") || addr?.name;
  const nameFromBuyer = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ") || buyer.name;
  if (!addr) warnings.push(`Flipkart order ${ref}: no delivery address in shipment details`);

  let status;
  if (opts.forceStatus) {
    status = opts.forceStatus;
  } else {
    const mapped = items.map((i) => mapStatus(i.status || shipment.status));
    if (mapped.length && mapped.every((s) => s === "cancelled")) status = "cancelled";
    else status = mapped.find((s) => s !== "cancelled") || mapStatus(shipment.status);
  }

  const placedAt = parseDate(first.orderDate || shipment.orderDate || detail?.orderDate) || new Date(0);
  if (placedAt.getTime() === 0) warnings.push(`Flipkart order ${ref}: missing orderDate`);

  const order = {
    channel: "flipkart",
    externalOrderId: orderId || shipmentId || "",
    externalShipmentId: shipmentId,
    placedAt,
    dispatchByDate: parseDate(first.dispatchByDate || shipment.dispatchByDate),
    fulfillmentType: mapFulfillmentType(shipment, items),
    status,
    customer: {
      name: str(nameFromAddr || nameFromBuyer),
      phone: str(addr?.contactNumber || addr?.phone || buyer.contactNumber),
      email: str(buyer.email),
      address: {
        line1: str(addr?.addressLine1),
        line2: str(addr?.addressLine2 || addr?.landmark),
        city: str(addr?.city),
        state: str(addr?.state),
        pincode: str(addr?.pinCode || addr?.pincode),
        country: str(addr?.country) || "India",
      },
    },
    addressRedacted: !addr,
    payment: { method, total, currency: DEFAULTS.currency },
    items: cleanItems,
    pricing: { itemsTotal, shipping, discount, total },
    raw: { shipment, detail: detail || null },
  };
  return { order, warnings };
}

export function toNormalizedOrder(shipment, shipmentDetail = null, opts = {}) {
  return toNormalizedOrderWithWarnings(shipment, shipmentDetail, opts).order;
}

/**
 * Group per-shipment orders sharing an orderId into one NormalizedOrder.
 * Multiple shipments of the same order: externalOrderId = orderId and
 * externalShipmentId is the FIRST shipment's id (later shipments' items are merged in;
 * all raw payloads are kept in raw.shipments). Limitation: confirming dispatch
 * confirms only the first shipment.
 */
export function mergeOrdersByOrderId(orders) {
  const map = new Map();
  for (const o of orders) {
    const prev = map.get(o.externalOrderId);
    if (!prev) {
      map.set(o.externalOrderId, { ...o, items: [...o.items], payment: { ...o.payment }, raw: { shipments: [o.raw] } });
      continue;
    }
    prev.items.push(...o.items);
    prev.pricing = {
      itemsTotal: prev.pricing.itemsTotal + o.pricing.itemsTotal,
      shipping: prev.pricing.shipping + o.pricing.shipping,
      discount: prev.pricing.discount + o.pricing.discount,
      total: prev.pricing.total + o.pricing.total,
    };
    prev.payment.total = prev.pricing.total;
    if (o.status !== "cancelled" && prev.status === "cancelled") prev.status = o.status;
    if (o.fulfillmentType === "MARKETPLACE") prev.fulfillmentType = "MARKETPLACE";
    prev.raw.shipments.push(o.raw);
  }
  return [...map.values()];
}

const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== "";

/** Local validation for a listing. Returns issues (empty = ok). */
export function validateListing(listing, ctx = {}) {
  const issues = [];
  const o = listing?.overrides || {};
  const pid = str(o.flipkartProductId);
  if (!isNonEmpty(listing?.sku)) issues.push("SKU is required");
  if (pid.length < PRODUCT_ID_MIN || pid.length > PRODUCT_ID_MAX) {
    issues.push(`Flipkart product id must be ${PRODUCT_ID_MIN}-${PRODUCT_ID_MAX} characters`);
  }
  if (!(num(listing?.mrp) > 0)) issues.push("MRP must be greater than 0");
  if (!(num(listing?.sellingPrice) > 0)) issues.push("Selling price must be greater than 0");
  if (num(listing?.sellingPrice) > num(listing?.mrp)) issues.push("Selling price cannot exceed MRP");
  if (!isNonEmpty(o.hsn || ctx.defaultHsn)) {
    issues.push("HSN code is required (set per product or a default HSN in the integration credentials)");
  }
  if (!isNonEmpty(ctx.locationId)) issues.push("Flipkart location id is required in the integration credentials");
  if (!(num(listing?.stock, -1) >= 0)) issues.push("Stock must be 0 or more");
  return issues;
}

/**
 * Build one Listing API v3 sku entry. TODO(verify) exact envelope/field names.
 * @param {object} listing NormalizedListing
 * @param {{locationId:string, defaultHsn?:string, defaultTaxCode?:string, defaultDispatchSla?:number,
 *   manufacturerName?:string, packerName?:string, countryOfOrigin?:string, selfShip?:boolean}} ctx
 */
export function toFlipkartListing(listing, ctx = {}) {
  const o = listing.overrides || {};
  const selfShip = ctx.selfShip !== false;
  const sku = {
    sku: listing.sku,
    product_id: str(o.flipkartProductId),
    price: {
      mrp: num(listing.mrp),
      selling_price: num(listing.sellingPrice),
      currency: listing.currency || DEFAULTS.currency,
    },
    tax: {
      hsn: str(o.hsn || ctx.defaultHsn),
      tax_code: str(o.taxCode || ctx.defaultTaxCode || DEFAULTS.taxCode),
    },
    listing_status: "ACTIVE",
    fulfillment_profile: "NON_FBF",
    fulfillment: {
      dispatch_sla: num(o.dispatchSla ?? ctx.defaultDispatchSla, DEFAULTS.dispatchSla),
      shipping_provider: selfShip ? "SELF" : "FLIPKART",
      procurement_type: "REGULAR",
    },
    locations: [{ id: str(ctx.locationId), inventory: Math.max(0, Math.floor(num(listing.stock))) }],
  };
  const label = {
    manufacturer_details: str(o.manufacturerName || ctx.manufacturerName),
    packer_details: str(o.packerName || ctx.packerName),
    country_of_origin: str(o.countryOfOrigin || ctx.countryOfOrigin || DEFAULTS.countryOfOrigin),
  };
  if (label.manufacturer_details || label.packer_details) sku.address_label = label; // TODO(verify) key names
  return sku;
}

/** Default GST % when no creds override: apparel up to Rs 2500 is 5%, above 18%. TODO(verify) current slabs. */
export function defaultTaxPercent(unitPrice) {
  return unitPrice <= 2500 ? 5 : 18;
}

/**
 * Self-ship dispatch payload.
 * TODO(verify against https://seller.flipkart.com/api-docs/order-api-docs/ ):
 * ALL field names below are a best guess. Change them here only.
 * @param {{shipmentId:string, locationId?:string, invoiceNumber:string, invoiceDate:Date,
 *   items:{orderItemId:string, quantity:number, unitPrice:number}[], carrierName:string, awb:string,
 *   expectedDeliveryDate:Date, dispatchDate:Date, taxPercent?:number}} p
 */
export function buildSelfShipDispatchPayload(p) {
  const iso = (d) => new Date(d).toISOString();
  return {
    shipments: [
      {
        shipmentId: p.shipmentId,
        locationId: p.locationId || undefined,
        dispatchDate: iso(p.dispatchDate),
        invoices: [
          {
            invoiceNumber: p.invoiceNumber,
            invoiceDate: iso(p.invoiceDate),
            items: p.items.map((i) => ({
              orderItemId: i.orderItemId,
              quantity: i.quantity,
              taxPercentage: p.taxPercent ?? defaultTaxPercent(i.unitPrice),
            })),
          },
        ],
        logistics: {
          courierName: p.carrierName,
          trackingId: p.awb,
          expectedDeliveryDate: iso(p.expectedDeliveryDate),
        },
      },
    ],
  };
}
