import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { analyzeWithDeterministicFallback, sanitizePii } from "@/lib/ai";
import { getBoard, addConcernsBatch } from "@/lib/data/concerns";
import type { WorkerConcernPayload } from "@/types";

export const dynamic = "force-dynamic";

// Controlled concurrency limit to prevent overwhelming local/remote inference
const BATCH_CONCURRENCY_LIMIT = 3;

/**
 * RFC 4180 compliant CSV parser with explicit comment-line support (#).
 */
export function parseCsvContent(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const clean = content.replace(/^\uFEFF/, "");
  const lines: string[] = [];

  let currentLine = "";
  let insideQuote = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"') {
      if (insideQuote && clean[i + 1] === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
        currentLine += char;
      }
    } else if ((char === "\n" || char === "\r") && !insideQuote) {
      if (char === "\r" && clean[i + 1] === "\n") {
        i++;
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  // Filter out comments starting with '#' and blank lines
  const nonCommentLines = lines.filter((line) => !line.trim().startsWith("#"));
  if (nonCommentLines.length === 0) {
    return { headers: [], rows: [] };
  }

  function splitCsvRow(rowStr: string): string[] {
    const cells: string[] = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const ch = rowStr[i];
      if (ch === '"') {
        if (inQuotes && rowStr[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    return cells;
  }

  const headerRow = splitCsvRow(nonCommentLines[0]).map((h) =>
    h.replace(/^["']|["']$/g, "").trim().toLowerCase().replace(/[\s_-]+/g, "_")
  );

  const parsedRows: Record<string, string>[] = [];
  for (let r = 1; r < nonCommentLines.length; r++) {
    const cells = splitCsvRow(nonCommentLines[r]);
    if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headerRow.length; c++) {
      rowObj[headerRow[c]] = (cells[c] ?? "").replace(/^["']|["']$/g, "").trim();
    }
    parsedRows.push(rowObj);
  }

  return { headers: headerRow, rows: parsedRows };
}

function normalizeRow(raw: Record<string, string>): {
  report_text: string;
  location: string;
  activity: string;
  equipment: string;
  report_type: string;
  date: string;
} {
  const findVal = (keys: string[]) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k].length > 0) return raw[k];
    }
    return "";
  };

  return {
    report_text: findVal(["report_text", "text", "observation", "hazard", "description", "details", "narrative"]),
    location: findVal(["location", "station", "site", "area", "installation", "field"]),
    activity: findVal(["activity", "operational_activity", "task", "operation"]),
    equipment: findVal(["equipment", "equipment_id", "tool", "asset"]),
    report_type: findVal(["report_type", "type", "category", "observation_type"]),
    date: findVal(["date", "reported_at", "timestamp", "datetime", "incident_date"]),
  };
}

export function computeReportFingerprint(text: string, location: string, date: string): string {
  const normText = text.toLowerCase().replace(/\s+/g, " ").trim();
  const normLoc = location.toLowerCase().replace(/\s+/g, " ").trim();
  const normDate = date.toLowerCase().replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(`${normText}|${normLoc}|${normDate}`).digest("hex");
}

async function runWithControlledConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        const value = await fn(items[idx], idx);
        results[idx] = { status: "fulfilled", value };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser(req);
    // Allow authenticated users to bulk upload reports
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required to ingest bulk safety observations" },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let rawCsvText = "";
    let inputRows: Record<string, string>[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (file && typeof file === "object" && "text" in file) {
        rawCsvText = await (file as Blob).text();
      } else {
        const textPayload = formData.get("csvContent");
        if (typeof textPayload === "string") rawCsvText = textPayload;
      }
    } else if (contentType.includes("application/json")) {
      const jsonBody = await req.json();
      if (jsonBody.csvContent && typeof jsonBody.csvContent === "string") {
        rawCsvText = jsonBody.csvContent;
      } else if (Array.isArray(jsonBody.rows)) {
        inputRows = jsonBody.rows;
      }
    } else {
      // Raw CSV text body
      rawCsvText = await req.text();
    }

    if (inputRows.length === 0 && rawCsvText.trim().length > 0) {
      const parsed = parseCsvContent(rawCsvText);
      inputRows = parsed.rows;
    }

    if (inputRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid rows found to ingest. Ensure CSV has data rows and valid header columns.",
        },
        { status: 400 }
      );
    }

    // 1. Gather existing card fingerprints to avoid duplicating identical existing reports
    const existingBoard = await getBoard();
    const existingFingerprints = new Set<string>();

    for (const col of existingBoard) {
      for (const card of col.cards) {
        if (card.duplicateFingerprint) {
          existingFingerprints.add(card.duplicateFingerprint);
        } else {
          const t = card.observation || card.hazard || "";
          const l = card.site_location || card.reporter?.station || "";
          const d = card.date || card.reportedAt || "";
          if (t.length > 5) {
            existingFingerprints.add(computeReportFingerprint(t, l, d));
          }
        }
      }
    }

    const seenInBatch = new Set<string>();
    const rowsToProcess: {
      index: number;
      normalized: ReturnType<typeof normalizeRow>;
      fingerprint: string;
    }[] = [];

    let duplicatesSkipped = 0;
    const rowErrors: { row: number; report_text?: string; error: string }[] = [];

    for (let i = 0; i < inputRows.length; i++) {
      const norm = normalizeRow(inputRows[i]);
      if (!norm.report_text || norm.report_text.trim().length < 5) {
        rowErrors.push({
          row: i + 1,
          error: "Missing or invalid report_text (minimum 5 characters required)",
        });
        continue;
      }

      const fp = computeReportFingerprint(norm.report_text, norm.location, norm.date);

      // Exact duplicate check
      if (existingFingerprints.has(fp) || seenInBatch.has(fp)) {
        duplicatesSkipped++;
        continue;
      }

      seenInBatch.add(fp);
      rowsToProcess.push({ index: i, normalized: norm, fingerprint: fp });
    }

    // 2. Controlled concurrency analysis of non-duplicate valid rows
    const settledResults = await runWithControlledConcurrency(
      rowsToProcess,
      BATCH_CONCURRENCY_LIMIT,
      async (item) => {
        const { normalized, fingerprint } = item;
        const sanitizedObservation = sanitizePii(normalized.report_text);
        const analysis = analyzeWithDeterministicFallback(
          sanitizedObservation,
          normalized.location,
          normalized.activity
        );

        const cardPayload: WorkerConcernPayload = {
          observation: sanitizedObservation,
          hazard: analysis.hazard || normalized.report_type || "Operational Safety Precursor",
          possible_consequence: analysis.possible_consequence,
          failed_barrier: analysis.failed_barrier,
          failed_barrier_type: analysis.failed_barrier_type,
          safety_protection: analysis.safety_protection,
          protection_failure_state: analysis.protection_failure_state,
          operational_activity: normalized.activity || analysis.operational_activity,
          site_location: normalized.location || analysis.site_location,
          evidence_quote: analysis.evidence_quote || sanitizedObservation,
          sif_score: analysis.sif_score,
          sif_potential: analysis.sif_potential ?? (analysis.sif_score >= 70),
          sif_category: analysis.sif_category || (analysis.sif_score >= 70 ? "HIGH" : analysis.sif_score >= 40 ? "MEDIUM" : "LOW"),
          iogp_rule: analysis.iogp_life_saving_rule,
          iogp_rules: analysis.iogp_rules,
          life_saving_rules: analysis.life_saving_rules,
          critical_barrier_failure: analysis.critical_barrier_failure,
          confidence: analysis.confidence,
          validation_flag: analysis.validation_flag,
          validation_notes: analysis.validation_notes,
          inference_engine:
            analysis.analysis_engine === "modal" || analysis.analysis_engine === "ollama"
              ? analysis.analysis_engine
              : "fallback",
          analysis_engine: analysis.analysis_engine,
          model_name: analysis.model_name,
          model_version: analysis.model_version,
          dataset_version: analysis.dataset_version,
          analyzed_at: analysis.analyzed_at,
          duplicateFingerprint: fingerprint,
          reporter: {
            name: session.name || session.email,
            role: session.role === "manager" ? "HSE Lead Reviewer" : "HSE Field Safety Officer",
            station: normalized.location || "Operational Site",
            email: session.email,
          },
        };

        return cardPayload;
      }
    );

    const validPayloads: WorkerConcernPayload[] = [];
    settledResults.forEach((res, i) => {
      const originalRow = rowsToProcess[i];
      if (res.status === "fulfilled") {
        validPayloads.push(res.value);
      } else {
        rowErrors.push({
          row: originalRow.index + 1,
          report_text: originalRow.normalized.report_text.slice(0, 80),
          error: res.reason instanceof Error ? res.reason.message : "Inference failed for row",
        });
      }
    });

    // 3. Atomic persistence of all successfully analyzed concerns
    let insertedCards: any[] = [];
    if (validPayloads.length > 0) {
      insertedCards = await addConcernsBatch(validPayloads);
    }

    return NextResponse.json({
      success: true,
      disclaimer: "ILLUSTRATIVE DEMO DATA — NOT ACTUAL OIL OPERATIONAL DATA",
      totalRows: inputRows.length,
      processed: rowsToProcess.length,
      inserted: insertedCards.length,
      duplicatesSkipped,
      errors: rowErrors,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Bulk ingestion error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
