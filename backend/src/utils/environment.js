/**
 * Environment Utility Functions
 * Centralized environment detection for consistent behavior across the app
 */

/**
 * Check if running in development mode
 * @returns {boolean} True if in development
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV !== "production";
};

/**
 * Check if running in production mode
 * @returns {boolean} True if in production
 */
export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};

/**
 * Check if running in test mode
 * @returns {boolean} True if in test
 */
export const isTest = () => {
  return process.env.NODE_ENV === "test";
};

/**
 * Get current environment name
 * @returns {string} Environment name (development, production, test, etc.)
 */
export const getEnvironment = () => {
  return process.env.NODE_ENV || "development";
};

/**
 * Log only in development mode
 * @param {...any} args - Arguments to log
 */
export const devLog = (...args) => {
  if (isDevelopment()) {
    console.log(...args);
  }
};

/**
 * Log warning only in development mode
 * @param {...any} args - Arguments to log
 */
export const devWarn = (...args) => {
  if (isDevelopment()) {
    console.warn(...args);
  }
};

/**
 * Log error (always logs in all environments)
 * @param {...any} args - Arguments to log
 */
export const devError = (...args) => {
  console.error(...args);
};
