/**
 * Async Handler Utility
 * Wrapper for async route handlers to catch errors automatically
 *
 * Usage: router.get("/path", asyncHandler(async (req, res) => { ... }))
 *
 * Eliminates the need for try/catch in every async route handler.
 * Automatically catches any thrown errors and passes them to the
 * central error handler middleware via next(error).
 */

/**
 * Wrap an async route handler to automatically catch errors
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 *
 * @example
 * // Before (manual error handling):
 * router.get("/users", async (req, res, next) => {
 *   try {
 *     const users = await User.find();
 *     res.json(users);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * // After (with asyncHandler):
 * router.get("/users", asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
