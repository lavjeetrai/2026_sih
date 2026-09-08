# SentinelSIF AI — IOGP Life-Saving Rules & Safety Taxonomy

This document outlines the authoritative domain safety taxonomy implemented in SentinelSIF AI, adhering directly to the International Association of Oil & Gas Producers (IOGP) Report 459 Standard.

---

## 1. The 9 IOGP Life-Saving Rules Catalog

SentinelSIF AI maps all oilfield safety observations directly to one or more of the 9 standardized IOGP rules:

| Rule # | Standardized Rule Name | Key Focus Area | Critical Barrier Definition |
|:---:|:---|:---|:---|
| **1** | **Work at Height** | Working above 1.8m, derrick platforms, scaffolding | 100% tie-off fall arrest system, certified anchorages, inspection tags |
| **2** | **Confined Space** | Tanks, separators, vessels, mud pits, cellars | Continuous atmospheric monitoring ($O_2$, LEL, $H_2S$), entry permit, standby rescuer |
| **3** | **Energy Isolation** | Electrical switchgear, pressurized lines, mechanical drives | Lockout/Tagout (LOTO), Double Block & Bleed, zero-energy physical verification |
| **4** | **Safe Mechanical Lifting** | Crane operations, cathead, wire rope slings, winches | Certified rigging, drop zone exclusion perimeter, non-exceeded rated capacity |
| **5** | **Hot Work** | Welding, flame torching, grinding in classified zones | Combustible gas sniff test (<1% LEL), continuous fire watch, spark curtains |
| **6** | **Line of Fire** | High-pressure piping, rotary table, tongs, suspended pipes | Physical barriers, exclusion tape, standing clear of tensioned cables |
| **7** | **Bypassing Safety Controls** | ESD valves, pressure relief valves, safety interlocks | Formal Management of Change (MOC), supervisor authorization override |
| **8** | **Driving Safety** | High-tonnage oilfield trucks, crew transport, rough terrain | Seatbelts, speed limits, vehicle pre-trip mechanical inspection |
| **9** | **Toxic Gas & Atmosphere** | Hydrogen Sulfide ($H_2S$), sulfurous crude, inert gas purging | Fixed telemetry sensors, personal gas clips, positive-pressure SCBA sets |

---

## 2. Barrier Failure State Classification

Every safety observation processed by SentinelSIF AI extracts two barrier dimensions:
1. **Safety Protection**: The physical or procedural defense layer intended to prevent energy release (e.g., `"Fall Arrest System"`, `"Positive Isolation"`, `"Combustible Gas Sniff Test"`).
2. **Protection Failure State**: The exact mode of failure:
   - `ABSENT`: Required barrier was omitted or not installed.
   - `DAMAGED`: Barrier was physically deteriorated, worn, or compromised.
   - `IMPROPERLY_USED`: Equipment was present but misused (e.g., harness worn but not clipped).
   - `INADEQUATE`: Barrier was present but undersized or insufficient for load.
   - `BYPASSED`: Safety device was intentionally overridden or jumpered.
   - `VERIFICATION_FAILED`: Pre-work checks or zero-energy confirmation was skipped.

---

## 3. Post-Inference Domain Safety Validation Gate

To uphold the core architectural invariant:
> **"AI predictions must never silently overwrite expert human judgment."**

SentinelSIF AI runs a post-inference validation gate (`validateSafetyRules` in `@/lib/safety`):
- If an AI inference model outputs `sif_potential = true` on text describing a purely compliant condition (e.g., *"100% tie-off verified by supervisor, zero gaps observed"*), the system **does not** discard the result.
- Instead, it marks `validation_flag = "NEEDS_HSE_REVIEW"` and sets `sif_category = "REVIEW"`.
- This ensures human HSE officers are explicitly notified to review the discrepancy without masking potential near-miss precursors.
