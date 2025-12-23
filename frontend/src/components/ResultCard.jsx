const placeholder = `Product Specifications
- Fabric: -
- Sleeves: -
- Neckline: -
- Bodice: -
- Closure: -
- Length: -

Style & Fit
- Silhouette: -
- Color: -
- Aesthetic: -`;

function ResultCard({ description, isLoading }) {
  const output = description?.trim() ? description.trim() : placeholder;

  return (
    <aside className="flex h-full flex-col rounded-3xl bg-slate-900 p-8 text-white shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-brand-100">
            Output
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Product Copy</h2>
        </div>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-white/80">
          {isLoading ? "Working" : "Ready"}
        </span>
      </div>

      <div className="mt-6 flex-1 rounded-2xl bg-white/5 p-5 text-sm text-slate-100 shadow-inner">
        <pre className="h-full whitespace-pre-wrap font-mono leading-relaxed">
          {output}
        </pre>
      </div>
      <p className="mt-4 text-xs text-white/60">
        Tip: provide clear, evenly lit imagery for the best technical specs.
      </p>
    </aside>
  );
}

export default ResultCard;

