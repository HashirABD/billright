---
doc: scope
status: approved
---

# BillRight

An AI-assisted energy bill verification tool that checks whether electricity catch-up charges violate regulatory back-billing limits and arms consumers with an exact disputed calculation and ready-to-send dispute letter.

## The Unique Kernel
BillRight replaces blind AI advice with a three-layer hybrid architecture: live regulatory retrieval (via Tavily) grounds the analysis in actual official rules rather than training memory, deterministic math functions calculate the lookback dates and disputed sums with mathematical certainty, and a constrained LLM (Gemini) evaluates only factual exception criteria. It never guesses the law or the math.

## Who It's For
A household tenant, homeowner, or small microbusiness owner (such as a local cafe or shop owner) who receives an unexpected catch-up bill demanding payment for energy consumed 18 to 24 months ago. Today, they face extreme power asymmetry: they feel intimidated by complex tariffs and large energy suppliers, panic and pay from savings, or get dismissed on customer service calls because they cannot cite official regulatory clauses.

## The Core Loop
The user opens BillRight, clicks one of three UK sample presets (or enters their own bill dates and line items), and clicks "Analyze Bill". Within seconds, they see an unambiguous verdict badge, a clear financial cut-off calculation showing exactly what portion cannot be back-billed, links to the official regulatory text, and a copyable complaint letter with escalation steps.

## Inspiration & Identity
- **Tone & Mood**: Reassuring, clear, objective, and authoritative without feeling aggressive or overly litigious.
- **Visual Identity**: Clean single-page interface with high-contrast informational badges, prominent non-legal-advice disclaimers, and clean tabular calculation summaries.
- **Reference**: Ofgem Standard Licence Condition 21BA ([Ofgem Back-billing Guide](https://www.ofgem.gov.uk/information-consumers/energy-advice-households/check-energy-back-billing-rules)).

## Why This Matters to the Learner
As an Electrical Engineering student who relies on AI coding agents, this project bridges practical consumer advocacy with a mastery of the spec-driven AI development workflow: enforcing rigorous boundaries between deterministic logic and LLM reasoning to prevent hallucinations, scope creep, and broken code.

## What "Working" Looks Like
In a 60-second browser demo:
1. User loads the single-page application and sees a prominent disclaimer banner.
2. User selects UK Case A (a £1,400 catch-up bill spanning 18 months).
3. The app executes live regulatory retrieval, deterministic cut-off calculation, and exception evaluation.
4. The user sees a bold verdict badge ("Likely not recoverable under the rule"), a transparent mathematical breakdown showing the exact disputable sum before the 12-month cut-off, retrieved official citations with source URLs, and a copyable, polite dispute letter referencing the two-step escalation ladder (supplier complaints team followed by the Energy Ombudsman).
5. User toggles to Case B (charges within 12 months) and Case C (missing data) to demonstrate reliable, non-hallucinatory edge handling.

## The POC Boundary
- **Included (POC)**:
  - Responsive single-page web interface with prominent informational disclaimer.
  - 3 instant UK sample presets: Case A (supports user), Case B (rule does not apply), Case C (missing evidence).
  - Manual entry mode: Country selection, bill date, line items (period start/end and amount), estimated reading flag, meter access obstruction toggle.
  - Live regulator search via Tavily API (Ofgem SLC 21BA for UK; best-effort fallback for others).
  - Deterministic calculation engine for the lookback date and disputed sum.
  - Constrained Gemini LLM call for exception checking.
  - Verdict card with 3-state badge, itemized financial calculation, retrieved sources drawer, and copyable polite dispute letter.

## Later
- PDF bill upload with OCR parsing.
- Dual-fuel multi-utility calculations (gas + electricity combined).
- Region-specific supplier directories with direct complaint inbox contacts.

## Explicitly Cut
- **User authentication & database storage**: Cut to keep the app completely stateless, client-focused, and privacy-first.
- **Automated email transmission**: Cut to avoid email-relay vulnerabilities and compliance overhead; users copy the text.
- **Tariff & kWh meter recalculation**: Cut to prevent complex rate-modeling errors; math focuses strictly on line-item billing periods relative to lookback dates.
- **Declaring charges "illegal"**: Cut as a strict safety guardrail; the app strictly frames results as informational assessments under published regulations.
