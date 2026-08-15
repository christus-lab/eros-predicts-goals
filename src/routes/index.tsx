import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BrainCircuit, ChevronRight, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TopBar } from "@/components/eros/TopBar";
import { MarketList, MarketRow } from "@/components/eros/MarketList";
import { COMPETITION_GROUPS, OTHER_COMPETITION } from "@/lib/competitions";
import { listPredictions, predictMatch, type ErosAnalysis } from "@/lib/eros.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eros-V1 — Prédictions football tous marchés, HT & FT" },
      {
        name: "description",
        content:
          "Collez vos stats, Eros-V1 calibre tous les marchés bookmakers en HT et FT et ne garde que les paris rentables.",
      },
      { property: "og:title", content: "Eros-V1 — Prédictions football tous marchés" },
      {
        property: "og:description",
        content: "Analyse multi-marchés HT/FT avec auto-apprentissage et protection de bankroll.",
      },
    ],
  }),
  component: Index,
});

const PLACEHOLDER = `Formes, classement, H2H, Elo, xG, buts HT/FT, corners, cartons, fautes, touches, blessures, arbitre, météo, cotes…`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-xs">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Index() {
  const [competition, setCompetition] = useState("");
  const [compSelect, setCompSelect] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<{ id: string | null; analysis: ErosAnalysis } | null>(null);

  const queryClient = useQueryClient();
  const predict = useServerFn(predictMatch);
  const fetchHistory = useServerFn(listPredictions);

  const history = useQuery({ queryKey: ["predictions"], queryFn: () => fetchHistory({}) });

  const mutation = useMutation({
    mutationFn: () => predict({ data: { competition, homeTeam, awayTeam, details } }),
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Analyse terminée");
    },
    onError: (error: Error) => toast.error(error.message || "Analyse impossible"),
  });

  const analysis = result?.analysis;
  const canSubmit = competition.trim() && homeTeam.trim() && awayTeam.trim() && !mutation.isPending;

  return (
    <main className="min-h-screen bg-background">
      <TopBar />
      <Toaster />

      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Tous marchés · HT &amp; FT · filtre anti-perte
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
          {/* Console */}
          <div className="panel space-y-3.5 p-4">
            <Field label="Compétition">
              <Select
                value={compSelect}
                onValueChange={(v) => {
                  setCompSelect(v);
                  setCompetition(v === OTHER_COMPETITION ? "" : v);
                }}
              >
                <SelectTrigger className="h-10 border-border bg-surface-2 text-sm">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent className="max-h-[60vh] w-[calc(100vw-2.5rem)] sm:w-auto">
                  {COMPETITION_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-xs">{group.label}</SelectLabel>
                      {group.items.map((item) => (
                        <SelectItem key={item} value={item} className="text-sm">
                          {item}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectGroup>
                    <SelectLabel className="text-xs">Non listée</SelectLabel>
                    <SelectItem value={OTHER_COMPETITION} className="text-sm">
                      Autre (saisir)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {compSelect === OTHER_COMPETITION && (
                <Input
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  placeholder="Nom de la compétition"
                  className="mt-2 h-10 border-border bg-surface-2 text-sm"
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Domicile">
                <Input
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="Équipe A"
                  className="h-10 border-border bg-surface-2 text-sm"
                />
              </Field>
              <Field label="Extérieur">
                <Input
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="Équipe B"
                  className="h-10 border-border bg-surface-2 text-sm"
                />
              </Field>
            </div>

            <Field label="Données du match">
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={PLACEHOLDER}
                className="min-h-[180px] resize-y border-border bg-surface-2 text-sm leading-relaxed"
              />
              <p className="num mt-1 text-xs text-muted-foreground">
                {details.length.toLocaleString("fr-FR")} caractères
              </p>
            </Field>

            <Button
              onClick={() => mutation.mutate()}
              disabled={!canSubmit}
              className="h-10 w-full text-sm font-semibold"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Analyse…
                </>
              ) : (
                <>
                  <BrainCircuit className="mr-2 h-3.5 w-3.5" />
                  Analyser
                </>
              )}
            </Button>
          </div>

          {/* Résultat */}
          <div className="space-y-4">
            {!analysis && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Le rapport apparaîtra ici.
              </div>
            )}

            {analysis && (
              <>
                <div className="panel p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="label-xs truncate">{analysis.competition}</p>
                      <h2 className="truncate font-display text-lg font-semibold">
                        {analysis.match}
                      </h2>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                          HT {analysis.score_predictions?.ht}
                        </span>
                        <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                          FT {analysis.score_predictions?.ft}
                        </span>
                        <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                          risque {analysis.risk_level}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num font-display text-2xl font-semibold text-primary">
                        {Math.round(Number(analysis.global_confidence) || 0)}%
                      </p>
                      <p className="label-xs">confiance</p>
                    </div>
                  </div>
                  <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                    {analysis.bankroll_advice}
                  </p>
                </div>

                <div>
                  <p className="label-xs">Sélections retenues</p>
                  <div className="mt-2 overflow-hidden rounded-xl border border-primary/30 bg-surface">
                    {analysis.best_bets?.length ? (
                      analysis.best_bets.map((m, i) => (
                        <MarketRow key={`${m.market}-${i}`} market={m} />
                      ))
                    ) : (
                      <p className="px-3 py-3 text-xs text-foreground">
                        NO BET — aucun pari justifié sur ce match.
                      </p>
                    )}
                  </div>
                </div>

                {!!analysis.markets?.length && (
                  <div>
                    <p className="label-xs mb-2">Tous les marchés ({analysis.markets.length})</p>
                    <MarketList markets={analysis.markets} />
                  </div>
                )}

                {result?.id && (
                  <Link
                    to="/historique/$id"
                    params={{ id: result.id }}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:bg-surface-2"
                  >
                    Noter les résultats de ce match
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </Link>
                )}
              </>
            )}

            {!analysis && !!history.data?.length && (
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                {history.data.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    to="/historique/$id"
                    params={{ id: p.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-3 py-2.5 last:border-0 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {p.home_team} — {p.away_team}
                      </p>
                      <p className="label-xs truncate">{p.competition}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
