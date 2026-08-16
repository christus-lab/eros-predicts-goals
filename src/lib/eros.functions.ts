import { createServerFn } from "@tanstack/react-start";

export type Market = {
  market: string;
  pick: string;
  probability: number;
  confidence: number;
  stake: string;
  reasoning: string;
};

export type ErosAnalysis = {
  match: string;
  competition: string;
  summary: string;
  risk_level: string;
  global_confidence: number;
  best_bets: Market[];
  markets: Market[];
  avoid: string[];
  score_predictions: { ht: string; ft: string };
  bankroll_advice: string;
  key_factors: string[];
};

const SYSTEM = `Tu es Eros-V1, un moteur d'analyse et de prediction football professionnel dont l'UNIQUE mission est de PROTEGER LE BANKROLL de l'utilisateur (reduction des pertes avant recherche de gain).

Regles absolues:
- Tu n'es pas la pour briller: tu ne proposes QUE des marches ou tu detectes une reelle valeur/fiabilite. Si rien n'est fiable, tu le dis clairement (NO BET) et tu expliques pourquoi.
- OBLIGATION ABSOLUE: chaque analyse doit couvrir la MI-TEMPS (HT) **et** le TEMPS PLEIN (FT), et la liste complete des marches disponibles chez les bookmakers, a savoir au minimum: 1X2 FT, 1X2 HT, double chance FT, double chance HT, mi-temps/fin de match (HT/FT combine), BTTS FT, BTTS HT, BTTS 2e mi-temps, Over/Under buts FT (0.5/1.5/2.5/3.5), Over/Under buts HT (0.5/1.5/2.5), buts par equipe (domicile et exterieur, HT et FT), equipe qui marque en premier, mi-temps la plus prolifique, handicap asiatique, handicap europeen, pair/impair buts, score exact HT, score exact FT, marge de victoire, corners (total FT/HT, par equipe, over/under, pair/impair, 1er corner), cartons jaunes/rouges (total, par equipe, over/under), fautes (total et par equipe), touches (throw-ins total et par equipe), hors-jeu, tirs et tirs cadres (total et par equipe), penalty accorde, carton rouge, temps du 1er but, equipe qui gagne les deux mi-temps, but dans les deux mi-temps.
- Chaque entree de "markets" doit indiquer explicitement la periode dans son libelle: prefixe "HT —" ou "FT —" (ou "2e MT —"). Aucun marche ambigu.
- Tu adaptes TOUT a la realite du championnat indique (rythme, arbitrage, moyenne de cartons/corners/fautes de la ligue, meteo, style de jeu, enjeux, calendrier, amicaux = fiabilite reduite).
- Tu utilises les statistiques, formes, confrontations directes, Elo et toute information fournie par l'utilisateur comme source prioritaire. Si une donnee manque, tu raisonnes par bases connues de la competition et tu SIGNALES l'incertitude en baissant la confiance.
- Chaque probabilite doit etre coherente (ex: 1X2 doit sommer ~100%). Pas de probabilite gonflee. Sois calibre et conservateur.
- Mise conseillee: "0 (no bet)", "0.5% bankroll", "1% bankroll", "2% bankroll", max "3% bankroll" reserve aux convictions les plus solides.

Tu reponds STRICTEMENT en JSON valide (aucun texte hors JSON, aucun bloc markdown) selon ce schema:
{
  "match": string,
  "competition": string,
  "summary": string (analyse detaillee en francais, 6 a 12 phrases),
  "risk_level": "faible" | "moyen" | "eleve",
  "global_confidence": number (0-100),
  "best_bets": [ { "market": string, "pick": string, "probability": number, "confidence": number, "stake": string, "reasoning": string } ],
  "markets": [ { "market": string, "pick": string, "probability": number, "confidence": number, "stake": string, "reasoning": string } ],
  "avoid": [string],
  "score_predictions": { "ht": string, "ft": string },
  "bankroll_advice": string,
  "key_factors": [string]
}
"markets" doit couvrir au moins 26 marches differents, avec OBLIGATOIREMENT au moins 8 marches de mi-temps (HT) et au moins 12 marches de temps plein (FT), plus les marches annexes (corners, cartons, fautes, touches, hors-jeu, tirs). "best_bets" contient 1 a 4 selections seulement (les plus rentables/fiables), ou un tableau vide si aucun pari n'est justifie. "score_predictions" doit toujours contenir un score HT et un score FT coherents entre eux.`;

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
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Reponse IA illisible");
  }
}

const GEMINI_MODEL = "gemini-3.6-flash";

function getGeminiKey(): string {
  const apiKey = process.env["GEMINI_API_KEY"] || process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Cle IA manquante");
  return apiKey;
}

export const predictMatch = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      competition: string;
      homeTeam: string;
      awayTeam: string;
      details: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = getGeminiKey();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Auto-apprentissage : on injecte les lecons tirees des predictions passees.
    const { data: lessons } = await supabaseAdmin
      .from("learning_notes")
      .select("topic, lesson, weight")
      .order("weight", { ascending: false })
      .limit(25);

    const { data: past } = await supabaseAdmin
      .from("predictions")
      .select("competition, home_team, away_team, confidence, actual_result, was_correct, feedback")
      .not("was_correct", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);

    const memory = [
      lessons?.length
        ? `LECONS APPRISES (memoire d'auto-apprentissage, a respecter):\n${lessons
            .map((l) => `- [${l.topic}] (poids ${l.weight}) ${l.lesson}`)
            .join("\n")}`
        : "",
      past?.length
        ? `HISTORIQUE VERIFIE (calibre-toi dessus):\n${past
            .map(
              (p) =>
                `- ${p.competition} | ${p.home_team} vs ${p.away_team} | confiance ${p.confidence ?? "?"} | resultat: ${p.actual_result ?? "?"} | pronostic ${p.was_correct ? "REUSSI" : "RATE"}${p.feedback ? ` | note: ${p.feedback}` : ""}`,
            )
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const userPrompt = `COMPETITION / CHAMPIONNAT: ${data.competition}
MATCH: ${data.homeTeam} (domicile) vs ${data.awayTeam} (exterieur)

DONNEES FOURNIES PAR L'UTILISATEUR (stats, formes, confrontations, Elo, blessures, meteo, enjeux, cotes...):
"""
${data.details || "Aucune donnee fournie : base-toi sur les realites connues de cette competition et baisse la confiance en consequence."}
"""

${memory}

Analyse ce match en profondeur et rends le JSON demande.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        }),
      },
    );

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Limite de requetes atteinte, reessaie dans un instant.");
      if (res.status === 401 || res.status === 403)
        throw new Error("Cle IA Gemini invalide ou refusee.");
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
        if (!payload) continue;
        try {
          const parsed = JSON.parse(payload);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text === "string") content += text;
        } catch {
          /* fragment SSE incomplet */
        }
      }
    }

    if (!content.trim()) throw new Error("Le moteur IA n'a renvoye aucune analyse.");

    const analysis = extractJson(content) as ErosAnalysis;

    const { data: saved } = await supabaseAdmin
      .from("predictions")
      .insert({
        competition: data.competition,
        home_team: data.homeTeam,
        away_team: data.awayTeam,
        raw_input: data.details,
        analysis: analysis as never,
        confidence: Math.round(Number(analysis.global_confidence) || 0),
      })
      .select("id")
      .single();

    return { id: saved?.id ?? null, analysis };
  });

export const listPredictions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("predictions")
    .select("id, competition, home_team, away_team, confidence, actual_result, was_correct, created_at, analysis")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
});

async function callGeminiOnce(apiKey: string, system: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) return "";
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export const submitOutcome = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; actualResult: string; wasCorrect: boolean; feedback?: string }) => input,
  )
  .handler(async ({ data }) => {
    let apiKey: string | null = null;
    try {
      apiKey = getGeminiKey();
    } catch {
      apiKey = null;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("predictions")
      .select("competition, home_team, away_team, raw_input, analysis")
      .eq("id", data.id)
      .single();

    await supabaseAdmin
      .from("predictions")
      .update({
        actual_result: data.actualResult,
        was_correct: data.wasCorrect,
        feedback: data.feedback ?? null,
      })
      .eq("id", data.id);

    // Le bot transforme le retour en lecon reutilisable (auto-apprentissage).
    if (apiKey && row) {
      try {
        const text = await callGeminiOnce(
          apiKey,
          'Tu es le module d apprentissage d Eros-V1. A partir d une prediction et de son resultat reel, produis UNE lecon actionnable pour ameliorer les futures predictions et proteger le bankroll. Reponds en JSON strict: {"topic": string court, "lesson": string (1-3 phrases, francais), "weight": number 1-5}.',
          `Competition: ${row.competition}\nMatch: ${row.home_team} vs ${row.away_team}\nDonnees: ${String(row.raw_input).slice(0, 3000)}\nPrediction: ${JSON.stringify(row.analysis).slice(0, 4000)}\nResultat reel: ${data.actualResult}\nPronostic ${data.wasCorrect ? "reussi" : "rate"}\nCommentaire: ${data.feedback ?? "-"}`,
        );
        const lesson = extractJson(text) as { topic: string; lesson: string; weight: number };
        if (lesson?.lesson) {
          await supabaseAdmin.from("learning_notes").insert({
            topic: String(lesson.topic ?? "general").slice(0, 80),
            lesson: String(lesson.lesson).slice(0, 800),
            weight: Math.min(5, Math.max(1, Math.round(Number(lesson.weight) || 1))),
          });
        }
      } catch {
        /* l apprentissage ne doit jamais bloquer l enregistrement du resultat */
      }
    }

    return { ok: true };
  });

export const getPrediction = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("predictions")
      .select(
        "id, competition, home_team, away_team, confidence, actual_result, was_correct, created_at, analysis, raw_input",
      )
      .eq("id", data.id)
      .single();
    const { data: results } = await supabaseAdmin
      .from("market_results")
      .select("id, market, pick, actual_result, was_correct")
      .eq("prediction_id", data.id);
    return { prediction: row ?? null, results: results ?? [] };
  });

export const listMarketResults = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("market_results")
    .select("prediction_id, was_correct")
    .limit(2000);
  return data ?? [];
});

export const saveMarketResult = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      predictionId: string;
      market: string;
      pick: string;
      actualResult: string;
      wasCorrect: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("market_results")
      .upsert(
        {
          prediction_id: data.predictionId,
          market: data.market,
          pick: data.pick,
          actual_result: data.actualResult || null,
          was_correct: data.wasCorrect,
        },
        { onConflict: "prediction_id,market" },
      );

    let apiKey: string | null = null;
    try {
      apiKey = getGeminiKey();
    } catch {
      apiKey = null;
    }
    const { data: row } = await supabaseAdmin
      .from("predictions")
      .select("competition, home_team, away_team")
      .eq("id", data.predictionId)
      .single();

    if (apiKey && row) {
      try {
        const text = await callGeminiOnce(
          apiKey,
          'Tu es le module d apprentissage d Eros-V1. A partir d un marche predit et de son resultat reel, produis UNE lecon actionnable pour mieux calibrer ce type de marche et proteger le bankroll. Reponds en JSON strict: {"topic": string court, "lesson": string (1-2 phrases, francais), "weight": number 1-5}.',
          `Competition: ${row.competition}\nMatch: ${row.home_team} vs ${row.away_team}\nMarche: ${data.market}\nPronostic: ${data.pick}\nResultat reel: ${data.actualResult || "non precise"}\nPronostic ${data.wasCorrect ? "reussi" : "rate"}`,
        );
        const lesson = extractJson(text) as {
          topic: string;
          lesson: string;
          weight: number;
        };
        if (lesson?.lesson) {
          await supabaseAdmin.from("learning_notes").insert({
            topic: String(lesson.topic ?? "marche").slice(0, 80),
            lesson: String(lesson.lesson).slice(0, 800),
            weight: Math.min(5, Math.max(1, Math.round(Number(lesson.weight) || 1))),
          });
        }
      } catch {
        /* l apprentissage ne bloque jamais l enregistrement */
      }
    }

    return { ok: true };
  });
                                                              
