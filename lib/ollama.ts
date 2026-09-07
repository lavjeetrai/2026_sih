export interface SafetyAnalysisResult {
  hazard: string;
  failed_barrier: string;
  evidence_quote: string;
  sif_score: number;
  raw?: Record<string, unknown>;
  // Extended fields from Modal fine-tuned SLM
  sif_potential?: boolean;
  iogp_life_saving_rule?: string;
  critical_barrier_failure?: boolean;
  failed_barrier_type?: string;
  operational_activity?: string;
  site_location?: string;
  engine?: "modal" | "ollama" | "fallback";
}

export interface OllamaHealthStatus {
  online: boolean;
  version?: string;
  model: string;
  targetModelFound: boolean;
  availableModels: string[];
  error?: string;
}

export interface ModalHealthStatus {
  online: boolean;
  url: string;
  modelName: string;
  error?: string;
}

export interface AiSystemStatus {
  online: boolean;
  activeEngine: "modal" | "ollama";
  preferredEngine: "auto" | "modal" | "ollama";
  environment: "vercel" | "production" | "local";
  modal: ModalHealthStatus;
  ollama: OllamaHealthStatus;
}

const MODAL_BASE_URL =
  process.env.MODAL_API_URL?.replace(/\/$/, "") ||
  "https://railavjeet897--oil-safety-classifier-sifclassifier-analy-8ffce8.modal.run";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "safety-phi3";

/**
 * Checks connection to local Ollama instance and verifies the safety model is available.
 */
export async function checkOllamaStatus(): Promise<OllamaHealthStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

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
      error: `Could not connect to Ollama at ${OLLAMA_BASE_URL}. (${errorMessage})`,
    };
  }
}

// In-memory response cache to prevent redundant Modal SLM token consumption
interface CachedInference {
  result: SafetyAnalysisResult;
  timestamp: number;
}
const MODAL_INFERENCE_CACHE = new Map<string, CachedInference>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour cache
const MAX_CACHE_ENTRIES = 500;

// Cached health check to avoid network chatter
let lastModalHealth: { status: ModalHealthStatus; timestamp: number } | null = null;
const HEALTH_CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Checks connection to the fine-tuned Modal Cloud SLM endpoint.
 * Cached for 60 seconds to avoid unnecessary network pings.
 */
export async function checkModalStatus(): Promise<ModalHealthStatus> {
  if (lastModalHealth && Date.now() - lastModalHealth.timestamp < HEALTH_CACHE_TTL_MS) {
    return lastModalHealth.status;
  }

  try {
    const controller = new AbortController();
    // 6s ping test
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(MODAL_BASE_URL, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    // FastAPI returns 405 Method Not Allowed for GET on POST-only endpoints,
    // which confirms the server and container are live and operational!
    if (res.ok || res.status === 405 || res.status === 200 || res.status === 400) {
      const status: ModalHealthStatus = {
        online: true,
        url: MODAL_BASE_URL,
        modelName: "Fine-Tuned SLM (Modal Cloud)",
      };
      lastModalHealth = { status, timestamp: Date.now() };
      return status;
    }

    const errorStatus: ModalHealthStatus = {
      online: false,
      url: MODAL_BASE_URL,
      modelName: "Fine-Tuned SLM (Modal Cloud)",
      error: `Modal returned HTTP ${res.status}: ${res.statusText}`,
    };
    lastModalHealth = { status: errorStatus, timestamp: Date.now() };
    return errorStatus;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unable to connect to Modal SLM";
    const errorStatus: ModalHealthStatus = {
      online: false,
      url: MODAL_BASE_URL,
      modelName: "Fine-Tuned SLM (Modal Cloud)",
      error: msg,
    };
    lastModalHealth = { status: errorStatus, timestamp: Date.now() };
    return errorStatus;
  }
}

/**
 * Returns overall AI system status across Modal and Ollama.
 */
export async function checkAiStatus(): Promise<AiSystemStatus> {
  const isVercel = Boolean(
    process.env.VERCEL ||
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      (process.env.NODE_ENV === "production" && !process.env.FORCE_LOCAL_OLLAMA)
  );

  const preferred = (process.env.AI_ENGINE || "auto").toLowerCase() as
    | "auto"
    | "modal"
    | "ollama";

  // In Vercel, don't waste time trying localhost Ollama since it does not exist
  const [modalStatus, ollamaStatus] = await Promise.all([
    checkModalStatus(),
    isVercel
      ? Promise.resolve({
          online: false,
          model: OLLAMA_MODEL,
          targetModelFound: false,
          availableModels: [],
          error: "Ollama not hosted in serverless cloud environment",
        })
      : checkOllamaStatus(),
  ]);

  let activeEngine: "modal" | "ollama" = "modal";
  if (preferred === "ollama" && ollamaStatus.online) {
    activeEngine = "ollama";
  } else if (preferred === "auto" && !isVercel && ollamaStatus.online) {
    activeEngine = "ollama";
  } else {
    activeEngine = "modal";
  }

  const online = activeEngine === "modal" ? modalStatus.online : ollamaStatus.online;

  return {
    online,
    activeEngine,
    preferredEngine: preferred,
    environment: isVercel ? "vercel" : process.env.NODE_ENV === "production" ? "production" : "local",
    modal: modalStatus,
    ollama: ollamaStatus,
  };
}

/**
 * Analyzes observation using the fine-tuned SLM deployed on Modal.
 * Optimized with in-memory caching and compressed single-key payloads to conserve tokens.
 */
export async function analyzeWithModal(
  observation: string
): Promise<SafetyAnalysisResult> {
  // 1. Normalize and compress whitespace to minimize token footprint
  const cleaned = observation
    ?.replace(/\s+/g, " ")
    ?.trim();

  if (!cleaned) {
    throw new Error("Observation text is required.");
  }

  // 2. Truncate overly long text (safety observations do not need >800 chars for classification)
  const optimizedInput = cleaned.length > 800 ? cleaned.slice(0, 800) : cleaned;
  const cacheKey = optimizedInput.toLowerCase();

  // 3. Check memory cache (0 tokens consumed on repeat queries)
  const cached = MODAL_INFERENCE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.result,
      evidence_quote: cleaned,
    };
  }

  const controller = new AbortController();
  // 20-second timeout to accommodate Modal cold starts
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response: Response;
  try {
    response = await fetch(MODAL_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Send ONLY single concise 'log' key to prevent token duplication
      body: JSON.stringify({
        log: optimizedInput,
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to communicate with Modal SLM endpoint at ${MODAL_BASE_URL}. (${msg})`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Modal SLM error (HTTP ${response.status}): ${errText || response.statusText}`
    );
  }

  const json = await response.json();
  const data = json.data || json;

  if (!data || typeof data !== "object") {
    throw new Error("Received empty or malformed data from Modal SLM API.");
  }

  // Parse fields from Modal response
  const sifScore =
    typeof data.sif_score === "number"
      ? data.sif_score
      : !isNaN(Number(data.sif_score))
      ? Number(data.sif_score)
      : data.sif_potential
      ? 80
      : 30;

  const iogpRule =
    typeof data.iogp_life_saving_rule === "string"
      ? data.iogp_life_saving_rule.trim()
      : undefined;

  const failedBarrierType =
    typeof data.failed_barrier_type === "string"
      ? data.failed_barrier_type.trim()
      : undefined;

  const operationalActivity =
    typeof data.operational_activity === "string"
      ? data.operational_activity.trim()
      : undefined;

  const hazard =
    iogpRule ||
    operationalActivity ||
    (data.hazard ? String(data.hazard) : "Operational Safety Hazard");

  const failed_barrier =
    failedBarrierType ||
    (data.failed_barrier ? String(data.failed_barrier) : "Safety Barrier Control");

  const sif_potential =
    typeof data.sif_potential === "boolean"
      ? data.sif_potential
      : sifScore >= 70;

  const critical_barrier_failure =
    typeof data.critical_barrier_failure === "boolean"
      ? data.critical_barrier_failure
      : Boolean(failed_barrier);

  const result: SafetyAnalysisResult = {
    hazard,
    failed_barrier,
    evidence_quote: cleaned,
    sif_score: sifScore,
    sif_potential,
    iogp_life_saving_rule: iogpRule,
    critical_barrier_failure,
    failed_barrier_type: failedBarrierType,
    operational_activity: operationalActivity,
    site_location: typeof data.site_location === "string" ? data.site_location : undefined,
    engine: "modal",
    raw: data,
  };

  // Cache response to save tokens on repeated / demo inputs
  if (MODAL_INFERENCE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = MODAL_INFERENCE_CACHE.keys().next().value;
    if (oldestKey) MODAL_INFERENCE_CACHE.delete(oldestKey);
  }
  MODAL_INFERENCE_CACHE.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });

  return result;
}

/**
 * Sends a safety observation to the local fine-tuned Ollama model and returns structured JSON.
 */
export async function analyzeWithOllama(
  observation: string
): Promise<SafetyAnalysisResult> {
  const trimmed = observation?.trim();
  if (!trimmed) {
    throw new Error("Observation text is required.");
  }

  const endpoint = `${OLLAMA_BASE_URL}/api/generate`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
      signal: controller.signal,
    });
    clearTimeout(timeout);
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

  // Fuzzy key resolver to handle minor key typos from smaller LLMs
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
    hazard: hazard.trim() || "Operational Safety Concern",
    failed_barrier: failed_barrier.trim() || "Safety Barrier Control",
    evidence_quote: evidence_quote.trim() || trimmed,
    sif_score,
    sif_potential: sif_score >= 70,
    critical_barrier_failure: sif_score >= 70,
    engine: "ollama",
    raw: parsed,
  };
}

/**
 * Intelligently routes observation analysis to the appropriate engine (Modal Cloud SLM or Local Ollama).
 * In Vercel / Production: uses Modal Cloud SLM.
 * In Local Dev: uses local Ollama if online; falls back to Modal Cloud SLM automatically.
 */
export async function analyzeSafetyObservation(
  observation: string,
  preferredEngine?: "modal" | "ollama" | "auto"
): Promise<SafetyAnalysisResult> {
  const isVercel = Boolean(
    process.env.VERCEL ||
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      (process.env.NODE_ENV === "production" && !process.env.FORCE_LOCAL_OLLAMA)
  );

  const envEngine = (process.env.AI_ENGINE || "auto").toLowerCase();
  const engineToUse =
    preferredEngine && preferredEngine !== "auto" ? preferredEngine : envEngine;

  // 1. Explicitly requested 'modal', or running in cloud Vercel environment
  if (engineToUse === "modal" || (isVercel && engineToUse !== "ollama")) {
    try {
      return await analyzeWithModal(observation);
    } catch (modalErr) {
      // In local dev, if Modal fails we can try Ollama as secondary fallback
      if (!isVercel) {
        try {
          return await analyzeWithOllama(observation);
        } catch {
          // Keep primary Modal error
        }
      }
      throw modalErr;
    }
  }

  // 2. Explicitly requested 'ollama'
  if (engineToUse === "ollama") {
    try {
      return await analyzeWithOllama(observation);
    } catch (ollamaErr) {
      console.warn("Local Ollama failed, attempting resilient fallback to Modal SLM:", ollamaErr);
      return await analyzeWithModal(observation);
    }
  }

  // 3. 'auto' mode in local development:
  // First check if Ollama is online locally
  try {
    const ollamaStatus = await checkOllamaStatus();
    if (ollamaStatus.online) {
      return await analyzeWithOllama(observation);
    }
  } catch {
    // Local Ollama offline, continue to Modal
  }

  // If local Ollama is offline or fails, route to Modal Cloud SLM
  return await analyzeWithModal(observation);
}

/**
 * Asks local safety-phi3 model or applies expert IOGP safety protocols
 * for 3 actionable field corrective action tips.
 */
export async function generateHseSuggestions(
  hazard?: string,
  failedBarrier?: string,
  observation?: string
): Promise<string[]> {
  const defaultTips = getFallbackSuggestions(hazard, failedBarrier);

  // If running locally with Ollama available, try Ollama prompt
  const isVercel = Boolean(
    process.env.VERCEL ||
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      (process.env.NODE_ENV === "production" && !process.env.FORCE_LOCAL_OLLAMA)
  );

  if (!isVercel) {
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
      const timeout = setTimeout(() => controller.abort(), 6000);

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
    } catch {
      // Gracefully fall back to expert domain tips
    }
  }

  return defaultTips;
}

/**
 * Domain-specific corrective actions mapped to official IOGP Life-Saving Rules.
 */
function getFallbackSuggestions(hazard?: string, barrier?: string): string[] {
  const combined = `${hazard || ""} ${barrier || ""}`.toLowerCase();

  // 1. Work at Height / Scaffolding
  if (
    combined.includes("height") ||
    combined.includes("fall") ||
    combined.includes("harness") ||
    combined.includes("derrick") ||
    combined.includes("scaffold") ||
    combined.includes("toe board")
  ) {
    return [
      "Issue immediate Stop Work Order on elevated platform until 100% tie-off compliance and toe-board barrier integrity is re-certified.",
      "Conduct immediate physical pull-test and harness web integrity audit for all personnel working above 1.8 meters.",
      "Convene mandatory Stand-Down Tool Box Talk with crew on IOGP Life-Saving Rule #1 (Work at Height) before work resumption.",
    ];
  }

  // 2. Toxic Gas / H2S / Confined Space Atmosphere
  if (
    combined.includes("gas") ||
    combined.includes("h2s") ||
    combined.includes("vapor") ||
    combined.includes("sensor") ||
    combined.includes("detector")
  ) {
    return [
      "Evacuate non-essential personnel upwind to designated muster point and verify fixed detector loop telemetry with central control room.",
      "Deploy portable multi-gas detector survey to establish 10 ppm H2S exclusion zone prior to manual maintenance authorization.",
      "Require positive pressure SCBA apparatus for entry and verify calibration certificates of gas detection instrumentation.",
    ];
  }

  // 3. Energy Isolation / LOTO
  if (
    combined.includes("loto") ||
    combined.includes("isolation") ||
    combined.includes("electric") ||
    combined.includes("pressure") ||
    combined.includes("padlock")
  ) {
    return [
      "Apply positive physical isolation (Double Block and Bleed + Red Padlock LOTO) at primary upstream supply points.",
      "Verify zero stored energy (depressurization gauge check and electrical zero-volt test) before opening system.",
      "Audit Permit to Work (PTW) cross-signatures between operations custodian and performing authority.",
    ];
  }

  // 4. Safe Mechanical Lifting / Crane
  if (
    combined.includes("lift") ||
    combined.includes("crane") ||
    combined.includes("sling") ||
    combined.includes("rigging") ||
    combined.includes("winch")
  ) {
    return [
      "Immediately ground suspended load and barricade 1.5x crane swing drop-zone with high-visibility safety tape.",
      "Perform thorough visual inspection on wire rope slings, shackles, and load hooks for elongation, kinks, or missing safety latches.",
      "Re-verify Critical Lift Plan calculation sheet and ensure banksman / rigger certification is current before any further lift.",
    ];
  }

  // 5. Confined Space
  if (
    combined.includes("confined") ||
    combined.includes("tank") ||
    combined.includes("vessel") ||
    combined.includes("pit")
  ) {
    return [
      "Halt vessel entry immediately and test atmospheric oxygen (19.5% - 23.5%), LEL (<10%), and toxic gases at bottom, middle, and top.",
      "Post a dedicated, trained Standby Attendant with emergency rescue winch and direct UHF radio link to rig control.",
      "Verify valid Confined Space Entry Permit (CSEP) and continuous forced-air mechanical ventilation before re-entry.",
    ];
  }

  // 6. Bypassing Safety Controls
  if (
    combined.includes("bypass") ||
    combined.includes("override") ||
    combined.includes("interlock") ||
    combined.includes("defeat")
  ) {
    return [
      "Immediately re-instate safety interlock or restore safety shutdown function to active fail-safe state.",
      "Audit Management of Change (MOC) register; verify senior superintendent authorization for any temporary trip bypass.",
      "Perform live loop simulation to confirm automated shutdown trips actuate reliably.",
    ];
  }

  // Default OIL HSE Action Protocol
  return [
    "Issue immediate Stop Work Authority to halt unsafe operational conditions and clear personnel from line of fire.",
    "Perform physical barrier audit to re-establish primary and secondary defense layers according to IOGP safety protocols.",
    "Log safety intervention in OIL India HSE registry and conduct pre-job safety debrief before clearing work permit.",
  ];
}
