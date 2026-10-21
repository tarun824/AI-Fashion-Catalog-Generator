import mongoose from "mongoose";
import Product from "../../models/Product.js";
import { ProviderError } from "../core/errors.js";
import { updateApiContext } from "../logging/apiCallContext.js";
import {
  getProviderOrThrow,
  assertCapability,
  requireCredentials,
} from "./credentialStore.js";

const imageUrl = (gridFsId) => {
  const base = (process.env.PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  if (!base) {
    console.warn(
      `[Integration:listing] PUBLIC_API_BASE_URL not set; image url is relative for gridFsId=${gridFsId}`,
    );
  }
  return `${base}/images/${gridFsId}`;
};

/**
 * Build a NormalizedListing from a Product document (lean or hydrated).
 * @returns {import("../core/schemas.js").NormalizedListing}
 */
export function buildNormalizedListing(product, overrides = {}) {
  const p = typeof product.toObject === "function" ? product.toObject() : product;

  let ids = [];
  if (Array.isArray(p.imageGallery) && p.imageGallery.length) {
    ids = [...p.imageGallery]
      .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || (a.order ?? 0) - (b.order ?? 0))
      .map((g) => g.gridFsId)
      .filter(Boolean);
  } else if (p.images?.original?.gridFsId) {
    ids = [p.images.original.gridFsId];
  } else {
    console.warn(
      `[Integration:listing] product has no images productId=${p._id} sku=${p.sku}`,
    );
  }

  const variants = (p.variants || []).map((v) => ({
    size: v.size || "",
    color: v.color || "",
    sku: v.sku || "",
    stock: Number(v.stock) || 0,
  }));
  const stock = variants.reduce((sum, v) => sum + v.stock, 0);
  const amount = p.price?.amount ?? null;

  return {
    sku: p.sku,
    name: p.name,
    description: p.description?.full || "",
    mrp: p.price?.suggested ?? amount,
    sellingPrice: amount,
    currency: p.price?.currency || "INR",
    images: ids.map((id) => imageUrl(id)),
    attributes: {
      fabric: p.fabric || p.description?.parsed?.fabric || "",
      colors: p.colors?.names || [],
      occasion: p.occasion || p.description?.parsed?.occasion || "",
      workType: p.workType || "",
      borderType: p.borderType || "",
      blouseIncluded: !!p.blouseIncluded,
      weight: p.weight || "",
    },
    stock,
    variants,
    category: p.category || "",
    overrides: overrides || {},
  };
}

function upsertListing(product, channel, patch) {
  const idx = product.channelListings.findIndex((l) => l.channel === channel);
  if (idx === -1) {
    product.channelListings.push({ channel, ...patch });
  } else {
    Object.assign(product.channelListings[idx], patch);
  }
}

/**
 * Publish (or dry-run) products to a channel.
 * @param {{providerId:string, productIds:string[], dryRun?:boolean, ownerId?:any, overrides?:Object}} params
 * `overrides` may be keyed by productId ({[productId]: {...}}) or flat (applied to all).
 */
export async function publishToChannel({
  providerId,
  productIds,
  dryRun = false,
  ownerId,
  overrides = {},
}) {
  const provider = getProviderOrThrow(providerId);
  assertCapability(provider, "publishProducts");

  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new ProviderError("VALIDATION", "productIds must be a non-empty array");
  }
  const bad = productIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (bad.length) {
    throw new ProviderError("VALIDATION", "Invalid productIds", {
      details: { invalid: bad },
    });
  }

  const { credentials } = await requireCredentials(providerId);
  const products = await Product.find({
    _id: { $in: productIds },
    deletedAt: null,
  });
  const found = new Set(products.map((p) => String(p._id)));

  const results = [];
  for (const id of productIds) {
    if (!found.has(String(id))) {
      console.warn(`[Integration:${providerId}] publish skipped productId=${id} reason=not found`);
      results.push({ productId: id, ok: false, status: "error", issues: ["Product not found"] });
    }
  }

  for (const product of products) {
    const pid = String(product._id);
    const perProduct = overrides?.[pid] ?? overrides ?? {};
    updateApiContext({ context: { productId: pid, sku: product.sku } });
    try {
      const listing = buildNormalizedListing(product, perProduct);
      const res = await provider.publishProduct(credentials, listing, { dryRun });
      const issues = res?.issues || [];
      results.push({
        productId: pid,
        sku: product.sku,
        ok: true,
        dryRun,
        externalId: res?.externalId ?? null,
        status: res?.status,
        issues,
      });
      if (!dryRun) {
        upsertListing(product, providerId, {
          externalId: res?.externalId || "",
          externalSku: res?.externalSku || product.sku,
          status: ["draft", "submitted", "live", "error"].includes(res?.status)
            ? res.status
            : "submitted",
          issues,
          lastSyncedAt: new Date(),
        });
        await product.save();
      }
    } catch (err) {
      console.warn(
        `[Integration:${providerId}] publish failed productId=${pid} sku=${product.sku} type=${err.type || "ERROR"} reason=${err.message}`,
      );
      results.push({
        productId: pid,
        sku: product.sku,
        ok: false,
        status: "error",
        errorType: err.type || "UPSTREAM_ERROR",
        issues: [err.message],
      });
      if (!dryRun) {
        upsertListing(product, providerId, {
          status: "error",
          issues: [err.message],
          lastSyncedAt: new Date(),
        });
        await product.save().catch((e) =>
          console.warn(`[Integration:${providerId}] could not persist error listing productId=${pid} reason=${e.message}`),
        );
      }
    }
  }

  void ownerId;
  return {
    dryRun,
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

export default { buildNormalizedListing, publishToChannel };
