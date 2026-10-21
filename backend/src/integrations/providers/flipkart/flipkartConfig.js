/**
 * Flipkart-specific constants. Everything marketplace-specific lives here so
 * routes/services never see it. Items marked TODO(verify) are unconfirmed
 * against https://seller.flipkart.com/api-docs/ and need a live test.
 */
export const PROVIDER_ID = "flipkart";

export const API_ORIGIN = "https://api.flipkart.net";
export const API_BASE = `${API_ORIGIN}/sellers`;
export const TOKEN_URL = `${API_ORIGIN}/oauth-service/oauth/token`;
export const TOKEN_SCOPE = "Seller_Api";

/** Refresh when fewer than this many ms remain on the token. */
export const TOKEN_EXPIRY_MARGIN_MS = 24 * 60 * 60 * 1000; // 1 day (token lives ~60 days)
export const TOKEN_DEFAULT_TTL_SEC = 60 * 24 * 60 * 60; // fallback if expires_in missing

export const PATHS = {
  shipmentsFilter: "/v3/shipments/filter/",
  shipmentsDetail: "/v3/shipments",
  selfShipDispatch: "/v3/shipments/selfShip/dispatch", // TODO(verify) exact path
  listingsCreate: "/listings/v3",
  listingsUpdateInventory: "/listings/v3/update/inventory", // TODO(verify) envelope
  listingsUpdatePrice: "/listings/v3/update/price", // TODO(verify) envelope
};

export const PAGE_SIZE = 20; // filter API max
export const DETAIL_BATCH_SIZE = 25;
export const LISTING_BATCH_MAX = 10;
export const DEFAULT_LOOKBACK_DAYS = 30;

/** Two passes, chained through an opaque cursor. */
export const PASSES = {
  preDispatch: {
    type: "preDispatch",
    states: ["APPROVED", "PACKING_IN_PROGRESS", "PACKED", "READY_TO_DISPATCH"],
  },
  // TODO(verify): exact filter for cancelled shipments (type "cancelled"; optional
  // cancellationType "sellerCancellation" | "buyerCancellation" - omitted so both come back).
  cancelled: { type: "cancelled" },
};
export const PASS_ORDER = ["preDispatch", "cancelled"];

export const DEFAULTS = {
  dispatchSla: 2,
  countryOfOrigin: "India",
  taxCode: "GST_APPAREL",
  currency: "INR",
  selfShip: true,
};

/** Flipkart item/shipment status -> NormalizedOrder.status */
export const STATUS_MAP = {
  APPROVED: "new",
  PACKING_IN_PROGRESS: "new",
  PACKED: "new",
  FORM_FAILED: "new",
  READY_TO_DISPATCH: "new",
  SHIPPED: "shipped",
  DISPATCHED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  CANCELED: "cancelled",
  RETURN_REQUESTED: "returned",
  RETURNED: "returned",
  RETURN_RECEIVED: "returned",
};

/** Flipkart product_id (FSN) length bounds. */
export const PRODUCT_ID_MIN = 13;
export const PRODUCT_ID_MAX = 16;

export const SELLER_HUB_HINT =
  "Create this style in Flipkart Seller Hub first, then paste its Flipkart product id (FSN/product_id) to link it";
