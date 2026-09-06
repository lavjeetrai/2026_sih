"use client";

import * as React from "react";
import { ChevronDown, Search, RefreshCw, Users, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type UserSessionData } from "./auth-form-1";

interface PersonnelUser {
  name: string;
  email: string;
  badgeId: string;
  designation: string;
  station: string;
  radioChannel: string;
  phone: string;
  avatarUrl?: string;
  role: "worker" | "manager";
  status: "pending" | "approved" | "rejected";
  createdAt: string | Date;
}

interface PersonnelTableProps {
  currentManager?: UserSessionData | null;
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d: string | Date) {
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return String(d); }
}

const HEAD = "px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap";
const ITEMS_PER_PAGE = 8;

export function PersonnelTable({ currentManager }: PersonnelTableProps) {
  const [activeTab, setActiveTab] = React.useState<"officers" | "managers">("officers");
  const [users, setUsers] = React.useState<PersonnelUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth?type=all");
      const json = await res.json();
      if (json.success && Array.isArray(json.users)) setUsers(json.users);
    } catch (err) {
      console.warn("[PersonnelTable] Failed to fetch:", err);
    } finally { setIsLoading(false); }
  }, []);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const officers = React.useMemo(() => users.filter((u) => u.role === "worker" && u.status === "approved"), [users]);
  const managers = React.useMemo(() => users.filter((u) => u.role === "manager" && u.status === "approved"), [users]);
  const source = activeTab === "officers" ? officers : managers;

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return source;
    return source.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.badgeId.toLowerCase().includes(q) ||
      u.station.toLowerCase().includes(q) ||
      u.designation.toLowerCase().includes(q)
    );
  }, [source, searchQuery]);

  React.useEffect(() => { setPage(1); }, [activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50/70 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-neutral-900">Personnel</h1>
          <button type="button" onClick={fetchUsers} className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer" title="Refresh">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setActiveTab("officers")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border", activeTab === "officers" ? "bg-neutral-900 text-white border-neutral-900 shadow-xs" : "bg-neutral-100/80 text-neutral-600 border-neutral-200/70 hover:bg-neutral-200/70")}>
              <Users className="w-3.5 h-3.5" />
              <span>Field Officers</span>
              <span className={cn("px-1.5 rounded-full text-[10px] font-bold", activeTab === "officers" ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-700")}>{officers.length}</span>
            </button>
            <button type="button" onClick={() => setActiveTab("managers")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border", activeTab === "managers" ? "bg-neutral-900 text-white border-neutral-900 shadow-xs" : "bg-neutral-100/80 text-neutral-600 border-neutral-200/70 hover:bg-neutral-200/70")}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Managers</span>
              <span className={cn("px-1.5 rounded-full text-[10px] font-bold", activeTab === "managers" ? "bg-neutral-700 text-white" : "bg-neutral-200 text-neutral-700")}>{managers.length}</span>
            </button>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input type="text" placeholder="Search name, badge, station..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs bg-white h-8 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><RefreshCw className="w-5 h-5 animate-spin text-neutral-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-16">{searchQuery ? "No match found" : `No ${activeTab === "officers" ? "field officers" : "managers"} yet`}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
              <tr>
                <th className={HEAD}>Personnel</th>
                <th className={HEAD}>Badge ID</th>
                <th className={HEAD}>Designation</th>
                <th className={HEAD}>Station</th>
                <th className={HEAD}>Radio</th>
                <th className={HEAD}>Joined</th>
                <th className={HEAD}>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {paginated.map((user) => (
                <tr key={user.email} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 shrink-0 border border-neutral-200">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="bg-neutral-900 text-white text-xs font-bold">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate max-w-[180px]">{user.name}</p>
                        <p className="text-[11px] text-neutral-500 truncate max-w-[180px]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-[11px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200 whitespace-nowrap">{user.badgeId || "—"}</span></td>
                  <td className="px-4 py-3 max-w-[200px]"><p className="text-xs text-neutral-700 line-clamp-2 leading-snug">{user.designation || "—"}</p></td>
                  <td className="px-4 py-3"><p className="text-xs text-neutral-600 truncate max-w-[160px]">{user.station || "—"}</p></td>
                  <td className="px-4 py-3"><span className="font-mono text-[11px] text-neutral-600 whitespace-nowrap">{user.radioChannel || "—"}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs text-neutral-500">{formatDate(user.createdAt)}</span></td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs cursor-pointer text-neutral-600 hover:text-neutral-900">
                          Actions <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[140px]">
                        <DropdownMenuGroup>
                          <DropdownMenuItem className="cursor-pointer py-1.5 text-xs" onClick={() => { navigator.clipboard?.writeText(user.email); }}>Copy Email</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer py-1.5 text-xs" onClick={() => { navigator.clipboard?.writeText(user.phone || ""); }}>Copy Phone</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer py-1.5 text-xs" onClick={() => { navigator.clipboard?.writeText(user.radioChannel || ""); }}>Copy Radio Ch.</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filtered.length > ITEMS_PER_PAGE && (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-6 py-3 flex items-center justify-between text-xs text-neutral-500">
          <span>Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium transition-colors">Prev</button>
            <span className="px-2 font-semibold text-neutral-700">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2.5 py-1 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonnelTable;
