import Integration from "../../models/Integration.js";
import registry from "../core/registry.js";
import { ProviderError } from "../core/errors.js";

/** Load the Integration doc (with encrypted blob) or null. */
export async function loadIntegration(providerId) {
  return Integration.findWithCredentials(providerId);
}

/**
 * Decrypted credentials for a provider. Throws CREDENTIALS_INVALID if none saved.
 * @returns {Promise<{integration:any, credentials:object}>}
 */
export async function requireCredentials(providerId) {
  const integration = await loadIntegration(providerId);
  if (!integration || !integration.hasCredentials()) {
    console.warn(
      `[Integration:${providerId}] no saved credentials reason=not connected`,
    );
    throw new ProviderError(
      "CREDENTIALS_INVALID",
      `${providerId} is not connected: no credentials saved`,
      { actionRequired: "Open Integrations, add credentials and test the connection." },
    );
  }
  let credentials;
  try {
    credentials = integration.getCredentials();
  } catch (err) {
    console.error(
      `[Integration:${providerId}] credential decrypt failed reason=${err.message}`,
    );
    throw new ProviderError(
      "CREDENTIALS_INVALID",
      "Stored credentials could not be decrypted (encryption key changed?)",
      { actionRequired: "Re-enter the credentials." },
    );
  }
  return { integration, credentials };
}

/** Validate against provider.credentialFields(); returns list of missing required keys. */
export function missingRequired(provider, values) {
  return provider
    .credentialFields()
    .filter((f) => f.required && !String(values?.[f.key] ?? "").trim())
    .map((f) => f.key);
}

/** Get registered provider or throw UNSUPPORTED-style 404-able error. */
export function getProviderOrThrow(providerId) {
  const provider = registry.get(providerId);
  if (!provider) {
    console.warn(`[Integration:${providerId}] provider not registered`);
    throw new ProviderError("UNSUPPORTED", `Unknown provider: ${providerId}`, {
      status: 404,
    });
  }
  return provider;
}

export function assertCapability(provider, capability) {
  if (!provider.capabilities[capability]) {
    console.warn(
      `[Integration:${provider.id}] capability missing capability=${capability}`,
    );
    throw new ProviderError(
      "UNSUPPORTED",
      `${provider.displayName} does not support ${capability}`,
      { details: { provider: provider.id, capability } },
    );
  }
}
