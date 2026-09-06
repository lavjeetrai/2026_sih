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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types & Initial Data ---

export type Priority = "Low" | "Medium" | "High";

export interface Tag {
  label: string;
  dotColor: string;
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
}

export interface ColumnData {
  id: string;
  title: string;
  cards: CardData[];
}

const INITIAL_BOARD: ColumnData[] = [
  {
    id: "col-1",
    title: "To Do",
    cards: [
      {
        id: "c-1",
        title: "Rig-04 Moran: Unlatched Derrick Harness",
        description: "Audit derrick monkey board fall arresters and replace worn safety lanyards.",
        tags: [{ label: "Height Work", dotColor: "bg-red-500" }],
        priority: "High",
        date: "Oct 15",
        comments: 3,
        attachments: 2,
        avatars: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"],
      },
      {
        id: "c-2",
        title: "Duliajan GGS: Fixed H2S Sensor Recalibration",
        coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
        tags: [{ label: "Gas Safety", dotColor: "bg-blue-500" }],
        priority: "High",
        comments: 12,
        avatars: [
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
        ],
      },
    ],
  },
  {
    id: "col-2",
    title: "In Progress",
    cards: [
      {
        id: "c-3",
        title: "Naharkatiya Rig-2: Crane Sling Inspection",
        description: "Inspect 30-ton BOP crane wire rope and certify lifting gear before rigging.",
        tags: [{ label: "Lifting", dotColor: "bg-orange-500" }],
        priority: "High",
        date: "Oct 12",
        tasksCompleted: 2,
        tasksTotal: 5,
        avatars: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"],
      },
    ],
  },
  {
    id: "col-3",
    title: "Done",
    cards: [
      {
        id: "c-4",
        title: "Digboi GGS: LOTO Verification for Separator",
        tags: [{ label: "Isolation", dotColor: "bg-green-500" }],
        priority: "Low",
        date: "Oct 01",
        attachments: 4,
        avatars: ["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80"],
      },
    ],
  },
];

export function KanbanBoard() {
  const [board, setBoard] = useState<ColumnData[]>(INITIAL_BOARD);
  const [draggingCard, setDraggingCard] = useState<{ card: CardData; sourceColId: string } | null>(null);

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

      // Remove from source
      newBoard[sourceColIndex] = {
        ...newBoard[sourceColIndex],
        cards: newBoard[sourceColIndex].cards.filter((c) => c.id !== draggingCard.card.id),
      };

      // Add to target
      newBoard[targetColIndex] = {
        ...newBoard[targetColIndex],
        cards: [...newBoard[targetColIndex].cards, draggingCard.card],
      };

      return newBoard;
    });
  };

  // --- Interactive Actions ---
  const handleAddCard = (columnId: string, title: string) => {
    const newCard: CardData = {
      id: `c-${Date.now()}`,
      title,
      tags: [{ label: "Task", dotColor: "bg-blue-500" }],
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };

    setBoard((prev) =>
      prev.map((col) => {
        if (col.id === columnId) {
          return { ...col, cards: [newCard, ...col.cards] };
        }
        return col;
      })
    );
  };

  const handleDeleteCard = (colId: string, cardId: string) => {
    setBoard((prev) =>
      prev.map((col) => {
        if (col.id === colId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        }
        return col;
      })
    );
  };

  return (
    <div className="w-full h-full bg-neutral-50 p-6 md:p-8 transition-colors flex flex-col font-sans overflow-hidden">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Manager Project Board</h1>
          <p className="text-sm text-neutral-500 mt-1">Track safety interventions, field tasks, and team milestones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-2 flex-1 w-full min-h-0">
        {board.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
          />
        ))}
      </div>
    </div>
  );
}

export default KanbanBoard;

// --- Column Component ---

interface KanbanColumnProps {
  col: ColumnData;
  onDragStart: (e: React.DragEvent, card: CardData, colId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, colId: string) => void;
  onAddCard: (colId: string, title: string) => void;
  onDeleteCard: (colId: string, cardId: string) => void;
}

function KanbanColumn({
  col,
  onDragStart,
  onDragEnd,
  onDrop,
  onAddCard,
  onDeleteCard,
}: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const submitNewCard = () => {
    if (newTaskTitle.trim()) {
      onAddCard(col.id, newTaskTitle);
    }
    setNewTaskTitle("");
    setIsAdding(false);
  };

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
        <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
          {col.title}
          <span className="text-xs font-semibold bg-white text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200 shadow-2xs">
            {col.cards.length}
          </span>
        </h3>
        <button className="text-neutral-400 hover:text-neutral-700 transition-colors p-1">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto pr-1">
        <AnimatePresence>
          {col.cards.map((card: CardData) => (
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
              >
                <KanbanCard card={card} onDelete={() => onDeleteCard(col.id, card.id)} />
              </motion.div>
            </div>
          ))}
        </AnimatePresence>

        {/* Empty State Visual Hint */}
        {col.cards.length === 0 && !isAdding && (
          <div className="h-24 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center text-xs text-neutral-400">
            Drop tasks here
          </div>
        )}

        {/* Add Card Inline Input */}
        {isAdding ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1">
            <input
              autoFocus
              type="text"
              placeholder="What needs to be done?"
              className="w-full p-3 text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-400 shadow-sm transition-all"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewCard();
                if (e.key === "Escape") setIsAdding(false);
              }}
              onBlur={() => {
                if (newTaskTitle.trim()) submitNewCard();
                else setIsAdding(false);
              }}
            />
          </motion.div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            type="button"
            className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 hover:text-neutral-800 hover:border-neutral-400 bg-white/60 transition-colors text-xs font-semibold"
          >
            <Plus size={14} /> Add Task
          </button>
        )}
      </div>
    </div>
  );
}

// --- Card Component ---

function KanbanCard({ card, onDelete }: { card: CardData; onDelete: () => void }) {
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
    <div className="group relative flex flex-col w-full bg-white rounded-xl border border-neutral-200/90 shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing overflow-visible">
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
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-28 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden z-20 py-1">
                  <button
                    type="button"
                    onClick={() => {
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
          <h4 className="text-sm font-semibold text-neutral-900 leading-snug">
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
            {card.date && (
              <div className="flex items-center gap-1">
                <Calendar size={13} className="text-neutral-400" />
                <span className="text-[11px]">{card.date}</span>
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
