import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Target } from "lucide-react";

import { TopBar } from "@/components/eros/TopBar";
import { listMarketResults, listPredictions } from "@/lib/eros.functions";

export const Route = createFileRoute("/historique/")({
  head: () => ({
    meta: [
      { title: "Historique des analyses — Eros-V1" },
      {
        name: "description",
        content:
          "Consultez toutes les analyses Eros-V1 et renseignez le résultat réel de chaque marché prédit pour affiner le moteur.",
      },
      { property: "og:title", content: "Historique des analyses — Eros-V1" },
      {
        property: "og:description",
        content: "Suivi marché par marché des prédictions Eros-V1 et apprentissage continu.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const fetchHistory = useServerFn(listPredictions);
  const fetchResults = useServerFn(listMarketResults);

  const history = useQuery({ queryKey: ["predictions"], queryFn: () => fetchHistory({}) });
  const results = useQuery({ queryKey: ["market-results"], queryFn: () => fetchResults({}) });

  const rows = history.data ?? [];
  const all = results.data ?? [];
  const graded = all.filter((r) => r.was_correct !== null);
  const hit = graded.length
    ? Math.round((graded.filter((r) => r.was_correct).length / graded.length) * 100)
    : null;

  return (
    <main className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Analyses", v: String(rows.length) },
            { l: "Marchés notés", v: String(graded.length) },
            { l: "Réussite", v: hit === null ? "—" : `${hit}%` },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-surface px-3 py-2.5">
              <p className="label-xs truncate">{s.l}</p>
              <p className="num mt-0.5 font-display text-lg font-semibold">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          {rows.map((p) => {
            const mine = all.filter((r) => r.prediction_id === p.id);
            const ok = mine.filter((r) => r.was_correct).length;
            return (
              <Link
                key={p.id}
                to="/historique/$id"
                params={{ id: p.id }}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-3 last:border-0 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.home_team} — {p.away_team}
                  </p>
                  <p className="label-xs mt-0.5 truncate">
                    {p.competition} · conf. {p.confidence ?? "—"} ·{" "}
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="num flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                    {mine.length ? `${ok}/${mine.length}` : "0"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
          {!rows.length && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucune analyse enregistrée.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
