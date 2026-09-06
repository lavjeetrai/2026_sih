# Oil India Limited (OIL) · Project Status

## Overview

This project is an AI/NLP-powered Health, Safety & Environment (HSE) intelligence dashboard tailored for **Oil India Limited (OIL)**. It addresses the challenge of identifying high fatal-potential events in unstructured oilfield reports by ranking installations and activities by **SIF-Precursor (Serious Injury & Fatality Precursor) Density** and auto-mapping observations to **IOGP Life-Saving Rules (LSR)**.

## Implemented Features

### 1. OIL HSE Landing Experience
- Full-screen scroll-driven circle inversion animation with oilfield safety branding.
- Focus message: *"Zero Fatalities. Targeted Interventions."*
- Problem statement highlights: SIF-Precursor Density ranking, UA/UC observation parsing, and IOGP Life-Saving Rules enforcement.
- *"Launch HSE Portal"* call-to-action opening the role-based auth flow.

### 2. Role-Based Safety Authentication
- Role selection between **HSE Field Officer** (Safety Steward / Inspector) and **HSE Manager** (Installation Manager / Safety Lead).
- Demo access credentials (`lav@gmail.com` / `123456`).
- Full registration & profile avatar management with OIL safety tags.

### 3. HSE Field Officer Workspace (AI Observation Intake)
- **OIL AI Safety Assistant & SIF Classifier**:
  - Interactive prompt interface for analyzing raw text observations and near-miss logs.
  - One-click oilfield test scenarios (*Unlatched Derrick Harness at 15m*, *Bypassed H2S Gas Alarm at Duliajan GGS*, *Frayed Crane Wire Sling*, *Hot Work in Gas Zone*).
  - Instant classification display with SIF-Precursor hazard badge, Mapped Life-Saving Rule, Fatal Potential Risk Level, and Recommended Field Interventions.

### 4. HSE Manager Workspace (SIF Analytics & CAPA Tracking)
- **SIF-Precursor Density & Site Ranking Suite**:
  - **Site SIF Density Bar Chart**: Ranks key OIL installations by SIF precursor concentration (*Moran Field Rig-04: 82%*, *Naharkatiya Workover-02: 68%*, *Duliajan GGS-1: 45%*, *Digboi GGS-3: 28%*, *Numaligarh Pipeline: 14%*).
  - **IOGP Life-Saving Rules Infraction Radar**: Multidimensional index tracking violations across *Line of Fire*, *Working at Height*, *Energy Isolation*, *Safe Mechanical Lifting*, and *Confined Space*.
  - **Observation Severity Split Donut**: Breakdown of OIL field logs into *SIF-P Precursor (42%)*, *Unsafe Acts (28%)*, *Unsafe Conditions (18%)*, and *Near Misses (12%)*.
- **HSE Intervention & CAPA Board**:
  - 4-stage Kanban workflow: *Flagged SIF-P*, *Intervention Assigned*, *Field Action / Inspection*, *Verified & Closed*.
  - Real OIL oilfield cards with priority indicators, Life-Saving Rule tags, checklists, and safety officer assignments.

## Technical Architecture

- **Framework**: Next.js App Router, React 19, TypeScript.
- **Styling**: Tailwind CSS v4, PostCSS.
- **Animations**: Framer Motion for scroll inversion, radar polygons, donut charts, and Kanban card transitions.
- **Form State & Validation**: React Hook Form, Zod.
- **UI System**: Radix UI primitives & Lucide React safety icons.

## Useful Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run lint     # Run ESLint
npm run build    # Build production bundle
```

