"use client";

import * as React from "react";
import { Search, Filter, SlidersHorizontal, UserPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Datatable1ToolbarProps {
  title?: string;
  description?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  selectedCount?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  onExport?: () => void;
  onAddUser?: () => void;
  children?: React.ReactNode;
}

export function Datatable1Toolbar({
  title = "Users Directory",
  description = "Manage system users, assigned roles, and security access levels.",
  searchQuery,
  onSearchChange,
  selectedCount = 0,
  onRefresh,
  isLoading = false,
  onExport,
  onAddUser,
  children,
}: Datatable1ToolbarProps) {
  const [internalSearch, setInternalSearch] = React.useState("");

  const searchValue = searchQuery !== undefined ? searchQuery : internalSearch;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2">

          {selectedCount > 0 ? (
            <div className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-md text-xs font-medium">
              <span>{selectedCount} selected</span>
            </div>
          ) : null}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-8 px-2.5 text-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          {onAddUser && (
            <Button
              size="sm"
              onClick={onAddUser}
              className="h-8 px-3 text-xs font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              <span>Add Member</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, badge..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Datatable1Toolbar;
