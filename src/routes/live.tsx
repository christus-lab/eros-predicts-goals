import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Loader2, Radio } from "lucide-react";

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
import { predictLive } from "@/lib/eros-live.functions";
import type { ErosAnalysis } from "@/lib/eros.functions";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live — Eros-V1 analyse de matchs en direct" },
      {
        name: "description",
        content:
          "Renseignez minute, score, corners, cartons, possession et tirs : Eros-V1 recalibre les marchés live encore ouverts pour protéger votre bankroll.",
      },
      { property: "og:title", content: "Eros-V1 Live — prédictions en cours de match" },
      {
        property: "og:description",
        content: "Analyse live calibrée sur le temps restant, le rythme et le momentum réel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-xs">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const inputCls = "h-10 border-border bg-surface-2 text-sm";

function DuoStat({
  label,
  home,
  away,
  onHome,
  onAway,
}: {
  label: string;
  home: string;
  away: string;
  onHome: (v: string) => void;
  onAway: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <Input
        inputMode="numeric"
        value={home}
        onChange={(e) => onHome(e.target.value)}
        placeholder="Dom"
        className="num h-9 border-border bg-surface-2 px-2 text-center text-sm"
      />
      <Input
        inputMode="numeric"
        value={away}
        onChange={(e) => onAway(e.target.value)}
        placeholder="Ext"
        className="num h-9 border-border bg-surface-2 px-2 text-center text-sm"
      />
    </div>
  );
}

function LivePage() {
  const [competition, setCompetition] = useState("");
  const [compSelect, setCompSelect] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [teamStats, setTeamStats] = useState("");
  const [minute, setMinute] = useState("");
  const [s, setS] = useState({
    scoreHome: "",
    scoreAway: "",
    cornersHome: "",
    cornersAway: "",
    yellowHome: "",
    yellowAway: "",
    redHome: "",
    redAway: "",
    possHome: "",
    possAway: "",
    shotsOnHome: "",
    shotsOnAway: "",
    shotsOffHome: "",
    shotsOffAway: "",
  });
  const [liveNotes, setLiveNotes] = useState("");
  const [result, setResult] = useState<{ id: string | null; analysis: ErosAnalysis } | null>(null);

  const set = (k: keyof typeof s) => (v: string) => setS((p) => ({ ...p, [k]: v }));

  const run = useServerFn(predictLive);
  const mutation = useMutation({
    mutationFn: () =>
      run({
        data: { competition, homeTeam, awayTeam, teamStats, minute, liveNotes, ...s },
      }),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Analyse live terminée");
    },
    onError: (e: Error) => toast.error(e.message || "Analyse impossible"),
  });

  const analysis = result?.analysis;
  const canSubmit =
    competition.trim() && homeTeam.trim() && awayTeam.trim() && minute.trim() && !mutation.isPending;

  return (
    <main className="min-h-screen bg-background">
      <TopBar />
      <Toaster />

      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Analyse en direct · marchés encore ouverts uniquement
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="panel space-y-3.5 p-4">
            <Field label="Compétition">
              <Select
                value={compSelect}
                onValueChange={(v) => {
                  setCompSelect(v);
                  setCompetition(v === OTHER_COMPETITION ? "" : v);
                }}
              >
                <SelectTrigger className={inputCls}>
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
                  className={`mt-2 ${inputCls}`}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Domicile">
                <Input
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="Équipe A"
                  className={inputCls}
                />
              </Field>
              <Field label="Extérieur">
                <Input
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="Équipe B"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="1 · Stats des deux équipes (avant-match, formes, H2H, Elo…)">
              <Textarea
                value={teamStats}
                onChange={(e) => setTeamStats(e.target.value)}
                placeholder="Formes, buts HT/FT, corners, cartons, xG, absences, classement…"
                className="min-h-[130px] resize-y border-border bg-surface-2 text-sm leading-relaxed"
              />
            </Field>

            <Field label="2 · Minute de jeu">
              <Input
                inputMode="numeric"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                placeholder="ex. 63"
                className={`num ${inputCls}`}
              />
            </Field>

            <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
              <p className="label-xs">3 · Stats du match en cours (dom / ext)</p>
              <DuoStat label="Score" home={s.scoreHome} away={s.scoreAway} onHome={set("scoreHome")} onAway={set("scoreAway")} />
              <DuoStat label="Corners" home={s.cornersHome} away={s.cornersAway} onHome={set("cornersHome")} onAway={set("cornersAway")} />
              <DuoStat label="Cartons jaunes" home={s.yellowHome} away={s.yellowAway} onHome={set("yellowHome")} onAway={set("yellowAway")} />
              <DuoStat label="Cartons rouges" home={s.redHome} away={s.redAway} onHome={set("redHome")} onAway={set("redAway")} />
              <DuoStat label="Possession %" home={s.possHome} away={s.possAway} onHome={set("possHome")} onAway={set("possAway")} />
              <DuoStat label="Tirs cadrés" home={s.shotsOnHome} away={s.shotsOnAway} onHome={set("shotsOnHome")} onAway={set("shotsOnAway")} />
              <DuoStat label="Tirs non cadrés" home={s.shotsOffHome} away={s.shotsOffAway} onHome={set("shotsOffHome")} onAway={set("shotsOffAway")} />
            </div>

            <Field label="4 · Tout ce qui est déjà arrivé dans le match">
              <Textarea
                value={liveNotes}
                onChange={(e) => setLiveNotes(e.target.value)}
                placeholder="Buteurs et minutes, penalty, blessures, remplacements, momentum, arbitrage, météo, cotes live…"
                className="min-h-[130px] resize-y border-border bg-surface-2 text-sm leading-relaxed"
              />
            </Field>

            <Button
              onClick={() => mutation.mutate()}
              disabled={!canSubmit}
              className="h-10 w-full text-sm font-semibold"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Analyse live…
                </>
              ) : (
                <>
                  <Radio className="mr-2 h-3.5 w-3.5" />
                  Analyser le live
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {!analysis && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Le rapport live apparaîtra ici.
              </div>
            )}

            {analysis && (
              <>
                <div className="panel p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="label-xs truncate">{analysis.competition}</p>
                      <h1 className="truncate font-display text-lg font-semibold">{analysis.match}</h1>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span className="num rounded border border-primary/40 bg-surface-2 px-1.5 py-0.5 text-primary">
                          {minute}&apos; · {s.scoreHome || 0}-{s.scoreAway || 0}
                        </span>
                        <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                          FT proj. {analysis.score_predictions?.ft}
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
                  <p className="label-xs">Sélections live retenues</p>
                  <div className="mt-2 overflow-hidden rounded-xl border border-primary/30 bg-surface">
                    {analysis.best_bets?.length ? (
                      analysis.best_bets.map((m, i) => <MarketRow key={`${m.market}-${i}`} market={m} />)
                    ) : (
                      <p className="px-3 py-3 text-xs text-foreground">
                        NO BET — aucune valeur fiable à cette minute.
                      </p>
                    )}
                  </div>
                </div>

                {!!analysis.markets?.length && (
                  <div>
                    <p className="label-xs mb-2">Marchés ouverts ({analysis.markets.length})</p>
                    <MarketList markets={analysis.markets} />
                  </div>
                )}

                {result?.id && (
                  <Link
                    to="/historique/$id"
                    params={{ id: result.id }}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:bg-surface-2"
                  >
                    Noter les résultats de ce live
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
