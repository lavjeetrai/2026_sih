"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Datatable1PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Datatable1Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: Datatable1PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-card text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span>Showing</span>
        <span className="font-semibold text-foreground">{startItem}</span>
        <span>to</span>
        <span className="font-semibold text-foreground">{endItem}</span>
        <span>of</span>
        <span className="font-semibold text-foreground">{total}</span>
        <span>entries</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer disabled:opacity-40"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">First page</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer disabled:opacity-40"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>

        <div className="flex items-center px-2 font-medium text-foreground">
          Page {page} of {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer disabled:opacity-40"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer disabled:opacity-40"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Last page</span>
        </Button>
      </div>
    </div>
  );
}

export default Datatable1Pagination;
