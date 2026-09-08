"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3,
  ChevronsUpDown,
  History,
  Home,
  LogOut,
  Menu,
  Users,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { type UserSessionData } from "@/components/ui/auth-form-1";
import { UserProfileOverlay } from "@/components/ui/profile-card-1";
import { cn } from "@/lib/utils";

interface SidenavbarProps {
  children?: React.ReactNode;
  user?: UserSessionData | null;
  onLogout?: () => void;
  onUpdateUser?: (user: UserSessionData) => void;
  activeItem?: string;
  onSelect?: (item: string) => void;
  className?: string;
}

export function Sidenavbar({
  children,
  user,
  onLogout,
  onUpdateUser,
  activeItem = "Home",
  onSelect,
  className,
}: SidenavbarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch("/api/auth");
        const json = await res.json();
        if (json.success && typeof json.pendingCount === "number") {
          setPendingCount(json.pendingCount);
        }
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex h-full w-full", className)}>
      <aside
        className={cn(
          isOpen ? "w-64" : "w-16",
          "flex flex-col border-r border-neutral-200 bg-white text-neutral-900 transition-all duration-300 ease-in-out shrink-0 select-none shadow-xs"
        )}
      >
        {/* Sidebar Header / Toggle */}
        <div className="flex h-12 items-center justify-between border-b border-neutral-200 px-3 shrink-0">
          <span
            className={cn(
              isOpen ? "block" : "hidden",
              "text-xs font-bold uppercase tracking-wider text-neutral-400"
            )}
          >
            Menu
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 h-8 w-8 ml-auto"
            title={isOpen ? "Collapse menu" : "Expand menu"}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            <Button
              variant="ghost"
              onClick={() => onSelect?.("Home")}
              className={cn(
                "w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                activeItem === "Home" && "bg-neutral-100 text-neutral-900 font-semibold"
              )}
            >
              <Home className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
              {isOpen && "Home"}
            </Button>

            {user?.role === "worker" && (
              <Button
                variant="ghost"
                onClick={() => onSelect?.("History")}
                className={cn(
                  "w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                  activeItem === "History" && "bg-neutral-100 text-neutral-900 font-semibold"
                )}
              >
                <History className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
                {isOpen && "Concern History"}
              </Button>
            )}

            {user?.role !== "worker" && (
              <Button
                variant="ghost"
                onClick={() => onSelect?.("Analytics")}
                className={cn(
                  "w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                  activeItem === "Analytics" && "bg-neutral-100 text-neutral-900 font-semibold"
                )}
              >
                <BarChart3 className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
                {isOpen && "Analytics"}
              </Button>
            )}


            {user?.role === "manager" && (
              <Button
                variant="ghost"
                onClick={() => onSelect?.("Users")}
                className={cn(
                  "w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 relative",
                  activeItem === "Users" && "bg-neutral-100 text-neutral-900 font-semibold"
                )}
              >
                <div className="relative">
                  <Users className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
                  {!isOpen && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse ring-2 ring-white" />
                  )}
                </div>
                {isOpen && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">Users</span>
                    {pendingCount > 0 && (
                      <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => onSelect?.("FixLedger")}
              className={cn(
                "w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                activeItem === "FixLedger" && "bg-neutral-100 text-neutral-900 font-semibold"
              )}
            >
              <ShieldCheck className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
              {isOpen && "FixLedger"}
            </Button>
          </nav>
        </ScrollArea>

        {/* User Profile Footer in Navbar Bottom */}
        {user && (
          <div className="p-2 border-t border-neutral-200 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setIsProfileCardOpen((prev) => !prev)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 active:bg-neutral-200 transition-all text-left group cursor-pointer border border-transparent hover:border-neutral-200/80 hover:shadow-xs",
                !isOpen && "justify-center px-0",
                isProfileCardOpen && "bg-neutral-100 border-neutral-200/90 shadow-2xs"
              )}
              title="Click to view full Profile Card"
              aria-label="View user profile card"
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-neutral-200 group-hover:ring-neutral-400 transition-all">
                <AvatarImage src={user.avatarUrl} alt={user.name || "User"} />
                <AvatarFallback className="bg-neutral-900 text-white text-xs font-semibold">
                  {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOpen && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-neutral-900 truncate leading-tight group-hover:text-emerald-700 transition-colors">
                      {user.name || "User"}
                    </span>
                    <span className="text-[11px] text-neutral-500 truncate leading-tight font-mono">
                      {user.badgeId || user.role}
                    </span>
                  </div>
                  <ChevronsUpDown
                    className={cn(
                      "h-4 w-4 text-neutral-400 group-hover:text-neutral-700 shrink-0 ml-1 transition-transform duration-200",
                      isProfileCardOpen && "rotate-180 text-neutral-900"
                    )}
                  />
                </div>
              )}
            </button>

            {/* Direct Sign Out Button at bottom of sidebar */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-600 hover:text-red-700 hover:bg-red-50 border border-neutral-200/70 hover:border-red-200 transition-colors cursor-pointer text-xs font-medium",
                  !isOpen && "justify-center px-0"
                )}
                title="Sign Out of Session"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                {isOpen && <span>Sign Out</span>}
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Interactive Glassmorphism Profile Card for Officers & Managers */}
      <UserProfileOverlay
        user={user || null}
        isOpen={isProfileCardOpen}
        onClose={() => setIsProfileCardOpen(false)}
        onLogout={onLogout}
        onUpdateUser={onUpdateUser}
        sidebarOpen={isOpen}
      />

      <main className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-neutral-50">
        {children}
      </main>
    </div>
  );
}

export default Sidenavbar;
