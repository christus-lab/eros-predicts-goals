import type { ErosAnalysis } from "./eros.functions";

export type LiveInput = {
  competition: string;
  homeTeam: string;
  awayTeam: string;
  teamStats: string;
  minute: string;
  scoreHome: string;
  scoreAway: string;
  cornersHome: string;
  cornersAway: string;
  yellowHome: string;
  yellowAway: string;
  redHome: string;
  redAway: string;
  possHome: string;
  possAway: string;
  shotsOnHome: string;
  shotsOnAway: string;
  shotsOffHome: string;
  shotsOffAway: string;
  liveNotes: string;
};

const SYSTEM = `Tu es Eros-V1 LIVE, moteur d'analyse football EN DIRECT. Ta mission unique: PROTEGER ET OPTIMISER LE BANKROLL de l'utilisateur. Tu ne gonfles JAMAIS tes predictions: tu ne retiens qu'un marche ou la valeur est reelle, sinon tu dis NO BET.

Regles live absolues:
- Tu raisonnes en TEMPS RESTANT: minute actuelle, score actuel, rythme constate (buts/corners/cartons/tirs par minute), fatigue, cartons, momentum (possession et tirs cadres recents), contexte tactique (equipe menee qui pousse, equipe qui gere, bloc bas).
- Tout marche deja tranche est EXCLU (ex: si la mi-temps est jouee, plus de marche HT sauf 2e mi-temps). Tu proposes uniquement des marches encore ouverts: FT restant, 2e mi-temps, prochain but, over/under buts FT (en tenant compte des buts DEJA marques), over/under corners FT et restants, cartons, BTTS encore possible, handicaps live, resultat final, marge de victoire, equipe qui marque le prochain but, etc.
- Chaque libelle de marche est prefixe par la periode: "FT —", "2e MT —", "PROCHAIN BUT —", "RESTANT —".
- Les probabilites doivent etre calibrees et coherentes (1X2 live ~100%). Prudence: plus la minute est avancee et le match verrouille, plus tu baisses la confiance ou tu passes en NO BET.
- Mises: "0 (no bet)", "0.5% bankroll", "1% bankroll", "2% bankroll", max "3% bankroll" pour les convictions les plus solides.

Tu reponds STRICTEMENT en JSON valide (aucun texte hors JSON, aucun markdown):
{
  "match": string,
  "competition": string,
  "summary": string (lecture live detaillee en francais, 6 a 10 phrases),
  "risk_level": "faible" | "moyen" | "eleve",
  "global_confidence": number (0-100),
  "best_bets": [ { "market": string, "pick": string, "probability": number, "confidence": number, "stake": string, "reasoning": string } ],
  "markets": [ { "market": string, "pick": string, "probability": number, "confidence": number, "stake": string, "reasoning": string } ],
  "avoid": [string],
  "score_predictions": { "ht": string, "ft": string },
  "bankroll_advice": string,
  "key_factors": [string]
}
"markets" contient au moins 14 marches encore ouverts. "best_bets" contient 0 a 3 selections maximum (tableau vide = NO BET). "score_predictions.ht" = score de mi-temps (reel s'il est deja connu), "ft" = score final projete.`;

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Reponse IA illisible");
  }
}

function pair(label: string, home: string, away: string) {
  if (!home && !away) return "";
  return `${label}: ${home || "?"} - ${away || "?"}`;
}

export function buildLivePrompt(d: LiveInput, memory: string) {
  const stats = [
    pair("Score actuel", d.scoreHome, d.scoreAway),
    pair("Corners", d.cornersHome, d.cornersAway),
    pair("Cartons jaunes", d.yellowHome, d.yellowAway),
    pair("Cartons rouges", d.redHome, d.redAway),
    pair("Possession (%)", d.possHome, d.possAway),
    pair("Tirs cadres", d.shotsOnHome, d.shotsOnAway),
    pair("Tirs non cadres", d.shotsOffHome, d.shotsOffAway),
  ]
    .filter(Boolean)
    .join("\n");

  return `COMPETITION: ${d.competition}
MATCH EN COURS: ${d.homeTeam} (domicile) vs ${d.awayTeam} (exterieur)
MINUTE DE JEU: ${d.minute || "?"}'

STATS D'AVANT-MATCH / SAISON DES DEUX EQUIPES (fournies par l'utilisateur):
"""
${d.teamStats || "Non fournies : baisse la confiance en consequence."}
"""

STATISTIQUES DU MATCH EN COURS (format domicile - exterieur):
${stats || "Non fournies"}

AUTRES ELEMENTS DEJA OBSERVES DANS LE MATCH (buts, minutes, blessures, remplacements, penaltys, momentum, arbitrage, meteo, cotes live...):
"""
${d.liveNotes || "Non fournis"}
"""

${memory}

Analyse ce match EN DIRECT a la minute ${d.minute || "?"} et rends le JSON demande. N'inclus aucun marche deja tranche.`;
}

export async function runLiveAnalysis(d: LiveInput) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Cle IA manquante");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: lessons } = await supabaseAdmin
    .from("learning_notes")
    .select("topic, lesson, weight")
    .order("weight", { ascending: false })
    .limit(25);

  const memory = lessons?.length
    ? `LECONS APPRISES (memoire d'auto-apprentissage, a respecter):\n${lessons
        .map((l) => `- [${l.topic}] (poids ${l.weight}) ${l.lesson}`)
        .join("\n")}`
    : "";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildLivePrompt(d, memory) },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de requetes atteinte, reessaie dans un instant.");
    if (res.status === 402) throw new Error("Credits IA epuises.");
    throw new Error(`Erreur moteur IA (${res.status}) ${detail.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") content += delta;
      } catch {
        /* fragment SSE incomplet */
      }
    }
  }

  if (!content.trim()) throw new Error("Le moteur IA n'a renvoye aucune analyse.");
  const analysis = extractJson(content) as ErosAnalysis;

  const rawInput = buildLivePrompt(d, "");

  const { data: saved } = await supabaseAdmin
    .from("predictions")
    .insert({
      competition: `LIVE · ${d.competition}`,
      home_team: d.homeTeam,
      away_team: d.awayTeam,
      raw_input: rawInput,
      analysis: analysis as never,
      confidence: Math.round(Number(analysis.global_confidence) || 0),
    })
    .select("id")
    .single();

  return { id: saved?.id ?? null, analysis };
}
