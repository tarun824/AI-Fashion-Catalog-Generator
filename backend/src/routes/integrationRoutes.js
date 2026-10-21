/**
 * Integration Management Routes
 * Centralized API for managing all third-party integrations.
 * Providers (Amazon, Flipkart, ...) come from integrations/core/registry.js.
 *
 * Route order matters: static paths are declared before "/:id".
 */

import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import integrationService from "../services/integrationService.js";
import registry from "../integrations/core/registry.js";
import { getProviderDocs } from "../integrations/core/docsLoader.js";
import { toErrorResponse } from "../integrations/core/errors.js";
import { publishToChannel } from "../integrations/services/listingPublishService.js";
import { confirmShipmentToMarketplace } from "../integrations/services/fulfillmentSyncService.js";
import {
  runWithApiContext,
  newCorrelationId,
} from "../integrations/logging/apiCallContext.js";

const router = express.Router();

const ownerOf = (req) => req.admin?._id || req.adminId || null;

/** Send a standard error body {success:false,error,errorType,actionRequired,details}. */
function sendError(res, err, label, correlationId) {
  console.error(
    `[Integration:routes] ${label} failed: ${err?.message}${correlationId ? ` correlationId=${correlationId}` : ""}`,
  );
  const { status, body } = toErrorResponse(err);
  return res
    .status(status)
    .json(correlationId ? { ...body, correlationId } : body);
}

/**
 * Run fn inside an API-call logging context (fresh correlationId, manual trigger).
 * fn receives the correlationId so the handler can echo it in the response.
 */
function withApiContext(req, operation, provider, fn) {
  const correlationId = newCorrelationId();
  return runWithApiContext(
    {
      correlationId,
      operation,
      trigger: "manual",
      triggeredBy: ownerOf(req) || undefined,
      provider,
      context: {},
    },
    () => fn(correlationId),
  );
}

/**
 * GET /api/admin/integrations
 * All integrations (registry providers + legacy static entries) with status
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const integrations = await integrationService.getAllIntegrations();
    res.json({ success: true, integrations });
  } catch (error) {
    sendError(res, error, "list integrations");
  }
});

/**
 * POST /api/admin/integrations/fetch-all
 * Body: { since? }  Fetch orders from every connected provider that supports it.
 * Response: { success, results: { [providerId]: {ok, imported, updated, skipped, needsMapping, warnings, fetched, pages} | {ok:false,error,errorType} | {skipped:true,reason} } }
 */
router.post("/fetch-all", authMiddleware, (req, res) =>
  withApiContext(req, "fetchAll", "all", async (correlationId) => {
    try {
      const results = await integrationService.fetchAll(
        { since: req.body?.since },
        ownerOf(req),
      );
      res.json({ success: true, correlationId, results });
    } catch (error) {
      sendError(res, error, "fetch-all", correlationId);
    }
  }),
);

/**
 * POST /api/admin/integrations/orders/:orderId/confirm-shipment
 * Send the Shiprocket AWB + courier to the order's marketplace.
 */
router.post(
  "/orders/:orderId/confirm-shipment",
  authMiddleware,
  (req, res) =>
    withApiContext(req, "confirmShipment", undefined, async (correlationId) => {
      try {
        const result = await confirmShipmentToMarketplace(
          req.params.orderId,
          ownerOf(req),
        );
        res.json({ success: true, correlationId, ...result });
      } catch (error) {
        sendError(res, error, "confirm-shipment", correlationId);
      }
    }),
);

/**
 * GET /api/admin/integrations/:id
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const integrations = await integrationService.getAllIntegrations();
    const integration = integrations.find((i) => i.id === id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "Integration not found",
        errorType: "NOT_FOUND",
        actionRequired: "Check the integration id.",
        details: { id },
      });
    }

    const config = integrationService.getIntegrationConfig(id);
    const provider = registry.get(id);
    const credentials =
      provider && integrationService.usesStoredCredentials(provider)
        ? await integrationService.getMaskedCredentials(id)
        : undefined;

    res.json({
      success: true,
      integration: { ...integration, config, credentials },
    });
  } catch (error) {
    sendError(res, error, "get integration");
  }
});

/**
 * GET /api/admin/integrations/:id/credential-fields
 * Response: { success, fields: [{key,label,secret,required,help}], credentials: {key:{hasValue,last4}} }
 */
router.get("/:id/credential-fields", authMiddleware, async (req, res) => {
  try {
    const fields = integrationService.getCredentialFields(req.params.id);
    const credentials = await integrationService.getMaskedCredentials(
      req.params.id,
    );
    res.json({ success: true, fields, credentials });
  } catch (error) {
    sendError(res, error, "credential-fields");
  }
});

/**
 * GET /api/admin/integrations/:id/docs
 * Response: { success, docs, lastVerified } or 404 { success:false, error, errorType:"NOT_FOUND", actionRequired }
 */
router.get("/:id/docs", authMiddleware, async (req, res) => {
  try {
    const docs = await getProviderDocs(req.params.id);
    if (!docs) {
      console.warn(`[Integration:docs] 404 providerId=${req.params.id} reason=no valid docs`);
      return res.status(404).json({
        success: false,
        error: "No guide available for this integration yet",
        errorType: "NOT_FOUND",
        actionRequired:
          "Use the provider's official documentation link, or contact support for setup help.",
      });
    }
    res.json({ success: true, docs, lastVerified: docs.lastVerified });
  } catch (error) {
    sendError(res, error, "docs");
  }
});

/**
 * PUT /api/admin/integrations/:id/credentials
 * Body: { credentials: { key: value } } (also accepts the object directly). Blank values keep existing.
 * Response: { success, credentials: {key:{hasValue,last4}} }  (secrets never returned)
 */
router.put("/:id/credentials", authMiddleware, async (req, res) => {
  try {
    const values = req.body?.credentials ?? req.body;
    const masked = await integrationService.saveCredentials(
      req.params.id,
      values,
      ownerOf(req),
    );
    res.json({ success: true, credentials: masked });
  } catch (error) {
    sendError(res, error, "save credentials");
  }
});

/**
 * DELETE /api/admin/integrations/:id/credentials
 */
router.delete("/:id/credentials", authMiddleware, async (req, res) => {
  try {
    const deleted = await integrationService.deleteCredentials(
      req.params.id,
      ownerOf(req),
    );
    res.json({ success: true, deleted });
  } catch (error) {
    sendError(res, error, "delete credentials");
  }
});

/**
 * POST /api/admin/integrations/:id/test
 * Registry providers with stored credentials use provider.testConnection;
 * everything else keeps the legacy env-based test.
 */
router.post("/:id/test", authMiddleware, (req, res) =>
  withApiContext(req, "test", req.params.id, async (correlationId) => {
    const { id } = req.params;
    try {
      const result = await integrationService.testIntegration(id);
      res.json({
        success: result.success,
        correlationId,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      if (registry.get(id)) return sendError(res, error, `test ${id}`, correlationId);
      console.error("Error testing integration:", error);
      res.status(500).json({ success: false, correlationId, error: error.message });
    }
  }),
);

/**
 * POST /api/admin/integrations/:id/fetch-orders
 * Body: { since? }  Defaults to lastSyncAt, or 7 days on first run.
 * Response: { success, imported, updated, skipped, needsMapping, warnings, fetched, pages }
 */
router.post("/:id/fetch-orders", authMiddleware, (req, res) =>
  withApiContext(req, "fetchOrders", req.params.id, async (correlationId) => {
    try {
      const summary = await integrationService.fetchOrdersFor(
        req.params.id,
        { since: req.body?.since },
        ownerOf(req),
      );
      res.json({ success: true, correlationId, ...summary });
    } catch (error) {
      sendError(res, error, `fetch-orders ${req.params.id}`, correlationId);
    }
  }),
);

/**
 * POST /api/admin/integrations/:id/publish
 * Body: { productIds: string[], dryRun?: boolean, overrides?: object }
 * Response: { success, dryRun, total, succeeded, failed, results: [{productId, sku, ok, externalId, status, issues}] }
 */
router.post("/:id/publish", authMiddleware, (req, res) =>
  withApiContext(req, "publish", req.params.id, async (correlationId) => {
    try {
      const { productIds, dryRun, overrides } = req.body || {};
      const out = await publishToChannel({
        providerId: req.params.id,
        productIds,
        dryRun: !!dryRun,
        ownerId: ownerOf(req),
        overrides: overrides || {},
      });
      res.json({ success: true, correlationId, ...out });
    } catch (error) {
      sendError(res, error, `publish ${req.params.id}`, correlationId);
    }
  }),
);

/**
 * POST /api/admin/integrations/:id/inventory
 * Body: { externalSku | productId, quantity? }  (quantity defaults to summed variant stock for productId)
 */
router.post("/:id/inventory", authMiddleware, (req, res) =>
  withApiContext(req, "updateInventory", req.params.id, async (correlationId) => {
    try {
      const result = await integrationService.pushInventory(
        req.params.id,
        req.body || {},
      );
      res.json({ success: true, correlationId, result });
    } catch (error) {
      sendError(res, error, `inventory ${req.params.id}`, correlationId);
    }
  }),
);

/**
 * POST /api/admin/integrations/:id/price
 * Body: { externalSku | productId, mrp?, sellingPrice? }
 */
router.post("/:id/price", authMiddleware, (req, res) =>
  withApiContext(req, "updatePrice", req.params.id, async (correlationId) => {
    try {
      const result = await integrationService.pushPrice(
        req.params.id,
        req.body || {},
      );
      res.json({ success: true, correlationId, result });
    } catch (error) {
      sendError(res, error, `price ${req.params.id}`, correlationId);
    }
  }),
);

/**
 * GET /api/admin/integrations/:id/webhook
 */
router.get("/:id/webhook", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const webhookUrl = integrationService.getWebhookUrl(id);

    res.json({
      success: true,
      webhookUrl,
      instructions: `Configure this URL in your ${id} dashboard to receive real-time updates.`,
    });
  } catch (error) {
    sendError(res, error, "webhook url");
  }
});

export default router;
