---
doc: spec
status: approved
---

# BillRight — Technical Specification

## How This Works, In Plain Language
BillRight is a local web application built with a lightweight Node.js Express server and a modern Vanilla HTML/CSS/JavaScript single-page frontend. 

When you click a sample preset or enter a bill and click "Analyze Bill", the frontend sends your bill data to a single backend endpoint (`POST /api/analyze`). The backend executes a strict three-stage pipeline:
1. **Deterministic Calculation**: A pure JavaScript module calculates the exact 12-month lookback cut-off date and apportioned billing charges down to the penny. The AI is never allowed to do math.
2. **Live Regulatory Retrieval**: The server calls the Tavily Search API to search for official current energy regulator rules (e.g., Ofgem Standard Licence Condition 21BA for the UK), retrieving the actual regulation title, clause excerpt, and official URL.
3. **Constrained AI Exception & Letter Formatting**: The server passes the pre-calculated numbers and user flags to Google Gemini (using the official `@google/genai` SDK at temperature 0.0 with structured JSON output). Gemini only evaluates whether an exception applies (such as meter access obstruction) and formats the polite dispute letter inserting the exact pre-calculated figures.

The browser receives the combined result and updates the page: displaying a clear status badge, an itemized mathematical calculation table, links to official regulatory sources, and a ready-to-copy complaint letter.

## The Core Journey Through the System
1. **User Loads Application**: Browser requests `http://localhost:3000`. Express serves `index.html`, `styles.css`, and `app.js`. The user sees the disclaimer banner and empty input form with UK presets ready.
   * *Implements `prd.md > The Core Journey (Step 1)`*
2. **User Selects Preset or Enters Data**: Clicking a preset button (Preset A, B, or C) instantly injects predefined dates and line items into the DOM, or the user enters line items manually. Client-side validation in `app.js` enables the "Analyze Bill" button once all fields are valid.
   * *Implements `prd.md > Features and Behavior (1. Sample Presets Management)`*
3. **Submission**: User clicks "Analyze Bill". `app.js` displays a loading progress indicator and sends a `POST` request to `/api/analyze` with the JSON payload.
   * *Implements `prd.md > The Core Journey (Step 3 & 4)`*
4. **Backend Coordination**: `server.js` validates payload fields, calls `calculateBackBilling()` to compute disputable charges, calls `tavilyClient.js` to retrieve live regulatory sources, and calls `llmClient.js` to evaluate exceptions and generate the letter.
   * *Implements `prd.md > Features and Behavior (2, 3, 4, 5)`*
5. **Rendering Results**: The frontend receives the response JSON, removes the loading indicator, renders the Verdict Card with its semantic badge, populates the itemized mathematical breakdown table, renders the Sources drawer, and populates the copyable Complaint Letter box.
   * *Implements `prd.md > The Core Journey (Step 5 & 6)`*

## Stack
- **Runtime & Backend Framework**: Node.js (v18+) with Express (`^4.19.2`).
  - *Rationale*: Zero compilation overhead, fast native HTTP handling, and keeps API keys securely off the client.
  - *Doc*: [Express Documentation](https://expressjs.com/)
- **Frontend Core**: Vanilla HTML5, modern CSS3, and modern Vanilla JavaScript (ES6+).
  - *Rationale*: Maximum performance, zero framework bundle weight, complete styling control with native CSS custom properties and `tabular-nums`.
  - *Doc*: [MDN Web Docs](https://developer.mozilla.org/)
- **AI / LLM SDK**: Official Google Gen AI SDK (`@google/genai` or `@google/generative-ai`), targeting `gemini-2.5-flash` on the free tier.
  - *Rationale*: Low latency, zero-cost development tier, strict JSON schema output mode, and robust prompt adherence.
  - *Doc*: [Google Gen AI SDK](https://github.com/google-gemini/generative-ai-js)
- **Search Retrieval API**: Tavily Search API (`@tavily/core` or direct REST `fetch`).
  - *Rationale*: Purpose-built search engine for LLMs that returns clean, official Markdown excerpts and authoritative URLs.
  - *Doc*: [Tavily API Documentation](https://docs.tavily.com/)
- **Configuration & Utilities**: `dotenv` (`^16.4.5`) for environment secrets management.
  - *Doc*: [dotenv](https://github.com/motdotla/dotenv)
- **Testing**: Built-in Node.js test runner (`node:test`) or lightweight test script for verifying mathematical edge cases.

## Where It Runs and How Someone Tries It
- **Runtime Environment**: Local Node.js environment on Windows/macOS/Linux.
- **Required Secrets**: Stored in a local `.env` file (gitignored):
  ```env
  PORT=3000
  GEMINI_API_KEY=your_gemini_api_key_here
  TAVILY_API_KEY=your_tavily_api_key_here
  ```
  A sanitized template is provided as [`.env.example`](file:///.env.example).
- **Exact Startup Command**:
  ```bash
  npm install
  npm start
  ```
- **Access URL**: Open `http://localhost:3000` in any modern web browser.
- **Demo Recording Verification**: Reviewer can click "Preset A" and "Analyze Bill" to observe end-to-end execution in under 5 seconds.

## Look and Feel
Carried forward directly from `prd.md > Look and Feel`:
- **Palette**:
  - Canvas: `#F8FAFC` (Warm slate off-white)
  - Card Surfaces: `#FFFFFF` with `#E2E8F0` border strokes and soft elevation
  - Primary / Headers: `#0F172A` / `#1E293B` (Deep Navy)
  - Badges:
    - *Likely not recoverable*: Text `#065F46`, Background `#D1FAE5` (Emerald)
    - *Rule does not apply*: Text `#334155`, Background `#F1F5F9` (Slate)
    - *More evidence needed*: Text `#92400E`, Background `#FEF3C7` (Amber)
- **Typography**: System sans-serif stack (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`) with `font-variant-numeric: tabular-nums` for all financial tables and date displays.
- **Letter Box**: Styled container with subtle border, clear letterhead format, and an instant "Copy Letter" clipboard button with tooltip feedback.

## Components

### Express Server & Static File Host (`server.js`)
Serves static frontend assets from `/public` and hosts the analysis API endpoint.
- *Implements `prd.md > Screens and Layout`*

### Analysis Coordinator Route (`POST /api/analyze`)
Validates incoming payload schema, orchestrates the sequential calls to the calculation engine, search retrieval client, and LLM client, and formats the unified JSON response.
- *Implements `prd.md > Features and Behavior`*

### Back-Billing Calculation Engine (`src/calculateBackBilling.js`)
Pure, deterministic mathematical calculation module.
- Takes `billDate` and an array of `billingPeriods: [{ startDate, endDate, amount }]`.
- Computes `cutOffDate` (exactly 12 calendar months prior to `billDate`).
- For each period:
  - If `endDate < cutOffDate`: `disputableAmount = amount`, `disputableDays = totalDays`.
  - If `startDate < cutOffDate && endDate >= cutOffDate`:
    - `disputableDays = daysBetween(startDate, cutOffDate)`.
    - `totalDays = daysBetween(startDate, endDate) + 1`.
    - `disputableAmount = Math.round(((disputableDays / totalDays) * amount) * 100) / 100`.
  - If `startDate >= cutOffDate`: `disputableAmount = 0.00`, `disputableDays = 0`.
- Aggregates total disputable sum and returns detailed itemized rows.
- *Implements `prd.md > Features and Behavior (2. Deterministic Mathematical Apportionment)`*

### Regulatory Retrieval Client (`src/tavilyClient.js`)
Calls Tavily Search API with queries targeted at national energy regulators (e.g., `"UK Ofgem Standard Licence Condition 21BA back-billing electricity rules 12 months"`).
- Extracts official rule summary, clause number, and source URL.
- Handles network errors and unindexed jurisdictions by returning `{ verified: false, fallbackReason: "..." }`.
- *Implements `prd.md > Features and Behavior (3. Dynamic Regulatory Retrieval)`*

### LLM Exception & Letter Formatter (`src/llmClient.js`)
Interacts with Gemini 2.5 Flash via `@google/genai` with temperature 0.0 and JSON schema mode.
- Evaluates whether the factual obstruction condition overrides the rule.
- If obstructed: returns verdict override `"Rule does not apply"` with the statutory exception reason and suppresses the dispute letter.
- If unobstructed and disputable sum > 0: returns verdict `"Likely not recoverable under the rule"` and formats the formal complaint letter with the two-step escalation ladder (supplier -> Energy Ombudsman).
- If unobstructed and disputable sum = 0: returns verdict `"Rule does not apply"`.
- *Implements `prd.md > Features and Behavior (4. Constrained Exception Evaluation & 5. Dispute Letter Generation)`*

### Frontend Single Page Application (`public/index.html`, `public/styles.css`, `public/app.js`)
- Renders the disclaimer banner, presets selector, bill input form, dynamic line-items table, progress indicators, and results view.
- Provides dynamic row creation, deletion, date validation, and one-click clipboard copying.
- *Implements `prd.md > The Core Journey` and `prd.md > Screens and Layout`*

## Data Model

### Analysis Request Payload (`POST /api/analyze`)
```json
{
  "country": "United Kingdom",
  "billDate": "2026-10-01",
  "isEstimated": true,
  "isMeterObstructed": false,
  "billingPeriods": [
    {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "amount": 1000.00
    },
    {
      "startDate": "2026-01-01",
      "endDate": "2026-09-30",
      "amount": 400.00
    }
  ]
}
```

### Analysis Response Payload
```json
{
  "verdict": "Likely not recoverable under the rule",
  "badgeType": "consumer_protected",
  "disputableTotal": 1000.00,
  "totalBilled": 1400.00,
  "cutOffDate": "2025-10-01",
  "itemizedBreakdown": [
    {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "amount": 1000.00,
      "totalDays": 365,
      "disputableDays": 365,
      "disputableAmount": 1000.00,
      "status": "fully_before_cutoff"
    },
    {
      "startDate": "2026-01-01",
      "endDate": "2026-09-30",
      "amount": 400.00,
      "totalDays": 273,
      "disputableDays": 0,
      "disputableAmount": 0.00,
      "status": "within_allowed_window"
    }
  ],
  "regulation": {
    "verified": true,
    "title": "Ofgem Standard Licence Condition 21BA (Back-billing Principle)",
    "jurisdiction": "United Kingdom",
    "summary": "Suppliers cannot back-bill domestic and microbusiness customers for energy consumed more than 12 months prior to the bill date unless the customer behaved obstructively.",
    "sourceUrl": "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/check-energy-back-billing-rules"
  },
  "exceptionTriggered": false,
  "exceptionNotes": null,
  "disputeLetter": "Dear Complaints Team,\n\nAccount Reference: [Insert Reference]..."
}
```

## File Structure
```
billright/
├── src/
│   ├── calculateBackBilling.js    # Pure deterministic mathematical engine
│   ├── tavilyClient.js            # Live regulatory search client
│   ├── llmClient.js               # Gemini exception evaluator & letter formatter
│   └── testMath.js                # Unit verification script for back-billing math
├── public/
│   ├── index.html                 # Single page markup & layout
│   ├── styles.css                 # Clean editorial stylesheet & design system
│   └── app.js                     # Frontend event handling, validation, API call
├── devpost/
│   ├── learner-profile.md         # Learner context & goals
│   ├── scope.md                   # Approved scope
│   ├── prd.md                     # Approved PRD
│   └── spec.md                    # Approved technical specification
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules (secrets & node_modules)
├── package.json                   # Dependencies & scripts
└── server.js                      # Express application entrypoint
```

## External Services and Dependencies
1. **Google Gemini API**:
   - Endpoint: `gemini-2.5-flash` via `@google/genai` SDK
   - Auth: Bearer API Key via `GEMINI_API_KEY`
   - Purpose: Strict exception condition verification and complaint letter template formatting.
   - Cost / Limits: Free tier within hackathon rate limits (15 RPM).
2. **Tavily Search API**:
   - Endpoint: `https://api.tavily.com/search`
   - Auth: API Key via `TAVILY_API_KEY`
   - Purpose: Live web search for authoritative regulator back-billing clauses.
   - Fallback: Gracefully switches to "More evidence needed" if unreachable or rate-limited.
3. **Express**:
   - Purpose: Local HTTP server routing.

## Important Failure Modes
1. **Tavily API Failure / Rate Limit / Unrecognized Country**:
   - *Behavior*: Backend catches error, returns `regulation.verified = false` with fallback explanation. Frontend displays amber badge (*"More evidence needed"*), renders mathematical calculation for reference, flags sources as unverified, and suppresses the letter.
2. **Missing or Corrupted Gemini API Key**:
   - *Behavior*: Backend falls back to deterministic rule synthesis template rather than crashing with an unhandled 500 error, ensuring the user still receives their calculation and standard dispute text.
3. **Client Input Inconsistencies (Reversed Dates, Empty Rows)**:
   - *Behavior*: Caught client-side in `app.js` before network transmission. Red field highlight and disabled submit button prevent invalid requests.

## What Was Simplified and Why
- **Vanilla Stack instead of React/Vite**: Zero bundling overhead, instant start, no client-side state library complexity, perfectly matching a proof-of-concept hackathon timeline.
- **Single Endpoint Architecture (`POST /api/analyze`)** instead of multi-step REST resources: Eliminates intermediate state synchronization between frontend and backend.
- **Client-Side Storage Only**: The app is completely stateless; no database or session cookies required, ensuring absolute user privacy.

## Decisions and Open Issues
- **Learner Choice**: Selected Node.js Express backend with Vanilla HTML5/CSS3/JS frontend running locally at `http://localhost:3000`.
- **Learner Choice**: Mandated complete isolation of the deterministic math engine (`calculateBackBilling.js`) so that AI never performs arithmetic.
- **Clarified Uncertainty**: Addressed how to prevent AI hallucinations by decoupling search retrieval (Tavily) from evaluation (Gemini temperature 0.0 with JSON schema).
- **Open Issues**: None. All dependencies, files, data models, and failure paths are fully mapped.
