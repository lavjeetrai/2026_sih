import { NextResponse } from "next/server";
import {
  getAllUsers,
  getUserByEmail,
  createUserRequest,
  approveUserRequest,
  rejectUserRequest,
  updateUserProfile,
  getApprovalsRegistry,
  type UserDocument,
} from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth
 * Query options:
 * - ?type=pending: lists all unverified account requests
 * - ?type=all: lists all users
 * - ?type=registry: lists the permanent manager approval audit logs
 * - default: returns summary counts & system auth status
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const allUsers = await getAllUsers();

    if (type === "pending") {
      const pending = allUsers.filter((u) => u.status === "pending");
      return NextResponse.json({ success: true, count: pending.length, data: pending });
    }

    if (type === "all") {
      // Omit passwords from client response
      const sanitized = allUsers.map(({ password, ...rest }) => rest);
      return NextResponse.json({ success: true, count: sanitized.length, data: sanitized });
    }

    if (type === "registry") {
      const registry = await getApprovalsRegistry();
      return NextResponse.json({ success: true, count: registry.length, data: registry });
    }

    const pendingCount = allUsers.filter((u) => u.status === "pending").length;
    const approvedCount = allUsers.filter((u) => u.status === "approved").length;

    return NextResponse.json({
      success: true,
      pendingCount,
      approvedCount,
      totalUsers: allUsers.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching auth state";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/auth
 * Actions:
 * - action: "signup" -> Submits an unverified registration request (status: "pending")
 * - action: "signin" -> Verifies credentials and ensures account is approved by a manager
 * - action: "approve" -> Existing Manager approves an applicant as Field Officer or Manager
 * - action: "reject" -> Existing Manager declines an applicant
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = "signin" } = body;

    // ─── 1. SIGN UP (ACCOUNT VERIFICATION REQUEST) ──────────────────────
    if (action === "signup") {
      const {
        name,
        email,
        password,
        role = "worker",
        badgeId,
        designation,
        station,
        radioChannel,
        phone,
        avatarUrl,
      } = body;

      // Validate all required user inputs
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Full Name is required." },
          { status: 400 }
        );
      }
      if (!email || !email.trim()) {
        return NextResponse.json(
          { success: false, error: "Official Email is required." },
          { status: 400 }
        );
      }
      if (!password || password.length < 6) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }
      if (!badgeId || !badgeId.trim()) {
        return NextResponse.json(
          { success: false, error: "Employee / Badge ID is required." },
          { status: 400 }
        );
      }
      if (!designation || !designation.trim()) {
        return NextResponse.json(
          { success: false, error: "Official Designation is required." },
          { status: 400 }
        );
      }
      if (!station || !station.trim()) {
        return NextResponse.json(
          { success: false, error: "Assigned Rig / Station Base is required." },
          { status: 400 }
        );
      }
      if (!radioChannel || !radioChannel.trim()) {
        return NextResponse.json(
          { success: false, error: "Tactical Radio Channel is required." },
          { status: 400 }
        );
      }
      if (!phone || !phone.trim()) {
        return NextResponse.json(
          { success: false, error: "Contact / Emergency Phone is required." },
          { status: 400 }
        );
      }

      const cleanEmail = email.toLowerCase().trim();
      const existing = await getUserByEmail(cleanEmail);
      if (existing) {
        return NextResponse.json(
          { success: false, error: "An account or request with this email already exists." },
          { status: 400 }
        );
      }

      const newUser = await createUserRequest({
        name: name.trim(),
        email: cleanEmail,
        password,
        requestedRole: role === "manager" ? "manager" : "worker",
        badgeId: badgeId.trim(),
        designation: designation.trim(),
        station: station.trim(),
        radioChannel: radioChannel.trim(),
        phone: phone.trim(),
        avatarUrl,
      });

      return NextResponse.json({
        success: true,
        status: "pending",
        message: "Registration request submitted. An existing HSE Manager will verify and approve your account.",
        user: {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          badgeId: newUser.badgeId,
          designation: newUser.designation,
          station: newUser.station,
          radioChannel: newUser.radioChannel,
          phone: newUser.phone,
          status: newUser.status,
          avatarUrl: newUser.avatarUrl,
        },
      });
    }

    // ─── 2. SIGN IN ────────────────────────────────────────────────────
    if (action === "signin") {
      const { email, password, role } = body;
      const cleanEmail = (email || "").toLowerCase().trim();

      const user = await getUserByEmail(cleanEmail);

      if (!user || user.password !== password) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password. Please verify your credentials." },
          { status: 401 }
        );
      }

      // Gatekeeping: Check account verification status
      if (user.status === "pending") {
        return NextResponse.json(
          {
            success: false,
            status: "pending",
            error: `Your account request (ID: ${user.badgeId}) is currently pending clearance by an HSE Manager. Please await manager sign-off.`,
          },
          { status: 403 }
        );
      }

      if (user.status === "rejected") {
        return NextResponse.json(
          {
            success: false,
            status: "rejected",
            error: `Your account request was declined by HSE management: ${user.rejectionReason || "Credentials not verified"}`,
          },
          { status: 403 }
        );
      }

      const activeRole = role || user.role;

      return NextResponse.json({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          role: activeRole,
          badgeId: user.badgeId,
          designation: user.designation,
          station: user.station,
          radioChannel: user.radioChannel,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          status: user.status,
          approval: user.approval,
        },
      });
    }

    // ─── 3. MANAGER APPROVE APPLICANT ──────────────────────────────────
    if (action === "approve") {
      const { userEmail, assignedRole, manager, remarks } = body;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: "Applicant userEmail is required." },
          { status: 400 }
        );
      }

      if (!assignedRole || !["worker", "manager"].includes(assignedRole)) {
        return NextResponse.json(
          { success: false, error: "Valid assignedRole ('worker' or 'manager') is required." },
          { status: 400 }
        );
      }

      const approvingManager = manager || {
        name: "Priyanka Bora",
        badgeId: "OIL-MGR-1002",
        email: "priyanka@oilindia.in",
        designation: "Chief General Manager (Process Safety & SIF Control)",
      };

      const updatedUser = await approveUserRequest({
        userEmail,
        assignedRole,
        manager: approvingManager,
        remarks,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully approved ${updatedUser.name} as ${assignedRole === "manager" ? "HSE Manager" : "Field Safety Officer"}.`,
        user: {
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          badgeId: updatedUser.badgeId,
          designation: updatedUser.designation,
          station: updatedUser.station,
          radioChannel: updatedUser.radioChannel,
          phone: updatedUser.phone,
          status: updatedUser.status,
          approval: updatedUser.approval,
        },
      });
    }

    // ─── 4. MANAGER REJECT APPLICANT ──────────────────────────────────
    if (action === "reject") {
      const { userEmail, manager, reason } = body;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: "Applicant userEmail is required." },
          { status: 400 }
        );
      }

      const rejectingManager = manager || {
        name: "Priyanka Bora",
        badgeId: "OIL-MGR-1002",
        email: "priyanka@oilindia.in",
      };

      const updatedUser = await rejectUserRequest({
        userEmail,
        manager: rejectingManager,
        reason,
      });

      return NextResponse.json({
        success: true,
        message: `Account request for ${updatedUser.name} has been rejected.`,
        user: {
          name: updatedUser.name,
          email: updatedUser.email,
          status: updatedUser.status,
          rejectionReason: updatedUser.rejectionReason,
        },
      });
    }

    // ─── 5. UPDATE PROFILE (LOGGED IN USER) ──────────────────────────
    if (action === "update_profile") {
      const { email, name, designation, station, radioChannel, phone, avatarUrl } = body;

      if (!email) {
        return NextResponse.json(
          { success: false, error: "User email is required to update profile." },
          { status: 400 }
        );
      }

      const updatedUser = await updateUserProfile({
        email,
        name,
        designation,
        station,
        radioChannel,
        phone,
        avatarUrl,
      });

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully.",
        user: {
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          badgeId: updatedUser.badgeId,
          designation: updatedUser.designation,
          station: updatedUser.station,
          radioChannel: updatedUser.radioChannel,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatarUrl,
          status: updatedUser.status,
          approval: updatedUser.approval,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
