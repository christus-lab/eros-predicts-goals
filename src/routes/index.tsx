import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  BrainCircuit,
  Check,
  ChevronDown,
  Loader2,
  ShieldCheck,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

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
import { MarketCard } from "@/components/eros/MarketCard";
import { COMPETITION_GROUPS, OTHER_COMPETITION } from "@/lib/competitions";
import { listPredictions, predictMatch, submitOutcome, type ErosAnalysis } from "@/lib/eros.functions";

import heroImage from "@/assets/eros-hero.jpg";
import logo from "@/assets/eros-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eros-V1 — Moteur de prédiction football & protection de bankroll" },
      {
        name: "description",
        content:
          "Eros-V1 analyse vos stats (formes, Elo, corners, cartons, fautes) sur tous les marchés football et ne conseille que les paris réellement rentables.",
      },
      { property: "og:title", content: "Eros-V1 — Prédiction football ultra fiable" },
      {
        property: "og:description",
        content:
          "Analyse multi-marchés (1X2, BTTS, HT/FT, corners, cartons, handicaps) avec auto-apprentissage pour réduire les pertes de bankroll.",
      },
    ],
  }),
  component: Index,
});

const PLACEHOLDER = `Collez ici TOUT ce que vous avez (aucune limite de caractères) :

• Forme récente domicile / extérieur (5-10 derniers matchs, scores)
• Classement, points, dynamique, série en cours
• Confrontations directes (H2H)
• Elo domicile / Elo extérieur, xG, xGA
• Buts marqués / encaissés HT et FT, moyennes par équipe
• Corners, cartons jaunes/rouges, fautes, touches, hors-jeu (moyennes équipe + ligue)
• Blessures, suspensions, absences clés, rotation, enjeu du match
• Arbitre, météo, terrain, voyage, calendrier européen
• Cotes disponibles par marché (si vous les avez)`;

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
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
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [outcome, setOutcome] = useState("");

  const queryClient = useQueryClient();
  const predict = useServerFn(predictMatch);
  const sendOutcome = useServerFn(submitOutcome);
  const fetchHistory = useServerFn(listPredictions);

  const history = useQuery({ queryKey: ["predictions"], queryFn: () => fetchHistory({}) });

  const mutation = useMutation({
    mutationFn: () =>
      predict({ data: { competition, homeTeam, awayTeam, details } }),
    onSuccess: (data) => {
      setResult(data);
      setShowAllMarkets(false);
      void queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Analyse Eros-V1 terminée");
    },
    onError: (error: Error) => toast.error(error.message || "Analyse impossible"),
  });

  const outcomeMutation = useMutation({
    mutationFn: (wasCorrect: boolean) =>
      sendOutcome({
        data: {
          id: result?.id ?? "",
          actualResult: outcome || "non précisé",
          wasCorrect,
        },
      }),
    onSuccess: () => {
      setOutcome("");
      void queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast.success("Résultat enregistré : Eros-V1 a appris de ce match.");
    },
    onError: () => toast.error("Enregistrement impossible"),
  });

  const analysis = result?.analysis;
  const verified = (history.data ?? []).filter((p) => p.was_correct !== null);
  const hitRate = verified.length
    ? Math.round((verified.filter((p) => p.was_correct).length / verified.length) * 100)
    : null;

  const canSubmit = competition.trim() && homeTeam.trim() && awayTeam.trim() && !mutation.isPending;

  return (
    <main className="min-h-screen bg-background">
      <Toaster />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroImage}
          alt="Stade de football illuminé la nuit avec superposition de données statistiques"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-pitch" />
        <div className="absolute inset-0 grid-lines opacity-30" />

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo Eros-V1" width={816} height={816} className="h-11 w-11" />
            <div>
              <p className="font-display text-xl font-bold tracking-tight text-foreground">EROS-V1</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
                Football prediction engine
              </p>
            </div>
          </div>

          <h1 className="mt-10 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
            Le moteur qui protège <span className="text-gradient-value">votre bankroll</span> avant de
            chercher le gain.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Tous les marchés : 1X2, BTTS, HT/FT, buts par équipe, corners, cartons, fautes, touches,
            hors-jeu, handicaps. Toutes les compétitions, coupes, sélections et amicaux. Vous fournissez
            les stats et l'Elo, Eros-V1 calibre, filtre et ne garde que ce qui est réellement rentable.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            {["Analyse calibrée", "Auto-apprentissage", "Filtre anti-perte", "No-bet assumé"].map(
              (tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/80 px-3 py-1.5 text-foreground backdrop-blur"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  {tag}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Console */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="panel p-6">
            <h2 className="font-display text-xl font-semibold">Console d'analyse</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Indiquez le championnat pour que le bot s'aligne sur ses réalités, puis les deux équipes.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Championnat / Compétition
                </label>
                <Select
                  value={compSelect}
                  onValueChange={(v) => {
                    setCompSelect(v);
                    setCompetition(v === OTHER_COMPETITION ? "" : v);
                  }}
                >
                  <SelectTrigger className="mt-2 h-11 border-border bg-surface-2">
                    <SelectValue placeholder="Choisissez une compétition..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {COMPETITION_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.items.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    <SelectGroup>
                      <SelectLabel>Non listée</SelectLabel>
                      <SelectItem value={OTHER_COMPETITION}>Autre compétition (saisir)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {compSelect === OTHER_COMPETITION && (
                  <Input
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    placeholder="Ex : Coupe du Bénin, tournoi régional, championnat U23..."
                    className="mt-2 h-11 border-border bg-surface-2"
                  />
                )}
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Équipe à domicile
                  </label>
                  <Input
                    value={homeTeam}
                    onChange={(e) => setHomeTeam(e.target.value)}
                    placeholder="Ex : Bayern Munich"
                    className="mt-2 h-11 border-border bg-surface-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Équipe à l'extérieur
                  </label>
                  <Input
                    value={awayTeam}
                    onChange={(e) => setAwayTeam(e.target.value)}
                    placeholder="Ex : Borussia Dortmund"
                    className="mt-2 h-11 border-border bg-surface-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Données du match — cadran unique, caractères illimités
                </label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={PLACEHOLDER}
                  className="mt-2 min-h-[320px] resize-y border-border bg-surface-2 font-sans text-sm leading-relaxed"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {details.length.toLocaleString("fr-FR")} caractères — plus vous en donnez, plus la
                  prédiction est fiable.
                </p>
              </div>

              <Button
                onClick={() => mutation.mutate()}
                disabled={!canSubmit}
                className="h-12 w-full bg-gradient-value font-display text-base font-semibold text-primary-foreground shadow-glow hover:opacity-90"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyse en cours…
                  </>
                ) : (
                  <>
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Lancer l'analyse Eros-V1
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel p-6">
              <h3 className="font-display text-lg font-semibold">Mémoire du bot</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat
                  label="Analyses"
                  value={String(history.data?.length ?? 0)}
                  icon={<Activity className="h-3.5 w-3.5" />}
                />
                <Stat
                  label="Taux de réussite"
                  value={hitRate === null ? "—" : `${hitRate}%`}
                  icon={<Target className="h-3.5 w-3.5" />}
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Chaque résultat que vous validez devient une leçon injectée dans les analyses suivantes :
                Eros-V1 se recalibre en continu sur vos championnats.
              </p>
            </div>

            <div className="panel p-6">
              <h3 className="font-display text-lg font-semibold">Historique</h3>
              <div className="mt-4 space-y-3">
                {(history.data ?? []).slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {p.home_team} — {p.away_team}
                      </span>
                      <span
                        className={
                          p.was_correct === null
                            ? "text-muted-foreground"
                            : p.was_correct
                              ? "text-success"
                              : "text-destructive"
                        }
                      >
                        {p.was_correct === null ? "en attente" : p.was_correct ? "réussi" : "raté"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.competition} · confiance {p.confidence ?? "—"}
                    </p>
                  </div>
                ))}
                {!history.data?.length && (
                  <p className="text-sm text-muted-foreground">Aucune analyse pour le moment.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Résultat */}
        {analysis && (
          <div className="mt-10 space-y-6">
            <div className="panel relative overflow-hidden p-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-value" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                    {analysis.competition}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{analysis.match}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Risque : <span className="text-foreground">{analysis.risk_level}</span> · Score HT{" "}
                    <span className="text-foreground">{analysis.score_predictions?.ht}</span> · Score FT{" "}
                    <span className="text-foreground">{analysis.score_predictions?.ft}</span>
                  </p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-surface-2 px-5 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Confiance globale
                  </p>
                  <p className="font-display text-3xl font-bold text-gradient-value">
                    {Math.round(Number(analysis.global_confidence) || 0)}%
                  </p>
                </div>
              </div>

              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {analysis.summary}
              </p>

              <div className="mt-5 rounded-xl border border-gold/30 bg-surface-2 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                  Gestion de bankroll
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                  {analysis.bankroll_advice}
                </p>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" />
                Sélections rentables
              </h3>
              {analysis.best_bets?.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {analysis.best_bets.map((m, i) => (
                    <MarketCard key={`${m.market}-${i}`} market={m} highlight />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-destructive/40 bg-surface p-4 text-sm text-foreground">
                  Aucun pari justifié sur ce match — Eros-V1 recommande de passer (NO BET) pour protéger
                  votre bankroll.
                </p>
              )}
            </div>

            {!!analysis.markets?.length && (
              <div>
                <button
                  onClick={() => setShowAllMarkets((v) => !v)}
                  className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"
                >
                  Tous les marchés analysés ({analysis.markets.length})
                  <ChevronDown
                    className={`h-5 w-5 text-primary transition-transform ${showAllMarkets ? "rotate-180" : ""}`}
                  />
                </button>
                {showAllMarkets && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analysis.markets.map((m, i) => (
                      <MarketCard key={`${m.market}-all-${i}`} market={m} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {!!analysis.key_factors?.length && (
                <div className="panel p-6">
                  <h3 className="font-display text-lg font-semibold">Facteurs clés</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {analysis.key_factors.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!analysis.avoid?.length && (
                <div className="panel p-6">
                  <h3 className="font-display text-lg font-semibold">Marchés à éviter</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {analysis.avoid.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {result?.id && (
              <div className="panel p-6">
                <h3 className="font-display text-lg font-semibold">Apprentissage : résultat réel</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Une fois le match terminé, renseignez le score/résultat. Eros-V1 en tire une leçon
                  permanente.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="Ex : 2-1, 7 corners, 3 cartons, BTTS oui"
                    className="h-11 border-border bg-surface-2"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => outcomeMutation.mutate(true)}
                      disabled={outcomeMutation.isPending}
                      className="h-11 bg-success font-medium text-success-foreground hover:opacity-90"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Réussi
                    </Button>
                    <Button
                      onClick={() => outcomeMutation.mutate(false)}
                      disabled={outcomeMutation.isPending}
                      variant="outline"
                      className="h-11 border-destructive/50 font-medium text-foreground hover:bg-accent"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Raté
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Eros-V1 — analyse statistique à but informatif. Jouez de manière responsable.
      </footer>
    </main>
  );
}
