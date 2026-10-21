import { ProviderError } from "./errors.js";

/**
 * Abstract marketplace/shipping provider. Subclass, set static id/displayName/
 * category/capabilities, implement the supported methods, add to providers/index.js.
 * Providers are stateless: credentials are passed in on every call.
 */
export class BaseProvider {
  /** unique id, must match Integration.name */
  static id = "";
  static displayName = "";
  /** "marketplace" | "shipping" */
  static category = "marketplace";
  static description = "";
  static logo = "";
  static docsUrl = "";
  static features = [];
  /** UI renders buttons from this */
  static capabilities = {
    fetchOrders: false,
    publishProducts: false,
    updateInventory: false,
    updatePrice: false,
    confirmShipment: false,
  };

  get id() {
    return this.constructor.id;
  }
  get displayName() {
    return this.constructor.displayName || this.constructor.id;
  }
  get category() {
    return this.constructor.category;
  }
  get capabilities() {
    return { ...BaseProvider.capabilities, ...this.constructor.capabilities };
  }

  /** @returns {{key:string,label:string,secret:boolean,required:boolean,help?:string}[]} */
  credentialFields() {
    return [];
  }

  _unsupported(method) {
    throw new ProviderError(
      "UNSUPPORTED",
      `${this.displayName || this.id} does not support ${method}`,
      { details: { provider: this.id, method } },
    );
  }

  /** @returns {Promise<{ok:boolean,message:string}>} */
  async testConnection(_credentials) {
    return this._unsupported("testConnection");
  }

  /**
   * @param {object} credentials
   * @param {{since?:Date, cursor?:string|null, limit?:number}} params
   * @returns {Promise<{orders: import("./schemas.js").NormalizedOrder[], cursor: string|null, warnings: string[]}>}
   */
  async fetchOrders(_credentials, _params) {
    return this._unsupported("fetchOrders");
  }

  /**
   * @param {object} credentials
   * @param {import("./schemas.js").NormalizedListing} listing
   * @param {{dryRun?:boolean}} opts
   * @returns {Promise<{externalId:string|null,status:string,issues:string[]}>}
   */
  async publishProduct(_credentials, _listing, _opts) {
    return this._unsupported("publishProduct");
  }

  /** @returns {Promise<{ok:boolean,message?:string}>} */
  async updateInventory(_credentials, _params /* {externalSku, quantity} */) {
    return this._unsupported("updateInventory");
  }

  /** @returns {Promise<{ok:boolean,message?:string}>} */
  async updatePrice(_credentials, _params /* {externalSku, mrp, sellingPrice} */) {
    return this._unsupported("updatePrice");
  }

  /**
   * Report courier + AWB back to the marketplace.
   * @param {object} credentials
   * @param {object} order lean Order document
   * @param {{carrierName:string, awb:string, shipDate:Date}} shipment
   * @returns {Promise<{ok:boolean,message?:string}>}
   */
  async confirmShipment(_credentials, _order, _shipment) {
    return this._unsupported("confirmShipment");
  }
}

export default BaseProvider;
