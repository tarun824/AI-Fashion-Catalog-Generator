/**
 * Provider list. To add a marketplace: import its instance and add it to the array.
 *   import amazonProvider from "./amazon/AmazonProvider.js";
 */
import shiprocketProvider from "./shiprocket/ShiprocketProvider.js";
import amazonProvider from "./amazon/AmazonProvider.js";
import flipkartProvider from "./flipkart/FlipkartProvider.js";
import shopifyProvider from "./shopify/ShopifyProvider.js";

export const providers = [shiprocketProvider, amazonProvider, flipkartProvider, shopifyProvider];

export default providers;
