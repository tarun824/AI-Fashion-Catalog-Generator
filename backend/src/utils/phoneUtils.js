/**
 * Phone number normalization utilities for India
 */

/**
 * Normalize a phone number to a standard format
 * @param {string} phone - The phone number to normalize
 * @param {string} defaultCountryCode - Default country code (default: "91" for India)
 * @returns {{ countryCode: string, number: string, full: string, formatted: string }}
 */
export function normalizePhone(phone, defaultCountryCode = "91") {
  if (!phone) {
    return { countryCode: "", number: "", full: "", formatted: "" };
  }

  // Convert to string and remove all non-digit characters
  let digits = String(phone).replace(/\D/g, "");

  // Handle empty result
  if (!digits) {
    return { countryCode: "", number: "", full: "", formatted: "" };
  }

  let countryCode = defaultCountryCode;
  let number = digits;

  // If starts with 0, remove it (Indian local format)
  if (digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  // Check if it already has country code
  if (digits.length === 12 && digits.startsWith("91")) {
    // Full number with country code (919876543210)
    countryCode = "91";
    number = digits.substring(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    // Starts with 0 after country code (shouldn't happen after above strip, but safety check)
    countryCode = defaultCountryCode;
    number = digits.substring(1);
  } else if (digits.length === 10) {
    // Standard 10-digit Indian number
    countryCode = defaultCountryCode;
    number = digits;
  } else if (digits.length > 10) {
    // Assume first digits are country code
    // For numbers longer than 12 digits, take last 10 as number
    if (digits.length > 12) {
      number = digits.slice(-10);
      countryCode = digits.slice(0, -10) || defaultCountryCode;
    } else {
      // Extract country code (everything except last 10 digits)
      countryCode = digits.slice(0, -10);
      number = digits.slice(-10);
    }
  } else {
    // Less than 10 digits - keep as is with default country code
    countryCode = defaultCountryCode;
    number = digits;
  }

  const full = `${countryCode}${number}`;
  const formatted = formatPhoneForDisplay(full);

  return { countryCode, number, full, formatted };
}

/**
 * Validate a phone number
 * @param {string} phone - The phone number to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePhone(phone) {
  if (!phone) {
    return { valid: false, error: "Phone number is required" };
  }

  const normalized = normalizePhone(phone);

  if (!normalized.number) {
    return { valid: false, error: "Invalid phone number format" };
  }

  // Check if number part is exactly 10 digits (Indian standard)
  if (normalized.number.length !== 10) {
    return {
      valid: false,
      error: `Phone number must be 10 digits, got ${normalized.number.length}`,
    };
  }

  // Indian mobile numbers start with 6, 7, 8, or 9
  const firstDigit = normalized.number[0];
  if (!["6", "7", "8", "9"].includes(firstDigit)) {
    return {
      valid: false,
      error: "Indian mobile numbers must start with 6, 7, 8, or 9",
    };
  }

  // Check for obviously invalid patterns (all same digits)
  if (/^(\d)\1{9}$/.test(normalized.number)) {
    return { valid: false, error: "Invalid phone number pattern" };
  }

  return { valid: true };
}

/**
 * Format a phone number for display
 * @param {string} phone - The phone number to format
 * @returns {string} Formatted phone number like "+91 98765 43210"
 */
export function formatPhoneForDisplay(phone) {
  if (!phone) return "";

  // Remove all non-digits
  const digits = String(phone).replace(/\D/g, "");

  if (!digits) return "";

  let countryCode;
  let number;

  if (digits.length === 12 && digits.startsWith("91")) {
    countryCode = "91";
    number = digits.substring(2);
  } else if (digits.length === 10) {
    countryCode = "91";
    number = digits;
  } else if (digits.length > 10) {
    countryCode = digits.slice(0, -10);
    number = digits.slice(-10);
  } else {
    // Short number, return as-is with country code
    return `+91 ${digits}`;
  }

  // Format as "+91 98765 43210"
  if (number.length === 10) {
    return `+${countryCode} ${number.substring(0, 5)} ${number.substring(5)}`;
  }

  return `+${countryCode} ${number}`;
}

/**
 * Check if two phone numbers are the same (after normalization)
 * @param {string} phone1 - First phone number
 * @param {string} phone2 - Second phone number
 * @returns {boolean}
 */
export function isSamePhone(phone1, phone2) {
  const norm1 = normalizePhone(phone1);
  const norm2 = normalizePhone(phone2);
  return norm1.full === norm2.full;
}

/**
 * Extract country code from a phone number
 * @param {string} phone - The phone number
 * @returns {string} The country code
 */
export function getCountryCode(phone) {
  return normalizePhone(phone).countryCode;
}
