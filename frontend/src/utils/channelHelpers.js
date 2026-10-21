export const CHANNEL_LABELS = {
  website: "Website",
  whatsapp: "WhatsApp",
  phone: "Phone",
  email: "Email",
  manual: "Manual",
  amazon: "Amazon",
  flipkart: "Flipkart",
  shopify: "Shopify",
  myntra: "Myntra",
  meesho: "Meesho",
};

export const channelLabel = (id) =>
  CHANNEL_LABELS[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : "");


/** Dispatch-by helper: returns {date, tone: overdue|today|ok} or null. */
export function dispatchState(dispatchByDate, now = new Date()) {
  if (!dispatchByDate) return null;
  const d = new Date(dispatchByDate);
  if (Number.isNaN(d.getTime())) return null;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return { date: d, tone: "today" };
  if (d < now) return { date: d, tone: "overdue" };
  return { date: d, tone: "ok" };
}
