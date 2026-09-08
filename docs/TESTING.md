# SentinelSIF AI — Testing & Verification Guide

This document summarizes the test suite and architectural verification commands for SentinelSIF AI.

---

## 1. Automated Verification Suite

Run all automated tests:
```bash
npm test
```

### Key Verification Scripts
- `npm run test:patterns` / `node scripts/verify_patterns.mjs`:
  - Validates cross-report warning pattern clustering.
  - Verifies cluster coherence validation prevents transitive chaining.
  - Tests exact duplicate suppression and temporal trend calculations.
- `npm run test:lsr` / `node scripts/verify_lsr.mjs`:
  - Verifies multi-label IOGP rule resolution.
  - Verifies barrier failure state extraction across diverse field observations.
- `node scripts/verify_auth.mjs`:
  - Validates scrypt password hashing and timing-safe verification.
  - Verifies HMAC-SHA256 session token generation and tamper detection.

---

## 2. Production Build & Static Analysis

Verify TypeScript compilation, Next.js bundling, and linting:
```bash
npm run build
```

Expected output:
```
✓ Compiled successfully
✓ Generating static pages
✓ Collecting build traces
```

---

## 3. Pre-Demo Checklist

| Verification Item | Verification Method | Status |
|:---|:---|:---:|
| **Fine-Tuned SLM Connection** | Run Modal status ping (`GET /api/ai-status`) | Verified |
| **Worker Concern Submission** | Submit observation from Worker Chat (`/`) | Verified |
| **Kanban Real-Time Update** | Check `/kanban` receives new card in "To Do" | Verified |
| **Bulk CSV Ingestion** | Upload 10–50 rows via "Import CSV" modal | Verified |
| **HSE Manager Review** | Open card modal, confirm or correct SIF fields | Verified |
| **Executive Telemetry** | View `/analytics` for site HSE priority ranking | Verified |
| **Cross-Report Patterns** | Verify recurring patterns in Bento dashboard | Verified |
