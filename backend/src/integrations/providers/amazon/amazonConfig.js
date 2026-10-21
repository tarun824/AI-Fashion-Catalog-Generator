/** Amazon India SP-API constants. Param names stay inside this provider. */
export const PROVIDER_ID = "amazon";

export const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
export const DEFAULT_ENDPOINT = "https://sellingpartnerapi-eu.amazon.com";
export const SANDBOX_ENDPOINT = "https://sandbox.sellingpartnerapi-eu.amazon.com";
export const INDIA_MARKETPLACE_ID = "A21TJRUUN4KGV";
export const LANGUAGE_TAG = "en_IN";
export const USER_AGENT = "ProdocCatalog/1.0 (Language=JavaScript)";
export const DEFAULT_PRODUCT_TYPE = "SAREE"; // TODO(verify): confirm the product type name for India via searchDefinitionsProductTypes
export const DEFAULT_CURRENCY = "INR";

/** Refresh the access token this long before real expiry. */
export const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;
/** Fallback when LWA does not return expires_in (it normally returns 3600). */
export const TOKEN_DEFAULT_TTL_S = 3600;

export const ORDERS_PAGE_SIZE = 100;
export const ORDERS_MAX_PAGES = 10;
export const DEFAULT_LOOKBACK_DAYS = 7;
/** Amazon rejects LastUpdatedAfter newer than now minus 2 minutes. */
export const LAST_UPDATED_SAFETY_MS = 3 * 60 * 1000;

/** RDT allows up to 50 restricted resources per request. */
export const RDT_MAX_RESOURCES = 50;
/** getOrderAddress rate is 1 rps burst 1. */
export const ADDRESS_MIN_INTERVAL_MS = 1100;

export const SCHEMA_CACHE_TTL_MS = 60 * 60 * 1000;

export const ORDER_STATUS_MAP = {
  Pending: "new",
  PendingAvailability: "new",
  Unshipped: "new",
  PartiallyShipped: "new",
  InvoiceUnconfirmed: "new", // TODO(verify)
  Shipped: "shipped",
  Canceled: "cancelled",
  Unfulfillable: "cancelled", // TODO(verify): Amazon says order cannot be fulfilled
};

export const PII_WARNING =
  "Amazon PII role missing or not approved: buyer addresses are redacted. Apply for the Direct-to-Consumer Delivery / buyer-address role in Seller Central > Developer Central, then re-fetch.";
