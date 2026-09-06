"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  ChevronRight,
  ChevronsUpDown,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  Sparkles,
  User as UserIcon,
  Users,
} from "lucide-react";
import { type UserSessionData } from "@/components/ui/auth-form-1";
import { cn } from "@/lib/utils";

interface SidenavbarProps {
  children?: React.ReactNode;
  user?: UserSessionData | null;
  onLogout?: () => void;
  activeItem?: string;
  onSelect?: (item: string) => void;
  className?: string;
}

export function Sidenavbar({
  children,
  user,
  onLogout,
  activeItem = "Home",
  onSelect,
  className,
}: SidenavbarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={cn("flex h-full w-full", className)}>
      <aside
        className={cn(
          isOpen ? "w-64" : "w-16",
          "flex flex-col border-r border-neutral-200 bg-white text-neutral-900 transition-all duration-300 ease-in-out shrink-0 select-none shadow-xs"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
          <span
            className={cn(
              isOpen ? "block" : "hidden",
              "text-lg font-semibold tracking-tight text-neutral-900"
            )}
          >
            Menu
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <Menu className="h-5 w-5" />
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

            {isOpen ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  >
                    <Package className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
                    <span>Observation Logs</span>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-neutral-400" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-4 space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.("Category 1")}
                    className="w-full justify-start text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 text-xs"
                  >
                    UA/UC Observations
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.("Category 2")}
                    className="w-full justify-start text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 text-xs"
                  >
                    Near Miss Reports
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.("Category 3")}
                    className="w-full justify-start text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 text-xs"
                  >
                    HIPO Incidents
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <Package className="h-4 w-4 shrink-0" />
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => onSelect?.("Users")}
              className={cn(
                "w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                activeItem === "Users" && "bg-neutral-100 text-neutral-900 font-semibold"
              )}
            >
              <Users className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
              {isOpen && "Users"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onSelect?.("Settings")}
              className={cn(
                "w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                activeItem === "Settings" && "bg-neutral-100 text-neutral-900 font-semibold"
              )}
            >
              <Settings className="mr-2 h-4 w-4 shrink-0 text-neutral-700" />
              {isOpen && "Settings"}
            </Button>
          </nav>
        </ScrollArea>

        {/* User Profile Footer in Navbar Bottom */}
        {user && (
          <div className="p-2 border-t border-neutral-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 transition-colors text-left group cursor-pointer",
                    !isOpen && "justify-center px-0"
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-neutral-200">
                    <AvatarImage src={user.avatarUrl} alt={user.name || "User"} />
                    <AvatarFallback className="bg-neutral-100 text-neutral-800 text-xs font-semibold">
                      {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOpen && (
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-neutral-900 truncate leading-tight">
                          {user.name || "User"}
                        </span>
                        <span className="text-xs text-neutral-500 truncate leading-tight capitalize">
                          {user.role} · {user.email}
                        </span>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 shrink-0 ml-1" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56 bg-white border-neutral-200 text-neutral-800 shadow-lg"
              >
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-neutral-900 leading-none">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-neutral-500">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-100" />
                <DropdownMenuItem className="focus:bg-neutral-100 focus:text-neutral-900 cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4 text-neutral-600" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-neutral-100 focus:text-neutral-900 cursor-pointer">
                  <Sparkles className="mr-2 h-4 w-4 text-neutral-600" />
                  <span>Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-100" />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-medium"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-neutral-50">
        {children}
      </main>
    </div>
  );
}

export default Sidenavbar;
