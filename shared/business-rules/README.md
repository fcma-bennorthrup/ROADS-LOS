# Prototype loan business rules

Add small, pure TypeScript rules here and register their results in `index.ts`.
Rules receive a saved `LoanApplication`, including prior rule results, plus a
server timestamp. The API evaluates and stores results atomically with each
accepted save. The client displays those server results, never unsaved drafts.
Do not add a DSL, rules editor, external engine, or fields to support a rule.

## TRID

- Name and SSN: saved first/last name and SSN of the same applicant in
  `borrower-primary` or `borrower-secondary`. Synthetic masked SSNs are accepted.
- Purchase address: saved subject-property street, city, state, ZIP.
- Amount: saved requested loan amount, greater than zero.
- Income: a saved income source with an income type and at least one explicit
  numeric income component. Explicit zero income is information; blank isn't.
- Value: positive saved Estimated Value in either collateral evaluation.
  There is currently **no purchase-price field**; no inferred purchase price,
  new field, or UI sample default is substituted.
- When all six exist, retain the trigger even if a field is later cleared.
- The checklist consumes required TRID to start Generate Loan Estimate, not
  decision-letter delivery.
- A confirmed rate-lock update starts a new TRID cycle, even with missing initial
  inputs. Its saved cycle counter and re-fired estimate actions commit together.
  Initial locking also retains the existing redisclosure behavior if an estimate
  was already completed.
- Saved Loan Estimate checklist delivery (action 2) satisfies the rule.
  Generation alone and Closing Disclosure delivery do not.
- Existing Loan Estimate re-fire resets delivery and makes triggered TRID
  required again until re-delivery.
- Re-fired estimates must be generated again before delivery is enabled.
- Demo reset/import starts a new lifecycle. Prior triggers aren't carried over.

The chip displays hard-coded “TRID day 0” while required; it is not a calculated day count or compliance deadline. Business-day
calendars, holidays, jurisdiction, legal applicability, actual delivery evidence,
and regulatory validation are outside this prototype rule.

Test new rules beside their implementation. Include incomplete inputs,
saved/unsaved boundaries, delivery, reset, and stale-write rejection as relevant.

## ECOA

Blend import stands in for a complete application and starts ECOA. The header
shows the fixed label “30 ECOA days remaining”; no elapsed-day calculation.
All three saved checklist actions must be complete to satisfy it: Loan Decision,
Generate Decision Letter, and Deliver Decision Letter. A decision or generation
alone does not hide the chip. Reset clears the lifecycle; re-import starts a
new one. Existing saved Blend imports are adopted when loaded.

## Joint credit

Blend demo controls support one or two borrowers (default two). A single-borrower
import has no secondary personal-information section or secondary income record.
The joint-credit rule shows “Joint Credit Application” for two or more named
borrowers, and no chip for one borrower or blank reset slots.
