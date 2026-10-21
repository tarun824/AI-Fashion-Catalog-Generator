import { BaseProvider } from "../../core/BaseProvider.js";
import { ProviderError } from "../../core/errors.js";
import { shopifyRequest, parseLinkHeader, shopHost } from "./shopifyAuth.js";
import { toNormalizedOrder } from "./shopifyMapper.js";
import { PROVIDER_ID, ORDERS_PAGE_SIZE, DEFAULT_LOOKBACK_DAYS } from "./shopifyConfig.js";

const log = (msg) => console.warn(`[Integration:${PROVIDER_ID}] ${msg}`);
const str = (v) => (v == null ? "" : String(v).trim());

export class ShopifyProvider extends BaseProvider {
  static id = PROVIDER_ID;
  static displayName = "Shopify";
  static category = "marketplace";
  static description = "Import Shopify orders and report Shiprocket tracking back as a fulfillment.";
  static docsUrl = "https://shopify.dev/docs/api/admin-rest";
  static features = ["Fetch orders", "Shipment confirmation (fulfillment + tracking)"];
  static capabilities = {
    fetchOrders: true,
    publishProducts: false,
    updateInventory: false,
    updatePrice: false,
    confirmShipment: true,
  };

  credentialFields() {
    return [
      { key: "shopDomain", label: "Shop domain", secret: false, required: true, help: "e.g. your-store.myshopify.com" },
      { key: "accessToken", label: "Admin API access token", secret: true, required: true, help: "Settings > Apps > Develop apps > your app > API credentials" },
      { key: "apiVersion", label: "API version", secret: false, required: false, help: "Default 2024-10" },
    ];
  }

  async testConnection(credentials) {
    try {
      const res = await shopifyRequest(credentials, { method: "GET", url: "/shop.json" });
      const name = res.data?.shop?.name;
      return { ok: true, message: name ? `Connected to Shopify store "${name}"` : "Connected to Shopify" };
    } catch (err) {
      log(`testConnection failed type=${err.type || "ERROR"} reason=${err.message}`);
      if (err instanceof ProviderError) throw err;
      throw new ProviderError("UPSTREAM_ERROR", err.message);
    }
  }

  /**
   * Cursor is Shopify's opaque next-page URL (or null to start). Once a cursor
   * is used, Shopify ignores all other query params, so we just follow it.
   * @param {object} credentials
   * @param {{since?:Date, cursor?:string|null, limit?:number}} [params]
   */
  async fetchOrders(credentials, params = {}) {
    const warnings = [];
    const limit = Math.max(1, Math.min(Number(params.limit) || ORDERS_PAGE_SIZE, 250));

    let res;
    if (params.cursor) {
      res = await shopifyRequest(credentials, { method: "GET", url: params.cursor });
    } else {
      let since = params.since instanceof Date ? params.since : params.since ? new Date(params.since) : null;
      if (!since || Number.isNaN(since.getTime())) {
        since = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 86400000);
        warnings.push(`No start date given; fetching the last ${DEFAULT_LOOKBACK_DAYS} days`);
      }
      res = await shopifyRequest(credentials, {
        method: "GET",
        url: "/orders.json",
        params: { status: "any", limit, updated_at_min: since.toISOString() },
      });
    }

    const rawOrders = Array.isArray(res.data?.orders) ? res.data.orders : [];
    const orders = [];
    for (const raw of rawOrders) {
      const { order, warnings: w } = toNormalizedOrder(raw);
      if (!order.externalOrderId || order.items.length === 0) {
        log(`skipped order id=${raw?.id} name=${raw?.name} reason=no id or items`);
        warnings.push(`Skipped Shopify order ${raw?.name || raw?.id}: no items`);
        continue;
      }
      orders.push(order);
      warnings.push(...w);
    }

    const { next } = parseLinkHeader(res.headers?.link);
    return { orders, cursor: next, warnings };
  }

  /**
   * Looks up the order's open fulfillment orders, then creates a fulfillment
   * with tracking info so Shopify marks it shipped and (optionally) emails the buyer.
   */
  async confirmShipment(credentials, order, shipment) {
    const externalOrderId = str(order?.marketplace?.externalOrderId);
    if (!externalOrderId) {
      log(`confirm rejected orderId=${order?._id} reason=no externalOrderId`);
      throw new ProviderError("VALIDATION", "This order has no Shopify order id");
    }

    let foRes;
    try {
      foRes = await shopifyRequest(credentials, {
        method: "GET",
        url: `/orders/${externalOrderId}/fulfillment_orders.json`,
      });
    } catch (err) {
      log(`confirm failed externalOrderId=${externalOrderId} reason=could not load fulfillment_orders: ${err.message}`);
      throw err;
    }
    const fulfillmentOrders = Array.isArray(foRes.data?.fulfillment_orders) ? foRes.data.fulfillment_orders : [];
    const openOrders = fulfillmentOrders.filter((fo) => ["open", "in_progress"].includes(str(fo.status)));
    if (!openOrders.length) {
      log(`confirm rejected externalOrderId=${externalOrderId} reason=no open fulfillment orders (already fulfilled?)`);
      throw new ProviderError("VALIDATION", "Shopify reports no open fulfillment orders for this order; it may already be fulfilled", {
        details: { fulfillmentOrderStatuses: fulfillmentOrders.map((fo) => fo.status) },
      });
    }

    const payload = {
      fulfillment: {
        notify_customer: true,
        tracking_info: {
          company: shipment.carrierName,
          number: shipment.awb,
        },
        line_items_by_fulfillment_order: openOrders.map((fo) => ({ fulfillment_order_id: fo.id })),
      },
    };

    const res = await shopifyRequest(credentials, {
      method: "POST",
      url: "/fulfillments.json",
      data: payload,
    });
    const fulfillmentId = res.data?.fulfillment?.id;
    if (!fulfillmentId) {
      log(`confirm: Shopify returned no fulfillment id externalOrderId=${externalOrderId}`);
      throw new ProviderError("UPSTREAM_ERROR", "Shopify did not return a fulfillment id");
    }
    return { ok: true, message: `Shopify fulfillment ${fulfillmentId} created on ${shopHost(credentials)}` };
  }
}

export default new ShopifyProvider();
