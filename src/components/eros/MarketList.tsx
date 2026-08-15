import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Market } from "@/lib/eros.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function period(market: string): "HT" | "FT" | "AUTRE" {
  const m = market.toUpperCase();
  if (m.startsWith("HT") || m.includes("MI-TEMPS") || m.includes("2E MT")) return "HT";
  if (m.startsWith("FT")) return "FT";
  return "AUTRE";
}

function tone(p: number) {
  if (p >= 75) return "text-success";
  if (p >= 55) return "text-primary";
  return "text-muted-foreground";
}

export function MarketRow({ market, right }: { market: Market; right?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const probability = Math.round(Number(market.probability) || 0);
  const confidence = Math.round(Number(market.confidence) || 0);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
      >
        <div className="min-w-0">
          <p className="label-xs truncate">{market.market}</p>
          <p className="truncate text-sm font-medium text-foreground">{market.pick}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`num font-display text-sm font-semibold ${tone(probability)}`}>
            {probability}%
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3">
          <div className="h-1 w-full overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, probability))}%` }}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{market.reasoning}</p>
          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
              conf. {confidence}
            </span>
            <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
              {market.stake}
            </span>
          </div>
          {right}
        </div>
      )}
    </div>
  );
}

export function MarketList({
  markets,
  renderExtra,
}: {
  markets: Market[];
  renderExtra?: (m: Market) => React.ReactNode;
}) {
  const groups = {
    HT: markets.filter((m) => period(m.market) === "HT"),
    FT: markets.filter((m) => period(m.market) === "FT"),
    AUTRE: markets.filter((m) => period(m.market) === "AUTRE"),
  };

  return (
    <Tabs defaultValue="FT">
      <TabsList className="w-full bg-surface-2">
        <TabsTrigger value="HT" className="flex-1 text-xs">
          HT ({groups.HT.length})
        </TabsTrigger>
        <TabsTrigger value="FT" className="flex-1 text-xs">
          FT ({groups.FT.length})
        </TabsTrigger>
        <TabsTrigger value="AUTRE" className="flex-1 text-xs">
          Autres ({groups.AUTRE.length})
        </TabsTrigger>
      </TabsList>
      {(["HT", "FT", "AUTRE"] as const).map((key) => (
        <TabsContent key={key} value={key} className="mt-2">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {groups[key].length ? (
              groups[key].map((m, i) => (
                <MarketRow key={`${key}-${m.market}-${i}`} market={m} right={renderExtra?.(m)} />
              ))
            ) : (
              <p className="px-3 py-4 text-xs text-muted-foreground">Aucun marché dans ce groupe.</p>
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
