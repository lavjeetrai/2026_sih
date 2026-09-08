import { NextResponse } from "next/server";
import {
  getAllUsers,
  getUserByEmail,
  createUserRequest,
  approveUserRequest,
  rejectUserRequest,
  updateUserProfile,
  getApprovalsRegistry,
  migrateUserPassword,
  sanitizeUser,
} from "@/lib/data/users";
import {
  verifyPassword,
  hashPassword,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth
 * Query options:
 * - ?type=session | me: returns the authenticated user session (without credentials)
 * - ?type=pending: lists all unverified account requests (Manager only)
 * - ?type=all: lists all users (passwords omitted)
 * - ?type=registry: lists the permanent manager approval audit logs (Manager only)
 * - default: returns summary counts & system auth status
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Session check for client verification
    if (type === "session" || type === "me") {
      const sessionUser = await getSessionUser(req);
      if (!sessionUser) {
        return NextResponse.json(
          { success: false, authenticated: false, error: "No active session" },
          { status: 401 }
        );
      }
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: sanitizeUser(sessionUser),
      });
    }

    // Role-protected endpoints: require active Manager session
    if (type === "pending" || type === "registry") {
      const sessionUser = await getSessionUser(req);
      if (!sessionUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      if (sessionUser.role !== "manager") {
        return NextResponse.json(
          { success: false, error: "Access denied. Manager role required." },
          { status: 403 }
        );
      }

      if (type === "pending") {
        const allUsers = await getAllUsers();
        const pending = allUsers
          .filter((u) => u.status === "pending")
          .map(sanitizeUser);
        return NextResponse.json({ success: true, count: pending.length, data: pending });
      }

      if (type === "registry") {
        const registry = await getApprovalsRegistry();
        return NextResponse.json({ success: true, count: registry.length, data: registry });
      }
    }

    const allUsers = await getAllUsers();

    if (type === "all") {
      const sanitized = allUsers.map(sanitizeUser);
      return NextResponse.json({ success: true, count: sanitized.length, data: sanitized });
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
 * - action: "signin" -> Verifies password against scrypt hash and sets HTTP-only session cookie
 * - action: "signout" -> Clears HTTP-only session cookie
 * - action: "approve" -> Authorized HSE Manager approves applicant
 * - action: "reject" -> Authorized HSE Manager declines applicant
 * - action: "update_profile" -> Updates own profile
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
        user: sanitizeUser(newUser),
      });
    }

    // ─── 2. SIGN IN ────────────────────────────────────────────────────
    if (action === "signin") {
      const { email, password } = body;
      const cleanEmail = (email || "").toLowerCase().trim();

      if (!cleanEmail || !password) {
        return NextResponse.json(
          { success: false, error: "Email and password are required." },
          { status: 400 }
        );
      }

      const user = await getUserByEmail(cleanEmail);

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password. Please verify your credentials." },
          { status: 401 }
        );
      }

      const { valid, needsMigration } = verifyPassword(password, user.password || "");

      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password. Please verify your credentials." },
          { status: 401 }
        );
      }

      // Lazy migration: upgrade legacy plaintext password to secure scrypt hash upon successful auth
      if (needsMigration) {
        try {
          const newHashed = hashPassword(password);
          await migrateUserPassword(cleanEmail, newHashed);
        } catch (migErr) {
          console.warn("[Auth] Lazy password migration note:", migErr);
        }
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

      const sanitized = sanitizeUser(user);
      const res = NextResponse.json({
        success: true,
        user: sanitized,
      });

      // Set server-verifiable HTTP-only session cookie
      setSessionCookie(res, { email: user.email, role: user.role });
      return res;
    }

    // ─── 3. SIGN OUT ───────────────────────────────────────────────────
    if (action === "signout") {
      const res = NextResponse.json({
        success: true,
        message: "Signed out successfully.",
      });
      clearSessionCookie(res);
      return res;
    }

    // ─── 4. MANAGER APPROVE APPLICANT ──────────────────────────────────
    if (action === "approve") {
      const sessionUser = await getSessionUser(req);
      if (!sessionUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required." },
          { status: 401 }
        );
      }
      if (sessionUser.role !== "manager") {
        return NextResponse.json(
          { success: false, error: "Access denied. Only an authorized HSE Manager can approve accounts." },
          { status: 403 }
        );
      }

      const { userEmail, assignedRole, remarks } = body;

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

      // Security: derive approving manager identity strictly from server-side session
      const approvingManager = {
        name: sessionUser.name,
        badgeId: sessionUser.badgeId || "OIL-MGR",
        email: sessionUser.email,
        designation: sessionUser.designation || "HSE Operations Manager",
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
        user: sanitizeUser(updatedUser),
      });
    }

    // ─── 5. MANAGER REJECT APPLICANT ──────────────────────────────────
    if (action === "reject") {
      const sessionUser = await getSessionUser(req);
      if (!sessionUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required." },
          { status: 401 }
        );
      }
      if (sessionUser.role !== "manager") {
        return NextResponse.json(
          { success: false, error: "Access denied. Only an authorized HSE Manager can reject accounts." },
          { status: 403 }
        );
      }

      const { userEmail, reason } = body;

      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: "Applicant userEmail is required." },
          { status: 400 }
        );
      }

      // Security: derive rejecting manager identity strictly from server-side session
      const rejectingManager = {
        name: sessionUser.name,
        badgeId: sessionUser.badgeId || "OIL-MGR",
        email: sessionUser.email,
      };

      const updatedUser = await rejectUserRequest({
        userEmail,
        manager: rejectingManager,
        reason,
      });

      return NextResponse.json({
        success: true,
        message: `Account request for ${updatedUser.name} has been rejected.`,
        user: sanitizeUser(updatedUser),
      });
    }

    // ─── 6. UPDATE PROFILE (LOGGED IN USER) ──────────────────────────
    if (action === "update_profile") {
      const sessionUser = await getSessionUser(req);
      if (!sessionUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required." },
          { status: 401 }
        );
      }

      const { email, name, designation, station, radioChannel, phone, avatarUrl } = body;

      if (!email) {
        return NextResponse.json(
          { success: false, error: "User email is required to update profile." },
          { status: 400 }
        );
      }

      // Security: users may only update their own profile unless they have manager role
      if (sessionUser.email.toLowerCase() !== email.toLowerCase().trim() && sessionUser.role !== "manager") {
        return NextResponse.json(
          { success: false, error: "Access denied. You can only update your own profile." },
          { status: 403 }
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
        user: sanitizeUser(updatedUser),
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
