import { BaseProvider } from "../../core/BaseProvider.js";
import { ProviderError } from "../../core/errors.js";
import { getAccessToken, flipkartRequest } from "./flipkartAuth.js";
import {
  toNormalizedOrderWithWarnings,
  mergeOrdersByOrderId,
  toFlipkartListing,
  validateListing,
  buildSelfShipDispatchPayload,
} from "./flipkartMapper.js";
import {
  PROVIDER_ID,
  API_ORIGIN,
  API_BASE,
  PATHS,
  PAGE_SIZE,
  DETAIL_BATCH_SIZE,
  DEFAULT_LOOKBACK_DAYS,
  PASSES,
  PASS_ORDER,
  DEFAULTS,
  PRODUCT_ID_MIN,
  PRODUCT_ID_MAX,
  SELLER_HUB_HINT,
} from "./flipkartConfig.js";

const log = (msg) => console.warn(`[Integration:${PROVIDER_ID}] ${msg}`);
const str = (v) => (v == null ? "" : String(v).trim());
const toBool = (v, d) => (v === undefined || v === null || v === "" ? d : v === true || v === "true" || v === "1" || v === 1);

function absoluteUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("/sellers/")) return `${API_ORIGIN}${pathOrUrl}`;
  return `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function encodeCursor(pass, url) {
  return JSON.stringify({ pass, url: url || null });
}

function decodeCursor(cursor) {
  if (!cursor) return { pass: PASS_ORDER[0], url: null };
  try {
    const c = JSON.parse(cursor);
    if (PASSES[c.pass]) return { pass: c.pass, url: c.url || null };
  } catch (err) {
    // fall through to the warning below
  }
  log("fetchOrders received an unreadable cursor reason=invalid cursor, restarting from first pass");
  return { pass: PASS_ORDER[0], url: null };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export class FlipkartProvider extends BaseProvider {
  static id = "flipkart";
  static displayName = "Flipkart";
  static category = "marketplace";
  static description = "Fetch Flipkart orders, link listings, sync stock/price and report self-ship dispatch.";
  static docsUrl = "https://seller.flipkart.com/api-docs/";
  static features = ["Fetch orders", "Link listings by product id", "Stock and price sync", "Self-ship dispatch"];
  static capabilities = {
    fetchOrders: true,
    publishProducts: true,
    updateInventory: true,
    updatePrice: true,
    confirmShipment: true,
  };

  credentialFields() {
    return [
      { key: "appId", label: "App ID", secret: false, required: true, help: "Seller Dashboard > Developer Access > self-access app" },
      { key: "appSecret", label: "App Secret", secret: true, required: true },
      { key: "locationId", label: "Seller location id", secret: false, required: false, help: "Needed for stock and listing sync" },
      { key: "sellerId", label: "Seller id", secret: false, required: false },
      { key: "defaultHsn", label: "Default HSN code", secret: false, required: false, help: "Used when a product has no HSN" },
      { key: "defaultTaxCode", label: "Default tax code", secret: false, required: false, help: "e.g. GST_APPAREL" },
      { key: "defaultTaxPercent", label: "Tax % for dispatch invoice", secret: false, required: false, help: "Leave blank to use 5% up to Rs 2500 per unit, else 18%" },
      { key: "defaultDispatchSla", label: "Dispatch SLA (days)", secret: false, required: false, help: "Default 2" },
      { key: "manufacturerName", label: "Manufacturer name", secret: false, required: false },
      { key: "packerName", label: "Packer name", secret: false, required: false },
      { key: "countryOfOrigin", label: "Country of origin", secret: false, required: false, help: "Default India" },
      { key: "selfShip", label: "Self-ship (true/false)", secret: false, required: false, help: "Default true: we ship with our own courier" },
    ];
  }

  _listingCtx(creds) {
    return {
      locationId: str(creds.locationId),
      defaultHsn: str(creds.defaultHsn),
      defaultTaxCode: str(creds.defaultTaxCode) || DEFAULTS.taxCode,
      defaultDispatchSla: Number(creds.defaultDispatchSla) || DEFAULTS.dispatchSla,
      manufacturerName: str(creds.manufacturerName),
      packerName: str(creds.packerName),
      countryOfOrigin: str(creds.countryOfOrigin) || DEFAULTS.countryOfOrigin,
      selfShip: toBool(creds.selfShip, DEFAULTS.selfShip),
    };
  }

  async testConnection(credentials) {
    try {
      await getAccessToken(credentials, { force: true });
      await flipkartRequest(credentials, {
        method: "POST",
        url: `${API_BASE}${PATHS.shipmentsFilter}`,
        data: { filter: { type: "preDispatch", states: PASSES.preDispatch.states }, pagination: { pageSize: 1 } },
      });
      return { ok: true, message: "Flipkart connection successful" };
    } catch (err) {
      log(`testConnection failed type=${err.type || "ERROR"} reason=${err.message}`);
      if (err instanceof ProviderError) throw err;
      throw new ProviderError("UPSTREAM_ERROR", err.message);
    }
  }

  /**
   * One page per call. The returned cursor is an opaque JSON string
   * {pass, url}: pass "preDispatch" then "cancelled"; url is Flipkart's nextPageUrl.
   * Callers loop until cursor === null.
   */
  async fetchOrders(credentials, params = {}) {
    const { pass, url } = decodeCursor(params.cursor);
    const warnings = [];
    const pageSize = Math.min(Math.max(Number(params.limit) || PAGE_SIZE, 1), PAGE_SIZE);

    let res;
    if (url) {
      // TODO(verify): nextPageUrl is followed with GET.
      res = await flipkartRequest(credentials, { method: "GET", url: absoluteUrl(url) });
    } else {
      let since = params.since instanceof Date ? params.since : params.since ? new Date(params.since) : null;
      if (!since || Number.isNaN(since.getTime())) {
        since = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 86400000);
        warnings.push(`No start date given; fetching the last ${DEFAULT_LOOKBACK_DAYS} days`);
      }
      const filter = { ...PASSES[pass], orderDate: { from: since.toISOString(), to: new Date().toISOString() } };
      res = await flipkartRequest(credentials, {
        method: "POST",
        url: `${API_BASE}${PATHS.shipmentsFilter}`,
        data: { filter, pagination: { pageSize }, sort: { field: "orderDate", order: "desc" } },
      });
    }

    const shipments = Array.isArray(res.data?.shipments) ? res.data.shipments : [];
    const details = await this._fetchDetails(credentials, shipments, warnings);

    const perShipment = [];
    for (const s of shipments) {
      const { order, warnings: w } = toNormalizedOrderWithWarnings(s, details.get(str(s.shipmentId)) || null, {
        forceStatus: pass === "cancelled" ? "cancelled" : undefined,
      });
      if (!order.externalOrderId || order.items.length === 0) {
        log(`skipped shipment shipmentId=${str(s.shipmentId)} pass=${pass} reason=no orderId or items`);
        warnings.push(`Skipped Flipkart shipment ${str(s.shipmentId)}: no order items`);
        continue;
      }
      perShipment.push(order);
      warnings.push(...w);
    }

    let cursor = null;
    if (res.data?.hasMore && res.data?.nextPageUrl) {
      cursor = encodeCursor(pass, res.data.nextPageUrl);
    } else {
      const next = PASS_ORDER[PASS_ORDER.indexOf(pass) + 1];
      if (res.data?.hasMore && !res.data?.nextPageUrl) {
        log(`hasMore=true but no nextPageUrl pass=${pass} reason=cannot paginate further`);
        warnings.push("Flipkart reported more orders but gave no next page; some orders may be missing");
      }
      if (next) cursor = encodeCursor(next, null);
    }

    return { orders: mergeOrdersByOrderId(perShipment), cursor, warnings };
  }

  /** Batch GET /v3/shipments?shipmentIds=a,b,c. Returns Map(shipmentId -> detail shipment). */
  async _fetchDetails(credentials, shipments, warnings) {
    const map = new Map();
    const ids = shipments.map((s) => str(s.shipmentId)).filter(Boolean);
    for (const batch of chunk(ids, DETAIL_BATCH_SIZE)) {
      try {
        const res = await flipkartRequest(credentials, {
          method: "GET",
          url: `${API_BASE}${PATHS.shipmentsDetail}`,
          params: { shipmentIds: batch.join(",") },
        });
        const list = Array.isArray(res.data?.shipments) ? res.data.shipments : [];
        for (const d of list) map.set(str(d.shipmentId), d);
      } catch (err) {
        if (err instanceof ProviderError && err.type === "CREDENTIALS_INVALID") throw err;
        log(`shipment details failed count=${batch.length} type=${err.type || "ERROR"} reason=${err.message}`);
        warnings.push(`Could not load buyer/address details for ${batch.length} Flipkart shipment(s); they will be missing an address`);
      }
    }
    return map;
  }

  async publishProduct(credentials, listing, { dryRun = false } = {}) {
    const pid = str(listing?.overrides?.flipkartProductId);
    if (pid.length < PRODUCT_ID_MIN || pid.length > PRODUCT_ID_MAX) {
      log(`publish skipped sku=${listing?.sku || ""} reason=no valid flipkartProductId (len=${pid.length})`);
      return { externalId: null, status: "error", issues: [SELLER_HUB_HINT] };
    }
    const ctx = this._listingCtx(credentials);
    const issues = validateListing(listing, ctx);
    if (issues.length) {
      log(`publish validation failed sku=${listing.sku} issues=${issues.length}`);
      return { externalId: null, status: "error", issues };
    }
    if (dryRun) return { externalId: pid, externalSku: listing.sku, status: "valid", issues: [] };

    // TODO(verify): exact envelope for POST /listings/v3 (assumed { skus: [...] }, max 10 per call).
    const res = await flipkartRequest(credentials, {
      method: "POST",
      url: `${API_BASE}${PATHS.listingsCreate}`,
      data: { skus: [toFlipkartListing(listing, ctx)] },
    });
    const respIssues = this._extractIssues(res.data);
    if (respIssues.length) {
      log(`publish rejected sku=${listing.sku} issues=${respIssues.length}`);
      return { externalId: null, externalSku: listing.sku, status: "error", issues: respIssues };
    }
    return { externalId: pid, externalSku: listing.sku, status: "submitted", issues: [] };
  }

  /** Best-effort: collect error strings from unknown response envelopes. TODO(verify). */
  _extractIssues(data) {
    const out = [];
    const walk = (node, depth = 0) => {
      if (!node || depth > 4) return;
      if (Array.isArray(node)) return node.forEach((n) => walk(n, depth + 1));
      if (typeof node !== "object") return;
      const status = str(node.status).toLowerCase();
      if (["failure", "failed", "error"].includes(status)) {
        const msgs = [].concat(node.errors || node.error || node.message || []).map((e) => str(e?.message || e)).filter(Boolean);
        out.push(...(msgs.length ? msgs : ["Flipkart rejected the listing"]));
      }
      for (const v of Object.values(node)) if (v && typeof v === "object") walk(v, depth + 1);
    };
    walk(data);
    return [...new Set(out)];
  }

  async updateInventory(credentials, { externalSku, quantity } = {}) {
    const locationId = str(credentials.locationId);
    if (!externalSku || !locationId || !(Number(quantity) >= 0)) {
      log(`updateInventory rejected sku=${externalSku || ""} reason=missing sku/locationId/quantity`);
      throw new ProviderError("VALIDATION", "SKU, quantity and the Flipkart location id are required to update stock");
    }
    // TODO(verify): envelope. Assumed keyed by sku.
    await flipkartRequest(credentials, {
      method: "POST",
      url: `${API_BASE}${PATHS.listingsUpdateInventory}`,
      data: { [externalSku]: { locations: [{ id: locationId, inventory: Math.floor(Number(quantity)) }] } },
    });
    return { ok: true, message: `Flipkart stock updated for ${externalSku}` };
  }

  async updatePrice(credentials, { externalSku, mrp, sellingPrice } = {}) {
    if (!externalSku || !(Number(sellingPrice) > 0)) {
      log(`updatePrice rejected sku=${externalSku || ""} reason=missing sku or sellingPrice`);
      throw new ProviderError("VALIDATION", "SKU and a selling price are required to update price");
    }
    // TODO(verify): envelope. Assumed keyed by sku.
    const price = { selling_price: Number(sellingPrice), currency: DEFAULTS.currency };
    if (Number(mrp) > 0) price.mrp = Number(mrp);
    await flipkartRequest(credentials, {
      method: "POST",
      url: `${API_BASE}${PATHS.listingsUpdatePrice}`,
      data: { [externalSku]: { price } },
    });
    return { ok: true, message: `Flipkart price updated for ${externalSku}` };
  }

  async confirmShipment(credentials, order, shipment) {
    const shipmentId = str(order?.marketplace?.externalShipmentId);
    const orderRef = str(order?.marketplace?.externalOrderId);
    if (!shipmentId) {
      log(`confirm rejected orderId=${orderRef} reason=no externalShipmentId`);
      throw new ProviderError("VALIDATION", "This order has no Flipkart shipment id; fetch it from Flipkart again");
    }
    if (order?.marketplace?.fulfillmentType === "MARKETPLACE") {
      log(`confirm rejected shipmentId=${shipmentId} reason=marketplace fulfilled (FBF)`);
      throw new ProviderError("VALIDATION", "This is a Flipkart-fulfilled (FBF) shipment; Flipkart ships it, nothing to dispatch");
    }
    if (!toBool(credentials.selfShip, DEFAULTS.selfShip)) {
      log(`confirm rejected shipmentId=${shipmentId} reason=selfShip disabled in credentials`);
      throw new ProviderError("VALIDATION", "Self-ship is turned off for this Flipkart integration");
    }

    // Fresh detail gives the real orderItemIds, shipment type and unit prices.
    const res = await flipkartRequest(credentials, {
      method: "GET",
      url: `${API_BASE}${PATHS.shipmentsDetail}`,
      params: { shipmentIds: shipmentId },
    });
    const detail = (res.data?.shipments || []).find((s) => str(s.shipmentId) === shipmentId);
    if (!detail) {
      log(`confirm failed shipmentId=${shipmentId} reason=shipment not found at Flipkart`);
      throw new ProviderError("VALIDATION", "Flipkart does not return this shipment. Check it in Seller Hub");
    }
    const shipType = str(detail.shipmentType).toUpperCase();
    // TODO(verify): value set of shipmentType. Anything not SELF/NORMAL-with-self-ship is treated as ineligible when explicit.
    if (shipType && /FBF/.test(shipType)) {
      log(`confirm rejected shipmentId=${shipmentId} reason=shipmentType=${shipType}`);
      throw new ProviderError("VALIDATION", `Flipkart marks this shipment as ${shipType}, so it is not eligible for self-ship dispatch`);
    }
    const flItems = Array.isArray(detail.orderItems) ? detail.orderItems : [];
    if (!flItems.length) {
      log(`confirm failed shipmentId=${shipmentId} reason=no orderItems in detail`);
      throw new ProviderError("UPSTREAM_ERROR", "Flipkart returned no items for this shipment");
    }

    let invoiceNumber = str(order.invoiceNumber || order.invoice?.number);
    let note = "";
    if (!invoiceNumber) {
      invoiceNumber = `INV-${str(order.orderNumber) || orderRef || shipmentId}`;
      note = ` Invoice number ${invoiceNumber} was generated from the order number.`;
    }
    const shipDate = shipment.shipDate ? new Date(shipment.shipDate) : new Date();
    const taxPercent = Number(credentials.defaultTaxPercent) > 0 ? Number(credentials.defaultTaxPercent) : undefined;

    const payload = buildSelfShipDispatchPayload({
      shipmentId,
      locationId: str(credentials.locationId) || str(detail.locationId),
      invoiceNumber,
      invoiceDate: shipDate,
      items: flItems.map((i) => ({
        orderItemId: str(i.orderItemId),
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.priceComponents?.sellingPrice) || 0,
      })),
      carrierName: shipment.carrierName,
      awb: shipment.awb,
      expectedDeliveryDate: new Date(shipDate.getTime() + 5 * 86400000), // TODO(verify) required/format
      dispatchDate: shipDate,
      taxPercent,
    });

    await flipkartRequest(credentials, {
      method: "POST",
      url: `${API_BASE}${PATHS.selfShipDispatch}`,
      data: payload,
    });
    return { ok: true, message: `Dispatch reported to Flipkart for shipment ${shipmentId}.${note}` };
  }
}

export default new FlipkartProvider();
