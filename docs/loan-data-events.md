# ROADS Prototype: Simulated Loan Data Events

Nov 11, 2026 · @Ben

## What changes

A loan becomes its Salesforce opportunity plus whatever simulated events have filled it in since, and Reset takes it back to the opportunity. Today every control rebuilds the loan from scratch, which is why Reset empties it and Blend import overwrites it.

Four behaviors change:

1. **One way to create a loan.** New Loan on the Pipeline creates a Salesforce opportunity for one or two borrowers. The Blend option is removed from that dialog.
2. **The opportunity is saved as the loan's baseline.** The data seeded at creation is the minimum a loan can have, and a copy of it is kept on the loan.
3. **Reset All Application Data returns to the baseline.** The borrower, CIF, loan amount and Sales Support details survive. Everything added later is removed.
4. **Blend import fills in, with random data.** It never changes a value the loan already has, and each loan gets a different application.

One structural change supports them: simulated loan data is generated on the server with one shared merge rule, instead of being assembled in the browser from page constants. The next simulated event you add follows the same pattern.

Five prompts deliver this, one phase each. Prompts 1 to 3 each produce one visible change you can check in the browser before pasting the next.

## Where the prototype stands today

Salesforce data is generated on the server and Blend data in the browser, and both Reset and Blend import work by replacing the whole loan. The table is what the uploaded code does as of commit `39861f9` (Nov 11).

| Area | Today, as read from the code | Consequence |
| --- | --- | --- |
| Creating a loan | Pipeline, New Loan opens `NewLoanDialog.tsx` with two sources. New SF Opportunity posts `{ source: "sf" }` to `POST /api/loans`. Blend import posts `{ source: "blank" }`, then sends the `blend` demo action with sections built in the browser. | Two creation paths. A Blend-created loan has no CIF and no opportunity details. |
| Salesforce data | `newSfOpportunity()` in `server/sf-opportunity.ts` builds one borrower with a random name, SSN, DOB, phone, email and address, a Purchase loan type, and a random amount under $444,100. Region, loan officer, application date and contract expiry go in `meta.opportunity`. | This is already the minimum loan. It needs a second borrower and a saved copy. |
| Blend data | `client/src/lib/blend-demo-fixture.ts` assembles fixed Richard and Jane Jamerson data from constants exported by four page components. The browser posts it to the server. `shared/loan-factory.ts` hard-codes the matching header values. | Every import is identical, and the data is built where it cannot be merged or randomized safely. |
| Reset | The `reset` demo action calls `newLoanApplication({ source: "blank" })`. It keeps the id, loan number, created time and creation receipt. It drops the CIF and `meta.opportunity`. | The loan becomes empty and falls out of the Sales Support queue. |
| Blend import in a loan | The `blend` demo action calls `newLoanApplication({ source: "blend" })` with the posted sections. The whole loan is replaced, including the borrower Salesforce created. | Salesforce data is overwritten, and the loan also leaves Sales Support. |
| The `mode` flag | `empty` shows blanks for unsaved sections. `blend` and `existing` show the components' sample constants for unsaved application sections. `mode === "blend"` starts the ECOA clock, and it is the only reason Declarations, Military and Demographic answers appear, because those answers are never saved. | The new import must still set `blend`, Reset must return to `empty`, and no borrower may be left without a saved section. |
| Liabilities and income | The Summary treats a missing liabilities list as unknown and an empty list as none. Income is matched to borrowers by position and may not have more records than borrowers. Liabilities come from the simulated credit pull. | Blend writes empty liability lists when they are missing, never rows, and one income record per borrower. |
| Fill-only precedent | Trigger TRID (`shared/business-rules/trigger-trid-demo.ts`) already fills only missing inputs. The credit pull (`shared/demo-credit.ts`) already adds without replacing. | The merge rule exists twice in one-off form. New events get one shared rule. |
| Stored model | One JSON document per loan in `prototype_loan_applications`, checked by `shared/loan-contract.ts`. `docs/database-collaboration.md` says an optional field needs no upgrade file. | The baseline is an optional field under `meta`: no upgrade file and no version bump. |
| Existing loans | Seed loan `1` and every loan created so far have no baseline. | Reset needs a rule for them (decision 4). |

Three details shape the prompts:

- **The entry point is the New Loan dialog.** New SF Opportunity does not live in Prototype Admin Controls. On the Pipeline that modal is an empty shell, and it stays one.
- **A one-borrower loan shows a blank "Borrower 2" tab in Borrower Financials today.** The income list's blank default has two entries. Seeding one empty income record per borrower fixes it for new loans.
- **A two-borrower opportunity shows the Joint Credit Application chip immediately.** The existing rule counts named borrowers, so this needs no change.

## Target pattern: a baseline plus events

Every loan is created once, by a Salesforce opportunity, and that opportunity is saved on the loan as its baseline. Everything after that is an event that fills blanks. Only a reset takes data away.

&#91;embedded content: loan data lifecycle · create, events, reset\]

Creation happens once. Events can run in any order, any number of times. Reset is the only arrow that points back.

Six rules follow from this, and they are the rules to hand to Replit:

1. **One creation path.** `POST /api/loans` creates Salesforce opportunities only, for one or two borrowers. No blank loans and no Blend creation.
2. **The baseline is saved once and never edited.** `meta.baseline` holds the loan header, opportunity details, borrowers and sections exactly as created.
3. **Events only fill blanks.** An event generates a complete set of data, then merges it with one shared rule: a value the loan already has always wins. Events never remove a borrower, a row or a value.
4. **Only resets take data away.** Reset All Application Data rebuilds the loan from the baseline and restarts the TRID and ECOA lifecycles. The checklist and TRID resets keep their narrower scope.
5. **The server generates, the browser asks.** The browser sends an action name and options. It never builds or posts loan data.
6. **Randomness is passed in.** Generators take the random source as an argument, so tests can fix it and every loan still differs.

The code lands in one new folder plus the existing creation file:

| File | Holds |
| --- | --- |
| `server/sf-opportunity.ts` (existing) | The creation event. Builds the opportunity for one or two borrowers and saves the baseline. It stays on the server because CIF allocation needs the database lock. |
| `shared/loan-events/random.ts` | The random source that generators receive. |
| `shared/loan-events/fill-missing.ts` | The one merge rule every event uses. |
| `shared/loan-events/synthetic-borrower.ts` | One borrower's Salesforce-level identity. Used for borrower two at creation and for a co-borrower that Blend adds. |
| `shared/loan-events/baseline.ts` | Capture a baseline, and rebuild a loan from one. |
| `shared/loan-events/blend-application.ts` | The Blend event: a random application and its fill-only apply. |
| `shared/loan-events/README.md` | These rules, and how to add an event. |

Adding the next simulated event then takes three small pieces: a file beside `blend-application.ts`, an action name on the `/demo` route, and a button in `LoanDemoControls.tsx`.

The `mode` flag keeps its current meaning, so the ECOA rule, the checklist defaults and the questionnaire display need no change. Trigger TRID, the credit pull and the checklist reset keep their behavior.

## Decisions baked in

Five choices are written into the prompts where your request left room. Each can be reversed by editing one step before you paste.

| # | Decision | Why | To change it |
| --- | --- | --- | --- |
| 1 | The second Salesforce borrower gets the same data points as the first, generated independently: own name, SSN, DOB, phone, email and address. The two are never identical. | "Randomly duplicate" read as the same fields with fresh values. | In Prompt 1 step 2, say borrower two shares borrower one's last name and address. |
| 2 | Blend import fills only what is blank on the loan as it stands. A second run on the same loan finds nothing to fill and says so. | One merge rule for every event, and a reset stays the only way to lose data. | In Prompt 3 step 2, say the import starts from the baseline each time, so it re-rolls. |
| 3 | The in-loan borrower choice stays, and means how many borrowers the Blend application covers. Choosing 2 on a one-borrower loan adds a co-borrower. Choosing 1 on a two-borrower loan fills only the first. It defaults to the loan's current count. | It follows from "fill in what isn't there", and it lets you demo a co-borrower joining at application. | In Prompt 3, remove the choice and always cover every borrower on the loan. |
| 4 | A loan created before this change gets its baseline on its first Reset. Salesforce-level values it already has are kept, and anything missing is generated. | It keeps the borrower on loans you made this week. | In Prompt 2 step 3, say to regenerate everything, or to leave older loans resetting to empty. |
| 5 | The New Loan dialog loses its source choice and gains a borrower choice, 1 or 2, defaulting to 1. | A one-option source list is noise, and 1 matches today's opportunity. | In Prompt 1 step 6, change the default or keep a source label. |

Decision 4 differs from the summary I gave you earlier, which regenerated everything. One side effect remains: an older loan that never had opportunity details gets them at that Reset, so it then appears in Sales Support.

Smaller calls, also in the prompts:

- **Blend import refuses to run over unsaved edits.** It no longer replaces the loan, so open edits would otherwise be lost silently. Trigger TRID already works this way.
- **Blend import keeps workflow progress.** Checklist status, credit results and documents survive an import. Only Reset clears them.
- **Questionnaire answers are unchanged.** Declarations, Military and Demographic answers still show the components' fixed samples after an import. They are not saved on the loan and not randomized.
- **Employers and banks become fictional.** The current fixture names real companies. Generated data uses names like "Demo Community Bank", matching the credit pull.
- **`meta.source` stays `sf` after an import.** It records where the loan came from, and the contract-expiry backfill depends on it.

## What each control does after the change

Salesforce supplies who the borrowers are and what they asked for. Blend supplies the application around that, and never touches a Salesforce value.

| Data | Salesforce opportunity (the baseline) | Blend import (only where blank) |
| --- | --- | --- |
| Loan header | Loan number, CIF, Purchase, requested amount, Customer Application stage | Nothing |
| Opportunity details | Region, loan officer, application date, contract expiry, Sales Support queue | Nothing |
| Borrower identity | First and last name, SSN, DOB, phone, email, street, city, state, ZIP, for one or two borrowers | Only for a co-borrower it adds |
| Borrower personal details | Blank | Marital status, dependents and their ages, farm involvement, MLA off |
| Loan details | Loan type, requested amount | Loan purpose, down payment amount and source, story |
| Income | One empty record per borrower | One employment source per covered borrower, with totals that match its parts |
| Assets | None | One or two current assets and one non-current asset per covered borrower |
| Liabilities | None | Empty lists if missing. Rows still come from the credit pull. |
| Subject property | None | Street, city, county, state, ZIP, owned by the primary borrower. Taxes and insurance stay blank. |
| Estimated property value | None | None. Trigger TRID or manual entry supplies it, as today. |

### New Loan, on the Pipeline

- The dialog asks for 1 or 2 borrowers and creates a Salesforce opportunity. You stay on the Pipeline.
- The row appears in All Loans and Sales Support. A two-borrower row shows "+1" beside the name.
- The baseline is saved in the same insert that creates the loan.
- A lost response still recovers the same loan on retry.

### Reset All Application Data, in a loan

- **Restored from the baseline:** loan header with its CIF, opportunity details, borrowers, and saved sections.
- **Kept as they are:** loan id, loan number, created time.
- **Cleared:** Blend data, manual edits, checklist progress, generated documents, credit results, rate lock, change log, the decision and credit-freeze toggles. The stage returns to Customer Application.
- TRID and ECOA start over.

### New Blend Import, in a loan

- It generates a full random application for the chosen number of borrowers, then keeps every value the loan already has.
- Checklist progress, documents and credit results are untouched.
- If nothing is blank, nothing is saved and the panel says so.
- It starts the ECOA clock, as today. It does not trigger TRID by itself, as today, because it supplies no estimated value.

## Migration plan

Five phases, one Replit session each, run in order. Phases 0 and 4 change nothing you can see. Phases 1 to 3 each deliver one of the behaviors you asked for.

&#91;embedded content: roadmap · 5 phases, 4 browser checks\]

Each diamond is the browser check in the table's last column.

| Phase | Touches | Check in the browser before the next prompt |
| --- | --- | --- |
| 0 · Prepare | New folder `shared/loan-events/` with the random source, the merge rule, the borrower generator and a README. Optional `meta.baseline` in `shared/loan-contract.ts`. `newSfOpportunity` calls the extracted generator. | Nothing looks or behaves differently. New SF Opportunity, Reset and Blend import work as before. `npm run db:check` reports compatible. |
| 1 · Create | `POST /api/loans` accepts Salesforce only, with a borrower count. `server/sf-opportunity.ts` adds the second borrower, the income records and the baseline. `NewLoanDialog.tsx` and the Pipeline empty-state text. | Create a one-borrower and a two-borrower loan. Both appear in Sales Support. The second shows "+1" and the Joint Credit chip. Borrower Financials shows one tab per borrower. The dialog has no Blend option. |
| 2 · Reset | `baseline.ts`, the `reset` branch of the `/demo` route, the reset card text in `LoanDemoControls.tsx`, and the rule for older loans. | On a Phase 1 loan: edit a field, run the old Blend import, then Reset. The original borrowers, CIF, amount and Sales Support row return. The checklist is all not started and History is empty. Then Reset an older loan and confirm it keeps its borrower. |
| 3 · Blend | `blend-application.ts`, the `blend` branch of the `/demo` route, and the Blend card in `LoanDemoControls.tsx`. | Import on two new loans: Salesforce fields are unchanged, the rest is filled, and the two applications differ. Set a marital status by hand, then import: your value survives. Import with 2 on a one-borrower loan: a co-borrower appears. Import again: nothing to fill. Reset, then import: different data. |
| 4 · Clean up | Trigger TRID's template data moves to the server. `client/src/lib/blend-demo-fixture.ts` is deleted. Unused factory code goes. `replit.md`, `docs/loan-demo-controls.md` and the two READMEs are updated. | Trigger TRID behaves exactly as before. The docs describe the new behavior. |

Between Phase 1 and Phase 3 the in-loan Blend import still replaces the loan, as it does today. Prompt 1 makes it carry the baseline forward, so Reset in Phase 2 still restores the real opportunity.

## Prompts to feed Replit

One prompt per phase, written to be pasted as-is. Run them in order, and pass each browser check before pasting the next. The first prompt carries the rules every later one relies on. Prompts 1 to 3 deliver the behavior, and Prompt 4 only tidies and documents.

Before Prompt 0, export this doc as Markdown and add it to the repo as `docs/loan-data-events.md`, as you did with `docs/pipeline-architecture.md`. Prompt 0 tells Replit to read it.

### Prompt 0: Prepare, no visible change

```markdown
We are changing how simulated data gets into a loan. From now on a loan is created only as a Salesforce (SF) opportunity, that opportunity is saved on the loan as its baseline, later simulated events (Blend import first) only fill in blanks, and Reset returns the loan to the baseline. This first task changes nothing a user can see. If `docs/loan-data-events.md` exists, read it for background, but do only the task in this message.

Rules for this and every later task in this series (save them to your memory notes; later prompts say "Same rules as before" and mean these):
1. Apart from what a prompt explicitly asks for, every page must look and behave exactly as it does today. No styling changes. Do not touch `design-tokens.css` or `design-tokens.ts`.
2. Every loan stays one document in `prototype_loan_applications`. No new tables and no `db:push`. Follow `docs/database-collaboration.md`. The only stored-model change in this series is one optional field, `meta.baseline`; it needs no upgrade file and no version bump, so do not edit `script/db-upgrades/`. Do not narrow the `mode` or `meta.source` enums, because existing loans carry the old values. Run `npm run db:check` before and after each task.
3. Simulated loan data is generated on the server by pure functions in `shared/loan-events/`. The browser sends an action name and options, never loan data. Generators receive their random source as an argument.
4. Synthetic data only: fictional people, employers and banks (as `shared/demo-credit.ts` does with "Demo Community Bank"), `@example.com` emails, `555-01xx` phone numbers, SSNs starting `000`.
5. `mode: "existing"` stays reserved for seed loan `1`, and `MemStorage` keeps only that loan. Keep what `mode` means today: do not change the ECOA rule, the checklist defaults or `applicationStore.read`.
6. Do not push to or pull from GitHub.
7. This series deliberately replaces some earlier decisions in your memory notes. Blend import will stop replacing the loan, stop removing a second borrower, and stop restarting the TRID and ECOA lifecycles. Reset will stop producing an empty loan. Loans can no longer be created blank or from Blend. An older loan may gain opportunity details when it is Reset. Treat these prompts as the newer instruction.
8. The UX choices in these prompts are decided. Ask only about something they do not cover.
9. Before you start, run `npm run check` and `npx vitest run` and record what already fails. At the end of each task, report new failures separately from inherited ones. Do not fix unrelated failures.
10. Verify only on loans you create for the purpose, and list them. Never run Reset or Blend import on a loan that already existed.

Do the following:
1. Create `shared/loan-events/random.ts`: a `RandomInt` type, `(min: number, maxExclusive: number) => number`, matching `randomInt` from `node:crypto`; a `pick(random, values)` helper; and a deterministic source for tests.
2. Create `shared/loan-events/fill-missing.ts` exporting `fillMissing(existing, incoming)`, the one merge rule every event will use. A missing value takes `incoming`. For two plain objects, a key is filled only when the existing value is `undefined`, `null`, or an empty or whitespace-only string; keys only in `existing` are kept; nested plain objects merge the same way. `false` and `0` are values, not blanks. A non-empty array is kept whole; an empty or missing one takes `incoming`. It never mutates its inputs. Unit-test every case.
3. Create `shared/loan-events/synthetic-borrower.ts` by extracting the borrower generation that is inline in `newSfOpportunity` (`server/sf-opportunity.ts`): the same name lists, locations, and formats for phone, email, SSN, DOB and address, taking `{ cif, now, random }`. `newSfOpportunity` calls it with `randomInt`. `server/__tests__/sf-opportunity.test.ts` and `opportunity-expiry.test.ts` must pass without edits.
4. In `shared/loan-contract.ts`, add optional `meta.baseline`: `{ capturedAt, loan, borrowers, sections, opportunity }`. Reuse the document's own schemas for each part and apply the same checks: the baseline's loan id equals the loan's, its borrowers belong to it, and recognised sections match `sectionSchemas`. Documents without a baseline stay valid. Add contract tests for a document with a baseline, without one, and with a mismatched one.
5. Add `shared/loan-events/README.md` stating rules 3 and 4 and the merge rule.

Nothing calls `fillMissing` or writes `meta.baseline` yet. Report the `check`, test and `db:check` results.
```

### Prompt 1: One way to create a loan

```markdown
Same rules as before. Make a Salesforce opportunity the only way to create a loan, for one or two borrowers, and save it on the loan as its baseline.

1. `POST /api/loans` in `server/loan-application.ts`: accept `{ source: "sf", borrowerCount?: 1 | 2, idempotencyKey? }`. A request without `borrowerCount` creates one borrower, so existing callers keep working. `source: "blank"` now gets the existing 400. Store `borrowerCount` in `meta.creationAttempt` beside `key` and `source`, and answer 409 when a retry key arrives with a different `borrowerCount`, as you already do for a different source. Keep the advisory lock, loan-number and CIF allocation, and lost-response recovery as they are.
2. `newSfOpportunity` in `server/sf-opportunity.ts`: add a `borrowerCount` argument, default 1. For 2, generate the second borrower with the same `syntheticBorrower` generator, independently of the first: its own name, SSN, DOB, phone, email and address. Re-draw until the two differ in full name, SSN, phone and email. Add the second entry to `document.borrowers` (`${id}-secondary`, `isPrimary: false`, with name, phone and email) and a `borrower-secondary` section with the same fields as `borrower-primary`. The loan keeps one CIF. A one-borrower opportunity is otherwise unchanged.
3. Also seed `sections.income` with one record per borrower: `{ name, isPrimaryWageEarner: false, incomeSources: [] }`. Today a one-borrower loan shows a blank "Borrower 2" tab in Borrower Financials, because the blank default in `BorrowerFinancialsContent.tsx` has two entries. This fixes it for new loans without touching that component.
4. Create `shared/loan-events/baseline.ts` with `captureBaseline(document, now)`, returning `{ capturedAt, loan, borrowers, sections, opportunity }` as deep copies, where `opportunity` is `meta.opportunity`. As the last step of `newSfOpportunity`, set `document.meta.baseline` from it. Nothing else may write `meta.baseline`.
5. Until later prompts replace them, the existing `reset` and `blend` branches of `POST /api/loans/:id/application/demo` must carry `meta.baseline` forward unchanged, the way they already carry `createdAt` and `creationAttempt`.
6. `client/src/components/NewLoanDialog.tsx`: remove the "Application source" radio group and every Blend path (the fixture import, the `/demo` call, the retained-blank-loan messages, "Open blank loan" and "Retry import"). Add a "Borrowers" radio group, "1 borrower" and "2 borrowers", default 1, with test ids `new-loan-borrowers-1` and `new-loan-borrowers-2`. Lock it after an attempt, as the source group is locked today. Send `{ source: "sf", borrowerCount, idempotencyKey }`. Keep the title "New loan". The description becomes "Create a simulated Salesforce opportunity." Keep "Create loan" and "Creating…", the same-key retry after a lost response, and staying on the Pipeline through `onSfCreated`.
7. `client/src/pages/pipeline.tsx`: the empty-state sentence becomes "Start with a New SF Opportunity." Leave the Pipeline's Prototype Admin Controls modal as the empty shell it is.
8. Tests: update `NewLoanDialog.test.tsx`, `pipeline.test.tsx`, `pipeline-routes.test.ts` and `sf-opportunity.test.ts`. Add cases for: two borrowers are distinct and both appear in `applicationView`; `pipelineView` reports `additionalBorrowerCount` of 1; `income` has one record per borrower; `meta.baseline` deep-equals the created loan header, borrowers, sections and opportunity; `blank` is rejected; the old `reset` and `blend` actions preserve `meta.baseline`. Also run `npm run test:postgres`.

Check in the browser: create a one-borrower and a two-borrower loan from the Pipeline. Both appear in All Loans and Sales Support. The second shows "+1" beside the name and, when opened, the Joint Credit Application chip and two borrower tabs. Borrower Financials shows one tab per borrower.
```

### Prompt 2: Reset returns to the baseline

```markdown
Same rules as before. Change "Reset All Application Data" so it returns the loan to its Salesforce baseline instead of emptying it.

1. In `shared/loan-events/baseline.ts`, add `resetToBaseline(current)`. It returns a new document with `loan`, `borrowers` and `sections` deep-copied from `current.meta.baseline`; the checklist status shape carried forward as all `not-started`, exactly as the `/demo` handler does today; `mode: "empty"`; `changeLog: []`; no previous business-rule results; `generation + 1` and `revision + 1`. In `meta`, keep the created time, the creation receipt and `baseline`; restore `opportunity` from the baseline; set `source` to `sf`. Then run the initialisers the loan factory runs, `withOriginationFee` and `evaluateLoanRules`, so the result matches a newly created opportunity after its first load.
2. In `server/loan-application.ts`, the `reset` action calls `resetToBaseline` and saves with the same `assertLoanDocument` check and generation/revision compare-and-swap as now. A reset loan therefore keeps its CIF, its opportunity details and its place in Sales Support.
3. Loans created before this series have no baseline. The first time Reset runs on one, and only then, build its baseline in the same save. Call the opportunity builder with the loan's existing id, loan number and created time, and a borrower count equal to its named borrowers (the joint-credit rule's count, minimum 1, maximum 2). Extend the builder to accept known values, and pass in what the loan already has so it is kept, not regenerated: its CIF, its `meta.opportunity`, and any non-blank Salesforce-level value saved in its `borrower-primary`, `borrower-secondary` and `loan-details` sections (first name, last name, SSN, DOB, phone, email, address, city, state, ZIP; loan type, requested amount). Generate only what is missing. Allocate a CIF only if the loan has none, under the same advisory lock `POST /api/loans` uses. Store the baseline, then reset to it. Never do this in `load()` or for the pipeline list.
4. `client/src/components/LoanDemoControls.tsx`, reset card only: title "Salesforce opportunity"; description "Return this loan to its original Salesforce opportunity data. Everything added since is removed."; button label unchanged; confirm label "Confirm reset".
5. Tests: `resetToBaseline` returns an edited, Blend-imported, credit-pulled loan to its baseline, with CIF and opportunity details intact, an empty change log, TRID and ECOA not triggered, and the origination fee present. Generation and revision both advance, and a stale request still gets 409. The older-loan rule keeps existing borrower values, generates missing ones, and touches no other loan. Update `pipeline-routes.test.ts` and `LoanDemoControls.test.tsx`.

Check in the browser: on a loan created after Prompt 1, edit a borrower field, run the Blend import (still the old one), then Reset. The original borrowers, CIF and amount return. The Pipeline row is still in Sales Support with the same region, officer and dates. Every checklist task is not started and History is empty. Then Reset a loan created before Prompt 1 and confirm it keeps its borrower.
```

### Prompt 3: Blend import fills in, with random data

```markdown
Same rules as before. Change the in-loan "New Blend Import" from replacing the loan to filling it in, with data generated at random on the server.

1. Create `shared/loan-events/blend-application.ts` exporting `applyBlendApplication(current, { borrowerCount, random, now })`. `borrowerCount` (1 or 2) is how many borrowers the Blend application covers, counted from the first.
2. It works on the loan as it stands. For each section it generates a complete record and merges it with `fillMissing`, so a value the loan already has is never changed and no borrower, row or value is removed:
   - Borrowers: if `borrowerCount` is 2 and the loan has one borrower, add `${id}-secondary` to `document.borrowers` with a full identity from `syntheticBorrower`. For each covered borrower, fill `borrower-primary` or `borrower-secondary` with marital status, dependents, dependents' ages, farm involvement and `mla: false`, plus any identity field that is blank.
   - `loan-details`: loan purpose, down payment amount (5 to 25% of the requested amount, rounded to $500, formatted like "$50,000.00"), down payment source, and a one-sentence story that says it is synthetic.
   - `income`: one record per borrower on the loan, by position. A covered borrower with no income sources gets one employment source with every field the income editor saves, amounts as strings like "65,000.00", `currentJob: "Yes"`, and totals equal to what `incomeSourceTotals` computes, formatted as the editor formats them.
   - `current-assets` and `noncurrent-assets`: a covered borrower who owns no rows in a list gets one or two current assets and one non-current asset, each carrying that borrower's `borrowerId`. Rows without a `borrowerId` count as the primary borrower's, as `BalanceSheetSection` treats them.
   - `current-liabilities` and `noncurrent-liabilities`: set to `[]` only if missing. Never add rows; they come from the credit pull.
   - `subject-property`: a street, and a city, county, state and ZIP that belong together; `collateralOwnerId` is the primary borrower's id; taxes and insurance stay blank. Do not write `evaluation-1` or `evaluation-2`.
   - `fees`: `[]` only if missing, then `withOriginationFee`.
   Use only the option values the forms offer (marital status, farm involvement, loan purpose, down payment source, income type, asset type); copy the values rather than importing client components. Give generated rows stable, unique ids.
3. Keep generated values consistent with what exists. Pass the existing section into the generator so derived values agree with it: an email built from the existing name, ages that match an existing dependents count. Fill coupled fields as a unit: street, city, state and ZIP only when all four are blank, and dependents' ages only together with dependents.
4. Afterwards every borrower on the loan has an income record, and each of its first two borrowers has a saved personal-information section (blank ones for borrowers the import did not cover), so no screen falls back to sample data. Seed loan `1` has a third borrower with no section of its own; leave that as it is. Set `mode: "blend"`; this is what starts ECOA and shows the questionnaire answers. Leave `meta`, the change log, checklist progress, credit results and every `storage:` section untouched. Re-evaluate business rules, keeping the previous results. Bump `revision` only, as Trigger TRID does. If nothing changed, return `current` itself.
5. `server/loan-application.ts`: the `blend` action checks generation and revision, calls `applyBlendApplication` with `randomInt`, and if it gets the same document back, responds with it without writing. Otherwise it runs `assertLoanDocument` and the usual compare-and-swap. It ignores any `sections` in the request.
6. `client/src/components/LoanDemoControls.tsx`, Blend card: for `blend`, stop importing the fixture and send only `{ action, borrowerCount, generation, revision, confirmed }`. Default the borrower choice to the loan's current number of borrowers. Refuse to run while there are unsaved edits, with the message Trigger TRID uses. Description: "Fill in the application with random borrower and loan data. Existing data is kept." Confirm label: "Confirm import". If the returned revision equals the current one, do not install it; keep the panel open and show, in the card's muted text style, "Nothing to fill. This loan's application is already complete. Reset to import a different one." Leave `tridDemoSections` and Trigger TRID alone.
7. Tests, using a fixed random source: Salesforce fields are identical after an import; a hand-entered value survives and a cleared one is refilled; two different random sources give different applications; 2 on a one-borrower loan adds a co-borrower and the joint-credit chip; 1 on a two-borrower loan leaves the second borrower's data as it was; liabilities are empty lists; `income.length` equals the borrower count; the Summary's monthly income is computable when every borrower is covered; ECOA becomes required and TRID stays not triggered; a second import returns the same document; checklist progress and credit results survive; every result passes `assertLoanDocument`. Update `pipeline-routes.test.ts` and `LoanDemoControls.test.tsx`.

Check in the browser: import on two new loans and compare them. Set a marital status by hand, then import. Import with 2 on a one-borrower loan. Import twice in a row. Reset, then import again. Finally run Trigger TRID and a credit pull on an imported loan and confirm both still work.
```

### Prompt 4: Clean up and document

```markdown
Same rules as before. This task changes no behaviour: it removes what the series left unused and documents the result.

1. Trigger TRID: move the template data that `tridDemoSections` builds in `client/src/lib/blend-demo-fixture.ts` into `shared/loan-events/trid-templates.ts`, with exactly the same values and shapes. The `trid` action builds its templates on the server and passes them to `triggerTridDemo`, which does not change. The client sends no `sections`, and `sections` leaves the action schema. Before deleting the old code, add a test proving the server-built templates equal the old client-built ones.
2. Delete `client/src/lib/blend-demo-fixture.ts`. Leave the sample constants in the page components; they still supply seed loan `1`'s display defaults.
3. Remove code nothing calls any more: the `blend` branch of `newLoanApplication` with its hard-coded Richard and Jane Jamerson values, and `IMPORTABLE_SECTIONS`. Keep the blank shell that `newSfOpportunity` and test fixtures use. Update or delete tests that only covered removed behaviour (`loan-factory.test.ts`, `loan-contract.test.ts`, `origination-fee.test.ts`) and say which. Replace the contract test's Blend fixture check with one that validates a generated Blend application for one and two borrowers.
4. Documentation: update `replit.md` (Pages, Data Model, API Routes), `docs/loan-demo-controls.md` and `shared/business-rules/README.md` (the TRID, ECOA and Joint credit paragraphs). They should describe SF-only creation with one or two borrowers, the baseline, Reset to baseline, the fill-only random Blend import, and that only Reset starts a new TRID and ECOA lifecycle. Add one line at the top of `docs/pipeline-architecture.md` pointing to `docs/loan-data-events.md` for the current creation flow; otherwise leave it as a record.
5. Complete `shared/loan-events/README.md` with how to add a simulated event: a pure function beside `blend-application.ts` that merges with `fillMissing`, an action on the `/demo` route, a card in `LoanDemoControls.tsx`, and tests with a fixed random source. Note there that the credit pull (`shared/demo-credit.ts`) and Trigger TRID (`shared/business-rules/trigger-trid-demo.ts`) are earlier events that already follow these rules and stay where they are.
6. Update the memory notes this series superseded: Blend import behaviour, the single-borrower import, reset to empty, creation sources, and older loans gaining opportunity details.
7. Run `npm run check`, `npx vitest run`, `npm run test:postgres` and `npm run db:check`. Report new failures separately from the ones recorded before Prompt 0.

Check in the browser: Trigger TRID on a new loan fills the same values as before this task. The full flow (create, import, Trigger TRID, credit pull, Reset) works on a one-borrower loan and on a two-borrower loan.
```
