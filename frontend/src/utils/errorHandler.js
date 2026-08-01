/**
 * Extract and format error messages from API responses
 * Works with axios-like error structure
 *
 * @param {Error} error - Error object from API call
 * @returns {Object} - Formatted error with message, type, action
 */
export function extractApiError(error) {
  // Get error data from axios-like structure
  const errorData = error.response?.data || {};

  return {
    message: errorData.error || error.message || "An unexpected error occurred",
    type: errorData.errorType || null,
    actionRequired: errorData.actionRequired || null,
    details: errorData.details || null,
    statusCode: error.response?.status || 500,
  };
}

/**
 * Format error message with action required (if any)
 *
 * @param {Error} error - Error object from API call
 * @returns {string} - Formatted error message
 */
export function formatErrorMessage(error) {
  const { message, actionRequired, type } = extractApiError(error);

  let fullMessage = message;

  // Add action required
  if (actionRequired) {
    fullMessage += `\n\n📋 Action Required: ${actionRequired}`;
  }

  // Add specific links for known error types
  if (type === "KYC_REQUIRED") {
    fullMessage += `\n\n🔗 Complete KYC at: https://app.shiprocket.in/settings`;
  } else if (type === "INSUFFICIENT_BALANCE") {
    fullMessage += `\n\n🔗 Add funds at: https://app.shiprocket.in/billing`;
  }

  return fullMessage;
}

/**
 * Log error to console with full details
 *
 * @param {string} context - Context where error occurred (e.g., "Assign Courier")
 * @param {Error} error - Error object from API call
 */
export function logApiError(context, error) {
  const errorData = error.response?.data || {};

  console.group(`❌ ${context} Error`);
  console.error("Message:", error.message);
  console.error("Status:", error.response?.status);
  console.error("Data:", errorData);
  console.groupEnd();
}
