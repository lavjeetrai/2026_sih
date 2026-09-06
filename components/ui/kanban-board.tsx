"use client";

import React, { useState } from "react";
import {
  MoreHorizontal,
  Calendar,
  GripVertical,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  Maximize2,
  Sparkles,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CardData, ColumnData, Priority, Tag } from "@/lib/concerns";
import { CardDetailModal } from "./card-detail-modal";
import { mapToLifeSavingRule } from "@/lib/lsr";
import { type UserSessionData } from "./auth-form-1";

export type SortOrder = "newest" | "oldest";

/**
 * Intelligently extracts an epoch millisecond timestamp from any card.
 * Handles worker concerns (worker-concern-<timestamp>), formatted date/time strings,
 * and canonical seed cards.
 */
export function getCardTimestamp(card: CardData): number {
  // 1. If card ID contains millisecond timestamp (e.g. worker-concern-1725621456000)
  if (card.id && typeof card.id === "string" && card.id.startsWith("worker-concern-")) {
    const epochPart = card.id.replace("worker-concern-", "");
    const parsedEpoch = parseInt(epochPart, 10);
    if (!isNaN(parsedEpoch) && parsedEpoch > 0) {
      return parsedEpoch;
    }
  }

  // 2. Parse reportedAt if present (e.g. "Sep 06, 2026 • 16:15 IST" or "Oct 15, 2026 • 14:15 IST")
  if (card.reportedAt) {
    const cleanDateStr = card.reportedAt
      .replace(/•/g, " ")
      .replace(/IST/g, "")
      .trim();
    const parsed = Date.parse(cleanDateStr);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 3. Parse date field if present (e.g. "Oct 15", "Sep 6")
  if (card.date) {
    const parsedWithYear = Date.parse(`${card.date}, 2026`);
    if (!isNaN(parsedWithYear) && parsedWithYear > 0) {
      return parsedWithYear;
    }
    const directParsed = Date.parse(card.date);
    if (!isNaN(directParsed) && directParsed > 0) {
      return directParsed;
    }
  }

  // 4. Fallback for initial demo cards
  if (card.id === "c-1") return new Date(2026, 9, 15, 14, 15).getTime();
  if (card.id === "c-2") return new Date(2026, 9, 14, 9, 30).getTime();
  if (card.id === "c-3") return new Date(2026, 9, 12, 11, 45).getTime();
  if (card.id === "c-4") return new Date(2026, 9, 1, 16, 0).getTime();

  return 0;
}

const INITIAL_BOARD: ColumnData[] = [
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

export function KanbanBoard({ user }: { user?: UserSessionData | null } = {}) {
  const [board, setBoard] = useState<ColumnData[]>(INITIAL_BOARD);
  const [draggingCard, setDraggingCard] = useState<{ card: CardData; sourceColId: string } | null>(null);
  const [selectedCardInfo, setSelectedCardInfo] = useState<{
    card: CardData;
    columnTitle: string;
    columnId: string;
  } | null>(null);

  // Column sort state ("newest" = newest to oldest, "oldest" = oldest to newest)
  const [columnSortOrders, setColumnSortOrders] = useState<Record<string, SortOrder>>({
    "col-1": "newest",
    "col-2": "newest",
    "col-3": "newest",
  });

  const isAllNewest = Object.values(columnSortOrders).every((v) => v === "newest");
  const isAllOldest = Object.values(columnSortOrders).every((v) => v === "oldest");

  const handleSetGlobalSort = (order: SortOrder) => {
    setColumnSortOrders({
      "col-1": order,
      "col-2": order,
      "col-3": order,
    });
  };

  const handleToggleColumnSort = (colId: string) => {
    setColumnSortOrders((prev) => ({
      ...prev,
      [colId]: (prev[colId] || "newest") === "newest" ? "oldest" : "newest",
    }));
  };

  // Sync board with server store so worker-submitted concerns appear in real-time
  const fetchBoard = React.useCallback(async () => {
    try {
      const res = await fetch("/api/concerns");
      const data = await res.json();
      if (data.success && Array.isArray(data.board) && data.board.length > 0) {
        setBoard(data.board);

        // Keep modal card reference stable if currently open to prevent child re-fetching
        setSelectedCardInfo((curr) => {
          if (!curr) return null;
          for (const col of data.board) {
            const match = col.cards.find((c: CardData) => c.id === curr.card.id);
            if (match) {
              if (curr.columnId !== col.id) {
                return { card: match, columnTitle: col.title, columnId: col.id };
              }
              return curr;
            }
          }
          return curr;
        });
      }
    } catch (e) {
      console.warn("Could not sync board:", e);
    }
  }, []);

  React.useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 3000);
    return () => clearInterval(interval);
  }, [fetchBoard]);

  const persistBoard = async (newBoard: ColumnData[]) => {
    try {
      await fetch("/api/concerns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: newBoard }),
      });
    } catch (e) {
      console.warn("Failed to persist board changes:", e);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, card: CardData, colId: string) => {
    setDraggingCard({ card, sourceColId: colId });
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.classList.add("opacity-40");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) e.target.classList.remove("opacity-40");
    setDraggingCard(null);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggingCard) return;
    if (draggingCard.sourceColId === targetColId) return;

    setBoard((prev) => {
      const newBoard = [...prev];
      const sourceColIndex = newBoard.findIndex((c) => c.id === draggingCard.sourceColId);
      const targetColIndex = newBoard.findIndex((c) => c.id === targetColId);

      const targetCol = newBoard[targetColIndex];
      const newStatus = (targetCol.title || "To Do") as "To Do" | "In Progress" | "Done";

      const updatedCard: CardData = {
        ...draggingCard.card,
        status: newStatus,
        columnId: targetColId,
        updatedAt: new Date().toISOString(),
        reviewer: user
          ? {
              name: user.name,
              role: user.designation || "HSE Operations Manager",
              avatarUrl:
                user.avatarUrl ||
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
              email: user.email,
              station: user.station || "Duliajan Corporate HQ",
              radioChannel: user.radioChannel || "COMMAND CH-01",
              badgeId: user.badgeId || "OIL-MGR-1002",
              phone: user.phone || "+91 374 280 4501",
            }
          : draggingCard.card.reviewer,
      };

      // Remove from source
      newBoard[sourceColIndex] = {
        ...newBoard[sourceColIndex],
        cards: newBoard[sourceColIndex].cards.filter((c) => c.id !== draggingCard.card.id),
      };

      // Add to target
      newBoard[targetColIndex] = {
        ...newBoard[targetColIndex],
        cards: [...newBoard[targetColIndex].cards, updatedCard],
      };

      persistBoard(newBoard);
      return newBoard;
    });
  };

  // --- Move Column from Modal ---
  const handleMoveColumn = (cardId: string, targetColId: string) => {
    setBoard((prev) => {
      let movedCard: CardData | null = null;
      const cleanBoard = prev.map((col) => {
        const card = col.cards.find((c) => c.id === cardId);
        if (card) {
          movedCard = card;
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== cardId),
          };
        }
        return col;
      });

      if (!movedCard) return prev;
      const validCard = movedCard as CardData;

      const targetCol = cleanBoard.find((c) => c.id === targetColId);
      const newStatus = (targetCol?.title || "In Progress") as "To Do" | "In Progress" | "Done";

      const processedCard: CardData = {
        ...validCard,
        status: newStatus,
        columnId: targetColId,
        updatedAt: new Date().toISOString(),
        reviewer: user
          ? {
              name: user.name,
              role: user.designation || "HSE Operations Manager",
              avatarUrl:
                user.avatarUrl ||
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
              email: user.email,
              station: user.station || "Duliajan Corporate HQ",
              radioChannel: user.radioChannel || "COMMAND CH-01",
              badgeId: user.badgeId || "OIL-MGR-1002",
              phone: user.phone || "+91 374 280 4501",
            }
          : validCard.reviewer,
      };

      const newBoard = cleanBoard.map((col) => {
        if (col.id === targetColId) {
          return {
            ...col,
            cards: [processedCard, ...col.cards],
          };
        }
        return col;
      });

      persistBoard(newBoard);

      if (targetCol && processedCard) {
        setSelectedCardInfo({
          card: processedCard,
          columnTitle: targetCol.title,
          columnId: targetCol.id,
        });
      }

      return newBoard;
    });
  };

  const handleDeleteCard = (colId: string, cardId: string) => {
    setBoard((prev) => {
      const updated = prev.map((col) => {
        if (col.id === colId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        }
        return col;
      });
      persistBoard(updated);
      return updated;
    });

    if (selectedCardInfo?.card.id === cardId) {
      setSelectedCardInfo(null);
    }
  };

  const handleCardClick = (card: CardData, col: ColumnData) => {
    setSelectedCardInfo({
      card,
      columnTitle: col.title,
      columnId: col.id,
    });
  };

  return (
    <div className="w-full h-full bg-neutral-50 p-6 md:p-8 transition-colors flex flex-col font-sans overflow-hidden">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Manager Project Board</h1>
        </div>

        {/* Global Sort Toolbar */}
        <div className="flex items-center gap-1.5 bg-neutral-200/65 p-1 rounded-xl border border-neutral-300/80 self-start sm:self-auto shadow-2xs">
          <span className="text-xs font-semibold text-neutral-600 px-2.5 flex items-center gap-1.5">
            <ArrowUpDown size={13} className="text-neutral-500" />
            Sort All:
          </span>
          <button
            type="button"
            onClick={() => handleSetGlobalSort("newest")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isAllNewest
                ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60"
            }`}
            title="Sort cards in all columns from newest to oldest"
          >
            <ArrowDownWideNarrow size={13} className={isAllNewest ? "text-blue-600" : "text-neutral-400"} />
            Newest to Oldest
          </button>
          <button
            type="button"
            onClick={() => handleSetGlobalSort("oldest")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isAllOldest
                ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60"
            }`}
            title="Sort cards in all columns from oldest to newest"
          >
            <ArrowUpNarrowWide size={13} className={isAllOldest ? "text-amber-600" : "text-neutral-400"} />
            Oldest to Newest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-2 flex-1 w-full min-h-0">
        {board.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            sortOrder={columnSortOrders[col.id] || "newest"}
            onToggleSort={() => handleToggleColumnSort(col.id)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onDeleteCard={handleDeleteCard}
            onCardClick={(card) => handleCardClick(card, col)}
          />
        ))}
      </div>

      {/* Full-Screen Issue Detail Modal */}
      {selectedCardInfo && (
        <CardDetailModal
          card={selectedCardInfo.card}
          columnTitle={selectedCardInfo.columnTitle}
          columnId={selectedCardInfo.columnId}
          onClose={() => setSelectedCardInfo(null)}
          onMoveColumn={handleMoveColumn}
          onDeleteCard={handleDeleteCard}
          currentManager={user}
        />
      )}
    </div>
  );
}

export default KanbanBoard;

// --- Column Component ---

interface KanbanColumnProps {
  col: ColumnData;
  sortOrder: SortOrder;
  onToggleSort: () => void;
  onDragStart: (e: React.DragEvent, card: CardData, colId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, colId: string) => void;
  onDeleteCard: (colId: string, cardId: string) => void;
  onCardClick: (card: CardData) => void;
}

function KanbanColumn({
  col,
  sortOrder,
  onToggleSort,
  onDragStart,
  onDragEnd,
  onDrop,
  onDeleteCard,
  onCardClick,
}: KanbanColumnProps) {
  // Intelligently sort cards based on active column sort order
  const sortedCards = React.useMemo(() => {
    return [...col.cards].sort((a, b) => {
      const tA = getCardTimestamp(a);
      const tB = getCardTimestamp(b);
      return sortOrder === "newest" ? tB - tA : tA - tB;
    });
  }, [col.cards, sortOrder]);

  return (
    <div
      className="flex flex-col w-full h-full min-h-0 bg-neutral-100/90 border border-neutral-200/90 rounded-2xl p-4 overflow-hidden shadow-2xs"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => onDrop(e, col.id)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-neutral-800">
            {col.title}
          </h3>
          <span className="text-xs font-semibold bg-white text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200 shadow-2xs">
            {col.cards.length}
          </span>
        </div>

        {/* Column-level Sort Toggle */}
        <button
          type="button"
          onClick={onToggleSort}
          title={`Sort ${col.title}: currently ${
            sortOrder === "newest" ? "Newest to Oldest" : "Oldest to Newest"
          }. Click to switch order.`}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-950 transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
        >
          {sortOrder === "newest" ? (
            <>
              <ArrowDownWideNarrow size={13} className="text-blue-600 transition-transform group-hover:translate-y-0.5" />
              <span className="text-[11px] font-semibold">Newest</span>
            </>
          ) : (
            <>
              <ArrowUpNarrowWide size={13} className="text-amber-600 transition-transform group-hover:-translate-y-0.5" />
              <span className="text-[11px] font-semibold">Oldest</span>
            </>
          )}
        </button>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {sortedCards.map((card: CardData) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => onDragStart(e, card, col.id)}
              onDragEnd={onDragEnd}
            >
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <KanbanCard
                  card={card}
                  onClick={() => onCardClick(card)}
                  onDelete={() => onDeleteCard(col.id, card.id)}
                />
              </motion.div>
            </div>
          ))}
        </AnimatePresence>

        {/* Empty State Visual Hint */}
        {sortedCards.length === 0 && (
          <div className="h-32 rounded-xl border-2 border-dashed border-neutral-300/80 bg-neutral-50/60 flex flex-col items-center justify-center p-4 text-center">
            <span className="text-xs font-semibold text-neutral-600">
              {col.title === "To Do"
                ? "No pending safety concerns"
                : col.title === "In Progress"
                ? "No active audits in progress"
                : "No resolved concerns yet"}
            </span>
            <span className="text-[11px] text-neutral-400 mt-1">
              {col.title === "To Do"
                ? "Real concerns logged by workers appear here automatically."
                : "Drag cards here as field actions progress."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Card Component ---

function KanbanCard({
  card,
  onDelete,
  onClick,
}: {
  card: CardData;
  onDelete: () => void;
  onClick: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const getPriorityColor = (p?: Priority) => {
    switch (p) {
      case "High":
        return "text-red-700 bg-red-50 border border-red-200";
      case "Medium":
        return "text-amber-700 bg-amber-50 border border-amber-200";
      case "Low":
        return "text-blue-700 bg-blue-50 border border-blue-200";
      default:
        return "text-neutral-700 bg-neutral-100 border border-neutral-200";
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col w-full bg-white rounded-xl border border-neutral-200/90 shadow-2xs hover:border-neutral-400 hover:shadow-md transition-all duration-200 cursor-pointer active:cursor-grabbing overflow-visible hover:ring-1 hover:ring-neutral-900/10"
    >
      {/* Visual Hover Hint */}
      <div className="absolute top-3.5 right-10 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 pointer-events-none z-10">
        <Maximize2 size={10} /> Inspect Dossier
      </div>

      {/* Optional Cover Image */}
      {card.coverImage && (
        <div className="w-full h-28 overflow-hidden rounded-t-xl border-b border-neutral-200">
          <img
            src={card.coverImage}
            alt="Cover"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        {/* Subtle Drag Handle on Hover */}
        <div className="absolute top-1/2 -left-3 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400">
          <GripVertical size={16} />
        </div>

        {/* Header: Tags, Priority & Action Menu */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {card.tags?.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide bg-neutral-100 text-neutral-700 border border-neutral-200/60 uppercase"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${tag.dotColor}`} />
                {tag.label}
              </span>
            ))}
            {card.priority && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${getPriorityColor(
                  card.priority
                )}`}
              >
                {card.priority}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-neutral-100 text-neutral-800 border border-neutral-200 uppercase">
              {mapToLifeSavingRule(card.hazard, card.failed_barrier, card.observation || card.description).shortLabel}
            </span>
          </div>

          {/* Card Actions Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="text-neutral-400 hover:text-neutral-700 transition-colors p-1"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-28 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden z-20 py-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Body: Title & Description */}
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold text-neutral-900 leading-snug group-hover:text-blue-600 transition-colors">
            {card.title}
          </h4>
          {card.description && (
            <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          )}
        </div>

        {/* Footer: Meta details & Avatars */}
        <div className="flex items-center justify-between mt-1 pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-3 text-xs font-medium text-neutral-500">
            {(card.date || card.reportedAt) && (
              <div
                className="flex items-center gap-1"
                title={card.reportedAt ? `Logged: ${card.reportedAt}` : `Date: ${card.date}`}
              >
                <Calendar size={13} className="text-neutral-400" />
                <span className="text-[11px] font-medium text-neutral-600">
                  {card.date || card.reportedAt?.replace(/•.*$/, "").trim()}
                </span>
              </div>
            )}

            {card.tasksTotal !== undefined && card.tasksCompleted !== undefined && (
              <div className="flex items-center gap-1">
                <CheckCircle2
                  size={13}
                  className={card.tasksCompleted === card.tasksTotal ? "text-emerald-600" : "text-neutral-400"}
                />
                <span className="text-[11px]">
                  {card.tasksCompleted}/{card.tasksTotal}
                </span>
              </div>
            )}

            {card.comments !== undefined && card.comments > 0 && (
              <div className="flex items-center gap-1 hover:text-neutral-800 cursor-pointer transition-colors">
                <MessageSquare size={13} className="text-neutral-400" />
                <span className="text-[11px]">{card.comments}</span>
              </div>
            )}

            {card.attachments !== undefined && card.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip size={13} className="text-neutral-400" />
                <span className="text-[11px]">{card.attachments}</span>
              </div>
            )}
          </div>

          {/* Overlapping Avatars */}
          {card.avatars && card.avatars.length > 0 && (
            <div className="flex items-center -space-x-1.5 shrink-0 ml-2">
              {card.avatars.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt="Assignee"
                  className="w-6 h-6 rounded-full border-2 border-white object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
