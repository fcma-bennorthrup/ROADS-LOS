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

This preparation step does not wire the merge into any event and does not
capture or write a loan baseline. Creation, Reset and Blend behavior stay
unchanged until their respective follow-up phases.
