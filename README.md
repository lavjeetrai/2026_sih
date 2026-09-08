# Oil India Limited (OIL) · SentinelSIF AI Platform
### Upstream Oil & Gas SIF-Precursor Intelligence & IOGP Life-Saving Rules Engine

An enterprise-grade Health, Safety & Environment (HSE) intelligence dashboard for **Oil India Limited (OIL)** that detects **SIF Precursors (Serious Injury & Fatality Precursors)**, performs cross-report warning pattern intelligence, and auto-maps observations to **IOGP Life-Saving Rules (LSR)**, empowering executive safety leadership to prioritize field engineering interventions where catastrophic hazard potential is highest.

---

## 🏛️ System Architecture & Documentation

SentinelSIF AI follows a strict physical-to-logical architectural separation:
- 📖 [**System Architecture Documentation**](docs/ARCHITECTURE.md) — Comprehensive technical specification, multi-tier failure tolerance, data contracts, and logical-to-physical layer mapping.
- 🧠 [**Fine-Tuned SLM & Model Verification**](docs/MODEL.md) — Exact base model, LoRA adapter, Modal cloud deployment, and deterministic failover proof.
- 🛡️ [**IOGP Safety Rules & Barrier Taxonomy**](docs/SAFETY_RULES.md) — Authoritative catalog of the 9 IOGP Life-Saving Rules, barrier states, and domain validation gate.
- 🧪 [**Testing & Verification Guide**](docs/TESTING.md) — Automated verification suite and pre-demo audit checklist.

---

## 🎯 Key Capabilities

- **Modal Cloud Fine-Tuned SLM**: Cloud inference on specialized `OIL-SIF-Precursor-UAUC-v1.0` weights with automated failover to local edge Ollama (`safety-phi3`) and deterministic safety fallback.
- **IOGP Life-Saving Rules Mapping**: Authoritative multi-label mapping of observations to IOGP 9 Life-Saving Rules (Work at Height, Energy Isolation, Confined Space, etc.).
- **Cross-Report Warning Pattern Intelligence**: Discovers multi-report recurring safety weaknesses using hybrid structured and semantic graph clustering with cluster coherence validation.
- **HSE Priority Scoring**: Mathematically ranks operational sites and warning patterns by precursor severity and barrier criticality rather than raw report volume.
- **Human-in-the-Loop Review Gate**: Preserves original AI predictions while providing HSE managers with structured review, verification, and correction audit trails.

---

## 📁 Repository Structure

```
├── app/                    # Next.js App Router (presentation pages & API route handlers)
│   ├── api/                # API routes: request validation, auth & orchestration
│   ├── kanban/             # HSE Manager Kanban & Action Board
│   ├── analytics/          # Executive telemetry & spatial intelligence
│   └── page.tsx            # Unified entry experience (Worker Chat & Manager Portal)
├── components/             # React presentation components (strictly no direct DB access)
│   ├── worker/             # Worker report submission & field history screens
│   ├── manager/            # Manager Kanban board, CSV bulk ingestion & user portal
│   ├── hse/                # Executive Bento analytics & card review detail modals
│   ├── landing/            # Visual presentation & authentication forms
│   └── ui/                 # Reusable UI primitives (buttons, dialogs, inputs, badges)
├── lib/                    # Domain logic & services (strict layer boundaries)
│   ├── ai/                 # Model inference, PII sanitization & multi-engine routing
│   ├── safety/             # IOGP taxonomy, barrier analysis & validation gates
│   ├── patterns/           # Fact normalization, similarity & pattern clustering
│   ├── prioritization/     # HSE priority scoring & ranking calculations
│   ├── data/               # Persistence & MongoDB Atlas repository access
│   └── auth/               # Session HMAC tokens, scrypt hashing & RBAC
├── types/                  # Canonical shared TypeScript domain interfaces
│   ├── safety.ts           # SafetyAnalysisResult, barriers, LSR interfaces
│   ├── concerns.ts         # CardData, ColumnData, WorkerConcernPayload
│   ├── patterns.ts         # WarningPatternRecord, PatternEvidence
│   └── users.ts            # UserDocument, SessionClaims
└── docs/                   # Authoritative architecture and evaluation documentation
    ├── ARCHITECTURE.md     # Primary architectural reference document
    ├── MODEL.md            # Fine-tuned SLM proof & inference pathways
    └── SAFETY_RULES.md     # IOGP domain rules and taxonomy reference
```

---

## 🚀 Getting Started

### Development
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Production Build & Test
```bash
npm test
npm run build
npm start
```

### Demo Credentials
- **Role**: HSE Field Safety Officer
  - **Email**: `lav@gmail.com`
  - **Password**: `123456`
- **Role**: Chief General Manager (HSE)
  - **Email**: `priyanka@oilindia.in`
  - **Password**: `123456`
