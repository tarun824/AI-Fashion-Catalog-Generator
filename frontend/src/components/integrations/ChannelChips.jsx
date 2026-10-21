/**
 * Small presentational helpers shared by Orders, OrderDetail, Products and Integrations.
 * Static class maps only (Tailwind cannot see dynamically built class names).
 */

import { channelLabel } from "../../utils/channelHelpers";

const SOURCE_STYLES = {
  amazon:
    "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700",
  flipkart:
    "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700",
  shopify:
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700",
  myntra:
    "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700",
  meesho:
    "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700",
  default:
    "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
};

export function SourceBadge({ source }) {
  if (!source) return null;
  const style = SOURCE_STYLES[source] || SOURCE_STYLES.default;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      {channelLabel(source)}
    </span>
  );
}

const CHIP_TONES = {
  amber:
    "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700",
  red: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
  slate:
    "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600",
  green:
    "bg-green-100 text-green-900 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700",
  blue: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700",
};

export function Chip({ tone = "slate", children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${CHIP_TONES[tone] || CHIP_TONES.slate}`}
    >
      {children}
    </span>
  );
}

/** Chips describing a marketplace order's state. */
export function MarketplaceOrderChips({ order }) {
  const m = order?.marketplace;
  if (!m?.channel) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {m.needsMapping && (
        <Chip
          tone="amber"
          title="Some items could not be matched to your products. Open the order to map them."
        >
          Needs mapping
        </Chip>
      )}
      {m.addressRedacted && (
        <Chip
          tone="slate"
          title="The marketplace hid the buyer address (PII access missing)."
        >
          Address hidden
        </Chip>
      )}
      {m.fulfillmentType === "MARKETPLACE" && (
        <Chip
          tone="blue"
          title="The marketplace ships this order. No action needed."
        >
          Fulfilled by marketplace
        </Chip>
      )}
    </div>
  );
}

const LISTING_TONES = {
  live: "green",
  submitted: "blue",
  draft: "slate",
  error: "red",
};

/** Per-channel listing status chips for a product. */
export function ListingChips({ listings }) {
  if (!Array.isArray(listings) || listings.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {listings.map((l) => (
        <Chip
          key={`${l.channel}-${l.externalSku || l.externalId}`}
          tone={LISTING_TONES[l.status] || "slate"}
          title={
            l.issues?.length
              ? l.issues.join("; ")
              : l.externalId
                ? `ID: ${l.externalId}`
                : undefined
          }
        >
          {channelLabel(l.channel)}: {l.status}
        </Chip>
      ))}
    </div>
  );
}
