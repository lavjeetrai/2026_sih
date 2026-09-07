/**
 * IOGP (International Association of Oil & Gas Producers)
 * Official 9 Life-Saving Rules (LSR) Classification Engine
 */

export interface LifeSavingRule {
  number: number;
  name: string;
  shortLabel: string;
  mandate: string;
  category: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const IOGP_LIFE_SAVING_RULES: Record<number, LifeSavingRule> = {
  1: {
    number: 1,
    name: "Work at Height",
    shortLabel: "LSR #1: Height Work",
    mandate: "Protect yourself against a fall when working at height. Wear your harness and verify 100% tie-off.",
    category: "Fall Protection",
    color: "#ef4444",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    badgeBorder: "border-red-200",
  },
  2: {
    number: 2,
    name: "Bypassing Safety Controls",
    shortLabel: "LSR #2: Safety Controls",
    mandate: "Obtain authorization before overriding, bypassing, or disabling any safety interlock or alarm.",
    category: "Procedural Compliance",
    color: "#f59e0b",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
  },
  3: {
    number: 3,
    name: "Energy Isolation",
    shortLabel: "LSR #3: Energy Isolation",
    mandate: "Verify positive physical isolation (LOTO) and zero stored energy before maintenance work begins.",
    category: "Hazardous Energy",
    color: "#eab308",
    badgeBg: "bg-yellow-50",
    badgeText: "text-yellow-800",
    badgeBorder: "border-yellow-200",
  },
  4: {
    number: 4,
    name: "Safe Mechanical Lifting",
    shortLabel: "LSR #4: Safe Lifting",
    mandate: "Plan lifting operations, inspect rigging gear, and strictly control the drop zone perimeter.",
    category: "Mechanical Handling",
    color: "#f97316",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    badgeBorder: "border-orange-200",
  },
  5: {
    number: 5,
    name: "Toxic Gas & Atmosphere",
    shortLabel: "LSR #5: Toxic Gas",
    mandate: "Test for toxic gas (H2S, LEL, CO) and verify breathing apparatus before entering hazardous atmosphere.",
    category: "Gas Detection",
    color: "#06b6d4",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-700",
    badgeBorder: "border-cyan-200",
  },
  6: {
    number: 6,
    name: "Confined Space Entry",
    shortLabel: "LSR #6: Confined Space",
    mandate: "Obtain valid confined space entry permit, continuous ventilation, and dedicated standby watch.",
    category: "Vessel Entry",
    color: "#8b5cf6",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    badgeBorder: "border-purple-200",
  },
  7: {
    number: 7,
    name: "Line of Fire",
    shortLabel: "LSR #7: Line of Fire",
    mandate: "Position yourself and others outside moving machinery, pinch points, and pressurized trajectories.",
    category: "Physical Position",
    color: "#ec4899",
    badgeBg: "bg-pink-50",
    badgeText: "text-pink-700",
    badgeBorder: "border-pink-200",
  },
  8: {
    number: 8,
    name: "Hot Work",
    shortLabel: "LSR #8: Hot Work",
    mandate: "Identify and control all flammable vapors and combustible sources before applying naked flame or spark.",
    category: "Fire & Explosion",
    color: "#dc2626",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    badgeBorder: "border-red-200",
  },
  9: {
    number: 9,
    name: "Driving Safety",
    shortLabel: "LSR #9: Driving",
    mandate: "Always wear seatbelts, respect rig speed limits, and never use mobile devices while driving.",
    category: "Logistics",
    color: "#10b981",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
  },
};

/**
 * Maps an HSE observation or hazard to the matching official IOGP Life-Saving Rule.
 */
export function mapToLifeSavingRule(
  hazard?: string,
  barrier?: string,
  text?: string
): LifeSavingRule {
  const combined = `${hazard || ""} ${barrier || ""} ${text || ""}`.toLowerCase();

  // Direct exact rule name checks (matches Modal fine-tuned SLM outputs)
  if (combined.includes("energy isolation") || combined.includes("loto")) {
    return IOGP_LIFE_SAVING_RULES[3];
  }
  if (combined.includes("working at heights") || combined.includes("work at height") || combined.includes("heights")) {
    return IOGP_LIFE_SAVING_RULES[1];
  }
  if (combined.includes("confined space")) {
    return IOGP_LIFE_SAVING_RULES[6];
  }
  if (combined.includes("mechanical lifting") || combined.includes("safe lifting")) {
    return IOGP_LIFE_SAVING_RULES[4];
  }
  if (combined.includes("bypassing safety controls") || combined.includes("safety controls")) {
    return IOGP_LIFE_SAVING_RULES[2];
  }
  if (combined.includes("line of fire")) {
    return IOGP_LIFE_SAVING_RULES[7];
  }
  if (combined.includes("hot work")) {
    return IOGP_LIFE_SAVING_RULES[8];
  }
  if (combined.includes("toxic gas") || combined.includes("h2s")) {
    return IOGP_LIFE_SAVING_RULES[5];
  }
  if (combined.includes("driving") || combined.includes("vehicle")) {
    return IOGP_LIFE_SAVING_RULES[9];
  }

  // 1. Work at Height
  if (
    combined.includes("height") ||
    combined.includes("fall") ||
    combined.includes("harness") ||
    combined.includes("derrick") ||
    combined.includes("monkey board") ||
    combined.includes("scaffold") ||
    combined.includes("catwalk") ||
    combined.includes("lanyard") ||
    combined.includes("ladder")
  ) {
    return IOGP_LIFE_SAVING_RULES[1];
  }

  // 4. Safe Mechanical Lifting
  if (
    combined.includes("lift") ||
    combined.includes("crane") ||
    combined.includes("sling") ||
    combined.includes("rigging") ||
    combined.includes("winch") ||
    combined.includes("hoist") ||
    combined.includes("drop zone") ||
    combined.includes("suspended load") ||
    combined.includes("bop stack")
  ) {
    return IOGP_LIFE_SAVING_RULES[4];
  }

  // 5. Toxic Gas
  if (
    combined.includes("gas") ||
    combined.includes("h2s") ||
    combined.includes("toxic") ||
    combined.includes("vapor") ||
    combined.includes("scba") ||
    combined.includes("detector") ||
    combined.includes("sensor") ||
    combined.includes("atmosphere") ||
    combined.includes("lel")
  ) {
    return IOGP_LIFE_SAVING_RULES[5];
  }

  // 3. Energy Isolation
  if (
    combined.includes("loto") ||
    combined.includes("isolation") ||
    combined.includes("lockout") ||
    combined.includes("bleed") ||
    combined.includes("residual pressure") ||
    combined.includes("zero energy") ||
    combined.includes("voltage") ||
    combined.includes("breaker")
  ) {
    return IOGP_LIFE_SAVING_RULES[3];
  }

  // 2. Bypassing Safety Controls
  if (
    combined.includes("bypass") ||
    combined.includes("defeat") ||
    combined.includes("override") ||
    combined.includes("interlock") ||
    combined.includes("tamper") ||
    combined.includes("disable")
  ) {
    return IOGP_LIFE_SAVING_RULES[2];
  }

  // 6. Confined Space
  if (
    combined.includes("confined") ||
    combined.includes("tank") ||
    combined.includes("vessel") ||
    combined.includes("separator interior") ||
    combined.includes("mud pit") ||
    combined.includes("manhole")
  ) {
    return IOGP_LIFE_SAVING_RULES[6];
  }

  // 8. Hot Work
  if (
    combined.includes("hot work") ||
    combined.includes("welding") ||
    combined.includes("cutting") ||
    combined.includes("grinding") ||
    combined.includes("spark") ||
    combined.includes("flare") ||
    combined.includes("ignition")
  ) {
    return IOGP_LIFE_SAVING_RULES[8];
  }

  // 7. Line of Fire
  if (
    combined.includes("line of fire") ||
    combined.includes("pinch") ||
    combined.includes("crush") ||
    combined.includes("pressurized hose") ||
    combined.includes("recoil") ||
    combined.includes("whip") ||
    combined.includes("drill string")
  ) {
    return IOGP_LIFE_SAVING_RULES[7];
  }

  // Default to Bypassing Safety Controls or Line of Fire depending on keyword
  return IOGP_LIFE_SAVING_RULES[2];
}
