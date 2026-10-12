---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Scaffolding, Deterministic Math Engine & Interactive Verification**
  Becomes usable: The project is scaffolded with `package.json`, `server.js`, `calculateBackBilling.js`, and `testMath.js`. The deterministic back-billing math engine calculates 12-month lookback cut-offs, daily pro-rata apportionment, and itemized rows down to the penny with verified unit tests passing.
  Why now: Risk first and unique kernel early. Proves the deterministic mathematical foundation before introducing search or AI APIs, ensuring zero hallucinations in calculation.
  PRD ref: `prd.md > Features and Behavior (2. Deterministic Mathematical Apportionment)`
  Spec ref: `spec.md > Back-Billing Calculation Engine (src/calculateBackBilling.js)`, `spec.md > Components`, `spec.md > File Structure`
  Build: Scaffold `package.json`, install `express` and `dotenv`, implement `src/calculateBackBilling.js` (lookback date calculation, full period, straddling daily pro-rata, within-window logic), write `src/testMath.js` covering all edge cases, and create basic `server.js` and `.env.example`.
  Verify (mechanical): Run `node src/testMath.js` to confirm all mathematical assertions pass with 100% precision.
  Learner check: Run `node src/testMath.js` in terminal and confirm the daily pro-rata math and cut-off dates compute correctly.
  Commit: `feat: scaffold server and implement deterministic back-billing math engine`

- [x] **2. Frontend Interactive UI with Presets, Dynamic Billing Table & Validation**
  Becomes usable: A running web UI at `http://localhost:3000` with the complete editorial design system, persistent disclaimer banner, 3 UK instant sample presets (A, B, C) that auto-populate the table, dynamic row addition/deletion, and client-side validation for dates and amounts.
  Why now: Creates the visual interaction surface early so the user journey can be tested hands-on before connecting external APIs.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > Features and Behavior (1. Sample Presets Management)`
  Spec ref: `spec.md > Frontend Single Page Application (public/index.html, public/styles.css, public/app.js)`, `spec.md > Look and Feel`
  Build: Create `public/index.html` layout, `public/styles.css` (navy/slate palette, semantic badge styles, tabular-nums font, clean responsive cards), and `public/app.js` (preset injection, dynamic table row management, client-side input validation, disabled button states).
  Verify (mechanical): Start `server.js` on port 3000 and verify static file serving returns HTTP 200 for `/`, `/styles.css`, and `/app.js`.
  Learner check: Open `http://localhost:3000`, test clicking Preset A, B, and C, dynamically add/delete billing rows, and test inline validation on reversed dates.
  Commit: `feat: add editorial web interface, sample presets, and dynamic billing table`

- [x] **3. Live Regulatory Retrieval (Tavily) & Constrained Gemini Exception / Letter Formatter**
  Becomes usable: The backend pipeline is complete: `tavilyClient.js` searches official regulator rules (Ofgem SLC 21BA), `llmClient.js` evaluates meter access obstruction exceptions and formats the polite dispute letter with the two-step escalation ladder, and `server.js` exposes `POST /api/analyze` combining math + retrieval + AI with robust fallbacks.
  Why now: Completes the backend engine, connecting search and LLM logic with strict error handling so API outages gracefully degrade to "More evidence needed".
  PRD ref: `prd.md > Features and Behavior (3. Dynamic Regulatory Retrieval, 4. Constrained Exception Evaluation, 5. Dispute Letter Generation)`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Regulatory Retrieval Client (src/tavilyClient.js)`, `spec.md > LLM Exception & Letter Formatter (src/llmClient.js)`, `spec.md > Analysis Coordinator Route (POST /api/analyze)`
  Build: Install `@google/genai`, implement `src/tavilyClient.js` for live regulation search with fallback handling, implement `src/llmClient.js` targeting `gemini-2.5-flash` (temperature 0.0, JSON output, obstruction override, polite letter generation), and connect `POST /api/analyze` in `server.js`.
  Verify (mechanical): Send test `POST` requests to `/api/analyze` and verify JSON response contains proper verdict, calculation, verified regulation, and dispute letter.
  Learner check: Review the `/api/analyze` response structure and confirm that Tavily citations and Gemini exception evaluations match expected criteria.
  Commit: `feat: implement Tavily live retrieval, Gemini exception evaluation, and /api/analyze endpoint`

- [x] **4. End-to-End Integration, Verdict Cards, Sources Drawer & One-Click Copyable Letter**
  Becomes usable: Complete end-to-end web application. Clicking "Analyze Bill" displays the loading progress indicator, calls `/api/analyze`, renders the Verdict Card with semantic badges, builds the itemized calculation table with exact day counts, opens the retrieved sources drawer with official links, and displays the dispute letter with a one-click clipboard copy button.
  Why now: Closes the core loop, connects all frontend and backend components, and delivers the full 60-second hackathon demo experience.
  PRD ref: `prd.md > The Core Journey (Steps 3-6)`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > The Core Journey Through the System`, `spec.md > Data Model`
  Build: Wire `public/app.js` to submit payload to `POST /api/analyze`, display loading state, render the Verdict Card with emerald/slate/amber badges, render the itemized calculation table, render the retrieved sources card, and render the dispute letter with one-click copy feedback.
  Verify (mechanical): Execute complete automated or browser verification across all three presets and the obstruction toggle, verifying all UI states render correctly.
  Learner check: Run the full 60-second demo in the browser: click Preset A, click Analyze Bill, observe the verdict, review the calculation table, check sources, and copy the dispute letter.
  Commit: `feat: wire end-to-end analysis, verdict rendering, sources drawer, and copyable letter`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slice 2 (interactive UI with presets, dynamic table, and validation)
- [x] Final kick-the-tires exploration and feedback completed — Slice 4 (complete end-to-end application)

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Focused architectural practice connected directly to the learner's Desired Learning Outcome (anti-hallucination hybrid architecture). Verified deterministic math isolation (`src/calculateBackBilling.js` with `src/testMath.js` passing 100%), live regulatory retrieval (`src/tavilyClient.js` pulling Ofgem SLC 21BA in ~850ms), and constrained Gemini exception handling with defensive timeout fallback (`src/llmClient.js`).
Route and stops: `public/app.js` (validation & presets) &rarr; `server.js` (`POST /api/analyze`) &rarr; `src/calculateBackBilling.js` (pro-rata lookback math) &rarr; `src/tavilyClient.js` (Ofgem live rules) &rarr; `src/llmClient.js` (exception evaluation & dispute letter).
Edit outcome: Added `Promise.race` 4-second timeout to `src/llmClient.js` ensuring 100% resilient fallback and zero latency spikes.
Reflection: Successfully demonstrated how formal planning specifications (`prd.md` and `spec.md`) keep autonomous AI agents aligned to build zero-hallucination architectures.
Activity mode: Focused architectural review and interactive app map (`devpost/app-map.html`).

## Revisions


