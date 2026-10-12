# BillRight ⚡

> An AI-assisted consumer protection web application that verifies whether electricity catch-up charges violate statutory back-billing limits and arms consumers with an exact disputed calculation and ready-to-send dispute letter.

![BillRight](https://img.shields.io/badge/status-ready-emerald)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-blue)
![Architecture](https://img.shields.io/badge/Architecture-Anti--Hallucination%20Hybrid-purple)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Overview

In many jurisdictions, energy regulators legally restrict how far back suppliers can bill consumers for past energy consumption. Under **Ofgem Standard Licence Condition 21BA** in Great Britain, energy suppliers generally cannot demand payment for electricity or gas consumed more than **12 months** prior to the bill date.

Despite these protections, thousands of households, tenants, and small microbusinesses receive intimidating catch-up bills spanning 18 to 24 months. Most either panic and pay or struggle to dispute them because regulatory clauses are dense and hiring legal assistance costs more than the bill.

**BillRight** bridges this power asymmetry through a **three-layer anti-hallucination hybrid architecture**:
1. **Deterministic Calculation**: A pure, isolated JavaScript engine calculates lookback cut-off dates and daily pro-rata billing apportionment down to the penny. The AI is never allowed to calculate math or dates.
2. **Live Regulatory Retrieval**: The server calls the **Tavily Search API** to retrieve current, authoritative regulator rules directly from official sources (such as Ofgem), ensuring legal rules are grounded rather than hallucinated.
3. **Constrained LLM Reasoning**: **Google Gemini (gemini-3.8-flash)** evaluates factual exception conditions (such as customer meter obstruction) and formats a formal, polite dispute letter referencing the two-step escalation ladder (supplier complaints department &rarr; Energy Ombudsman).

---

## Key Features

- **3 Instant UK Presets**:
  - **Case A (£1,400 Catch-up Bill)**: Billed energy exceeds 12 months; produces an emerald *"Likely not recoverable under the rule"* verdict, calculates £1,000.00 disputable charges, cites Ofgem SLC 21BA, and generates a dispute letter.
  - **Case B (£650 Recent Charge)**: Charges fall strictly within the permitted 12-month window; produces a slate *"Rule does not apply"* verdict.
  - **Case C (Missing Data)**: Incomplete dates trigger client-side validation prompting complete information.
- **Dynamic Billing Breakdown Table**: Add, edit, or delete billing period rows with real-time validation and automatic currency totals.
- **Accurate Pro-Rata Math**: For billing periods straddling the 12-month boundary, charges are apportioned using exact calendar days (`(disputableDays / totalDays) * rowAmount`).
- **One-Click Dispute Letter**: Generates a courteous, legally sound dispute letter ready to paste into supplier complaint portals, equipped with one-click clipboard copying.
- **Fail-Safe Reliability**: Built-in 4-second API race timeouts that fall back to deterministic templates if external AI endpoints experience latency spikes.

---

## Anti-Hallucination Hybrid Architecture

```
┌──────────────────┐
│  Client Browser  │ (public/app.js & index.html)
└────────┬─────────┘
         │ POST /api/analyze
         ▼
┌──────────────────┐
│    server.js     │ (Express API Coordinator)
└────────┬─────────┘
         ├───► 1. Deterministic Math (src/calculateBackBilling.js)
         │        └── Computes 12-month cut-off date & pro-rata calendar days
         │
         ├───► 2. Live Search Retrieval (src/tavilyClient.js)
         │        └── Fetches verified Ofgem SLC 21BA regulatory text
         │
         └───► 3. Constrained Gemini Evaluation (src/llmClient.js)
                  └── Evaluates meter obstruction exception & formats dispute letter
```

---

## Quickstart & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Clone the repository
```bash
git clone https://github.com/HashirABD/billright.git
cd billright
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy the sample environment file and add your API keys:
```bash
cp .env.example .env
```
Edit `.env`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```
*(Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/) and a free Tavily API key from [Tavily](https://tavily.com/).)*

### 4. Run the development server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Testing & Verification

Run the deterministic mathematical test suite:
```bash
npm run test:math
```
Verifies cut-off dates, day counting, full lookback, straddling daily pro-rata math, and validation edge cases with 100% precision.

---

## Spec-Driven Development Artifacts

BillRight was developed following the **Devpost Learn Build With AI: Basics** spec-driven development process:
- [`devpost/scope.md`](devpost/scope.md) — Initial idea discovery, unique kernel, and proof-of-concept boundaries.
- [`devpost/prd.md`](devpost/prd.md) — Complete product requirements, user journeys, edge cases, and states.
- [`devpost/spec.md`](devpost/spec.md) — Technical specification, stack rationale, data contracts, and failure modes.
- [`devpost/checklist.md`](devpost/checklist.md) — Four-slice vertical build checklist and verification logs.
- [`devpost/app-map.html`](devpost/app-map.html) — Interactive standalone architecture map and reusable engineering takeaways.

---

## Legal Disclaimer

BillRight is an informational consumer assistance tool. It does not provide formal legal advice, judicial rulings, or financial guarantees. Users should always consult relevant regulatory ombudsman services or qualified legal professionals when disputing utility charges.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
