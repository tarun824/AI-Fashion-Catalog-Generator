import {
  ORDER_STATUS_MAP,
  INDIA_MARKETPLACE_ID,
  LANGUAGE_TAG,
  DEFAULT_PRODUCT_TYPE,
  DEFAULT_CURRENCY,
  PROVIDER_ID,
} from "./amazonConfig.js";

/** Pure mapping functions. No network, no module state. */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (m) => num(m?.Amount);
const round2 = (n) => Math.round(n * 100) / 100;
const str = (v) => (v == null ? "" : String(v).trim());

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mapOrderStatus(amazonStatus) {
  const mapped = ORDER_STATUS_MAP[amazonStatus];
  if (!mapped) {
    console.warn(
      `[Integration:${PROVIDER_ID}] unknown OrderStatus=${amazonStatus} reason=defaulting to new`,
    );
    return "new";
  }
  return mapped;
}

function mapItem(it) {
  const quantity = Math.max(1, num(it.QuantityOrdered) || 1);
  // ItemPrice is the LINE total for QuantityOrdered, not per unit.
  const lineTotal = money(it.ItemPrice);
  return {
    externalItemId: it.OrderItemId ? String(it.OrderItemId) : null,
    externalSku: str(it.SellerSKU),
    asin: str(it.ASIN),
    name: str(it.Title),
    quantity,
    unitPrice: round2(lineTotal / quantity),
    subtotal: round2(lineTotal),
  };
}

function mapAddress(a) {
  if (!a) {
    return { line1: "", line2: "", city: "", state: "", pincode: "", country: "India" };
  }
  const country = str(a.CountryCode).toUpperCase();
  return {
    line1: str(a.AddressLine1),
    line2: [a.AddressLine2, a.AddressLine3].map(str).filter(Boolean).join(", "),
    city: str(a.City),
    state: str(a.StateOrRegion),
    pincode: str(a.PostalCode),
    country: !country || country === "IN" ? "India" : country,
  };
}

/**
 * @param {object} rawOrder   Orders v0 Order
 * @param {object[]} rawItems Orders v0 OrderItems (payload.OrderItems)
 * @param {object|null} rawAddress  getOrderAddress payload.ShippingAddress, or null when redacted
 * @returns {import("../../core/schemas.js").NormalizedOrder}
 */
export function toNormalizedOrder(rawOrder, rawItems, rawAddress) {
  const items = (rawItems || []).map(mapItem);
  const addressRedacted = !rawAddress;

  const sum = (fn) => round2((rawItems || []).reduce((s, it) => s + fn(it), 0));
  const itemsTotal = sum((it) => money(it.ItemPrice));
  const shipping = sum((it) => money(it.ShippingPrice));
  const discount = sum((it) => money(it.PromotionDiscount) + money(it.ShippingDiscount));
  const orderTotal = money(rawOrder.OrderTotal);
  const total = orderTotal > 0 ? round2(orderTotal) : round2(itemsTotal + shipping - discount);

  const isCod =
    rawOrder.PaymentMethod === "COD" ||
    (Array.isArray(rawOrder.PaymentMethodDetails) &&
      rawOrder.PaymentMethodDetails.includes("CashOnDelivery"));

  const phone = str(rawAddress?.Phone);

  return {
    channel: PROVIDER_ID,
    externalOrderId: str(rawOrder.AmazonOrderId),
    externalShipmentId: null,
    placedAt: parseDate(rawOrder.PurchaseDate) || new Date(),
    dispatchByDate: parseDate(rawOrder.LatestShipDate),
    fulfillmentType: rawOrder.FulfillmentChannel === "AFN" ? "MARKETPLACE" : "SELLER",
    status: mapOrderStatus(rawOrder.OrderStatus),
    customer: {
      name: str(rawAddress?.Name),
      phone: addressRedacted || !phone ? "REDACTED" : phone,
      email: "", // TODO(verify): BuyerInfo email is an Amazon relay address; not fetched
      address: mapAddress(rawAddress),
    },
    addressRedacted,
    payment: {
      method: isCod ? "COD" : "Prepaid",
      total,
      currency: str(rawOrder.OrderTotal?.CurrencyCode) || DEFAULT_CURRENCY,
    },
    items,
    pricing: { itemsTotal, shipping, discount, total },
    // Raw is stored for debugging: order + item ids only, never the address.
    raw: { order: rawOrder, itemCount: items.length },
  };
}

/* ------------------------------ listings ------------------------------ */

/** Wrap a scalar into the Listings API attribute shape. */
function attr(value, ctx, { language = true } = {}) {
  const o = { value, marketplace_id: ctx.marketplaceId };
  if (language) o.language_tag = ctx.languageTag;
  return [o];
}

function buildBullets(l) {
  const a = l.attributes || {};
  const b = [];
  if (a.fabric) b.push(`Fabric: ${a.fabric}`);
  if (a.workType) b.push(`Work: ${a.workType}`);
  if (a.borderType) b.push(`Border: ${a.borderType}`);
  if (a.occasion) b.push(`Occasion: ${a.occasion}`);
  if (a.blouseIncluded) b.push("Blouse piece included");
  if (a.weight) b.push(`Weight: ${a.weight}`);
  return b.slice(0, 5);
}

export function buildFulfillmentAvailability(quantity) {
  return [
    { fulfillment_channel_code: "DEFAULT", quantity: Math.max(0, Math.trunc(num(quantity))) },
  ];
}

export function buildPriceAttributes({ mrp, sellingPrice, currency }, ctx) {
  const c = currency || DEFAULT_CURRENCY;
  const out = {};
  if (sellingPrice != null && Number.isFinite(Number(sellingPrice))) {
    out.purchasable_offer = [
      {
        marketplace_id: ctx.marketplaceId,
        currency: c,
        our_price: [{ schedule: [{ value_with_tax: Number(sellingPrice) }] }],
      },
    ];
  }
  if (mrp != null && Number.isFinite(Number(mrp))) {
    // TODO(verify): list_price key is `value` (some product types use value_with_tax)
    out.list_price = [{ value: Number(mrp), currency: c, marketplace_id: ctx.marketplaceId }];
  }
  return out;
}

function offerAttributes(l, ctx) {
  return {
    ...buildPriceAttributes(l, ctx),
    fulfillment_availability: buildFulfillmentAvailability(l.stock),
  };
}

/**
 * @param {import("../../core/schemas.js").NormalizedListing} listing
 * @param {{marketplaceId?:string, productType?:string, brand?:string, languageTag?:string}} [ctxIn]
 * @returns {{sku:string, productType:string, requirements:string, attributes:object}}
 */
export function toAmazonListing(listing, ctxIn = {}) {
  const ctx = {
    marketplaceId: ctxIn.marketplaceId || INDIA_MARKETPLACE_ID,
    productType: ctxIn.productType || DEFAULT_PRODUCT_TYPE,
    brand: ctxIn.brand || "",
    languageTag: ctxIn.languageTag || LANGUAGE_TAG,
  };
  const ov = listing.overrides || {};
  const asin = str(ov.asin);
  const requirements = asin ? "LISTING_OFFER_ONLY" : "LISTING";
  const attributes = {};

  const variant = (listing.variants || []).length === 1 ? listing.variants[0] : null;
  const color = str(variant?.color) || str(listing.attributes?.colors?.[0]);
  const size = str(variant?.size);

  if (asin) {
    attributes.merchant_suggested_asin = attr(asin, ctx, { language: false });
    attributes.condition_type = attr("new_new", ctx);
    Object.assign(attributes, offerAttributes(listing, ctx));
  } else {
    attributes.item_name = attr(str(listing.name), ctx);
    const brand = str(ov.brand) || ctx.brand;
    if (brand) attributes.brand = attr(brand, ctx);
    const bullets = buildBullets(listing);
    if (bullets.length) {
      attributes.bullet_point = bullets.map((b) => ({
        value: b,
        marketplace_id: ctx.marketplaceId,
        language_tag: ctx.languageTag,
      }));
    }
    if (listing.description) {
      attributes.product_description = attr(str(listing.description), ctx);
    }
    if (color) attributes.color = attr(color, ctx);
    if (size) attributes.size = attr(size, ctx);
    const fabric = str(listing.attributes?.fabric);
    if (fabric) {
      attributes.material = attr(fabric, ctx);
      // TODO(verify): saree types may want fabric_type; dropped if absent from the schema
      attributes.fabric_type = attr(fabric, ctx);
    }
    // TODO(verify): allowed department values per product type
    attributes.department = attr(str(ov.department) || "Women", ctx);
    attributes.country_of_origin = attr(str(ov.countryOfOrigin) || "IN", ctx, {
      language: false,
    });
    attributes.condition_type = attr("new_new", ctx);

    const gtin = str(ov.gtin || ov.ean || ov.upc);
    if (gtin) {
      const type = ov.upc ? "upc" : ov.ean ? "ean" : "gtin";
      attributes.externally_assigned_product_identifier = [
        { type, value: gtin, marketplace_id: ctx.marketplaceId },
      ];
    } else {
      attributes.supplier_declared_has_product_identifier_exemption = attr(true, ctx, {
        language: false,
      });
    }
    Object.assign(attributes, offerAttributes(listing, ctx));

    (listing.images || []).slice(0, 9).forEach((url, i) => {
      const key = i === 0 ? "main_product_image_locator" : `other_product_image_locator_${i}`;
      attributes[key] = [{ media_location: url, marketplace_id: ctx.marketplaceId }];
    });
  }

  // Marketplace-only extras supplied by the user: {attr: scalar | [{...}]}
  const extra = ov.amazonAttributes;
  if (extra && typeof extra === "object") {
    for (const [k, v] of Object.entries(extra)) {
      attributes[k] = Array.isArray(v) ? v : attr(v, ctx);
    }
  }

  return { sku: listing.sku, productType: ctx.productType, requirements, attributes };
}

/**
 * Map a Listings API PUT response to our contract.
 * @returns {{status:'submitted'|'draft'|'error', issues:string[]}}
 */
export function mapListingResponse(data, { dryRun = false } = {}) {
  const rawIssues = Array.isArray(data?.issues) ? data.issues : [];
  const issues = rawIssues.map((i) => {
    const sev = i.severity ? `[${i.severity}] ` : "";
    const names =
      Array.isArray(i.attributeNames) && i.attributeNames.length
        ? ` (${i.attributeNames.join(", ")})`
        : "";
    return `${sev}${i.message || i.code || "Unknown issue"}${names}`;
  });
  const invalid = data?.status === "INVALID" || rawIssues.some((i) => i.severity === "ERROR");
  let status;
  if (invalid) status = "error";
  else if (dryRun) status = "draft";
  else status = "submitted"; // ACCEPTED = queued. TODO(verify): detect live via getListingsItem
  return { status, issues };
}

/** Missing top-level required attributes per a product type JSON schema. */
export function findMissingRequired(schemaJson, attributes) {
  const required = Array.isArray(schemaJson?.required) ? schemaJson.required : [];
  return required.filter((k) => attributes[k] == null);
}

/** Keep only attributes the schema knows. */
export function filterToSchema(schemaJson, attributes) {
  const props = schemaJson?.properties;
  if (!props || typeof props !== "object") return { kept: attributes, dropped: [] };
  const kept = {};
  const dropped = [];
  for (const [k, v] of Object.entries(attributes)) {
    if (k in props) kept[k] = v;
    else dropped.push(k);
  }
  return { kept, dropped };
}

export default { toNormalizedOrder, toAmazonListing, mapListingResponse };
