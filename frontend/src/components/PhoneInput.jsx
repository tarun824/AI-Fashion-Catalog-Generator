import { useState, useEffect } from "react";

/**
 * Normalize phone number to standard format
 * @param {string} phone - Raw phone input
 * @param {string} defaultCountryCode - Default country code (default: "91" for India)
 * @returns {object} { countryCode, number, full, formatted }
 */
export function normalizePhone(phone, defaultCountryCode = "91") {
  if (!phone) return { countryCode: "", number: "", full: "", formatted: "" };

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Handle different formats
  if (digits.length === 10) {
    // 10 digits: assume Indian number without country code
    return {
      countryCode: defaultCountryCode,
      number: digits,
      full: defaultCountryCode + digits,
      formatted: `+${defaultCountryCode} ${digits.slice(0, 5)} ${digits.slice(5)}`,
    };
  } else if (digits.length === 11 && digits.startsWith("0")) {
    // 11 digits starting with 0: remove leading 0
    digits = digits.slice(1);
    return {
      countryCode: defaultCountryCode,
      number: digits,
      full: defaultCountryCode + digits,
      formatted: `+${defaultCountryCode} ${digits.slice(0, 5)} ${digits.slice(5)}`,
    };
  } else if (digits.length === 12 && digits.startsWith("91")) {
    // 12 digits starting with 91: already has India code
    const number = digits.slice(2);
    return {
      countryCode: "91",
      number: number,
      full: digits,
      formatted: `+91 ${number.slice(0, 5)} ${number.slice(5)}`,
    };
  } else if (digits.length > 10) {
    // Assume first digits are country code
    const countryCode = digits.slice(0, digits.length - 10);
    const number = digits.slice(-10);
    return {
      countryCode,
      number,
      full: digits,
      formatted: `+${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`,
    };
  }

  // Return as-is if can't normalize
  return {
    countryCode: "",
    number: digits,
    full: digits,
    formatted: phone,
  };
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validatePhone(phone) {
  if (!phone) {
    return { valid: false, error: "Phone number is required" };
  }

  const normalized = normalizePhone(phone);

  if (!normalized.number) {
    return { valid: false, error: "Invalid phone number" };
  }

  // Check Indian mobile number format (starts with 6-9)
  if (normalized.countryCode === "91") {
    if (normalized.number.length !== 10) {
      return { valid: false, error: "Phone number must be 10 digits" };
    }
    if (!/^[6-9]/.test(normalized.number)) {
      return {
        valid: false,
        error: "Indian mobile numbers must start with 6, 7, 8, or 9",
      };
    }
  }

  return { valid: true };
}

/**
 * Format phone for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone like "+91 98765 43210"
 */
export function formatPhoneForDisplay(phone) {
  const normalized = normalizePhone(phone);
  return normalized.formatted || phone;
}

/**
 * PhoneInput Component
 * Handles phone number input with automatic normalization and validation
 */
export default function PhoneInput({
  value,
  onChange,
  onBlur,
  name = "phone",
  placeholder = "98765 43210",
  required = false,
  disabled = false,
  className = "",
  showFormatted = true,
  countryCode = "91",
}) {
  const [displayValue, setDisplayValue] = useState("");
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Sync display value with prop value
  useEffect(() => {
    if (!isFocused && value) {
      const normalized = normalizePhone(value, countryCode);
      setDisplayValue(showFormatted ? normalized.formatted : value);
    }
  }, [value, isFocused, showFormatted, countryCode]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Clear error while typing
    if (error) setError("");

    // Normalize and pass to parent
    const normalized = normalizePhone(inputValue, countryCode);
    if (onChange) {
      // Pass the full normalized number (with country code)
      onChange({
        target: {
          name,
          value: normalized.full || inputValue.replace(/\D/g, ""),
          normalized,
        },
      });
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw value on focus for easier editing
    if (value) {
      const normalized = normalizePhone(value, countryCode);
      setDisplayValue(normalized.number || value);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);

    // Validate on blur
    if (displayValue) {
      const validation = validatePhone(displayValue);
      if (!validation.valid) {
        setError(validation.error);
      } else {
        setError("");
        // Format the value
        const normalized = normalizePhone(displayValue, countryCode);
        setDisplayValue(showFormatted ? normalized.formatted : normalized.full);
      }
    }

    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <div className="relative">
      <div className="flex">
        <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
          +{countryCode}
        </span>
        <input
          type="tel"
          name={name}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`flex-1 px-3 py-2 border rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            error ? "border-red-500" : "border-gray-300"
          } ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
