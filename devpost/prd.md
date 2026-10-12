---
doc: prd
status: approved
---

# BillRight — Product Requirements Document

An AI-assisted energy bill verification web app that helps consumers and microbusiness owners determine whether electricity catch-up charges exceed statutory back-billing limits, calculating the exact disputable sum and providing an actionable dispute letter.
Source: `scope.md > BillRight`

## The Core Journey
1. **Arrival & Disclaimer**: The user lands on a clean, single-page interface featuring a persistent header banner with a shield icon stating: *"Informational utility tool only — not formal legal advice."*
2. **Preset Selection or Manual Input**:
   - The user can select one of three **UK Sample Presets** (Preset A, B, or C) from a top selector to instantly populate all dates, amounts, and flags.
   - Alternatively, the user selects a country (defaults to United Kingdom) and enters their bill date, adds billing period rows, toggles estimated readings, and sets the meter access obstruction flag.
3. **Triggering Analysis**: The user clicks the primary *"Analyze Bill"* button (disabled if inputs are invalid or incomplete).
4. **Execution & Progress**: A subtle progress indicator shows the analysis pipeline steps: retrieving official regulatory rules, running mathematical lookback apportionment, and evaluating factual exceptions.
5. **Results Presentation**:
   - **Verdict Card**: Displays an unambiguous status badge (*"Likely not recoverable under the rule"*, *"Rule does not apply"*, or *"More evidence needed"*).
   - **Itemized Calculation Breakdown**: A clean tabular breakdown displaying each billing period, total days, days prior to the 12-month cut-off date, and calculated disputable amount.
   - **Retrieved Regulatory Sources**: A clean expandable drawer showing the official cited regulation (e.g., Ofgem SLC 21BA), relevant excerpt, and official source URL.
   - **Polite Dispute Letter**: A copyable, structured letter citing the retrieved regulation, the exact disputed sum, and the two-step escalation ladder (supplier formal complaints department, followed by the Energy Ombudsman).
6. **Interaction**: The user clicks *"Copy Letter"* to copy the text to their clipboard.

Source: `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`

## Screens and Layout
A focused, responsive single-page application arranged in a clean vertical stack:
- **Header**: App title ("BillRight"), brief tagline, and persistent non-legal-advice disclaimer banner.
- **Sample Presets Bar**: Quick-select buttons for UK Preset A, Preset B, and Preset C, plus a "Clear / Reset" option.
- **Bill Information Card**:
  - Country selection dropdown (United Kingdom by default, with "Other Country" option).
  - Bill Issue Date picker.
  - Meter access obstructed toggle (No / Yes).
  - Estimated readings toggle (No / Yes).
- **Billing Periods Table Card**:
  - Dynamic table with columns: Start Date, End Date, Amount (£), and an Actions column (Delete row).
  - "Add Billing Period" button to append rows.
  - Live client-side validation warnings for date ordering or non-positive amounts.
  - Primary "Analyze Bill" action button.
- **Results View (rendered below input upon analysis)**:
  - **Verdict Card**: Prominent badge, summary statement, and exception notes if triggered.
  - **Calculation Breakdown Table**: Itemized rows with cut-off dates, pro-rata apportionment math, and total disputable amount.
  - **Retrieved Regulatory Sources Card**: Regulation title, clause citation, excerpt, and verified hyperlink.
  - **Dispute Letter Container**: Distinct clean text container with an instant "Copy Letter" button and escalation ladder guidance.

## Look and Feel
Conveys civic trust, regulatory authority, and financial precision, deliberately free of generic neon AI styling.
- **Palette**:
  - Primary Brand / Structure: Deep Navy / Slate Blue (`#0F172A` / `#1E293B`) for headers, primary buttons, and card titles.
  - Canvas Background: Warm Off-White / Light Gray canvas (`#F8FAFC`).
  - Card Surfaces: Pure White (`#FFFFFF`) with subtle slate borders (`#E2E8F0`) and soft elevation.
  - Semantic Status Badges:
    - *Likely not recoverable under the rule*: Crisp Emerald / Forest Green (`#065F46` text on `#D1FAE5` background).
    - *Rule does not apply*: Cool Slate / Steel Gray (`#334155` text on `#F1F5F9` background).
    - *More evidence needed*: Warm Amber (`#92400E` text on `#FEF3C7` background).
- **Typography**:
  - Clean, modern sans-serif hierarchy (Inter or system font stack).
  - Explicit `font-variant-numeric: tabular-nums` for all financial figures and dates to ensure crisp numerical alignment.
- **Letter Container**:
  - Clean monospace or parchment-styled text container with subtle contrasting border and high legibility.

Source: `scope.md > Inspiration & Identity`

## Features and Behavior

### 1. Sample Presets Management
- **Preset A (Supports User / Over 12 Months)**:
  - Bill Date: Oct 1, 2026.
  - Period 1: Jan 1, 2025 – Dec 31, 2025 (£1,000.00). Completely before lookback date (Oct 1, 2025).
  - Period 2: Jan 1, 2026 – Sep 30, 2026 (£400.00). Entirely within the allowed 12 months.
  - Obstruction: No.
  - Expected Verdict: *"Likely not recoverable under the rule"*, Disputable Amount: £1,000.00.
- **Preset B (Rule Does Not Apply / Under 12 Months)**:
  - Bill Date: Oct 1, 2026.
  - Period 1: Oct 1, 2025 – Sep 30, 2026 (£650.00). Entirely within 12 months.
  - Obstruction: No.
  - Expected Verdict: *"Rule does not apply"*, Disputable Amount: £0.00.
- **Preset C (More Evidence Needed / Incomplete Data)**:
  - Bill Date: Oct 1, 2026.
  - Period 1: Start date missing or corrupted date format.
  - Expected Verdict: *"More evidence needed"*, Disputable Amount: Undetermined, banner prompting full dates.

### 2. Deterministic Mathematical Apportionment
- **Lookback Cut-off Date**: Exactly 12 calendar months prior to the Bill Issue Date.
- **Period Evaluation Logic**:
  - *Case 1 (Entirely Prior)*: If `End Date < Cut-off Date`, Disputable Amount = 100% of Row Amount.
  - *Case 2 (Straddling Cut-off)*: If `Start Date < Cut-off Date` and `End Date >= Cut-off Date`:
    - `Disputable Days` = Days from `Start Date` up to `Cut-off Date`.
    - `Total Days` = Days from `Start Date` to `End Date` (inclusive).
    - `Disputable Amount` = `(Disputable Days / Total Days) * Row Amount`.
  - *Case 3 (Entirely Within Window)*: If `Start Date >= Cut-off Date`, Disputable Amount = £0.00.
- Total Disputable Amount is the sum of all individual row disputable amounts, rounded to 2 decimal places.

### 3. Dynamic Regulatory Retrieval (Tavily)
- The app executes a live search for current back-billing rules (for UK: Ofgem Standard Licence Condition 21BA / back-billing principle).
- Extracts official regulatory citation, clause summary, and source URL.
- If live query fails, times out, or country is unrecognized, enters the graceful fallback state.

### 4. Constrained Exception Evaluation (Gemini)
- Evaluates specific statutory exceptions (specifically consumer obstructive conduct / refusing meter access).
- If the meter obstruction toggle is **Yes**, Gemini confirms the statutory exception applies.
- Overrides any calculation verdict to *"Rule does not apply"*, displays the statutory exception explanation, and suppresses the dispute letter.

### 5. Dispute Letter Generation
- Generates a courteous, legally sound dispute letter.
- Automatically inserts the supplier name (or placeholder), account/reference placeholder, exact calculated disputed sum, and official regulatory clause citation.
- Explicitly outlines the required UK dispute escalation path:
  1. Formal complaint submission to the supplier's internal complaints team (with statutory 8-week resolution window).
  2. Subsequent escalation to the Energy Ombudsman if unresolved.
- Contains a prominent "Copy Letter" button with visual feedback ("Copied!").

## States and Boundaries

- **Initial / Empty State**: Clean interface with empty form, preset selector active, Analyze button disabled until valid data exists, and results section hidden.
- **Loading State**: Visual progress indicator displayed during rule retrieval, mathematical calculation, and exception evaluation; input controls temporarily locked to prevent race conditions.
- **Success State — Disputable Charges Found**: Emerald badge (*"Likely not recoverable under the rule"*), itemized table showing exact disputed calculation, live regulatory citations, and active dispute letter.
- **Success State — Charges Valid**: Cool slate badge (*"Rule does not apply"*), itemized table showing £0.00 disputable charges, polite note explaining charges fall within the statutory 12-month window.
- **Exception Triggered State (Meter Obstruction)**: Slate badge (*"Rule does not apply"*), itemized table annotated with exception warning, dispute letter suppressed and replaced with objective guidance on meter access responsibilities.
- **Fallback State (Search / Network Failure or Unindexed Country)**: Amber badge (*"More evidence needed"*), banner explaining live regulatory rules could not be retrieved, calculation displayed for reference only, citations marked unverified, dispute letter disabled.
- **Validation Error State**: Client-side inline red indicators for reversed dates ("End date must be after start date") or non-positive amounts ("Amount must be a positive number"); "Analyze Bill" button disabled.

## Product Decisions
- **Pro-rata Daily Apportionment**: The learner chose an exact calendar-day pro-rata calculation for periods straddling the cut-off date to ensure mathematical accuracy and eliminate estimation errors.
- **Suppression of Dispute Letter on Obstruction**: If meter access was obstructed, the dispute letter is suppressed entirely rather than generating a flawed challenge, protecting consumer credibility and avoiding frivolous disputes.
- **Stateless Operation**: No database or user session storage to ensure privacy and eliminate backend complexity.
- **Separation of Concerns**: Deterministic code handles 100% of the mathematical calculation; Tavily handles regulatory retrieval; Gemini evaluates only qualitative exception conditions.

Source: `scope.md > The Unique Kernel` and `scope.md > The POC Boundary`

## What We're Building
- Responsive single-page web app with complete design system (Navy, Emerald, Slate, Amber).
- 3 built-in UK sample presets with instant one-click population.
- Dynamic billing table with add/edit/delete row capabilities and strict client-side validation.
- Deterministic lookback calculation engine implementing daily pro-rata math.
- Live regulatory retrieval integration via Tavily API with source URLs.
- Constrained Gemini exception evaluator for meter obstruction.
- 3-tier verdict display, calculation table, source reference drawer, and copyable dispute letter with escalation ladder.

## Deferred From the POC
- **PDF Bill Upload & OCR**: Deferred to maintain a reliable, zero-failure demo for the hackathon without OCR parsing failures.
- **Dual-fuel (Gas & Electricity) Combined Modeling**: Deferred to keep the data schema clean and focused on electricity back-billing.
- **Supplier Direct Contacts Directory**: Deferred; users copy the letter into their own supplier's complaint portal.

## Possible Later Enhancements
- Support for specific Australian (AER) and US state utility back-billing rules.
- Direct export of the calculation summary and dispute letter to PDF.

## Non-Goals
- The app will **never** declare a charge "illegal" or give formal legal advice.
- The app will not calculate or audit kilowatt-hour (kWh) meter readings, tariffs, or standing charges.
- The app will not store user financial or billing data on any server.

## Open Questions
- None blocking specification. API environment configuration (Tavily and Gemini API keys) will be formally mapped in `4-spec`.
