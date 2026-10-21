// Run: node backend/src/integrations/providers/amazon/amazon.mapper.test.mjs  (no network)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { toNormalizedOrder, toAmazonListing, mapListingResponse, findMissingRequired, filterToSchema } from "./amazonMapper.js";
import { validateNormalizedOrder } from "../../core/schemas.js";
import provider, { AmazonProvider } from "./AmazonProvider.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const fx = (n) => JSON.parse(readFileSync(path.join(dir, n), "utf8"));
let passed = 0;
const t = async (name, fn) => {
  await fn();
  passed++;
  console.log("ok -", name);
};

await t("order mapping with address", () => {
  const f = fx("order.json");
  const o = toNormalizedOrder(f.order, f.items, f.address);
  assert.equal(o.channel, "amazon");
  assert.equal(o.externalOrderId, "404-0000000-0000001");
  assert.equal(o.status, "new");
  assert.equal(o.fulfillmentType, "SELLER");
  assert.equal(o.payment.method, "Prepaid");
  assert.equal(o.addressRedacted, false);
  assert.equal(o.customer.address.pincode, "560001");
  assert.equal(o.customer.address.country, "India");
  assert.equal(o.items[0].unitPrice, 1199); // 2398 / 2
  assert.equal(o.items[0].subtotal, 2398);
  assert.equal(o.items[0].externalItemId, "10000000000001");
  assert.equal(o.pricing.total, 2498);
  assert.equal(o.pricing.shipping, 100);
  assert.equal(o.dispatchByDate.toISOString(), "2026-09-30T18:29:59.000Z");
  assert.equal(validateNormalizedOrder(o).valid, true);
});

await t("order mapping redacted + COD + AFN + shipped", () => {
  const f = fx("orderCod.json");
  const o = toNormalizedOrder(f.order, f.items, null);
  assert.equal(o.payment.method, "COD");
  assert.equal(o.fulfillmentType, "MARKETPLACE");
  assert.equal(o.status, "shipped");
  assert.equal(o.addressRedacted, true);
  assert.equal(o.customer.phone, "REDACTED");
  assert.equal(o.customer.address.line1, "");
  assert.equal(o.dispatchByDate, null);
  assert.equal(validateNormalizedOrder(o).valid, true);
});

await t("canceled status", () => {
  const f = fx("order.json");
  const o = toNormalizedOrder({ ...f.order, OrderStatus: "Canceled" }, f.items, null);
  assert.equal(o.status, "cancelled");
});

await t("listing mapping (new ASIN)", () => {
  const l = fx("listing.json");
  const r = toAmazonListing(l, { productType: "SAREE", brand: "Prodoc" });
  assert.equal(r.requirements, "LISTING");
  assert.equal(r.sku, "SAREE-RED-001");
  const a = r.attributes;
  assert.deepEqual(a.item_name, [{ value: "Red Silk Saree", marketplace_id: "A21TJRUUN4KGV", language_tag: "en_IN" }]);
  assert.equal(a.brand[0].value, "Prodoc");
  assert.ok(a.bullet_point.length >= 4);
  assert.equal(a.country_of_origin[0].value, "IN");
  assert.equal(a.supplier_declared_has_product_identifier_exemption[0].value, true);
  assert.equal(a.purchasable_offer[0].currency, "INR");
  assert.equal(a.purchasable_offer[0].our_price[0].schedule[0].value_with_tax, 1199);
  assert.equal(a.list_price[0].value, 3999);
  assert.deepEqual(a.fulfillment_availability, [{ fulfillment_channel_code: "DEFAULT", quantity: 7 }]);
  assert.equal(a.main_product_image_locator[0].media_location, "https://example.com/api/images/a1");
  assert.equal(a.other_product_image_locator_2[0].media_location, "https://example.com/api/images/a3");
  assert.equal(a.color[0].value, "Red");
  assert.equal(a.size[0].value, "Free Size");
});

await t("listing mapping (existing ASIN => offer only, gtin)", () => {
  const l = fx("listing.json");
  const r = toAmazonListing({ ...l, overrides: { asin: "B0EXISTING1" } }, {});
  assert.equal(r.requirements, "LISTING_OFFER_ONLY");
  assert.equal(r.attributes.merchant_suggested_asin[0].value, "B0EXISTING1");
  assert.equal(r.attributes.item_name, undefined);
  const g = toAmazonListing({ ...l, overrides: { ean: "8901234567890" } }, {});
  assert.equal(g.attributes.externally_assigned_product_identifier[0].type, "ean");
  assert.equal(g.attributes.supplier_declared_has_product_identifier_exemption, undefined);
});

await t("response + schema helpers", () => {
  const ok = mapListingResponse({ status: "ACCEPTED", issues: [] }, { dryRun: false });
  assert.equal(ok.status, "submitted");
  assert.equal(mapListingResponse({ status: "ACCEPTED", issues: [] }, { dryRun: true }).status, "draft");
  const bad = mapListingResponse({ status: "INVALID", issues: [{ severity: "ERROR", message: "Missing hsn", attributeNames: ["hsn_code"] }] });
  assert.equal(bad.status, "error");
  assert.match(bad.issues[0], /hsn_code/);
  const schema = fx("productTypeSchema.json");
  const r = toAmazonListing(fx("listing.json"), { brand: "Prodoc" });
  assert.deepEqual(findMissingRequired(schema, r.attributes), ["hsn_code"]);
  const { dropped } = filterToSchema(schema, r.attributes);
  assert.ok(dropped.includes("fabric_type"));
});

await t("provider metadata", () => {
  assert.equal(AmazonProvider.id, "amazon");
  assert.equal(provider.category, "marketplace");
  assert.ok(Object.values(provider.capabilities).every(Boolean));
  const keys = provider.credentialFields().map((f) => f.key);
  for (const k of ["sellerId", "lwaClientId", "lwaClientSecret", "refreshToken", "marketplaceId"]) assert.ok(keys.includes(k));
});

/** Fake SP client for provider flow tests (no network). */
function fakeSp({ rdtFails = false, addr403 = false } = {}) {
  const f = fx("order.json");
  const calls = [];
  return {
    calls,
    getRestrictedDataToken: async (res) => {
      calls.push(["rdt", res.length]);
      if (rdtFails) {
        const { ProviderError } = await import("../../core/errors.js");
        throw new ProviderError("PII_ROLE_MISSING", "denied");
      }
      return "RDT-FAKE";
    },
    request: async (cfg, opts = {}) => {
      calls.push([cfg.method, cfg.url, opts.accessToken ? "rdt" : "lwa"]);
      if (cfg.url === "/orders/v0/orders") return { data: { payload: { Orders: [f.order] } } };
      if (cfg.url.endsWith("/orderItems")) return { data: { payload: { OrderItems: f.items } } };
      if (cfg.url.endsWith("/address")) {
        if (addr403) {
          const { ProviderError } = await import("../../core/errors.js");
          throw new ProviderError("PII_ROLE_MISSING", "denied");
        }
        return { data: { payload: { ShippingAddress: f.address } } };
      }
      if (cfg.url.endsWith("/shipmentConfirmation")) {
        calls.push(["body", cfg.data]);
        return { data: "" };
      }
      throw new Error("unexpected " + cfg.url);
    },
  };
}
const noSleep = async () => {};

await t("fetchOrders with RDT address", async () => {
  const sp = fakeSp();
  const r = await provider.fetchOrders({}, {}, { sp, sleep: noSleep });
  assert.equal(r.orders.length, 1);
  assert.equal(r.orders[0].addressRedacted, false);
  assert.equal(r.warnings.length, 0);
  assert.ok(sp.calls.some((c) => typeof c[1] === "string" && c[1].endsWith("/address") && c[2] === "rdt"));
});

await t("fetchOrders degrades when RDT denied", async () => {
  const origWarn = console.warn;
  console.warn = () => {};
  const r = await provider.fetchOrders({}, {}, { sp: fakeSp({ rdtFails: true }), sleep: noSleep });
  const r2 = await provider.fetchOrders({}, {}, { sp: fakeSp({ addr403: true }), sleep: noSleep });
  console.warn = origWarn;
  for (const x of [r, r2]) {
    assert.equal(x.orders[0].addressRedacted, true);
    assert.equal(x.orders[0].customer.phone, "REDACTED");
    assert.equal(x.warnings.length, 1);
    assert.match(x.warnings[0], /PII role/);
  }
});

await t("confirmShipment body", async () => {
  const sp = fakeSp();
  const res = await provider.confirmShipment(
    { marketplaceId: "A21TJRUUN4KGV" },
    { marketplace: { externalOrderId: "404-0000000-0000001" } },
    { carrierName: "Delhivery", awb: "AWB123", shipDate: new Date("2026-09-29T00:00:00Z") },
    { sp },
  );
  assert.equal(res.ok, true);
  const body = sp.calls.find((c) => c[0] === "body")[1];
  assert.equal(body.packageDetail.carrierCode, "Other");
  assert.equal(body.packageDetail.carrierName, "Delhivery");
  assert.equal(body.packageDetail.trackingNumber, "AWB123");
  assert.deepEqual(body.packageDetail.orderItems, [{ orderItemId: "10000000000001", quantity: 2 }]);
});

await t("publish pre-validation reports missing required (dryRun)", async () => {
  const sp = {
    request: async (cfg) => {
      if (cfg.url.startsWith("/definitions/")) return { data: { schema: { link: { resource: "https://example.invalid/schema" } } } };
      assert.equal(cfg.method, "PUT");
      assert.equal(cfg.params.mode, "VALIDATION_PREVIEW");
      assert.equal(cfg.data.attributes.fabric_type, undefined); // dropped by schema filter
      return { data: { status: "ACCEPTED", issues: [] } };
    },
  };
  const p = new AmazonProvider();
  p._fetchSchemaJson = async () => fx("productTypeSchema.json");
  const r = await p.publishProduct({ sellerId: "ATESTSELLER", brand: "Prodoc" }, fx("listing.json"), { dryRun: true }, { sp });
  assert.equal(r.status, "error");
  assert.ok(r.issues.some((i) => i.includes("hsn_code")));
});

console.log(`\n${passed} tests passed`);
