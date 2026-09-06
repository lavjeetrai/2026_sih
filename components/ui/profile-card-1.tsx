"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Phone,
  Radio,
  Mail,
  X,
  BadgeCheck,
  Edit3,
  Check,
  Loader2,
  Save,
  MapPin,
  IdCard,
} from "lucide-react";
import { type UserSessionData } from "./auth-form-1";
import { cn } from "@/lib/utils";

// Social SVG Icons (Lucide-react v1+ removed brand icons, providing seamless SVGs)
const Twitter = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const Github = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Linkedin = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

//================================================================================
// 1. DEMO COMPONENT (demos/default/code.demo.tsx)
//================================================================================

export function Component() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 font-sans bg-neutral-950 transition-colors duration-500 sm:p-8 w-full">
      <ProfileCardDemo />
    </div>
  );
}

const ProfileCardDemo = () => {
  const cardProps: GlassmorphismProfileCardProps = {
    avatarUrl:
      "https://cdn.21st.dev/assets/mirror/c9/c9babfd70e9056d8223e9d2eda28c4c7cc6c3555d666e10ef656b70a49f67a48.png",
    name: "Ravi Katiyar",
    title: "Sr. Designer",
    bio: "Building beautiful and intuitive digital experiences. Passionate about design systems and web animation.",
    socialLinks: [
      { id: "github", icon: Github, label: "GitHub", href: "#" },
      { id: "linkedin", icon: Linkedin, label: "LinkedIn", href: "#" },
      { id: "twitter", icon: Twitter, label: "Twitter", href: "#" },
    ],
    actionButton: {
      text: "Contact Me",
      href: "#",
    },
  };

  return <GlassmorphismProfileCard {...cardProps} />;
};

//================================================================================
// 2. REUSABLE COMPONENT (your-component/code.tsx)
//================================================================================

export interface SocialLink {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  onClick?: () => void;
}

export interface ActionButtonProps {
  text: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "danger";
}

export interface GlassmorphismProfileCardProps {
  avatarUrl: string;
  name: string;
  title: string;
  bio: string;
  socialLinks?: SocialLink[];
  actionButton?: ActionButtonProps;
  badgeTag?: string;
  metaDetails?: { label: string; value: string }[];
  onClose?: () => void;
  theme?: "project" | "dark";
  size?: "small" | "normal";
  onEditClick?: () => void;
}

export const GlassmorphismProfileCard: React.FC<GlassmorphismProfileCardProps> = ({
  avatarUrl,
  name,
  title,
  bio,
  socialLinks = [],
  actionButton,
  badgeTag,
  metaDetails = [],
  onClose,
  theme = "project",
  size = "small",
  onEditClick,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isDark = theme === "dark";
  const isSmall = size === "small";

  return (
    <div
      className={cn(
        "relative select-none",
        isSmall ? "w-[300px] sm:w-[325px] max-w-[calc(100vw-32px)]" : "w-full max-w-[350px]"
      )}
    >
      <div
        className={cn(
          "relative flex flex-col items-center border transition-all duration-300 ease-out backdrop-blur-2xl shadow-xl max-h-[86vh] overflow-y-auto",
          isSmall ? "p-3.5 sm:p-4 rounded-2xl" : "p-6 rounded-3xl",
          isDark
            ? "bg-neutral-900/95 text-white border-white/15"
            : "bg-white/95 text-neutral-900 border-neutral-200/90"
        )}
        style={{
          boxShadow: isDark
            ? "0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
            : "0 15px 35px -5px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header bar: Edit button (left) and Close (right) */}
        <div className="w-full flex items-center justify-between gap-1 mb-2">
          {onEditClick ? (
            <button
              type="button"
              onClick={onEditClick}
              className="text-[10px] font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors border border-neutral-200/70 shadow-2xs"
              title="Edit personal information"
            >
              <Edit3 size={11} />
              <span>Edit</span>
            </button>
          ) : (
            <div className="w-6" />
          )}

          {badgeTag && (
            <div
              className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shadow-2xs",
                isDark
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
              )}
            >
              <BadgeCheck size={11} className={isDark ? "text-emerald-400" : "text-emerald-600"} />
              <span className="break-words">{badgeTag}</span>
            </div>
          )}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                isDark
                  ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
              )}
              aria-label="Close profile card"
            >
              <X size={12} />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        {/* Avatar: Clean circle without any active status dot */}
        <div
          className={cn(
            "relative mb-2 rounded-full p-0.5 border-2 shadow-xs",
            isSmall ? "w-14 h-14" : "w-20 h-20",
            isDark ? "border-white/30 bg-neutral-950" : "border-emerald-600/30 bg-white"
          )}
        >
          <img
            src={avatarUrl}
            alt={`${name}'s Avatar`}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = `https://placehold.co/60x60/0f172a/white?text=${name.charAt(0)}`;
            }}
          />
        </div>

        {/* Name and Designation: Fully rendered with break-words */}
        <h2
          className={cn(
            "font-bold tracking-tight text-center leading-snug break-words px-2 w-full",
            isSmall ? "text-sm sm:text-base" : "text-xl",
            isDark ? "text-white" : "text-neutral-900"
          )}
        >
          {name}
        </h2>
        <p
          className={cn(
            "font-semibold text-center tracking-wide uppercase font-mono mt-1 leading-snug break-words px-2 w-full",
            isSmall ? "text-[10px] sm:text-[10.5px]" : "text-xs",
            isDark ? "text-emerald-400" : "text-emerald-700"
          )}
        >
          {title}
        </p>

        {/* Bio: Fully rendered without truncation */}
        {bio && (
          <p
            className={cn(
              "text-center leading-relaxed font-normal mt-2 px-2 break-words w-full",
              isSmall ? "text-[10.5px]" : "text-xs",
              isDark ? "text-neutral-300" : "text-neutral-600"
            )}
          >
            {bio}
          </p>
        )}

        {/* Meta details: Clean divide-y row layout that never clips or truncates long text */}
        {metaDetails.length > 0 && (
          <div
            className={cn(
              "w-full rounded-xl border font-mono mt-2.5 divide-y",
              isSmall ? "p-2.5 text-[10px]" : "p-3 text-[11px]",
              isDark
                ? "bg-white/5 border-white/10 divide-white/10 text-neutral-300"
                : "bg-neutral-50/90 border-neutral-200/80 divide-neutral-200/60 text-neutral-700"
            )}
          >
            {metaDetails.map((meta, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
              >
                <span
                  className={cn(
                    "uppercase font-medium shrink-0 pt-0.5",
                    isSmall ? "text-[9px]" : "text-[10px]",
                    isDark ? "text-neutral-400" : "text-neutral-500"
                  )}
                >
                  {meta.label}
                </span>
                <span
                  className={cn(
                    "font-semibold text-right break-words leading-tight max-w-[68%]",
                    isDark ? "text-white" : "text-neutral-900"
                  )}
                >
                  {meta.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "w-1/2 h-px rounded-full",
            isSmall ? "my-2" : "my-4",
            isDark ? "bg-white/15" : "bg-neutral-200"
          )}
        />

        {/* Social / Telecom Channels */}
        {socialLinks.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            {socialLinks.map((item) => (
              <SocialButton
                key={item.id}
                item={item}
                setHoveredItem={setHoveredItem}
                hoveredItem={hoveredItem}
                isDark={isDark}
                isSmall={isSmall}
              />
            ))}
          </div>
        )}

        {/* Call to action button */}
        {actionButton && (
          <ActionButton action={actionButton} isDark={isDark} isSmall={isSmall} />
        )}
      </div>

      {/* Radiant Glow Behind Card */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl -z-10 transition-all duration-500 ease-out blur-xl opacity-50",
          isDark
            ? "bg-gradient-to-tr from-emerald-600/40 via-teal-500/30 to-blue-600/40"
            : "bg-gradient-to-tr from-emerald-200/50 via-teal-100/40 to-slate-200/50"
        )}
      />
    </div>
  );
};

const SocialButton: React.FC<{
  item: SocialLink;
  setHoveredItem: (id: string | null) => void;
  hoveredItem: string | null;
  isDark?: boolean;
  isSmall?: boolean;
}> = ({ item, setHoveredItem, hoveredItem, isDark, isSmall }) => (
  <div className="relative">
    <a
      href={item.href}
      onClick={(e) => {
        if (item.onClick) {
          e.preventDefault();
          item.onClick();
        }
      }}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all duration-200 ease-out group overflow-hidden border",
        isSmall ? "w-7.5 h-7.5" : "w-10 h-10",
        isDark
          ? "bg-white/10 hover:bg-white/20 border-white/10 text-white"
          : "bg-neutral-100 hover:bg-neutral-200/80 border-neutral-200 text-neutral-700 hover:text-neutral-900 shadow-2xs"
      )}
      onMouseEnter={() => setHoveredItem(item.id)}
      onMouseLeave={() => setHoveredItem(null)}
      aria-label={item.label}
    >
      <div className="relative z-10 flex items-center justify-center">
        <item.icon
          size={isSmall ? 13 : 17}
          className={cn(
            "transition-all duration-200 ease-out group-hover:scale-110",
            isDark
              ? "text-white/80 group-hover:text-white"
              : "text-neutral-600 group-hover:text-neutral-900"
          )}
        />
      </div>
    </a>
    <Tooltip item={item} hoveredItem={hoveredItem} isDark={isDark} />
  </div>
);

const ActionButton: React.FC<{
  action: ActionButtonProps;
  isDark?: boolean;
  isSmall?: boolean;
}> = ({ action, isDark, isSmall }) => (
  <button
    type="button"
    onClick={(e) => {
      if (action.onClick) {
        e.preventDefault();
        action.onClick();
      }
    }}
    className={cn(
      "flex items-center justify-center gap-1.5 w-full font-semibold uppercase transition-all duration-200 ease-out hover:scale-[1.01] active:scale-95 group cursor-pointer shadow-2xs",
      isSmall ? "px-3 py-1.5 mt-2.5 rounded-lg text-[10px] tracking-wide" : "px-5 py-2.5 mt-4 rounded-xl text-xs tracking-wider",
      action.variant === "danger"
        ? isDark
          ? "bg-red-500/90 hover:bg-red-600 text-white border border-red-400/30 shadow-red-950/40"
          : "bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200/80"
        : isDark
        ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 border border-emerald-300/40 shadow-emerald-950/40"
        : "bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-900"
    )}
  >
    <span>{action.text}</span>
    <ArrowUpRight
      size={isSmall ? 12 : 14}
      className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
    />
  </button>
);

const Tooltip: React.FC<{
  item: SocialLink;
  hoveredItem: string | null;
  isDark?: boolean;
}> = ({ item, hoveredItem, isDark }) => (
  <div
    role="tooltip"
    className={cn(
      "absolute -top-9 left-1/2 -translate-x-1/2 z-50 px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-semibold whitespace-nowrap transition-all duration-150 ease-out pointer-events-none shadow-xl",
      isDark
        ? "bg-neutral-950/90 text-white border-white/20"
        : "bg-neutral-900 text-white border-neutral-800",
      hoveredItem === item.id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
    )}
  >
    {item.label}
    <div
      className={cn(
        "absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 border-b border-r",
        isDark ? "bg-neutral-950 border-white/20" : "bg-neutral-900 border-neutral-800"
      )}
    />
  </div>
);

//================================================================================
// 3. OFFICER & MANAGER DYNAMIC PROFILE OVERLAY WITH EDIT CAPABILITY
// Small-sized, floating in the bottom-left near the menu bar.
//================================================================================

export interface UserProfileOverlayProps {
  user: UserSessionData | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  onUpdateUser?: (updated: UserSessionData) => void;
  sidebarOpen?: boolean;
}

export function UserProfileOverlay({
  user,
  isOpen,
  onClose,
  onLogout,
  onUpdateUser,
  sidebarOpen = true,
}: UserProfileOverlayProps) {
  if (!isOpen || !user) return null;

  const isManager = user.role === "manager";

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable form fields
  const [name, setName] = useState(user.name || "");
  const [designation, setDesignation] = useState(
    user.designation || (isManager ? "Chief General Manager (Process Safety)" : "HSE Field Safety Officer")
  );
  const [station, setStation] = useState(
    user.station || (isManager ? "Duliajan Directorate" : "Moran Rig #04 • Wellhead Section")
  );
  const [radioChannel, setRadioChannel] = useState(user.radioChannel || "UHF CH-04");
  const [phone, setPhone] = useState(user.phone || "+91 94350 44521");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setDesignation(
        user.designation ||
          (user.role === "manager"
            ? "Chief General Manager (Process Safety)"
            : "HSE Field Safety Officer")
      );
      setStation(
        user.station ||
          (user.role === "manager"
            ? "Duliajan Directorate"
            : "Moran Rig #04 • Wellhead Section")
      );
      setRadioChannel(user.radioChannel || "UHF CH-04");
      setPhone(user.phone || "+91 94350 44521");
    }
  }, [user]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          email: user.email,
          name,
          designation,
          station,
          radioChannel,
          phone,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update profile.");
      }

      const updatedUser: UserSessionData = {
        ...user,
        name,
        designation,
        station,
        radioChannel,
        phone,
      };

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const socialLinks: SocialLink[] = [
    {
      id: "radio",
      icon: Radio,
      label: `Radio: ${radioChannel || "UHF CH-04"}`,
      href: "#",
      onClick: () => {
        navigator.clipboard?.writeText(radioChannel || "UHF CH-04");
      },
    },
    {
      id: "phone",
      icon: Phone,
      label: `Call: ${phone || "+91 94350 44521"}`,
      href: `tel:${phone || "+919435044521"}`,
    },
    {
      id: "mail",
      icon: Mail,
      label: `Email: ${user.email}`,
      href: `mailto:${user.email}`,
    },
  ];

  const metaDetails = [
    ...(user.badgeId ? [{ label: "Employee ID", value: user.badgeId }] : []),
    { label: "Radio Freq", value: radioChannel || "UHF CH-04" },
    { label: "Station Base", value: station || "Moran Rig #04" },
  ];

  const bioText = isManager
    ? `Authorized Manager overseeing process safety, barrier control, and work-order audits across ${station || "Duliajan Operations"}.`
    : `Field Safety Officer responsible for rig operations, SIF precursor detection, and hazard reporting at ${station || "Moran Rig #04"}.`;

  return (
    <>
      {/* Subtle backdrop overlay: clicking outside closes the profile card */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!isEditing) onClose();
        }}
        aria-hidden="true"
      />

      {/* Floating small profile card in bottom left near menu bar */}
      <div
        className={cn(
          "fixed bottom-3 z-50 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2 duration-200",
          sidebarOpen ? "left-3 sm:left-[268px]" : "left-3 sm:left-[76px]"
        )}
      >
        {isEditing ? (
          /* Inline Edit Mode Form */
          <div className="w-[300px] sm:w-[325px] max-w-[calc(100vw-32px)] max-h-[86vh] overflow-y-auto p-4 rounded-2xl bg-white/95 border border-neutral-200/90 shadow-2xl backdrop-blur-2xl text-neutral-900 select-none">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <Edit3 size={13} className="text-emerald-700" />
                <span className="text-xs font-bold text-neutral-900">Edit Profile Info</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Cancel editing"
              >
                <X size={13} />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-2 p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px]">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-2">
              <div>
                <label className="block text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-2 py-1 text-xs rounded-lg border border-neutral-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-neutral-50/50"
                  placeholder="Official name"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                  className="w-full px-2 py-1 text-xs rounded-lg border border-neutral-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-neutral-50/50"
                  placeholder="Official designation"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">
                  Station Base / Rig
                </label>
                <input
                  type="text"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  required
                  className="w-full px-2 py-1 text-xs rounded-lg border border-neutral-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-neutral-50/50"
                  placeholder="Assigned rig or directorate"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">
                    Radio Freq
                  </label>
                  <input
                    type="text"
                    value={radioChannel}
                    onChange={(e) => setRadioChannel(e.target.value)}
                    required
                    className="w-full px-2 py-1 text-xs rounded-lg border border-neutral-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-neutral-50/50"
                    placeholder="UHF CH-04"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-2 py-1 text-xs rounded-lg border border-neutral-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-neutral-50/50"
                    placeholder="+91 94350..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 text-white transition-all shadow-xs cursor-pointer",
                    saveSuccess
                      ? "bg-emerald-600"
                      : "bg-neutral-900 hover:bg-neutral-800 active:scale-95"
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={13} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      <span>Save Info</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* View Mode: Compact Small Glassmorphism Profile Card */
          <GlassmorphismProfileCard
            theme="project"
            size="small"
            avatarUrl={
              user.avatarUrl ||
              (isManager
                ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")
            }
            name={name || "Oil India Personnel"}
            title={designation}
            bio={bioText}
            socialLinks={socialLinks}
            metaDetails={metaDetails}
            onClose={onClose}
            onEditClick={() => setIsEditing(true)}
            actionButton={{
              text: "Sign Out",
              variant: "danger",
              onClick: () => {
                onClose();
                if (onLogout) onLogout();
              },
            }}
          />
        )}
      </div>
    </>
  );
}
