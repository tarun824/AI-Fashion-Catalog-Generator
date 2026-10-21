import { providers as providerList } from "../providers/index.js";

/** id -> provider instance */
class ProviderRegistry {
  constructor() {
    this.map = new Map();
  }

  /** @param {import("./BaseProvider.js").BaseProvider} provider */
  register(provider) {
    const id = provider?.id;
    if (!id) {
      console.warn("[Integration:registry] register skipped: provider has no id");
      return this;
    }
    if (this.map.has(id)) {
      console.warn(`[Integration:registry] provider id=${id} already registered, replacing`);
    }
    this.map.set(id, provider);
    return this;
  }

  get(id) {
    return this.map.get(id) || null;
  }

  has(id) {
    return this.map.has(id);
  }

  list() {
    return [...this.map.values()];
  }
}

const registry = new ProviderRegistry();
for (const p of providerList) registry.register(p);

export default registry;
export { ProviderRegistry };
