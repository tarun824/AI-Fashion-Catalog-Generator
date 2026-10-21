import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const storage = new AsyncLocalStorage();

/** New correlation id (one per button click / webhook / job). */
export function newCorrelationId() {
  return randomUUID();
}

/**
 * Run fn inside an API-log context. Child async work (awaits, timers,
 * promises) inherits it. Returns fn's result.
 * @param {{correlationId?:string,operation?:string,trigger?:'manual'|'webhook'|'system',triggeredBy?:any,provider?:string,context?:{orderId?:string,externalOrderId?:string,productId?:string,sku?:string}}} ctx
 */
export function runWithApiContext(ctx, fn) {
  const store = { ...(ctx || {}), context: { ...(ctx?.context || {}) } };
  if (!store.correlationId) store.correlationId = newCorrelationId();
  return storage.run(store, fn);
}

/** Current store or undefined. */
export function getApiContext() {
  return storage.getStore();
}

/** Shallow-merge patch into the current store (nested `context` merged too). */
export function updateApiContext(patch = {}) {
  const store = storage.getStore();
  if (!store) {
    console.warn("[ApiLog] updateApiContext called outside runWithApiContext; ignored");
    return;
  }
  const { context, ...rest } = patch || {};
  Object.assign(store, rest);
  if (context) store.context = { ...(store.context || {}), ...context };
}
