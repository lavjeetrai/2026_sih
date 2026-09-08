/**
 * Cloud Fine-Tuned SLM Service Client (Modal API)
 * Hosted on Modal serverless container: microsoft/Phi-3-mini-4k-instruct + LoRA adapter
 */

import type { ModalHealthStatus, SafetyAnalysisResult, SifEvidenceFactors } from "../../types";
import { extractProtectionAndFailureState } from "../safety";
import { sanitizePii } from "./pii-sanitization";
import { derivePossibleConsequence } from "./consequence";

const MODAL_BASE_URL =
  process.env.MODAL_API_URL?.replace(/\/$/, "") ||
  "https://railavjeet897--oil-safety-classifier-sifclassifier-analy-8ffce8.modal.run";

/**
 * Checks connection to the fine-tuned Modal Cloud SLM endpoint.
 */
export async function checkModalStatus(): Promise<ModalHealthStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(MODAL_BASE_URL, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (res.ok || res.status === 405 || res.status === 200 || res.status === 400) {
      return {
        online: true,
        url: MODAL_BASE_URL,
        modelName: "Fine-Tuned SLM (Modal Cloud)",
      };
    }

    return {
      online: false,
      url: MODAL_BASE_URL,
      modelName: "Fine-Tuned SLM (Modal Cloud)",
      error: `Modal returned HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unable to connect to Modal SLM";
    return {
      online: false,
      url: MODAL_BASE_URL,
      modelName: "Fine-Tuned SLM (Modal Cloud)",
      error: msg,
    };
  }
}

/**
 * Analyzes observation using the fine-tuned SLM deployed on Modal.
 */
export async function analyzeWithModal(
  observation: string
): Promise<SafetyAnalysisResult> {
  const trimmed = observation?.trim();
  if (!trimmed) {
    throw new Error("Observation text is required.");
  }

  // Pre-inference PII sanitization layer
  const sanitized = sanitizePii(trimmed);

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
      body: JSON.stringify({
        log: sanitized,
        text: sanitized,
        observation: sanitized,
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

  const iogpRules: string[] | undefined = Array.isArray(data.iogp_rules)
    ? data.iogp_rules.map(String)
    : Array.isArray(data.iogp_life_saving_rules)
    ? data.iogp_life_saving_rules.map(String)
    : iogpRule
    ? [iogpRule]
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

  const sifCategory: "HIGH" | "MEDIUM" | "LOW" | "REVIEW" =
    typeof data.sif_category === "string" && ["HIGH", "MEDIUM", "LOW", "REVIEW"].includes(data.sif_category.toUpperCase())
      ? (data.sif_category.toUpperCase() as "HIGH" | "MEDIUM" | "LOW" | "REVIEW")
      : sifScore >= 70
      ? "HIGH"
      : sifScore >= 40
      ? "MEDIUM"
      : "LOW";

  const critical_barrier_failure =
    typeof data.critical_barrier_failure === "boolean"
      ? data.critical_barrier_failure
      : Boolean(failed_barrier);

  const possible_consequence = derivePossibleConsequence(hazard, trimmed, data);

  const protectionInfo = extractProtectionAndFailureState(
    trimmed,
    hazard,
    failedBarrierType || failed_barrier
  );

  const confidence =
    typeof data.confidence === "number"
      ? Math.max(0, Math.min(1, data.confidence))
      : Math.min(0.95, Math.max(0.4, Math.round((sifScore / 100) * 100) / 100));

  const sifFactors: SifEvidenceFactors = {
    hazardSeverity: sifScore >= 70 ? "CRITICAL" : sifScore >= 40 ? "HIGH" : "MODERATE",
    barrierCompromised: critical_barrier_failure,
    humanExposure: true,
  };

  return {
    hazard,
    possible_consequence,
    failed_barrier,
    evidence_quote: trimmed,
    sif_score: sifScore,
    sif_potential,
    sif_category: sifCategory,
    iogp_life_saving_rule: iogpRule,
    iogp_rules: iogpRules,
    life_saving_rules: iogpRules || (iogpRule ? [iogpRule] : []),
    critical_barrier_failure,
    failed_barrier_type: failedBarrierType,
    safety_protection: protectionInfo.safety_protection,
    protection_failure_state: protectionInfo.protection_failure_state,
    operational_activity: operationalActivity,
    site_location: typeof data.site_location === "string" ? data.site_location : undefined,
    confidence,
    sif_factors: sifFactors,
    validation_flag: "PASSED",
    engine: "modal",
    analysis_engine: "modal",
    model_name: typeof data.model_name === "string" ? data.model_name : "Fine-Tuned SLM (Modal Cloud)",
    model_version: typeof data.model_version === "string" ? data.model_version : "1.0-lora",
    dataset_version: "OIL-SIF-Precursor-UAUC-v1.0",
    analyzed_at: new Date().toISOString(),
    raw: data,
  };
}
