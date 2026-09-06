export interface SafetyAnalysisResult {
  hazard: string;
  failed_barrier: string;
  evidence_quote: string;
  sif_score: number;
  raw?: Record<string, unknown>;
}

export interface OllamaHealthStatus {
  online: boolean;
  version?: string;
  model: string;
  targetModelFound: boolean;
  availableModels: string[];
  error?: string;
}

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "safety-phi3";

/**
 * Checks connection to local Ollama instance and verifies the safety model is available.
 */
export async function checkOllamaStatus(): Promise<OllamaHealthStatus> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        online: false,
        model: OLLAMA_MODEL,
        targetModelFound: false,
        availableModels: [],
        error: `Ollama service returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    const availableModels: string[] = (data.models || []).map(
      (m: { name: string }) => m.name
    );

    const targetModelFound = availableModels.some(
      (name) =>
        name === OLLAMA_MODEL ||
        name.startsWith(`${OLLAMA_MODEL}:`) ||
        name.includes(OLLAMA_MODEL)
    );

    return {
      online: true,
      model: OLLAMA_MODEL,
      targetModelFound,
      availableModels,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unable to reach Ollama service";
    return {
      online: false,
      model: OLLAMA_MODEL,
      targetModelFound: false,
      availableModels: [],
      error: `Could not connect to Ollama at ${OLLAMA_BASE_URL}. Ensure Ollama is running (ollama serve). Details: ${errorMessage}`,
    };
  }
}

/**
 * Sends a safety observation to the fine-tuned Ollama model and returns structured JSON.
 */
export async function analyzeSafetyObservation(
  observation: string
): Promise<SafetyAnalysisResult> {
  const trimmed = observation?.trim();
  if (!trimmed) {
    throw new Error("Observation text is required.");
  }

  const endpoint = `${OLLAMA_BASE_URL}/api/generate`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: trimmed,
        stream: false,
        format: "json",
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to communicate with Ollama at ${endpoint}. Please ensure Ollama is running. (${msg})`
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Ollama error (HTTP ${response.status}): ${errText || response.statusText}`
    );
  }

  const data = await response.json();
  const rawContent = data.response;

  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Received empty or invalid response from Ollama model.");
  }

  // Sanitize potential markdown code block wraps (```json ... ```)
  const cleaned = rawContent
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse model output as JSON. Raw output: "${rawContent}"`
    );
  }

  // Fuzzy key resolver to handle minor key typos from smaller LLMs (e.g. siif_score, sif_score, hazard)
  const findValue = (possibleKeys: string[]): unknown => {
    for (const key of possibleKeys) {
      if (parsed[key] !== undefined) return parsed[key];
    }
    const allKeys = Object.keys(parsed);
    for (const candidate of possibleKeys) {
      const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z]/g, "");
      const match = allKeys.find(
        (k) => k.toLowerCase().replace(/[^a-z]/g, "") === normalizedCandidate
      );
      if (match) return parsed[match];
    }
    return undefined;
  };

  const rawHazard = findValue(["hazard", "hazards", "primary_hazard"]);
  const rawBarrier = findValue(["failed_barrier", "failed_barriers", "barrier", "barriers"]);
  const rawQuote = findValue(["evidence_quote", "evidence", "quote", "evidencequote"]);

  let rawScore = findValue([
    "sif_score",
    "siif_score",
    "si_score",
    "sf_score",
    "sifscore",
    "score",
  ]);

  if (rawScore === undefined) {
    const scoreKey = Object.keys(parsed).find((k) =>
      k.toLowerCase().includes("score")
    );
    if (scoreKey) {
      rawScore = parsed[scoreKey];
    }
  }

  const hazard = typeof rawHazard === "string" ? rawHazard : String(rawHazard ?? "");
  const failed_barrier =
    typeof rawBarrier === "string" ? rawBarrier : String(rawBarrier ?? "");
  const evidence_quote =
    typeof rawQuote === "string" ? rawQuote : String(rawQuote ?? "");

  const sif_score =
    typeof rawScore === "number"
      ? rawScore
      : !isNaN(Number(rawScore))
      ? Number(rawScore)
      : 0;

  return {
    hazard: hazard.trim(),
    failed_barrier: failed_barrier.trim(),
    evidence_quote: evidence_quote.trim(),
    sif_score,
    raw: parsed,
  };
}

/**
 * Asks the local safety-phi3 model for 3 actionable field corrective actions and barrier restoration tips.
 */
export async function generateHseSuggestions(
  hazard?: string,
  failedBarrier?: string,
  observation?: string
): Promise<string[]> {
  const defaultTips = getFallbackSuggestions(hazard, failedBarrier);

  try {
    const prompt = `<|user|>
You are an expert Senior HSE Rig Safety Superintendent for OIL India Limited.
A safety breach occurred:
Hazard: ${hazard || "Oilfield Operational Hazard"}
Breached Barrier: ${failedBarrier || "Safety Barrier Control"}
Observation: ${observation || "Unsafe condition observed on site."}

List 3 immediate, concise, bulletproof field corrective action tips for the manager:
1.
2.
3.
<|end|>
<|assistant|>
1.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        raw: true,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const rawText = "1." + (data.response || "");
      const lines = rawText
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      const parsedSteps: string[] = [];
      for (const line of lines) {
        const cleaned = line.replace(/^(\d+[\.\)]|\-|\*|Step\s*\d+:?)\s*/i, "").trim();
        if (cleaned.length > 10) {
          parsedSteps.push(cleaned);
        }
      }

      if (parsedSteps.length >= 2) {
        return parsedSteps.slice(0, 3);
      }
    }
  } catch (e) {
    console.warn("Ollama suggestion generation failed, using safety rule fallback:", e);
  }

  return defaultTips;
}

function getFallbackSuggestions(hazard?: string, barrier?: string): string[] {
  const combined = `${hazard || ""} ${barrier || ""}`.toLowerCase();

  if (
    combined.includes("height") ||
    combined.includes("fall") ||
    combined.includes("harness") ||
    combined.includes("derrick")
  ) {
    return [
      "Issue immediate Stop Work Order on derrick/elevated area until 100% tie-off compliance and static anchor lines are re-certified.",
      "Conduct immediate physical pull-test and harness web integrity audit for all crew working above 1.8 meters.",
      "Convene mandatory Stand-Down Tool Box Talk with drilling crew on IOGP Life-Saving Rule #3 (Working at Height) before work resumption.",
    ];
  }

  if (
    combined.includes("gas") ||
    combined.includes("h2s") ||
    combined.includes("vapor") ||
    combined.includes("sensor")
  ) {
    return [
      "Evacuate non-essential personnel upwind to designated muster point and verify fixed detector loop telemetry with central control room.",
      "Deploy portable multi-gas detector survey to establish 10 ppm H2S exclusion zone prior to manual maintenance authorization.",
      "Require Type-C positive pressure SCBA apparatus for entry and verify calibration certificates of gas detection instrumentation.",
    ];
  }

  if (
    combined.includes("lift") ||
    combined.includes("crane") ||
    combined.includes("sling") ||
    combined.includes("rigging")
  ) {
    return [
      "Immediately ground suspended load and barricade 1.5x crane swing drop-zone with high-visibility safety tape.",
      "Perform thorough visual inspection on wire rope slings, shackles, and load hooks for elongation, kinks, or missing safety latches.",
      "Re-verify Critical Lift Plan calculation sheet and ensure banksman / rigger certification is current before any further lift.",
    ];
  }

  if (
    combined.includes("loto") ||
    combined.includes("isolation") ||
    combined.includes("electric") ||
    combined.includes("pressure")
  ) {
    return [
      "Apply positive physical isolation (Double Block and Bleed + Red Padlock LOTO) at primary upstream valves.",
      "Verify zero stored energy (depressurization gauge check and electrical zero volt verification) before opening system.",
      "Audit Permit to Work (PTW) cross-signatures between operations custodian and performing authority.",
    ];
  }

  return [
    "Issue immediate Stop Work Authority to halt unsafe operational conditions and clear personnel from line of fire.",
    "Perform physical barrier audit to re-establish primary and secondary defense layers according to IOGP safety protocols.",
    "Log safety intervention in OIL India HSE registry and conduct pre-job safety debrief before clearing work permit.",
  ];
}

