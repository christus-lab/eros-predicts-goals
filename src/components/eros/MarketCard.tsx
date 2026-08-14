import type { Market } from "@/lib/eros.functions";

function tone(confidence: number) {
  if (confidence >= 75) return "text-success";
  if (confidence >= 55) return "text-gold";
  return "text-muted-foreground";
}

export function MarketCard({ market, highlight = false }: { market: Market; highlight?: boolean }) {
  const confidence = Math.round(Number(market.confidence) || 0);
  const probability = Math.round(Number(market.probability) || 0);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-colors ${
        highlight
          ? "border-primary/40 bg-surface-2 shadow-glow"
          : "border-border bg-surface hover:border-primary/30"
      }`}
    >
      {highlight && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-value" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {market.market}
          </p>
          <p className="mt-1 font-display text-lg font-semibold leading-tight text-foreground">
            {market.pick}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-display text-2xl font-bold leading-none ${tone(confidence)}`}>
            {probability}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">conf. {confidence}</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-accent">
        <div
          className="h-full rounded-full bg-gradient-value"
          style={{ width: `${Math.min(100, Math.max(0, probability))}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{market.reasoning}</p>

      <p className="mt-3 inline-flex items-center rounded-md border border-border bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground">
        Mise : {market.stake}
      </p>
    </div>
  );
}
