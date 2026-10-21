// Run: node flipkart.mapper.test.mjs   (no network; sanitized fixtures)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  toNormalizedOrder,
  toNormalizedOrderWithWarnings,
  mergeOrdersByOrderId,
  toFlipkartListing,
  validateListing,
  buildSelfShipDispatchPayload,
  parseDate,
} from "./flipkartMapper.js";
import { validateNormalizedOrder } from "../../core/schemas.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const load = (f) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const filter = load("shipments.filter.json");
const detail = load("shipments.detail.json");
const [s1, s2, s3] = filter.shipments;

let passed = 0;
const t = (name, fn) => {
  fn();
  passed++;
  console.log("ok -", name);
};

t("maps shipment 1: ids, items, pricing, COD, address, hold warning", () => {
  const { order, warnings } = toNormalizedOrderWithWarnings(s1, detail);
  assert.equal(order.externalOrderId, "OD000000000000000001");
  assert.equal(order.externalShipmentId, "SHP0001");
  assert.equal(order.items.length, 2);
  assert.equal(order.items[0].externalItemId, "OI1");
  assert.equal(order.items[0].name, "Red Silk Saree (detail)");
  assert.equal(order.items[1].quantity, 2);
  assert.equal(order.items[1].unitPrice, 500);
  assert.equal(order.pricing.itemsTotal, 2500);
  assert.equal(order.pricing.shipping, 50);
  assert.equal(order.pricing.total, 2550);
  assert.equal(order.payment.method, "COD");
  assert.equal(order.customer.name, "Test Receiver");
  assert.equal(order.customer.address.pincode, "560001");
  assert.equal(order.status, "new");
  assert.equal(order.fulfillmentType, "SELLER");
  assert.equal(order.addressRedacted, false);
  assert.ok(warnings.some((w) => /on hold/.test(w)));
  assert.ok(!warnings.some((w) => /payment type/.test(w)));
  const v = validateNormalizedOrder(order);
  assert.ok(v.valid, v.errors.join(","));
});

t("FBF shipment -> MARKETPLACE, unknown payment -> Prepaid + warning, epoch date", () => {
  const { order, warnings } = toNormalizedOrderWithWarnings(s2, detail);
  assert.equal(order.fulfillmentType, "MARKETPLACE");
  assert.equal(order.payment.method, "Prepaid");
  assert.ok(warnings.some((w) => /Check COD manually/.test(w)));
  assert.equal(order.placedAt.getTime(), 1759400000000);
});

t("cancelled item -> cancelled; missing detail -> redacted + warning", () => {
  const { order, warnings } = toNormalizedOrderWithWarnings(s3, null);
  assert.equal(order.status, "cancelled");
  assert.equal(order.addressRedacted, true);
  assert.ok(warnings.some((w) => /no delivery address/.test(w)));
});

t("forceStatus overrides", () => {
  assert.equal(toNormalizedOrder(s1, detail, { forceStatus: "cancelled" }).status, "cancelled");
});

t("merge groups shipments of one orderId, keeps first shipmentId", () => {
  const a = toNormalizedOrder(s1, detail);
  const clone = JSON.parse(JSON.stringify(s1));
  clone.shipmentId = "SHP0001B";
  clone.orderItems = [{ ...clone.orderItems[0], orderItemId: "OI9" }];
  const b = toNormalizedOrder(clone, null);
  const merged = mergeOrdersByOrderId([a, b, toNormalizedOrder(s2, detail)]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].externalShipmentId, "SHP0001");
  assert.equal(merged[0].items.length, 3);
  assert.equal(merged[0].raw.shipments.length, 2);
  assert.equal(merged[0].pricing.total, a.pricing.total + b.pricing.total);
});

t("parseDate handles ISO, ms, seconds, junk", () => {
  assert.equal(parseDate("2026-10-02T08:30:00.000Z").toISOString(), "2026-10-02T08:30:00.000Z");
  assert.equal(parseDate(1759400000).getTime(), 1759400000000);
  assert.equal(parseDate("nope"), null);
  assert.equal(parseDate(null), null);
});

const listing = {
  sku: "SAREE-RED-001",
  name: "x",
  description: "",
  mrp: 2000,
  sellingPrice: 1500,
  currency: "INR",
  images: [],
  attributes: {},
  stock: 7,
  variants: [],
  category: "saree",
  overrides: { flipkartProductId: "SARABCDEFGH12345", hsn: "5407" },
};
const ctx = { locationId: "LOC_TEST", defaultTaxCode: "GST_APPAREL", defaultDispatchSla: 2, selfShip: true };

t("listing mapping + validation ok", () => {
  assert.deepEqual(validateListing(listing, ctx), []);
  const l = toFlipkartListing(listing, ctx);
  assert.equal(l.product_id, "SARABCDEFGH12345");
  assert.equal(l.price.selling_price, 1500);
  assert.equal(l.fulfillment.shipping_provider, "SELF");
  assert.equal(l.fulfillment.dispatch_sla, 2);
  assert.deepEqual(l.locations, [{ id: "LOC_TEST", inventory: 7 }]);
  assert.equal(l.tax.hsn, "5407");
});

t("listing validation catches problems", () => {
  const bad = { ...listing, mrp: 100, overrides: { flipkartProductId: "short" } };
  const issues = validateListing(bad, { locationId: "" });
  assert.ok(issues.length >= 4, issues.join("|"));
});

t("self-ship payload builder", () => {
  const d = new Date("2026-10-03T00:00:00.000Z");
  const p = buildSelfShipDispatchPayload({
    shipmentId: "SHP0001",
    invoiceNumber: "INV-1",
    invoiceDate: d,
    dispatchDate: d,
    expectedDeliveryDate: new Date(d.getTime() + 5 * 86400000),
    carrierName: "Delhivery",
    awb: "AWB123",
    items: [
      { orderItemId: "OI1", quantity: 1, unitPrice: 1500 },
      { orderItemId: "OI2", quantity: 2, unitPrice: 3000 },
    ],
  });
  const sh = p.shipments[0];
  assert.equal(sh.logistics.trackingId, "AWB123");
  assert.equal(sh.invoices[0].items[0].taxPercentage, 5);
  assert.equal(sh.invoices[0].items[1].taxPercentage, 18);
});

console.log(`\n${passed} tests passed`);
