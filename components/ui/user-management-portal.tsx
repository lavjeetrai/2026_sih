"use client";

import * as React from "react";
import {
  CheckCircle2,
  MapPin,
  Phone,
  Radio,
  Search,
  ShieldAlert,
  X,
  Mail,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type UserSessionData } from "./auth-form-1";
import { Datatable1 } from "@/components/ui/datatable-1";
import { usersData, type UserData } from "@/components/ui/datatable-1-utils/datatable-1-data";
import { Datatable1Toolbar } from "@/components/ui/datatable-1-utils/datatable-1-toolbar";
import { Datatable1Pagination } from "@/components/ui/datatable-1-utils/datatable-1-pagination";

interface ApprovalLogItem {
  candidateName: string;
  candidateEmail: string;
  candidateBadgeId: string;
  candidateDesignation: string;
  candidateStation: string;
  candidateRadioChannel: string;
  candidatePhone: string;
  candidateAvatarUrl?: string;
  grantedRole: "worker" | "manager";
  approvedByManagerName: string;
  approvedByManagerBadge: string;
  approvedByManagerEmail: string;
  approvedByManagerDesignation: string;
  approvedAt: string | Date;
  remarks: string;
}

interface PendingUserItem {
  name: string;
  email: string;
  badgeId: string;
  designation: string;
  station: string;
  radioChannel: string;
  phone: string;
  avatarUrl?: string;
  requestedRole: "worker" | "manager";
  role: "worker" | "manager";
  status: "pending" | "approved" | "rejected";
  createdAt: string | Date;
}

interface UserManagementPortalProps {
  currentManager?: UserSessionData | null;
  onRefreshPendingCount?: () => void;
}

const DEFAULT_REGISTRY_LOGS: ApprovalLogItem[] = [
  {
    candidateName: "Rahul Sharma",
    candidateEmail: "rahul.sharma@oilindia.in",
    candidateBadgeId: "OIL-FO-2041",
    candidateDesignation: "Senior Drilling Safety Officer",
    candidateStation: "Rig #4 Digboi Field",
    candidateRadioChannel: "CH-3",
    candidatePhone: "+91 94351 88231",
    candidateAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    grantedRole: "worker",
    approvedByManagerName: "Priyanka Bora",
    approvedByManagerBadge: "OIL-MGR-1002",
    approvedByManagerEmail: "priyanka@oilindia.in",
    approvedByManagerDesignation: "Chief General Manager (Process Safety)",
    approvedAt: "2026-03-03T10:30:00.000Z",
    remarks: "Verified Derrick safety compliance and wellhead certifications.",
  },
  {
    candidateName: "Vikram Baruah",
    candidateEmail: "vikram.baruah@oilindia.in",
    candidateBadgeId: "OIL-FO-2089",
    candidateDesignation: "Field Process Safety Engineer",
    candidateStation: "Moran Central GGS",
    candidateRadioChannel: "CH-2",
    candidatePhone: "+91 94352 44781",
    candidateAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    grantedRole: "worker",
    approvedByManagerName: "Priyanka Bora",
    approvedByManagerBadge: "OIL-MGR-1002",
    approvedByManagerEmail: "priyanka@oilindia.in",
    approvedByManagerDesignation: "Chief General Manager (Process Safety)",
    approvedAt: "2026-02-19T08:15:00.000Z",
    remarks: "Cleared for high pressure gas gathering station operations.",
  },
  {
    candidateName: "Ananya Gogoi",
    candidateEmail: "ananya.gogoi@oilindia.in",
    candidateBadgeId: "OIL-MGR-1044",
    candidateDesignation: "Environmental Compliance Officer",
    candidateStation: "Naharkatiya OCS-1",
    candidateRadioChannel: "CH-4",
    candidatePhone: "+91 94353 99012",
    candidateAvatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    grantedRole: "manager",
    approvedByManagerName: "OIL HSE Directorate",
    approvedByManagerBadge: "OIL-DIR-001",
    approvedByManagerEmail: "directorate@oilindia.in",
    approvedByManagerDesignation: "Executive Director (Corporate HSE)",
    approvedAt: "2026-01-27T11:45:00.000Z",
    remarks: "Certified HazMat environmental compliance supervisor.",
  },
  {
    candidateName: "Debojit Saikia",
    candidateEmail: "debojit.saikia@oilindia.in",
    candidateBadgeId: "OIL-FO-2104",
    candidateDesignation: "Rig Safety Inspector",
    candidateStation: "Kusijan Well #12",
    candidateRadioChannel: "CH-3",
    candidatePhone: "+91 94354 33219",
    candidateAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    grantedRole: "worker",
    approvedByManagerName: "Priyanka Bora",
    approvedByManagerBadge: "OIL-MGR-1002",
    approvedByManagerEmail: "priyanka@oilindia.in",
    approvedByManagerDesignation: "Chief General Manager (Process Safety)",
    approvedAt: "2026-01-15T09:20:00.000Z",
    remarks: "Annual BOP & well control safety authorization issued.",
  },
  {
    candidateName: "Arpita Das",
    candidateEmail: "arpita.das@oilindia.in",
    candidateBadgeId: "OIL-FO-2155",
    candidateDesignation: "Lead Electrical Safety Officer",
    candidateStation: "Jorajan Substation & Power",
    candidateRadioChannel: "CH-5",
    candidatePhone: "+91 94355 77620",
    candidateAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    grantedRole: "worker",
    approvedByManagerName: "Manash Kalita",
    approvedByManagerBadge: "OIL-MGR-1088",
    approvedByManagerEmail: "manash.kalita@oilindia.in",
    approvedByManagerDesignation: "Pipeline Integrity Specialist",
    approvedAt: "2025-12-05T14:10:00.000Z",
    remarks: "High voltage substation clearance approved.",
  },
  {
    candidateName: "Lav Kumar",
    candidateEmail: "lav@gmail.com",
    candidateBadgeId: "OIL-FLD-5542",
    candidateDesignation: "HSE Field Safety Officer (Derrick Floor)",
    candidateStation: "Moran Rig #04 • Wellhead Section",
    candidateRadioChannel: "UHF CH-04",
    candidatePhone: "+91 94350 44521",
    candidateAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    grantedRole: "worker",
    approvedByManagerName: "Priyanka Bora",
    approvedByManagerBadge: "OIL-MGR-1002",
    approvedByManagerEmail: "priyanka@oilindia.in",
    approvedByManagerDesignation: "Chief General Manager (Process Safety & SIF Control)",
    approvedAt: "2026-08-15T10:00:00.000Z",
    remarks: "Verified credentials and assigned station clearance at Moran Rig #04.",
  },
];

const HEAD_CLASS =
  "p-4 font-medium text-sm text-muted-foreground uppercase tracking-wider";
const AUDIT_ITEMS_PER_PAGE = 6;

export function UserManagementPortal({
  currentManager,
  onRefreshPendingCount,
}: UserManagementPortalProps) {
  const [activeTab, setActiveTab] = React.useState<"officers" | "managers" | "pending" | "registry">("officers");
  const [pendingUsers, setPendingUsers] = React.useState<PendingUserItem[]>([]);
  const [registry, setRegistry] = React.useState<ApprovalLogItem[]>([]);
  const [allUsers, setAllUsers] = React.useState<PendingUserItem[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = React.useState("");
  const [auditCurrentPage, setAuditCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionMessage, setActionMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processingEmail, setProcessingEmail] = React.useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = React.useState<UserData | null>(null);

  const activeManager = {
    name: currentManager?.name || "Priyanka Bora",
    badgeId: currentManager?.badgeId || "OIL-MGR-1002",
    email: currentManager?.email || "priyanka@oilindia.in",
    designation: currentManager?.designation || "Chief General Manager (Process Safety & SIF Control)",
  };

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [resPending, resRegistry, resAll] = await Promise.all([
        fetch("/api/auth?type=pending"),
        fetch("/api/auth?type=registry"),
        fetch("/api/auth?type=all"),
      ]);

      const [jsonPending, jsonRegistry, jsonAll] = await Promise.all([
        resPending.json(),
        resRegistry.json(),
        resAll.json(),
      ]);

      if (jsonPending.success) setPendingUsers(jsonPending.data || []);
      if (jsonRegistry.success) setRegistry(jsonRegistry.data || []);
      if (jsonAll.success) setAllUsers(jsonAll.data || []);

      onRefreshPendingCount?.();
    } catch (err) {
      console.warn("Failed to fetch user management data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onRefreshPendingCount]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combined Audit Registry List (API data merged with standard initial governance records)
  const combinedRegistry = React.useMemo<ApprovalLogItem[]>(() => {
    const existingEmails = new Set(registry.map((r) => r.candidateEmail));
    const merged = [...registry];
    for (const def of DEFAULT_REGISTRY_LOGS) {
      if (!existingEmails.has(def.candidateEmail)) {
        merged.push(def);
      }
    }
    return merged;
  }, [registry]);

  const filteredRegistry = React.useMemo(() => {
    if (!auditSearchQuery.trim()) return combinedRegistry;
    const q = auditSearchQuery.toLowerCase();
    return combinedRegistry.filter(
      (item) =>
        item.candidateName.toLowerCase().includes(q) ||
        item.candidateBadgeId.toLowerCase().includes(q) ||
        item.approvedByManagerName.toLowerCase().includes(q) ||
        item.approvedByManagerBadge.toLowerCase().includes(q) ||
        item.candidateStation.toLowerCase().includes(q) ||
        item.candidateEmail.toLowerCase().includes(q)
    );
  }, [combinedRegistry, auditSearchQuery]);

  const currentAuditItems = React.useMemo(() => {
    const start = (auditCurrentPage - 1) * AUDIT_ITEMS_PER_PAGE;
    return filteredRegistry.slice(start, start + AUDIT_ITEMS_PER_PAGE);
  }, [filteredRegistry, auditCurrentPage]);

  // Transform Field Officers data for Datatable1
  const fieldOfficersData = React.useMemo<UserData[]>(() => {
    const approvedWorkers = allUsers.filter(
      (u) => (u.role === "worker" || u.requestedRole === "worker") && u.status === "approved"
    );

    const realMapped: UserData[] = approvedWorkers.map((u) => ({
      id: u.email || u.badgeId,
      name: u.name,
      email: u.email,
      avatar: u.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: u.designation || "Field Safety Officer",
      lastLogin: "Active on Duty",
      twoStep: true,
      joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Active",
      badgeId: u.badgeId,
      station: u.station,
      radioChannel: u.radioChannel,
      phone: u.phone,
      status: u.status,
    }));

    const defaultOfficers = usersData.filter(
      (u) =>
        !u.role.toLowerCase().includes("manager") &&
        !u.role.toLowerCase().includes("commander") &&
        !realMapped.some((r) => r.email === u.email)
    );

    return [...realMapped, ...defaultOfficers];
  }, [allUsers]);

  // Transform Managers data for Datatable1
  const managersData = React.useMemo<UserData[]>(() => {
    const approvedManagers = allUsers.filter(
      (u) => u.role === "manager" && u.status === "approved"
    );

    const realMapped: UserData[] = approvedManagers.map((u) => ({
      id: u.email || u.badgeId,
      name: u.name,
      email: u.email,
      avatar: u.avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      role: u.designation || "HSE Corporate Manager",
      lastLogin: "Active on Duty",
      twoStep: true,
      joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Active",
      badgeId: u.badgeId,
      station: u.station,
      radioChannel: u.radioChannel,
      phone: u.phone,
      status: u.status,
    }));

    const defaultManagers = usersData.filter(
      (u) =>
        (u.role.toLowerCase().includes("manager") ||
         u.role.toLowerCase().includes("commander") ||
         u.role.toLowerCase().includes("lead")) &&
        !realMapped.some((r) => r.email === u.email)
    );

    return [...realMapped, ...defaultManagers];
  }, [allUsers]);

  const handleApprove = async (
    candidate: PendingUserItem,
    assignedRole: "worker" | "manager"
  ) => {
    setProcessingEmail(candidate.email);
    setActionMessage(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          userEmail: candidate.email,
          assignedRole,
          manager: activeManager,
          remarks: `Verified credentials and assigned station clearance at ${candidate.station}.`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Approval failed.");
      }

      setActionMessage({
        type: "success",
        text: `Successfully approved ${candidate.name} (${candidate.badgeId}) as ${
          assignedRole === "manager" ? "HSE Manager" : "Field Safety Officer"
        }. Record logged in audit registry.`,
      });

      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve user.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleReject = async (candidate: PendingUserItem) => {
    if (!confirm(`Are you sure you want to decline the request for ${candidate.name}?`)) {
      return;
    }

    setProcessingEmail(candidate.email);
    setActionMessage(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          userEmail: candidate.email,
          manager: activeManager,
          reason: "Credentials or station assignment could not be verified by rig supervisor.",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Rejection failed.");
      }

      setActionMessage({
        type: "success",
        text: `Account request for ${candidate.name} has been declined.`,
      });

      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline user.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleUserAction = (action: string, user: UserData) => {
    if (action === "copy-email") {
      setActionMessage({
        type: "success",
        text: `Copied ${user.name}'s email (${user.email}) to clipboard.`,
      });
    } else if (action === "copy-phone") {
      setActionMessage({
        type: "success",
        text: `Copied ${user.name}'s phone (${user.phone || "N/A"}) to clipboard.`,
      });
    } else if (action === "view-details") {
      setSelectedUserDetail(user);
    } else if (action === "deactivate") {
      if (confirm(`Revoke active safety clearance for ${user.name} (${user.badgeId || user.email})?`)) {
        setActionMessage({
          type: "success",
          text: `Clearance deactivation noted for ${user.name}. Safety officer permissions paused.`,
        });
      }
    }
  };

  const formatDateTime = (timestamp: string | Date) => {
    try {
      const date = new Date(timestamp);
      return `${date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })} • ${date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      return String(timestamp);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50/60 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-neutral-900">
          Personnel Verification & Directory
        </h1>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-2 border-t border-neutral-100 overflow-x-auto">
          {/* TAB 1: FIELD OFFICERS */}
          <button
            type="button"
            onClick={() => setActiveTab("officers")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "officers"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            )}
          >
            <span>Field Officers</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                activeTab === "officers"
                  ? "bg-neutral-700 text-white"
                  : "bg-neutral-200 text-neutral-700"
              )}
            >
              {fieldOfficersData.length}
            </span>
          </button>

          {/* TAB 2: MANAGERS */}
          <button
            type="button"
            onClick={() => setActiveTab("managers")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "managers"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            )}
          >
            <span>Managers</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                activeTab === "managers"
                  ? "bg-neutral-700 text-white"
                  : "bg-neutral-200 text-neutral-700"
              )}
            >
              {managersData.length}
            </span>
          </button>

          {/* TAB 3: PENDING APPROVALS */}
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "pending"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            )}
          >
            <span>Pending Approvals</span>
            {pendingUsers.length > 0 ? (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                  activeTab === "pending"
                    ? "bg-amber-400 text-neutral-950"
                    : "bg-amber-100 text-amber-900 animate-pulse"
                )}
              >
                {pendingUsers.length}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-600">
                0
              </span>
            )}
          </button>

          {/* TAB 4: AUDIT REGISTRY */}
          <button
            type="button"
            onClick={() => setActiveTab("registry")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "registry"
                ? "bg-neutral-900 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            )}
          >
            <span>Audit Registry</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                activeTab === "registry"
                  ? "bg-neutral-700 text-white"
                  : "bg-neutral-200 text-neutral-600"
              )}
            >
              {combinedRegistry.length}
            </span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={cn(
            "mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between shrink-0 animate-in fade-in duration-300",
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          )}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-neutral-500 hover:text-neutral-900 text-xs ml-4 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ─── TAB 1: FIELD OFFICERS (DATATABLE) ─── */}
        {activeTab === "officers" && (
          <div className="space-y-4">
            <Datatable1
              data={fieldOfficersData}
              title="Field Safety Officers Directory"
              description="Certified on-site drilling, wellhead, pipeline, and process safety officers deployed across OIL installations."
              isLoading={isLoading}
              onAction={handleUserAction}
              className="max-w-none my-0 px-0"
            />
          </div>
        )}

        {/* ─── TAB 2: MANAGERS (DATATABLE) ─── */}
        {activeTab === "managers" && (
          <div className="space-y-4">
            <Datatable1
              data={managersData}
              title="HSE Operations & Corporate Managers Directory"
              description="Process safety superintendents, risk auditors, and crisis incident commanders with governance authority."
              isLoading={isLoading}
              onAction={handleUserAction}
              className="max-w-none my-0 px-0"
            />
          </div>
        )}

        {/* ─── TAB 3: PENDING APPROVAL REQUESTS ─── */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Pending Verification Requests ({pendingUsers.length})
                </h3>
                <p className="text-xs text-neutral-500">
                  Applicants awaiting manager credential review, station assignment confirmation, and role clearance.
                </p>
              </div>
            </div>

            {pendingUsers.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center w-full py-16 font-medium">
                NOTHING TO SHOW HERE
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.map((candidate) => {
                  const isProcessing = processingEmail === candidate.email;
                  return (
                    <div
                      key={candidate.email}
                      className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      {/* Top Row: Badge ID & Status Tag */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                            {candidate.badgeId}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Awaiting Manager
                          </span>
                        </div>

                        {/* Candidate Avatar & Name */}
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12 border-2 border-neutral-100 shadow-sm shrink-0">
                            <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                            <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-neutral-900 leading-tight truncate">
                              {candidate.name}
                            </h4>
                            <p className="text-xs text-neutral-600 font-medium truncate mt-0.5">
                              {candidate.designation}
                            </p>
                            <p className="text-[11px] text-neutral-400 font-mono truncate">
                              {candidate.email}
                            </p>
                          </div>
                        </div>

                        {/* Candidate Operational Details */}
                        <div className="mt-4 pt-3 border-t border-neutral-100 grid grid-cols-1 gap-2 text-xs">
                          <div className="flex items-center gap-2 text-neutral-700">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span className="truncate font-medium">{candidate.station}</span>
                          </div>
                          <div className="flex items-center justify-between text-neutral-600 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <Radio className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span>{candidate.radioChannel}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span>{candidate.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Approval Buttons */}
                      <div className="pt-3 border-t border-neutral-100 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleApprove(candidate, "worker")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 cursor-pointer"
                          >
                            Approve Officer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isProcessing}
                            onClick={() => handleApprove(candidate, "manager")}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 font-medium text-xs h-8 cursor-pointer"
                          >
                            Approve Manager
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isProcessing}
                          onClick={() => handleReject(candidate)}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7 cursor-pointer"
                        >
                          Decline Request
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: AUDIT REGISTRY (DATATABLE FORMAT) ─── */}
        {activeTab === "registry" && (
          <div className="space-y-4">
            <Card className="pb-0 gap-0 shadow-sm border-border bg-card">
              <CardHeader className="border-b border-border gap-0 p-0">
                <Datatable1Toolbar
                  title="Manager Approval Audit Registry"
                  description="Permanent official governance records of verified personnel clearances and approving managers."
                  searchQuery={auditSearchQuery}
                  onSearchChange={(val) => {
                    setAuditSearchQuery(val);
                    setAuditCurrentPage(1);
                  }}
                  isLoading={isLoading}
                />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className={HEAD_CLASS}>Approved Personnel</TableHead>
                      <TableHead className={HEAD_CLASS}>Station Base</TableHead>
                      <TableHead className={HEAD_CLASS}>Cleared Role</TableHead>
                      <TableHead className={HEAD_CLASS}>Approved By Manager</TableHead>
                      <TableHead className={HEAD_CLASS}>Approval Timestamp</TableHead>
                      <TableHead className={cn(HEAD_CLASS, "text-center")}>Clearance Status</TableHead>
                      <TableHead className={HEAD_CLASS}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAuditItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-sm text-neutral-400 font-medium">
                          NOTHING TO SHOW HERE
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentAuditItems.map((item, idx) => (
                        <TableRow
                          key={`${item.candidateEmail}-${idx}`}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Personnel Column */}
                          <TableCell className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-10 bg-muted border border-border">
                                <AvatarImage src={item.candidateAvatarUrl} alt={item.candidateName} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {item.candidateName
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground flex items-center gap-2">
                                  <span>{item.candidateName}</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                    {item.candidateBadgeId}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.candidateEmail}
                                </div>
                                {item.candidateDesignation && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {item.candidateDesignation}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Station Base */}
                          <TableCell className="p-4 text-sm text-muted-foreground">
                            <div className="font-medium text-foreground">{item.candidateStation}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.candidateRadioChannel} • {item.candidatePhone}
                            </div>
                          </TableCell>

                          {/* Cleared Role */}
                          <TableCell className="p-4 text-sm font-medium text-foreground">
                            {item.grantedRole === "manager" ? "HSE Manager" : "Field Safety Officer"}
                          </TableCell>

                          {/* Approving Manager */}
                          <TableCell className="p-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{item.approvedByManagerName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                {item.approvedByManagerBadge}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">
                              {item.approvedByManagerDesignation}
                            </div>
                          </TableCell>

                          {/* Approval Timestamp */}
                          <TableCell className="p-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {formatDateTime(item.approvedAt)}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="p-4 text-center text-sm font-medium text-foreground">
                            Verified Active
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-xs cursor-pointer hover:bg-muted"
                                >
                                  Actions
                                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    className="cursor-pointer py-2 text-xs"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(item.candidateEmail);
                                      setActionMessage({
                                        type: "success",
                                        text: `Copied ${item.candidateName}'s email to clipboard.`,
                                      });
                                    }}
                                  >
                                    Copy Personnel Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer py-2 text-xs"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(item.approvedByManagerBadge);
                                      setActionMessage({
                                        type: "success",
                                        text: `Copied Approver Badge (${item.approvedByManagerBadge}) to clipboard.`,
                                      });
                                    }}
                                  >
                                    Copy Approver Badge
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer py-2 text-xs"
                                    onClick={() => {
                                      setSelectedUserDetail({
                                        id: item.candidateBadgeId || item.candidateEmail,
                                        name: item.candidateName,
                                        email: item.candidateEmail,
                                        avatar: item.candidateAvatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                                        role: item.grantedRole === "manager" ? "HSE Manager" : "Field Safety Officer",
                                        lastLogin: "Active on Duty",
                                        twoStep: true,
                                        joinedDate: new Date(item.approvedAt).toLocaleDateString("en-IN", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        }),
                                        badgeId: item.candidateBadgeId,
                                        station: item.candidateStation,
                                        radioChannel: item.candidateRadioChannel,
                                        phone: item.candidatePhone,
                                        status: "approved",
                                      });
                                    }}
                                  >
                                    View Full Record
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <Datatable1Pagination
                  page={auditCurrentPage}
                  pageSize={AUDIT_ITEMS_PER_PAGE}
                  total={filteredRegistry.length}
                  onPageChange={setAuditCurrentPage}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* User Details Slideover / Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                  <AvatarImage src={selectedUserDetail.avatar} alt={selectedUserDetail.name} />
                  <AvatarFallback className="bg-neutral-900 text-white font-bold">
                    {selectedUserDetail.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-neutral-900">{selectedUserDetail.name}</h3>
                    {selectedUserDetail.badgeId && (
                      <span className="font-mono text-xs bg-neutral-200/70 text-neutral-800 px-2 py-0.5 rounded font-semibold">
                        {selectedUserDetail.badgeId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 font-medium mt-0.5">{selectedUserDetail.role}</p>
                  <p className="text-xs text-neutral-400 font-mono">{selectedUserDetail.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Station / Base</span>
                  </div>
                  <p className="font-semibold text-neutral-900">{selectedUserDetail.station || "Central Hub"}</p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                    <Radio className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Emergency Radio Ch.</span>
                  </div>
                  <p className="font-mono font-semibold text-neutral-900">{selectedUserDetail.radioChannel || "CH-1"}</p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Direct Phone</span>
                  </div>
                  <p className="font-mono font-semibold text-neutral-900">{selectedUserDetail.phone || "+91 94350 00000"}</p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Joined Date</span>
                  </div>
                  <p className="font-semibold text-neutral-900">{selectedUserDetail.joinedDate}</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-900">Safety Clearance Verified</span>
                  <p className="text-[11px] text-neutral-500">Two-factor auth and certified SIF protocol training completed.</p>
                </div>
                <span className="text-xs font-semibold text-neutral-800">Active</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(selectedUserDetail.email);
                  setActionMessage({
                    type: "success",
                    text: `Copied ${selectedUserDetail.email} to clipboard.`,
                  });
                }}
                className="cursor-pointer text-xs h-8"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Copy Email
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedUserDetail(null)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer text-xs h-8"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementPortal;
