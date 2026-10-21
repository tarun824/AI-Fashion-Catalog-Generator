/**
 * Provider error types. Routes map these to the repo-standard error shape
 * { error, errorType, actionRequired, details }.
 */
export const ErrorTypes = Object.freeze({
  CREDENTIALS_INVALID: "CREDENTIALS_INVALID",
  RATE_LIMITED: "RATE_LIMITED",
  PII_ROLE_MISSING: "PII_ROLE_MISSING",
  UNSUPPORTED: "UNSUPPORTED",
  MAPPING_REQUIRED: "MAPPING_REQUIRED",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  VALIDATION: "VALIDATION",
});

const HTTP_STATUS = {
  CREDENTIALS_INVALID: 401,
  RATE_LIMITED: 429,
  PII_ROLE_MISSING: 403,
  UNSUPPORTED: 400,
  MAPPING_REQUIRED: 422,
  UPSTREAM_ERROR: 502,
  VALIDATION: 400,
};

const ACTIONS = {
  CREDENTIALS_INVALID: "Re-enter the credentials for this marketplace and test the connection again.",
  RATE_LIMITED: "Wait a minute and try again.",
  PII_ROLE_MISSING: "Apply for the buyer-address (PII) role in the marketplace developer console.",
  UNSUPPORTED: "This marketplace does not support that action.",
  MAPPING_REQUIRED: "Link the product SKUs to marketplace listings first.",
  UPSTREAM_ERROR: "The marketplace returned an error. Try again later.",
  VALIDATION: "Fix the highlighted fields and retry.",
};

export class ProviderError extends Error {
  /**
   * @param {string} type one of ErrorTypes
   * @param {string} message human readable
   * @param {{retryable?: boolean, details?: any, status?: number, actionRequired?: string}} [opts]
   */
  constructor(type, message, opts = {}) {
    super(message || type);
    this.name = "ProviderError";
    this.type = ErrorTypes[type] ? type : ErrorTypes.UPSTREAM_ERROR;
    this.retryable = opts.retryable ?? ["RATE_LIMITED", "UPSTREAM_ERROR"].includes(this.type);
    this.details = opts.details ?? null;
    this.status = opts.status ?? HTTP_STATUS[this.type];
    this.actionRequired = opts.actionRequired ?? ACTIONS[this.type];
  }

  toResponse() {
    return {
      success: false,
      error: this.message,
      errorType: this.type,
      actionRequired: this.actionRequired,
      details: this.details,
    };
  }
}

/** Build the standard error body for any thrown value. Returns {status, body}. */
export function toErrorResponse(err) {
  if (err instanceof ProviderError) {
    return { status: err.status, body: err.toResponse() };
  }
  return {
    status: 500,
    body: {
      success: false,
      error: err?.message || "Something went wrong.",
      errorType: "UPSTREAM_ERROR",
      actionRequired: "Try again. If it keeps failing, check server logs.",
      details: null,
    },
  };
}
