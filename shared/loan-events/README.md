# Simulated loan data events

Generate simulated data on the server with pure functions in this directory.
The browser sends an action name and options, never generated loan data.
Pass the random source into every generator; production callers use
`node:crypto`'s `randomInt`, and tests can use `deterministicRandom`.
Pass time explicitly when a generator needs it.

Use synthetic data only: fictional people, employers and banks (for example
Demo Community Bank), `@example.com` emails, `555-01xx` telephone numbers,
and SSNs starting with `000`.

## Shared merge rule

`fillMissing(existing, incoming)` never mutates either input.
Undefined, null, empty strings and whitespace-only strings take the incoming
value. Plain objects merge recursively and keep keys found only in the existing
object. False and zero are real values, not blanks. Arrays are atomic: a
non-empty array is kept whole, while an empty or missing array takes incoming.
Other existing values win.

## Lifecycle

Salesforce-only creation supports one or two borrowers and captures an independent
baseline. Reset restores that baseline and clears later task/application output.
Legacy loans capture missing baselines during their first Reset, preserving known
values. Blend generates random data and fills blanks, retaining metadata,
history, credit and task progress. Only Reset restarts the overall TRID/ECOA
lifecycle. Repeated imports with nothing to fill do not save a new revision.

## Adding an event

1. Add a pure function beside `blend-application.ts`, injecting randomness/time.
2. Merge generated data with `fillMissing`; preserve existing rows and values.
   For borrower-owned arrays, append only where that borrower has no rows.
3. Add an action to the `/demo` route with generation/revision checks and the
   shared document validation. Accept options, never browser-generated sections.
4. Add a card to `LoanDemoControls.tsx` using the existing control patterns.
5. Test with a fixed random source: preservation, repeat no-op, stale requests,
   borrower ownership and document validity.

Credit pull (`shared/demo-credit.ts`) and Trigger TRID
(`shared/business-rules/trigger-trid-demo.ts`) are earlier fill-only events.
They stay where they are. Trigger TRID uses frozen server-side templates; its
values and rule implementation are unchanged.
