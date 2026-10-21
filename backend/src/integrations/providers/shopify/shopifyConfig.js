/**
 * Shopify-specific constants. Admin REST API, custom-app static access token
 * (no OAuth/refresh needed for a single store you own).
 * https://shopify.dev/docs/api/admin-rest
 */
export const PROVIDER_ID = "shopify";

export const DEFAULT_API_VERSION = "2024-10";
export const ORDERS_PAGE_SIZE = 50;
export const DEFAULT_LOOKBACK_DAYS = 30;

/** Shopify has no native fulfillment_status/financial_status combo for "cancelled"; cancelled_at drives it. */
export const FULFILLMENT_STATUS_MAP = {
  fulfilled: "shipped",
  partial: "shipped",
};

/** Gateway name / tag substrings that indicate Cash on Delivery. */
export const COD_HINTS = ["cash on delivery", "cod", "cashondelivery"];

export const DEFAULT_CURRENCY = "INR";
