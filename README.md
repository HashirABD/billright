# BillRight ⚡

> An AI-assisted consumer protection web utility that verifies whether utility catch-up bills violate statutory back-billing limits across multiple jurisdictions (UK, Australia, US), armed with multimodal document auto-extraction, interactive SVG timeline visualization, deterministic pro-rata math, and formal dispute drafting.

![BillRight](https://img.shields.io/badge/status-production--ready-emerald)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-blue)
![Architecture](https://img.shields.io/badge/Architecture-Anti--Hallucination%20Hybrid-purple)
![Multimodal](https://img.shields.io/badge/Multimodal-Gemini%20Vision-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## The Problem

In many countries and states, energy utility regulators legally restrict how far back suppliers can bill consumers for historical energy consumption:
- **United Kingdom**: Under **Ofgem Standard Licence Condition 21BA**, energy suppliers cannot demand payment for energy consumed more than **12 months** prior to the bill date.
- **Australia**: Under **AER National Energy Retail Rules (NERR Rule 30)**, retailers recovering historical undercharges are strictly capped at a maximum of **9 months**.
- **United States (e.g., California CPUC Rule 17.1)**: Adjustment of residential bills for billing errors where the customer is not at fault is restricted to **3 months** (or **6 months** in states like Texas under PUCT §25.28).

Despite these protections, millions of households, tenants, and small business owners receive sudden, intimidating multi-year catch-up bills. Most either panic and pay or struggle to dispute them because utility regulations are dense and hiring a lawyer costs more than the bill itself.

---

## The Anti-Hallucination Solution

Most AI applications attempt to solve legal and financial problems by feeding documents into a raw prompt, risking dangerous mathematical inaccuracies and hallucinated case law.

**BillRight** enforces a strict **four-pillar anti-hallucination architecture**:

1. **Multimodal Document Extraction (Gemini Vision)**: Users can drop PDF or image bills into an upload zone. Gemini Vision extracts statement dates, billing periods, amounts, and reading types (actual vs. estimated) with structured JSON schemas, auto-populating the form while leaving the user in full control to inspect or edit.
2. **100% Deterministic Arithmetic**: A pure, zero-dependency JavaScript engine calculates regional statutory cut-off dates and daily pro-rata billing apportionment down to the penny. The AI is **never** permitted to calculate numbers or dates.
3. **Interactive Dispute Timeline Visualizer**: A dynamic SVG visualizer maps each consumption period against the statutory cut-off barrier line, color-coding periods into the *Permissible Billing Window* (green) and *Disputable Back-Billing Zone* (red), with straddling periods visually split into exact pro-rata segments with interactive hover tooltips.
4. **Live Regulatory Grounding (Tavily Search API)**: The server calls Tavily to retrieve current, official regulatory clauses directly from regulator authorities (`ofgem.gov.uk`, `aer.gov.au`, `cpuc.ca.gov`), ensuring legal facts are grounded in live statutory reality.
5. **Constrained Exception Evaluation & Letter Drafting (Gemini)**: The LLM evaluates statutory exceptions (such as customer meter obstruction) and drafts a courteous, formal complaint letter tailored to the regional statutory escalation ladder (supplier dispute &rarr; Energy Ombudsman / Utilities Commission).

---

## System Architecture

```
                          USER INTERACTION
    ┌───────────────────────┬───────────────────────────────┐
    │  PDF / Image Dropzone │  Manual / Preset Input Form   │
    └───────────┬───────────┴───────────────┬───────────────┘
                │                           │
                ▼                           │
    ┌───────────────────────────┐           │
    │  POST /api/extract-bill   │           │
    │  Gemini 2.5/3.8 Vision    │           │
    │  (Structured JSON parser) │           │
    └───────────┬───────────────┘           │
                │ (Auto-populates fields)   │
                └──────────────────────────►▼
                                ┌───────────────────────────┐
                                │     POST /api/analyze     │
                                └─────────────┬─────────────┘
                                              │
    ┌─────────────────────────────────────────┼────────────────────────────────────────┐
    ▼                                         ▼                                        ▼
[Stage 1: Deterministic Math]        [Stage 2: Live Search]                  [Stage 3: Constrained LLM]
calculateBackBilling.js              tavilyClient.js                         llmClient.js
- Regional lookback:                 - UK: Ofgem SLC 21BA                    - Exception evaluation
  • UK: 12 months                    - AU: AER NERR Rule 30 (9 mos)          - Multi-currency letter
  • AU: 9 months                     - US: CPUC Rule 17.1 (3 mos)            - Localized ombudsman
  • US: 3 / 6 months                 - Dynamic query builder                   escalation pathways
- Daily pro-rata apportionment
                                              │
                                              ▼
                                 UNIFIED CLIENT RESPONSE
                                              │
       ┌──────────────────────────────────────┴──────────────────────────────────────┐
       ▼                                                                             ▼
[Interactive SVG Timeline]                                              [Results & Action Deck]
- Color-coded zones (Permissible vs Disputable)                         - Semantic Badges
- Cut-off barrier line with exact date                                  - Itemized pro-rata table
- Straddling period split segments                                      - Live citation cards
- Hover tooltips & interactive highlights                               - One-click copyable letter
```

---

## Supported Jurisdictions

| Jurisdiction | Regulatory Authority | Statutory Instrument | Lookback Limit | Currency | Escalation Ladder |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **United Kingdom** | Ofgem | Standard Licence Condition 21BA | **12 months** | £ (GBP) | Supplier complaint (8 wks) &rarr; Energy Ombudsman |
| **Australia** | AER | National Energy Retail Rules (Rule 30) | **9 months** | A$ (AUD) | Retailer dispute &rarr; Energy & Water Ombudsman (EWON/EWOV/EWOQ) |
| **US (California)** | CPUC | Tariff Rule 17.1 (Underbilling) | **3 months** | $ (USD) | Utility complaint &rarr; California Public Utilities Commission |
| **US (Texas)** | PUCT | Substantive Rule §25.28(h) | **6 months** | $ (USD) | Utility dispute &rarr; Public Utility Commission of Texas |

---

## Instant Sample Presets

BillRight includes instant presets for one-click demonstration:

- **UK Case A (£1,400 Catch-up Bill)**: Billed energy exceeds 12 months; produces an emerald *"Likely not recoverable under the rule"* badge, £1,000.00 disputable charges, Ofgem SLC 21BA citation, and a formal dispute letter.
- **UK Case B (£650 Recent Charge)**: Charges fall strictly within the permitted 12-month window; produces a slate *"Rule does not apply"* badge.
- **AU Case D (A$1,800 AER Catch-up Bill)**: 18-month catch-up bill in Australia; enforces AER 9-month limit, isolating A$900.00 disputable charges and drafting an Ombudsman escalation letter.
- **US CA Case E ($900 CPUC Underbilling)**: 9-month billing adjustment in California; enforces CPUC 3-month limit, isolating $600.00 in disputable charges.
- **Case C (Incomplete Data)**: Missing dates trigger inline validation prompting complete information.

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
Copy the sample environment file:
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

Run the deterministic mathematical unit test suite:
```bash
npm run test:math
```
Verifies cut-off dates, calendar day counting, multi-period composite math, straddling pro-rata formulas, leap year clamps, and Australian/US lookback windows with 100% precision.

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
