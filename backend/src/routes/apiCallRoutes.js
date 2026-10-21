/**
 * External API call log viewer (read-only).
 * Mount at /admin/api-calls. All endpoints require authMiddleware.
 *
 *   GET /stats                        per-provider health + overall totals (?provider, ?hours<=720)
 *   GET /correlation/:correlationId   all calls of one click/webhook (no bodies)
 *   GET /                             paginated summary list (no bodies)
 *        filters: provider, operation, success, status, statusClass, correlationId,
 *                 orderId, direction, from, to, q, page, limit (<=100)
 *   GET /:id                          full document incl. request/response bodies
 *
 * Static routes are declared before "/:id".
 */

import express from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/auth.js";
import ExternalApiCall from "../models/ExternalApiCall.js";

const router = express.Router();

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const P95_SAMPLE = 5000;

// Summary projection: NO request/response bodies or headers (data minimisation).
const SUMMARY_SELECT = {
  provider: 1,
  operation: 1,
  direction: 1,
  "request.method": 1,
  "request.url": 1,
  "response.status": 1,
  success: 1,
  durationMs: 1,
  errorType: 1,
  errorMessage: 1,
  attempt: 1,
  correlationId: 1,
  context: 1,
  startedAt: 1,
  createdAt: 1,
};

const invalid = (res, message) =>
  res
    .status(400)
    .json({ success: false, error: message, errorType: "INVALID_INPUT" });

const serverError = (res, label, err) => {
  console.error(`[ApiCalls:routes] ${label} failed: ${err?.message}`);
  return res.status(500).json({
    success: false,
    error: "Could not load API call logs.",
    errorType: "SERVER_ERROR",
    actionRequired:
      "Try again in a moment. If it keeps failing, check the server logs.",
  });
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const str = (v) => (typeof v === "string" ? v.trim() : "");

const STATUS_CLASS = {
  "2xx": [200, 300],
  "3xx": [300, 400],
  "4xx": [400, 500],
  "5xx": [500, 600],
};

function parseDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Build a filter from req.query. Returns {filter} or {error}. */
function buildFilter(query) {
  const filter = {};
  const provider = str(query.provider);
  if (provider) filter.provider = provider.toLowerCase();
  const operation = str(query.operation);
  if (operation) filter.operation = operation;
  const direction = str(query.direction);
  if (direction) {
    if (!["inbound", "outbound"].includes(direction)) {
      return { error: "direction must be 'inbound' or 'outbound'." };
    }
    filter.direction = direction;
  }
  const success = str(query.success);
  if (success) {
    if (!["true", "false"].includes(success)) {
      return { error: "success must be 'true' or 'false'." };
    }
    filter.success = success === "true";
  }
  const status = str(query.status);
  const statusClass = str(query.statusClass);
  if (status) {
    const n = Number(status);
    if (!Number.isInteger(n) || n < 100 || n > 599) {
      return { error: "status must be an HTTP status code (100-599)." };
    }
    filter["response.status"] = n;
  } else if (statusClass) {
    const range = STATUS_CLASS[statusClass.toLowerCase()];
    if (!range) {
      return { error: "statusClass must be one of 2xx, 3xx, 4xx, 5xx." };
    }
    filter["response.status"] = { $gte: range[0], $lt: range[1] };
  }
  const correlationId = str(query.correlationId);
  if (correlationId) filter.correlationId = correlationId;
  const orderId = str(query.orderId);
  if (orderId) {
    filter.$or = [
      { "context.orderId": orderId },
      { "context.externalOrderId": orderId },
    ];
  }
  const from = str(query.from);
  const to = str(query.to);
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const d = parseDate(from);
      if (!d) return { error: "from must be an ISO date." };
      filter.createdAt.$gte = d;
    }
    if (to) {
      const d = parseDate(to);
      if (!d) return { error: "to must be an ISO date." };
      filter.createdAt.$lte = d;
    }
  }
  const q = str(query.q);
  if (q) {
    filter["request.url"] = {
      $regex: escapeRegex(q.slice(0, 200)),
      $options: "i",
    };
  }
  return { filter };
}

const percentile = (sorted, p) =>
  sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]
    : null;

/** GET /stats */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const hoursRaw = Number(req.query.hours ?? 24);
    if (!Number.isFinite(hoursRaw) || hoursRaw <= 0) {
      return invalid(res, "hours must be a positive number (max 720).");
    }
    const hours = Math.min(Math.floor(hoursRaw) || 1, 720);
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const match = { createdAt: { $gte: since } };
    const provider = str(req.query.provider);
    if (provider) match.provider = provider.toLowerCase();

    const [groups, errorGroups, statusGroups] = await Promise.all([
      ExternalApiCall.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$provider",
            total: { $sum: 1 },
            failures: { $sum: { $cond: ["$success", 0, 1] } },
            avgDurationMs: { $avg: "$durationMs" },
            lastCallAt: { $max: "$createdAt" },
            lastFailureAt: {
              $max: { $cond: ["$success", null, "$createdAt"] },
            },
          },
        },
      ]),
      ExternalApiCall.aggregate([
        {
          $match: {
            ...match,
            success: false,
            errorType: { $nin: [null, ""] },
          },
        },
        {
          $group: {
            _id: { provider: "$provider", errorType: "$errorType" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      ExternalApiCall.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              provider: "$provider",
              cls: {
                $switch: {
                  branches: [
                    {
                      case: { $not: [{ $gt: ["$response.status", 0] }] },
                      then: "network",
                    },
                    { case: { $lt: ["$response.status", 300] }, then: "2xx" },
                    { case: { $lt: ["$response.status", 400] }, then: "3xx" },
                    { case: { $lt: ["$response.status", 500] }, then: "4xx" },
                  ],
                  default: "5xx",
                },
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const providers = {};
    for (const g of groups) {
      providers[g._id] = {
        provider: g._id,
        total: g.total,
        failures: g.failures,
        successRate: g.total
          ? Math.round(((g.total - g.failures) / g.total) * 1000) / 10
          : null,
        avgDurationMs:
          g.avgDurationMs == null ? null : Math.round(g.avgDurationMs),
        p95DurationMs: null,
        errorsByType: [],
        statusBreakdown: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, network: 0 },
        lastFailureAt: g.lastFailureAt || null,
        lastCallAt: g.lastCallAt || null,
      };
    }
    for (const e of errorGroups) {
      providers[e._id.provider]?.errorsByType.push({
        errorType: e._id.errorType,
        count: e.count,
      });
    }
    for (const s of statusGroups) {
      const p = providers[s._id.provider];
      if (p) p.statusBreakdown[s._id.cls] = s.count;
    }

    // p95 from a sorted sample of the latest durations per provider.
    await Promise.all(
      Object.keys(providers).map(async (name) => {
        const rows = await ExternalApiCall.find({
          ...match,
          provider: name,
          durationMs: { $type: "number" },
        })
          .select("durationMs")
          .sort({ createdAt: -1 })
          .limit(P95_SAMPLE)
          .lean();
        const sorted = rows.map((r) => r.durationMs).sort((a, b) => a - b);
        providers[name].p95DurationMs = percentile(sorted, 0.95);
      }),
    );

    const list = Object.values(providers).sort((a, b) => b.total - a.total);
    const total = list.reduce((n, p) => n + p.total, 0);
    const failures = list.reduce((n, p) => n + p.failures, 0);
    res.json({
      success: true,
      hours,
      since,
      providers: list,
      overall: {
        total,
        failures,
        successRate: total
          ? Math.round(((total - failures) / total) * 1000) / 10
          : null,
      },
    });
  } catch (error) {
    serverError(res, "stats", error);
  }
});

/** GET /correlation/:correlationId */
router.get("/correlation/:correlationId", authMiddleware, async (req, res) => {
  try {
    const correlationId = str(req.params.correlationId);
    if (!correlationId || correlationId.length > 200) {
      return invalid(res, "A valid correlationId is required.");
    }
    const calls = await ExternalApiCall.find({ correlationId })
      .select(SUMMARY_SELECT)
      .sort({ startedAt: 1, createdAt: 1 })
      .limit(500)
      .lean();
    const summary = {
      total: calls.length,
      failures: calls.filter((c) => !c.success).length,
      totalDurationMs: calls.reduce((n, c) => n + (c.durationMs || 0), 0),
    };
    res.json({ success: true, correlationId, summary, data: calls });
  } catch (error) {
    serverError(res, "correlation", error);
  }
});

/** GET / */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { filter, error } = buildFilter(req.query);
    if (error) return invalid(res, error);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT),
    );

    const [data, total] = await Promise.all([
      ExternalApiCall.find(filter)
        .select(SUMMARY_SELECT)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ExternalApiCall.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    serverError(res, "list", err);
  }
});

/** GET /:id (full document) */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return invalid(res, "Invalid API call id.");
    }
    const call = await ExternalApiCall.findById(req.params.id).lean();
    if (!call) {
      return res.status(404).json({
        success: false,
        error:
          "API call not found. It may have expired (logs are kept 30-90 days).",
        errorType: "NOT_FOUND",
      });
    }
    res.json({ success: true, data: call });
  } catch (error) {
    serverError(res, "detail", error);
  }
});

export default router;
