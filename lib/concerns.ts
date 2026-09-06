import fs from "fs/promises";
import path from "path";
import { generateHseSuggestions } from "./ollama";
import { getDb } from "./mongodb";

export type Priority = "Low" | "Medium" | "High";

export interface Tag {
  label: string;
  dotColor: string;
}

export interface ReporterInfo {
  name: string;
  role: string;
  avatarUrl: string;
  email?: string;
  station?: string;
  radioChannel?: string;
  badgeId?: string;
  phone?: string;
}

export interface CardData {
  id: string;
  title: string;
  description?: string;
  tags?: Tag[];
  priority?: Priority;
  date?: string;
  avatars?: string[];
  tasksCompleted?: number;
  tasksTotal?: number;
  comments?: number;
  attachments?: number;
  coverImage?: string;
  // Structured safety fields
  observation?: string;
  hazard?: string;
  failed_barrier?: string;
  evidence_quote?: string;
  sif_score?: number;
  reporter?: ReporterInfo;
  reviewer?: ReporterInfo;
  reportedAt?: string;
  llmSuggestions?: string[];
  status?: "To Do" | "In Progress" | "Done";
  columnId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ColumnData {
  id: string;
  title: string;
  cards: CardData[];
}

export interface BoardDocument {
  _id: string;
  board: ColumnData[];
  updatedAt: Date;
}

export interface WorkerConcernPayload {
  observation: string;
  hazard?: string;
  failed_barrier?: string;
  evidence_quote?: string;
  sif_score?: number;
  reporter?: string | Partial<ReporterInfo>;
}

// Clean production board schema for OIL India HSE Operations (no mock seed cards)
const CLEAN_INITIAL_BOARD: ColumnData[] = [
  {
    id: "col-1",
    title: "To Do",
    cards: [],
  },
  {
    id: "col-2",
    title: "In Progress",
    cards: [],
  },
  {
    id: "col-3",
    title: "Done",
    cards: [],
  },
];

const DATA_DIR = path.join(process.cwd(), "data");
const CONCERNS_FILE = path.join(DATA_DIR, "concerns.json");

// In-memory fallback (initialized with clean empty board)
let memoryBoard: ColumnData[] = JSON.parse(JSON.stringify(CLEAN_INITIAL_BOARD));

function enrichCard(card: CardData): CardData {
  const enriched = { ...card };

  // If missing reporter, provide default field officer
  if (!enriched.reporter) {
    enriched.reporter = {
      name: "Lav Kumar",
      role: "HSE Field Safety Officer (Derrick Floor)",
      avatarUrl:
        enriched.avatars?.[0] ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      email: "lav.kumar@oilindia.in",
      station: "Moran Rig-04 • Production Operations",
      radioChannel: "UHF CH-04",
      badgeId: "OIL-FLD-5542",
    };
  }

  // Parse structured information from description if not directly provided
  if (!enriched.hazard || !enriched.failed_barrier) {
    const desc = enriched.description || "";
    const quoteMatch = desc.match(/Quote:\s*"([^"]+)"/i);
    const barrierMatch = desc.match(/Failed Barrier:\s*([^|]+)/i);
    const obsMatch = desc.match(/Observation:\s*(.+)$/i);

    if (quoteMatch && !enriched.evidence_quote) {
      enriched.evidence_quote = quoteMatch[1].trim();
    }
    if (barrierMatch && !enriched.failed_barrier) {
      enriched.failed_barrier = barrierMatch[1].trim();
    }
    if (obsMatch && !enriched.observation) {
      enriched.observation = obsMatch[1].trim();
    }

    if (!enriched.hazard) {
      const titleClean = enriched.title.replace(/\s*-\s*[a-z0-9]+$/i, "").trim();
      enriched.hazard = titleClean.length > 3 ? titleClean : "Operational Safety Precursor";
    }
  }

  if (enriched.observation && enriched.observation.includes("|")) {
    const obsMatch = enriched.observation.match(/Observation:\s*(.+)$/i);
    if (obsMatch) {
      enriched.observation = obsMatch[1].trim();
    } else if (enriched.evidence_quote) {
      enriched.observation = enriched.evidence_quote;
    }
  }

  if (!enriched.observation) {
    enriched.observation = enriched.evidence_quote || enriched.title;
  }

  if (enriched.sif_score === undefined) {
    const sifTag = enriched.tags?.find((t) => t.label.toLowerCase().includes("sif"));
    if (sifTag) {
      const match = sifTag.label.match(/\d+/);
      if (match) enriched.sif_score = parseInt(match[0], 10);
    }
    if (enriched.sif_score === undefined) {
      enriched.sif_score = enriched.priority === "High" ? 85 : enriched.priority === "Medium" ? 50 : 25;
    }
  }

  if (!enriched.reportedAt) {
    enriched.reportedAt = enriched.date ? `${enriched.date}, 2026 • 14:00 IST` : "Sep 06, 2026 • 16:15 IST";
  }

  // Restore full unabbreviated title if it was previously truncated with trailing ellipsis
  if (enriched.title && enriched.title.endsWith("...") && enriched.observation) {
    if (enriched.hazard) {
      enriched.title = `${enriched.hazard} — ${enriched.observation}`;
    } else {
      enriched.title = enriched.observation;
    }
  }

  // Restore full tag labels if they had trailing ellipsis
  if (enriched.tags && Array.isArray(enriched.tags)) {
    enriched.tags = enriched.tags.map((tag) => {
      if (tag.label.endsWith("...") && enriched.hazard) {
        return {
          ...tag,
          label: enriched.hazard.replace(/\(.*\)/, "").trim(),
        };
      }
      return tag;
    });
  }

  return enriched;
}

async function syncLocalFile(board: ColumnData[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CONCERNS_FILE, JSON.stringify(board, null, 2), "utf-8");
  } catch (e) {
    console.warn("Local sync write failed:", e);
  }
}

/**
 * Retrieves the board columns and cards directly from MongoDB Atlas.
 * Guarantees only real data (excludes any legacy synthetic cards).
 */
export async function getBoard(): Promise<ColumnData[]> {
  try {
    const db = await getDb();
    const boardCol = db.collection<BoardDocument>("board_state");
    const boardDoc = await boardCol.findOne({ _id: "active_board" });

    if (boardDoc && Array.isArray(boardDoc.board) && boardDoc.board.length > 0) {
      // Filter out any mock cards (c-1, c-2, c-3, c-4) so ONLY real data is displayed
      const cleanBoard: ColumnData[] = boardDoc.board.map((col: ColumnData) => ({
        ...col,
        cards: (col.cards || [])
          .filter((c: CardData) => !c.id.match(/^c-[1-4]$/))
          .map(enrichCard),
      }));
      memoryBoard = cleanBoard;
      await syncLocalFile(cleanBoard);
      return cleanBoard;
    }

    // Check individual concerns collection if board_state doc is missing
    const concernsCol = db.collection<CardData>("concerns");
    const realCards = await concernsCol.find().toArray();
    const cleanCards = realCards
      .filter((c) => !c.id.match(/^c-[1-4]$/))
      .map(enrichCard);

    const initialBoard: ColumnData[] = [
      {
        id: "col-1",
        title: "To Do",
        cards: cleanCards.filter((c) => !c.status || c.status === "To Do"),
      },
      {
        id: "col-2",
        title: "In Progress",
        cards: cleanCards.filter((c) => c.status === "In Progress"),
      },
      {
        id: "col-3",
        title: "Done",
        cards: cleanCards.filter((c) => c.status === "Done"),
      },
    ];

    await boardCol.updateOne(
      { _id: "active_board" },
      { $set: { board: initialBoard, updatedAt: new Date() } },
      { upsert: true }
    );

    memoryBoard = initialBoard;
    await syncLocalFile(initialBoard);
    return initialBoard;
  } catch (e) {
    console.warn("[concerns] Failed to fetch board from MongoDB Atlas, checking fallback:", e);

    // Try reading local file if available
    try {
      const content = await fs.readFile(CONCERNS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleanParsed = parsed.map((col: ColumnData) => ({
          ...col,
          cards: (col.cards || []).filter((c: CardData) => !c.id.match(/^c-[1-4]$/)).map(enrichCard),
        }));
        memoryBoard = cleanParsed;
        return cleanParsed;
      }
    } catch {
      // Fall through to memoryBoard
    }

    return memoryBoard.map((col) => ({
      ...col,
      cards: col.cards.filter((c) => !c.id.match(/^c-[1-4]$/)).map(enrichCard),
    }));
  }
}

/**
 * Persists updated board state to MongoDB Atlas and updates individual cards.
 */
export async function saveBoard(board: ColumnData[]): Promise<void> {
  const cleanBoard = board.map((col) => ({
    ...col,
    cards: col.cards.filter((c) => !c.id.match(/^c-[1-4]$/)),
  }));
  memoryBoard = cleanBoard;
  await syncLocalFile(cleanBoard);

  try {
    const db = await getDb();
    const boardCol = db.collection<BoardDocument>("board_state");
    await boardCol.updateOne(
      { _id: "active_board" },
      { $set: { board: cleanBoard, updatedAt: new Date() } },
      { upsert: true }
    );

    // Sync status and columnId to the individual concerns collection
    const concernsCol = db.collection("concerns");
    for (const col of cleanBoard) {
      for (const card of col.cards) {
        await concernsCol.updateOne(
          { id: card.id },
          {
            $set: {
              ...card,
              columnId: col.id,
              status: col.title as "To Do" | "In Progress" | "Done",
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    }
  } catch (e) {
    console.warn("[concerns] Failed to save board to MongoDB Atlas:", e);
  }
}

function getHazardDotColor(hazard?: string): string {
  const h = (hazard || "").toLowerCase();
  if (h.includes("height") || h.includes("fall")) return "bg-red-500";
  if (h.includes("gas") || h.includes("h2s") || h.includes("vapor") || h.includes("fire")) return "bg-amber-500";
  if (h.includes("lift") || h.includes("crane") || h.includes("sling")) return "bg-orange-500";
  if (h.includes("electric") || h.includes("energy") || h.includes("loto")) return "bg-yellow-500";
  return "bg-blue-500";
}

function truncateText(str: string, maxLength: number): string {
  if (!str) return "";
  return str.length > maxLength ? str.slice(0, maxLength).trim() + "..." : str;
}

/**
 * Creates a real concern card from a worker observation, saves to MongoDB Atlas
 * in both the concerns collection and the board_state, and places it in "To Do".
 */
export async function addConcernFromWorker(payload: WorkerConcernPayload): Promise<CardData> {
  const board = await getBoard();

  const score = payload.sif_score ?? 0;
  const priority: Priority = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

  // Meaningful full card title without truncation
  let cardTitle = payload.hazard?.trim();
  if (!cardTitle || cardTitle.length < 3) {
    cardTitle = payload.observation?.trim() || "Operational Safety Precursor";
  } else if (payload.observation && !cardTitle.toLowerCase().includes(payload.observation.toLowerCase().slice(0, 15))) {
    cardTitle = `${cardTitle} — ${payload.observation.trim()}`;
  }

  // Generate suggestions from local Ollama model
  let llmSuggestions: string[] | undefined;
  try {
    llmSuggestions = await generateHseSuggestions(payload.hazard, payload.failed_barrier, payload.observation);
  } catch {
    // fallback will be computed on demand
  }

  // Description containing evidence quote, failed barrier, and observation
  const descParts: string[] = [];
  if (payload.evidence_quote) {
    descParts.push(`Quote: "${payload.evidence_quote}"`);
  }
  if (payload.failed_barrier) {
    descParts.push(`Failed Barrier: ${payload.failed_barrier}`);
  }
  if (payload.observation && payload.observation !== payload.evidence_quote) {
    descParts.push(`Observation: ${payload.observation}`);
  }
  const description = descParts.join(" | ");

  const tags: Tag[] = [];
  if (payload.hazard) {
    tags.push({
      label: payload.hazard.replace(/\(.*\)/, "").trim(),
      dotColor: getHazardDotColor(payload.hazard),
    });
  }
  if (score > 0) {
    tags.push({
      label: `SIF ${score}`,
      dotColor: score >= 70 ? "bg-red-500" : score >= 40 ? "bg-amber-500" : "bg-blue-500",
    });
  } else {
    tags.push({
      label: "Worker Log",
      dotColor: "bg-purple-500",
    });
  }

  const now = new Date();
  const formattedTime =
    now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + ` • ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} IST`;

  const newCard: CardData = {
    id: `worker-concern-${Date.now()}`,
    title: cardTitle,
    description: description || undefined,
    tags,
    priority,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    comments: 0,
    attachments: 0,
    avatars: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    ],
    observation: payload.observation,
    hazard: payload.hazard,
    failed_barrier: payload.failed_barrier,
    evidence_quote: payload.evidence_quote,
    sif_score: score,
    reportedAt: formattedTime,
    reporter:
      typeof payload.reporter === "object" && payload.reporter
        ? {
            name: payload.reporter.name || "Lav Kumar",
            role: payload.reporter.role || "HSE Field Safety Officer (Derrick Operations)",
            avatarUrl:
              payload.reporter.avatarUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            email: payload.reporter.email || "lav.kumar@oilindia.in",
            station: payload.reporter.station || "Moran Rig #04 • Wellhead Section",
            radioChannel: payload.reporter.radioChannel || "UHF CH-04",
            badgeId: payload.reporter.badgeId || "OIL-FLD-5542",
            phone: payload.reporter.phone || "+91 94350 44521",
          }
        : {
            name: typeof payload.reporter === "string" ? payload.reporter : "Lav Kumar",
            role: "HSE Field Safety Officer (Derrick Operations)",
            avatarUrl:
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            email: "lav.kumar@oilindia.in",
            station: "Moran Rig #04 • Wellhead Section",
            radioChannel: "UHF CH-04",
            badgeId: "OIL-FLD-5542",
            phone: "+91 94350 44521",
          },
    reviewer: undefined,
    llmSuggestions,
    status: "To Do",
    columnId: "col-1",
    createdAt: new Date().toISOString(),
  };

  // 1. Insert into MongoDB Atlas concerns collection
  try {
    const db = await getDb();
    await db.collection("concerns").insertOne(newCard);
  } catch (err) {
    console.warn("[concerns] Failed to insert card into concerns collection in Atlas:", err);
  }

  // 2. Add to "col-1" (To Do) at the very top of the board
  const updatedBoard = board.map((col) => {
    if (col.id === "col-1" || col.title.toLowerCase().includes("to do")) {
      return {
        ...col,
        cards: [newCard, ...col.cards],
      };
    }
    return col;
  });

  // 3. Persist to MongoDB Atlas board_state and local sync
  await saveBoard(updatedBoard);

  return newCard;
}
