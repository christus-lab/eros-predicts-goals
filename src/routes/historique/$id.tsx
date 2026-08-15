import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/eros/TopBar";
import { MarketList } from "@/components/eros/MarketList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { getPrediction, saveMarketResult, type ErosAnalysis, type Market } from "@/lib/eros.functions";

export const Route = createFileRoute("/historique/$id")({
  head: () => ({
    meta: [
      { title: "Détail d'analyse — Eros-V1" },
      {
        name: "description",
        content:
          "Renseignez le résultat réel de chaque marché prédit par Eros-V1 pour alimenter son auto-apprentissage.",
      },
      { property: "og:title", content: "Détail d'analyse — Eros-V1" },
      {
        property: "og:description",
        content: "Notation marché par marché d'une prédiction Eros-V1.",
      },
    ],
  }),
  component: DetailPage,
});

type Saved = { market: string; pick: string; actual_result: string | null; was_correct: boolean | null };

function MarketGrader({
  predictionId,
  market,
  saved,
}: {
  predictionId: string;
  market: Market;
  saved?: Saved | undefined;
}) {
  const [value, setValue] = useState(saved?.actual_result ?? "");
  const queryClient = useQueryClient();
  const save = useServerFn(saveMarketResult);

  const mutation = useMutation({
    mutationFn: (wasCorrect: boolean) =>
      save({
        data: {
          predictionId,
          market: market.market,
          pick: market.pick,
          actualResult: value,
          wasCorrect,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prediction", predictionId] });
      void queryClient.invalidateQueries({ queryKey: ["market-results"] });
      toast.success("Résultat enregistré — le bot a appris.");
    },
    onError: () => toast.error("Enregistrement impossible"),
  });

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2">
      {saved?.was_correct !== undefined && saved?.was_correct !== null && (
        <p
          className={`label-xs mb-1.5 ${saved.was_correct ? "text-success" : "text-destructive"}`}
        >
          Déjà noté : {saved.was_correct ? "réussi" : "raté"}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Résultat réel (ex : 1-0, 8 corners)"
          className="h-9 border-border bg-surface text-sm"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => mutation.mutate(true)}
            disabled={mutation.isPending}
            className="h-9 flex-1 bg-success text-success-foreground hover:opacity-90"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => mutation.mutate(false)}
            disabled={mutation.isPending}
            className="h-9 flex-1 border-destructive/50"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailPage() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getPrediction);
  const query = useQuery({
    queryKey: ["prediction", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const prediction = query.data?.prediction;
  const analysis = prediction?.analysis as ErosAnalysis | undefined;
  const saved = query.data?.results ?? [];

  const markets: Market[] = [
    ...(analysis?.best_bets ?? []),
    ...(analysis?.markets ?? []),
  ].filter((m, i, arr) => arr.findIndex((x) => x.market === m.market) === i);

  return (
    <main className="min-h-screen bg-background">
      <TopBar />
      <Toaster />
      <div className="mx-auto max-w-5xl px-4 py-5">
        <Link
          to="/historique"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Historique
        </Link>

        {query.isLoading && (
          <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
        )}

        {prediction && (
          <>
            <div className="mt-3 rounded-xl border border-border bg-surface p-4">
              <p className="label-xs truncate">{prediction.competition}</p>
              <h1 className="mt-0.5 font-display text-xl font-semibold">
                {prediction.home_team} — {prediction.away_team}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <span className="num rounded border border-border bg-surface-2 px-1.5 py-0.5">
                  conf. {prediction.confidence ?? "—"}%
                </span>
                <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                  HT {analysis?.score_predictions?.ht ?? "—"}
                </span>
                <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                  FT {analysis?.score_predictions?.ft ?? "—"}
                </span>
                <span className="num rounded border border-border bg-surface-2 px-1.5 py-0.5">
                  {saved.length}/{markets.length} notés
                </span>
              </div>
            </div>

            <p className="label-xs mt-5">Notez chaque marché</p>
            <div className="mt-2">
              <MarketList
                markets={markets}
                renderExtra={(m) => (
                  <MarketGrader
                    predictionId={prediction.id}
                    market={m}
                    saved={saved.find((r) => r.market === m.market) as Saved | undefined}
                  />
                )}
              />
            </div>
          </>
        )}

        {!query.isLoading && !prediction && (
          <p className="mt-6 text-sm text-muted-foreground">Analyse introuvable.</p>
        )}
      </div>
    </main>
  );
}
