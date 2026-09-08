"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usersData, type UserData } from "@/components/ui/datatable-1-utils/datatable-1-data";
import { Datatable1Pagination } from "@/components/ui/datatable-1-utils/datatable-1-pagination";
import { Datatable1Toolbar } from "@/components/ui/datatable-1-utils/datatable-1-toolbar";
import { LumaSpin } from "@/components/ui/luma-spin";

const ITEMS_PER_PAGE = 6;

const HEAD_CLASS =
  "p-4 font-medium text-sm text-muted-foreground uppercase tracking-wider";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

interface Datatable1Props {
  data?: UserData[];
  title?: string;
  description?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  onAction?: (action: string, user: UserData) => void;
  className?: string;
}

export function Datatable1({
  data = usersData,
  title,
  description,
  onRefresh,
  isLoading,
  className,
}: Datatable1Props = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = data.filter((user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      (user.station && user.station.toLowerCase().includes(q)) ||
      (user.badgeId && user.badgeId.toLowerCase().includes(q))
    );
  });

  const currentUsers = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className={cn("w-full max-w-7xl flex flex-col gap-6 my-8 mx-auto px-4 sm:px-6 lg:px-8", className)}>
      <Card className="pb-0 gap-0 shadow-sm border-border bg-card">
        <CardHeader className="border-b border-border gap-0 p-0">
          <Datatable1Toolbar
            title={title}
            description={description}
            searchQuery={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            onRefresh={onRefresh}
            isLoading={isLoading}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className={HEAD_CLASS}>User</TableHead>
                <TableHead className={HEAD_CLASS}>Role</TableHead>
                <TableHead className={HEAD_CLASS}>Last Login</TableHead>
                <TableHead className={HEAD_CLASS}>Joined Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <LumaSpin size={44} />
                      <span className="text-xs text-muted-foreground font-medium">Synchronizing personnel records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-sm text-neutral-400 font-medium">
                    NOTHING TO SHOW HERE
                  </TableCell>
                </TableRow>
              ) : (
                currentUsers.map((user, idx) => (
                  <TableRow key={`${user.id || "usr"}-${user.email || ""}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 bg-muted border border-border">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <span>{user.name}</span>
                            {user.badgeId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                {user.badgeId}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                          {user.station && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span>{user.station}</span>
                              {user.radioChannel && <span>• {user.radioChannel}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{user.role}</span>
                    </TableCell>
                    <TableCell className="p-4 text-sm font-medium text-foreground">
                      {user.lastLogin}
                    </TableCell>
                    <TableCell className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                      {user.joinedDate}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Datatable1Pagination
            page={currentPage}
            pageSize={ITEMS_PER_PAGE}
            total={filteredData.length}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default Datatable1;
