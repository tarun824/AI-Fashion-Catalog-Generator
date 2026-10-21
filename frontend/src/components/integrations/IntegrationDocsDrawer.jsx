import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Search,
  BookOpen,
} from "lucide-react";
import useIntegrationDocs from "../../hooks/useIntegrationDocs";
import { ExtLink, FieldHelp } from "./DocsBits";
import { asArray, asText } from "../../utils/docsHelpers";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "how", label: "How it works" },
  { id: "setup", label: "Setup guide" },
  { id: "fields", label: "Keys" },
  { id: "usage", label: "Using it" },
  { id: "troubleshooting", label: "Fix problems" },
  { id: "good", label: "Good to know" },
];

const CARD =
  "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4";
const H3 = "text-base font-bold text-gray-900 dark:text-white mb-2";
const BODY = "text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line";

function Empty({ children }) {
  return (
    <p className="text-sm text-gray-600 dark:text-gray-400 py-4">{children}</p>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      {title && <h3 className={H3}>{title}</h3>}
      {children}
    </section>
  );
}

function Accordion({ open, onToggle, header, children, id }) {
  return (
    <div className={`${CARD} !p-0 overflow-hidden`} id={id}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-h-[44px] flex items-center justify-between gap-3 px-4 py-3 text-left text-gray-900 dark:text-white"
      >
        <span className="flex-1 min-w-0">{header}</span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ docs }) {
  const caps = asArray(docs.capabilities);
  return (
    <div className="space-y-6">
      {asText(docs.overview) ? (
        <p className={BODY}>{docs.overview}</p>
      ) : (
        <Empty>No overview available yet.</Empty>
      )}
      {caps.length > 0 && (
        <Section title="What you can do">
          <div className="grid gap-3 sm:grid-cols-2">
            {caps.map((c, i) => (
              <div key={i} className={CARD}>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {asText(c?.label)}
                </p>
                {asText(c?.button) && (
                  <span className="inline-block mt-1 mb-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200">
                    Button: {c.button}
                  </span>
                )}
                {asText(c?.description) && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {c.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function HowTab({ docs }) {
  const steps = asArray(docs.howItWorks);
  return (
    <div className="space-y-4">
      <p className="text-sm rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 px-3 py-2">
        Everything here is button-driven and manual. Nothing runs in the
        background unless you click it.
      </p>
      {steps.length === 0 ? (
        <Empty>No walkthrough available yet.</Empty>
      ) : (
        <ol>
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span className="w-0.5 flex-1 bg-blue-200 dark:bg-blue-800 my-1" />
                )}
              </div>
              <div className="pb-5 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {asText(s?.title)}
                </p>
                <p className={`${BODY} mt-1`}>{asText(s?.body)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CheckRow({ id, checked, onToggle, children }) {
  return (
    <li>
      <label
        htmlFor={id}
        className="flex items-start gap-3 min-h-[44px] py-1.5 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
      >
        <input
          id={id}
          type="checkbox"
          checked={!!checked}
          onChange={onToggle}
          className="mt-1 w-5 h-5 flex-shrink-0 accent-blue-600"
        />
        <span className={checked ? "line-through opacity-70" : ""}>
          {children}
        </span>
      </label>
    </li>
  );
}

function SetupTab({ docs }) {
  const [checked, setChecked] = useState({});
  const toggle = (k) => setChecked((p) => ({ ...p, [k]: !p[k] }));
  const prereq = asArray(docs.prerequisites);
  const setup = asArray(docs.setup);
  return (
    <div className="space-y-6">
      {prereq.length > 0 && (
        <Section title="Before you start">
          <ul className={`${CARD} divide-y divide-gray-100 dark:divide-gray-700`}>
            {prereq.map((p, i) => {
              const item = typeof p === "string" ? { text: p } : p || {};
              return (
                <CheckRow
                  key={i}
                  id={`pre-${i}`}
                  checked={checked[`pre-${i}`]}
                  onToggle={() => toggle(`pre-${i}`)}
                >
                  {asText(item.text)}
                  {item.link && (
                    <>
                      {" "}
                      <ExtLink href={item.link} className="!min-h-0">
                        Open
                      </ExtLink>
                    </>
                  )}
                </CheckRow>
              );
            })}
          </ul>
        </Section>
      )}
      {setup.length === 0 ? (
        <Empty>No setup steps available yet.</Empty>
      ) : (
        setup.map((sec, si) => (
          <section key={si} className={CARD}>
            <h3 className={H3}>
              <span className="inline-flex w-7 h-7 mr-2 rounded-full bg-blue-600 text-white text-sm items-center justify-center align-middle">
                {si + 1}
              </span>
              {asText(sec?.title)}
            </h3>
            <ul>
              {asArray(sec?.steps).map((st, i) => (
                <CheckRow
                  key={i}
                  id={`s-${si}-${i}`}
                  checked={checked[`s-${si}-${i}`]}
                  onToggle={() => toggle(`s-${si}-${i}`)}
                >
                  {asText(st)}
                </CheckRow>
              ))}
            </ul>
            {asText(sec?.note) && (
              <p className="mt-2 text-sm rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-3 py-2">
                {sec.note}
              </p>
            )}
            <ExtLink href={sec?.link}>Open the official page</ExtLink>
          </section>
        ))
      )}
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Ticks are only for you and are not saved.
      </p>
    </div>
  );
}

function FieldsTab({ docs, focusField }) {
  const entries = Object.entries(
    docs.fields && typeof docs.fields === "object" ? docs.fields : {},
  );
  const [open, setOpen] = useState(() =>
    focusField ? { [focusField]: true } : {},
  );
  useEffect(() => {
    if (!focusField) return;
    const el = document.getElementById(`docfield-${focusField}`);
    if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusField]);
  if (entries.length === 0) return <Empty>No key help available yet.</Empty>;
  return (
    <div className="space-y-3">
      {entries.map(([key, f]) => (
        <Accordion
          key={key}
          id={`docfield-${key}`}
          open={!!open[key]}
          onToggle={() => setOpen((p) => ({ ...p, [key]: !p[key] }))}
          header={
            <span className="block">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{asText(f?.label) || key}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    f?.required
                      ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {f?.required ? "Required" : "Optional"}
                </span>
              </span>
              {asText(f?.summary) && (
                <span className="block text-sm font-normal text-gray-700 dark:text-gray-300 mt-0.5">
                  {f.summary}
                </span>
              )}
            </span>
          }
        >
          <FieldHelp field={f} />
        </Accordion>
      ))}
    </div>
  );
}

function UsageTab({ docs }) {
  const usage = asArray(docs.usage);
  if (usage.length === 0) return <Empty>No usage guide available yet.</Empty>;
  return (
    <div className="space-y-4">
      {usage.map((u, i) => (
        <section key={i} className={CARD}>
          <h3 className={H3}>{asText(u?.title)}</h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-800 dark:text-gray-200">
            {asArray(u?.steps).map((s, j) => (
              <li key={j}>{asText(s)}</li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TroubleTab({ docs }) {
  const items = asArray(docs.troubleshooting);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const indexed = items.map((it, i) => [it, i]);
    if (!needle) return indexed;
    return indexed.filter(([it]) =>
      [it?.problem, it?.cause, it?.fix].some((t) =>
        asText(t).toLowerCase().includes(needle),
      ),
    );
  }, [items, q]);
  if (items.length === 0) return <Empty>No troubleshooting tips yet.</Empty>;
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your error or problem"
          aria-label="Search troubleshooting"
          className="w-full min-h-[44px] pl-9 pr-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {filtered.length === 0 && (
        <Empty>Nothing matches "{q}". Try fewer words.</Empty>
      )}
      {filtered.map(([it, i]) => (
        <Accordion
          key={i}
          open={!!open[i]}
          onToggle={() => setOpen((p) => ({ ...p, [i]: !p[i] }))}
          header={
            <span className="font-semibold">
              {asText(it?.problem) || "Problem"}
            </span>
          }
        >
          <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
            {asText(it?.cause) && (
              <p>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Why it happens:{" "}
                </span>
                {it.cause}
              </p>
            )}
            {asText(it?.fix) && (
              <p className="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-200 px-3 py-2 whitespace-pre-line">
                <span className="font-semibold">How to fix: </span>
                {it.fix}
              </p>
            )}
          </div>
        </Accordion>
      ))}
    </div>
  );
}

function GoodTab({ docs, providerName }) {
  const limits = asArray(docs.limitations).map(asText).filter(Boolean);
  const security = asArray(docs.security).map(asText).filter(Boolean);
  const glossary = asArray(docs.glossary);
  const links = asArray(docs.links);
  const unverified = asArray(docs.unverified).map(asText).filter(Boolean);
  const [showUnv, setShowUnv] = useState(false);
  const none =
    !limits.length &&
    !security.length &&
    !glossary.length &&
    !links.length &&
    !unverified.length;
  if (none) {
    return <Empty>Nothing else to know about {providerName} yet.</Empty>;
  }
  return (
    <div className="space-y-6">
      {limits.length > 0 && (
        <Section title="Limits">
          <ul className="space-y-2">
            {limits.map((l, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 px-3 py-2"
              >
                <AlertTriangle
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {security.length > 0 && (
        <Section title="Where your keys are stored">
          <ul className="space-y-2">
            {security.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200"
              >
                <ShieldCheck
                  className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-700 dark:text-green-400"
                  aria-hidden="true"
                />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {glossary.length > 0 && (
        <Section title="Words you may see">
          <dl className={`${CARD} space-y-3`}>
            {glossary.map((g, i) => (
              <div key={i}>
                <dt className="font-semibold text-sm text-gray-900 dark:text-white">
                  {asText(g?.term)}
                </dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300">
                  {asText(g?.meaning)}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      {links.length > 0 && (
        <Section title="Official links">
          <div className="flex flex-col">
            {links.map((l, i) => (
              <ExtLink key={i} href={l?.url}>
                {asText(l?.label) || asText(l?.url)}
              </ExtLink>
            ))}
          </div>
        </Section>
      )}
      {unverified.length > 0 && (
        <Accordion
          open={showUnv}
          onToggle={() => setShowUnv((v) => !v)}
          header={
            <span className="font-semibold">
              Unverified items - double check
            </span>
          }
        >
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 dark:text-gray-200">
            {unverified.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </Accordion>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div
      className="space-y-4 animate-pulse"
      aria-busy="true"
      aria-label="Loading guide"
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700" />
      ))}
    </div>
  );
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Slide-over guide for a provider.
 * Props: providerId, providerName, onClose, initialTab, focusField
 */
export default function IntegrationDocsDrawer({
  providerId,
  providerName,
  onClose,
  initialTab,
  focusField,
}) {
  const { docs, loading, notFound, error, retry } =
    useIntegrationDocs(providerId);
  const startTab = focusField
    ? "fields"
    : TABS.some((t) => t.id === initialTab)
      ? initialTab
      : "overview";
  const [tab, setTab] = useState(startTab);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Esc, focus trap, scroll lock, focus restore.
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll(FOCUSABLE);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === "function") prevFocus.focus();
    };
  }, []);

  const selectTab = (id) => {
    setTab(id);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  const name = asText(docs?.title) || providerName || providerId;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${providerName || providerId} setup guide`}
        className="relative bg-gray-50 dark:bg-gray-900 w-full sm:max-w-2xl lg:max-w-3xl h-full shadow-2xl flex flex-col outline-none"
      >
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen
                  className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <span className="truncate">{name}</span>
              </h2>
              {asText(docs?.tagline) && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {docs.tagline}
                </p>
              )}
              {asText(docs?.lastVerified) && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Last verified {docs.lastVerified}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close guide"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {docs && (
            <div
              role="tablist"
              aria-label="Guide sections"
              className="flex gap-1 overflow-x-auto px-3 pt-2"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => selectTab(t.id)}
                  className={`min-h-[44px] px-3 whitespace-nowrap text-sm font-medium border-b-2 ${
                    tab === t.id
                      ? "border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400"
                      : "border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div role="alert" className={`${CARD} text-center space-y-3`}>
              <p className="text-sm text-red-700 dark:text-red-300">
                We could not load the guide. Check your connection and try
                again.
              </p>
              <button
                type="button"
                onClick={retry}
                className="min-h-[44px] px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try again
              </button>
            </div>
          ) : notFound || !docs ? (
            <div className={`${CARD} text-center`}>
              <p className="font-semibold text-gray-900 dark:text-white">
                Guide coming soon
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                We are still writing the guide for {providerName || providerId}.
                Meanwhile, use the official documentation from the provider.
              </p>
            </div>
          ) : (
            <>
              {tab === "overview" && <OverviewTab docs={docs} />}
              {tab === "how" && <HowTab docs={docs} />}
              {tab === "setup" && <SetupTab docs={docs} />}
              {tab === "fields" && (
                <FieldsTab docs={docs} focusField={focusField} />
              )}
              {tab === "usage" && <UsageTab docs={docs} />}
              {tab === "troubleshooting" && <TroubleTab docs={docs} />}
              {tab === "good" && (
                <GoodTab docs={docs} providerName={providerName || providerId} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
