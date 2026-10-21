import { BaseProvider } from "../../core/BaseProvider.js";
import { ProviderError } from "../../core/errors.js";
import shiprocketService from "../../../services/shiprocketService.js";

/**
 * Thin wrapper so Shiprocket shows up in the registry list.
 * Shipping itself keeps going through shiprocketService / shippingRoutes.
 * Credentials come from env (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD), so there
 * are no credential fields to edit here.
 */
export class ShiprocketProvider extends BaseProvider {
  static id = "shiprocket";
  static displayName = "Shiprocket";
  static category = "shipping";
  static capabilities = {
    fetchOrders: false,
    publishProducts: false,
    updateInventory: false,
    updatePrice: false,
    confirmShipment: false,
  };

  credentialFields() {
    return [];
  }

  async testConnection() {
    try {
      const token = await shiprocketService.getAuthToken();
      return {
        ok: !!token,
        message: token
          ? "Shiprocket connection successful"
          : "Shiprocket returned no token",
      };
    } catch (error) {
      console.warn(
        `[Integration:shiprocket] testConnection failed reason=${error.message}`,
      );
      throw new ProviderError("CREDENTIALS_INVALID", error.message);
    }
  }

  /** Usage stats from the Integration document (no secrets). */
  async getStatus() {
    return shiprocketService.getStats();
  }
}

export default new ShiprocketProvider();
