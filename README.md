# BillRight ⚡

> An AI-assisted consumer protection web utility that verifies whether utility catch-up bills violate statutory back-billing limits across multiple jurisdictions (UK, Australia, US), armed with multimodal bill & physical meter dial OCR, interactive SVG timeline visualization, deterministic pro-rata math, direct supplier email dispatch, statutory escalation calendar reminders (.ics), dynamic party personalization, and multi-page vector legal dispute packet generation (.pdf).

![BillRight](https://img.shields.io/badge/status-production--ready-emerald)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-blue)
![Architecture](https://img.shields.io/badge/Architecture-Anti--Hallucination%20Hybrid-purple)
![Multimodal](https://img.shields.io/badge/Multimodal-Gemini%20Vision%20OCR-orange)
![PDF Engine](https://img.shields.io/badge/PDF%20Engine-PDFKit%20Vector%20Packet-navy)
![Calendar Engine](https://img.shields.io/badge/Calendar-RFC%205545%20.ics-teal)
![License](https://img.shields.io/badge/license-MIT-green)

🌐 **Live Demo**: [https://billright-zeta.vercel.app](https://billright-zeta.vercel.app)

---

## What BillRight Does

In many countries and states, energy utility regulators legally restrict how far back suppliers can bill consumers for historical energy consumption:
- **United Kingdom**: Under **Ofgem Standard Licence Condition 21BA**, energy suppliers cannot demand payment for energy consumed more than **12 months** prior to the bill date.
- **Australia**: Under **NERR Rule 30** (National Energy Retail Rules for participating states such as NSW, QLD, SA; Victoria maintains separate local rules), retailers recovering historical undercharges are strictly capped at a maximum of **9 months** before the customer was notified.
- **United States (California)**: Under **PG&E Electric Rule 17.1** (and equivalent CPUC tariff rules for SCE/SDG&E), adjustment of residential bills for billing errors where the customer was not at fault is restricted to **3 months**.
- **United States (Texas)**: Under **PUCT §25.28(d)** for electric utilities, back-billing adjustments are limited to **6 months** from error discovery; for retail electric providers, the limit under **§25.480(e)** must be verified with the PUCT.

Despite these protections, millions of households, tenants, and small businesses receive sudden, intimidating multi-year catch-up bills. Most either panic and pay or struggle to dispute them because utility regulations are dense, suppliers provide estimated meter readings that inflate charges, and consumers miss critical statutory escalation deadlines.

**BillRight** empowers consumers by:
1. **Reading Statements & Meters Honestly**: Uses Gemini Vision to extract statement dates, billing periods, amounts, and physical meter index readings, always leaving the user in control to inspect, edit, or enter values manually.
2. **Calculating Disputable Amounts Deterministically**: Apportions charges day-by-day across statutory lookback cut-off dates using zero-dependency, pure mathematical calculation. The AI is **never** permitted to calculate numbers or dates.
3. **Visualizing Lookback Windows**: Renders an interactive SVG timeline showing the *Permitted Window* and the *Disputable Window*, with cut-off barrier line and pro-rata period slices.
4. **Generating Ready-to-Send Dispute Dossiers**: Formulates formal dispute letters citing exact statutory rules, caveats for meter obstruction or estimated readings, and packages a 3-page vector PDF packet with full mathematical schedules.
5. **Managing Escalation Calendars & Inboxes**: Computes Day 1 (today), Day 14 (suggested response deadline), and Day 56 (8-week Ombudsman escalation) from the user's local date, providing one-click `.ics` calendar reminders and pre-filled complaints email dispatch.

---

## Anti-Hallucination Architecture

```
                          USER INTERACTION
    ┌───────────────────────┬───────────────────────────────┐
    │  PDF / Image Dropzone │  Manual / Preset Input Form   │
    └───────────┬───────────┴───────────────┬───────────────┘
                │                           │
                ▼                           │
    ┌───────────────────────────┐           │
    │  POST /api/extract-bill   │           │
    │  Gemini Vision OCR        │           │
    │  (Structured JSON schema) │           │
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
  • UK: 12 months                    - AU: NERR Rule 30 (9 mos)              - Multi-currency letter
  • AU: 9 months                     - US CA: PG&E Rule 17.1 (3 mos)         - Localized ombudsman
  • US TX: 6 months                  - US TX: PUCT §25.28(d)/§25.480(e)        escalation pathways
- Daily pro-rata apportionment       - Dynamic query builder                 - Obstruction warnings
                                              │
                                              ▼
                                 UNIFIED CLIENT RESPONSE
                                              │
       ┌──────────────────────────────────────┴──────────────────────────────────────┐
       ▼                                                                             ▼
[Interactive SVG Timeline]                                              [Results & Action Deck]
- Color-coded zones (Permitted vs Disputable)                           - Semantic Badges
- Cut-off barrier line with exact date                                  - Itemized pro-rata table
- Straddling period split segments                                      - Live citation cards
- Hover tooltips & interactive highlights                               - One-click copyable letter
```

---

## Supported Jurisdictions

| Jurisdiction | Regulatory Body | Statutory Instrument | Lookback Limit | Currency | Escalation Ladder |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **United Kingdom** | Ofgem | Standard Licence Condition 21BA | **12 months** | £ (GBP) | Supplier complaint (8 wks) &rarr; Energy Ombudsman |
| **Australia** | AER | National Energy Retail Rules (NERR Rule 30) | **9 months** | A$ (AUD) | Retailer dispute &rarr; Energy & Water Ombudsman (EWON/EWOV/EWOQ) |
| **US (California)** | CPUC | PG&E Electric Rule 17.1 (SCE/SDG&E eq.) | **3 months** | $ (USD) | Utility complaint &rarr; California Public Utilities Commission |
| **US (Texas)** | PUCT | §25.28(d) electric utilities (6 mos); §25.480(e) REPs (must be verified with PUCT) | **6 months** *(utilities; verify REP limit)* | $ (USD) | Utility dispute &rarr; Public Utility Commission of Texas |
| **Other Country** | Regional Regulator | Provisional 12-month benchmark | **12 months** *(Provisional)* | $ (USD) | Regional regulatory authority |

---

## Instant Sample Presets

BillRight includes instant presets for one-click demonstration:

- **UK Case A (£1,400 Catch-up Bill)**: Billed energy exceeds 12 months; produces an emerald *"Likely not recoverable under the rule"* badge, £1,000.00 disputable charges, Ofgem SLC 21BA citation, and a formal dispute letter.
- **UK Case B (£650 Recent Charge)**: Charges fall strictly within the permitted 12-month window; produces a slate *"Rule does not apply"* badge.
- **AU Case D (A$1,800 Catch-up Bill)**: 18-month catch-up bill in Australia; enforces NERR Rule 30 9-month limit, isolating A$900.00 disputable charges and drafting an Ombudsman escalation letter.
- **US CA Case E ($900 Underbilling)**: 9-month billing adjustment in California; enforces PG&E Rule 17.1 3-month limit, isolating $600.00 in disputable charges.
- **Case C (Missing Data)**: Demonstrates form validation behavior when dates are absent.

---

## How to Run Locally

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
GEMINI_MODEL=gemini-3.8-flash
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
Verifies cut-off dates, calendar day counting, multi-period composite math, straddling pro-rata formulas, leap year clamps, timezone edge calculations, obstruction/estimate handling, and multi-jurisdiction lookback windows with 100% precision.

---

## How the Devpost Skill Pack Was Used

BillRight was developed following the structured **Build With AI: Basics** methodology using specialized agent skills:

1. **`1-start`**: Established the learner profile, project conventions, and the flipped-interaction workflow, ensuring the agent interviews the builder to uncover core requirements.
2. **`2-scope`**: Interrogated the problem space to isolate a high-impact proof of concept: helping consumers dispute back-billing without hallucinations. Defined the non-negotiable boundary: AI handles extraction and text formatting, but pure code handles math.
3. **`3-prd`**: Authored a complete product requirements document covering user journeys, multimodal inputs, edge cases (leap years, meter obstructions, estimated bills), and multi-jurisdiction statutory rules without premature code discussion.
4. **`4-spec`**: Drafted the technical blueprint: Express.js server, vanilla CSS/JS frontend, zero-dependency math engine (`calculateBackBilling.js`), Gemini Vision for multimodal OCR, Tavily for live citation grounding, and PDFKit for vector legal packets.
5. **`5-build`**: Executed vertical slices step-by-step: Slice 1 (deterministic math), Slice 2 (form UI and SVG timeline), Slice 3 (multimodal bill and meter dial OCR), and Slice 4 (PDF export, email launcher, and calendar integration), verifying each milestone with unit tests.
6. **`6-ship`**: Conducted end-to-end verification, verified test suites, resolved regulatory citations, eliminated hardcoded mock data, secured credentials, and deployed live to Vercel.

---

## Data Privacy & File Handling

BillRight does not store your files. They are sent to Google Gemini for reading and are subject to Google's data policy.

---

## Notice & Informational Disclaimer

> **Not legal advice.** BillRight is an informational consumer calculation tool designed to assist consumers in identifying catch-up utility charges and assembling formal dispute notices. It does not provide legal advice, judicial determinations, or financial guarantees. Consumers should verify official utility rules with their regional energy regulator (e.g. Ofgem, AER, CPUC, PUCT) or independent ombudsman service.

---

## Future Work

- **Dual-Fuel Splitting**: Separate gas and electricity tariffs, standing charges, and calorific value conversions on combined utility statements.
- **Supplier API Inboxes**: Direct REST integrations with energy supplier customer service ticketing systems for automated delivery confirmation and tracking.
- **Multi-Language Notices**: Localized statutory dispute letters in Spanish, Welsh, and other regional languages.
- **Ombudsman Case Tracking**: Webhook-based tracking for the 8-week statutory escalation window with automated status notifications.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
