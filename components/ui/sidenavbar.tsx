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
          "flex flex-col border-r border-neutral-800 bg-neutral-950 text-white transition-all duration-300 ease-in-out shrink-0 select-none"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-800 px-4">
          <span
            className={cn(
              isOpen ? "block" : "hidden",
              "text-lg font-semibold tracking-tight"
            )}
          >
            Menu
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="text-neutral-400 hover:text-white hover:bg-neutral-800"
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
                "w-full justify-start text-neutral-300 hover:text-white hover:bg-neutral-800",
                activeItem === "Home" && "bg-neutral-800 text-white"
              )}
            >
              <Home className="mr-2 h-4 w-4 shrink-0" />
              {isOpen && "Home"}
            </Button>

            <Button
              variant="ghost"
              onClick={() => onSelect?.("Analytics")}
              className={cn(
                "w-full justify-start text-neutral-300 hover:text-white hover:bg-neutral-800",
                activeItem === "Analytics" && "bg-neutral-800 text-white font-medium"
              )}
            >
              <BarChart3 className="mr-2 h-4 w-4 shrink-0 text-indigo-400" />
              {isOpen && "Analytics"}
            </Button>

            {isOpen ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-300 hover:text-white hover:bg-neutral-800"
                  >
                    <Package className="mr-2 h-4 w-4 shrink-0" />
                    <span>Products</span>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-4 space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.("Category 1")}
                    className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-800/60 text-xs"
                  >
                    Category 1
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.("Category 2")}
                    className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-800/60 text-xs"
                  >
                    Category 2
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect?.("Category 3")}
                    className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-800/60 text-xs"
                  >
                    Category 3
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-center text-neutral-300 hover:text-white hover:bg-neutral-800"
              >
                <Package className="h-4 w-4 shrink-0" />
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => onSelect?.("Users")}
              className={cn(
                "w-full justify-start text-neutral-300 hover:text-white hover:bg-neutral-800",
                activeItem === "Users" && "bg-neutral-800 text-white"
              )}
            >
              <Users className="mr-2 h-4 w-4 shrink-0" />
              {isOpen && "Users"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onSelect?.("Settings")}
              className={cn(
                "w-full justify-start text-neutral-300 hover:text-white hover:bg-neutral-800",
                activeItem === "Settings" && "bg-neutral-800 text-white"
              )}
            >
              <Settings className="mr-2 h-4 w-4 shrink-0" />
              {isOpen && "Settings"}
            </Button>
          </nav>
        </ScrollArea>

        {/* User Profile Footer in Navbar Bottom */}
        {user && (
          <div className="p-2 border-t border-neutral-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-850 transition-colors text-left group cursor-pointer",
                    !isOpen && "justify-center px-0"
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-neutral-700/60">
                    <AvatarImage src={user.avatarUrl} alt={user.name || "User"} />
                    <AvatarFallback className="bg-neutral-800 text-neutral-200 text-xs font-semibold">
                      {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOpen && (
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate leading-tight">
                          {user.name || "User"}
                        </span>
                        <span className="text-xs text-neutral-400 truncate leading-tight capitalize">
                          {user.role} · {user.email}
                        </span>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 text-neutral-500 group-hover:text-white shrink-0 ml-1" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56 bg-neutral-900 border-neutral-800 text-neutral-200"
              >
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-white leading-none">
                      {user.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-neutral-400">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-800" />
                <DropdownMenuItem className="focus:bg-neutral-800 focus:text-white cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-neutral-800 focus:text-white cursor-pointer">
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span>Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-800" />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer font-medium"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-neutral-950">
        {children}
      </main>
    </div>
  );
}

export default Sidenavbar;
