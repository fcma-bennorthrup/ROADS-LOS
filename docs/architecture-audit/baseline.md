# Local architecture audit baseline

## Authority and scope
This is a read-only architectural audit of the **current local project**, not a review of GitHub or the latest commit diff. No claim of remote parity is made or needed. The entire included tree is fingerprinted, including unchanged, unrouted, test, configuration and asset files. Source is the reference even where comments or setup documents disagree.

Captured UTC: 2026-10-14T19:56:49.831770+00:00

Files: **174**. Aggregate SHA-256: **ab0f85c1707e2b9355037c78a4d365dddba7e0019bf5559bb40659facabbee92**.

Aggregate definition: sort paths lexicographically; concatenate each path, a NUL byte, its lowercase SHA-256, and a newline; SHA-256 that UTF-8 string. Each file hash is over raw bytes, including binaries. Hashes establish provenance, not correctness or remote synchronization.

## Exact preservation contract
No application source, component, styles, design tokens, configuration, dependencies, tests, database or assets may be changed during the audit. No package installation, migration, GitHub operation, live sync testing or automatic remediation. Only the audit reports are deliverables.

Any later approved internal change must preserve the current layouts, responsive behavior, typography, spacing, colors, labels, component identities, navigation, defaults, calculations, editing/save/cancel flows, validation, documents and PDF bytes, loading/error/empty states, focus/keyboard behavior and workflow outcomes. Existing placeholder/no-op interactions are part of the baseline; making them functional is not an invisible refactor. Do not route an unrouted page, replace a library, change a persistence lifetime or normalize visual differences under this audit.

Every recommendation is individually **Awaiting user approval**. Approval of the audit does not authorize implementation. A defect fix that changes observable behavior is explicitly outside the preservation-only implementation scope unless the user changes that constraint. Security issues must be reported, not silently patched.

## Capture boundary and exclusions
Included: all regular files outside the exclusions below, regardless of Git tracking. Root configuration, lockfile, project documentation, custom project skill, client/public, attached assets and unexplained root files are retained. The root file sedZiKBNa contains configuration-like text; it is inventoried, not deleted or treated as an active configuration file without a reference.

Excluded directory names at any depth: .git, node_modules, dist, .local, .cache, .config, .upm, .npm, .vite, generated-artifacts. These contain source-control internals, vendor installations, build output, platform instructions/task metadata, cache or runtime sync state. Their contents are not first-party application source. The source code that creates and consumes runtime sync state IS reviewed. .agents/memory is excluded as audit context already supplied to reviewers, not application behavior. docs/architecture-audit is excluded to prevent self-referential hashes and allow parallel reports. Secret-like .env* and *.pem / *.key files and symlinks are not opened or hashed by the inventory procedure. Do not follow external symlinks or inspect credentials. Review any excluded source-like additions explicitly if discovered later.

Binary treatment: raw-byte hash, size, location and consumer/reference review only. No PDF text, personal records or screenshot contents are reproduced. This stage does not establish document rendering equivalence. Keep assets even if currently unreferenced; removal requires separate approval and consumer checks. package-lock.json is fingerprinted as the generated dependency contract, not hand-reviewed as authored source. Third-party package internals are excluded; local UI wrappers remain included first-party code.

## Baseline drift procedure for isolated page reviewers
1. Read this report, coverage.md and shared.md before reviewing your assigned files.
2. Compare **all** manifest rows against your local files; at minimum verify your page, transitive local imports, global styles, assets and shared contracts before drawing conclusions. Missing files or mismatched hashes are blockers for baseline-specific conclusions, not permission to substitute a remote version.
3. List each missing/mismatched path and its local hash in your own report. Preserve your checkout; never pull, reset, copy over or reconcile files to make the check pass.
4. New first-party files outside the manifest need explicit coverage assignments in the final consolidation. Untracked does not mean out of scope. Audit documents and excluded tooling are not drift.
5. Repeat comparison before finalizing. Cite line numbers from the matching snapshot. The final architect must reconcile any divergent snapshots before combining findings.

Read-only checker (run from project root; prints paths only, no file contents):

```python
import hashlib, pathlib, re
text = pathlib.Path('docs/architecture-audit/baseline.md').read_text()
rows = re.findall(r'^\| \x60([^\x60]+)\x60 \| (\d+) \| \x60([0-9a-f]{64})\x60 \|', text, re.M)
assert rows, 'No manifest rows found'
failures = []
for name, size, expected in rows:
    p = pathlib.Path(name)
    if not p.is_file() or p.is_symlink():
        failures.append((name, 'missing or symlink'))
        continue
    digest = hashlib.sha256()
    with p.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    if p.stat().st_size != int(size) or digest.hexdigest() != expected:
        failures.append((name, digest.hexdigest()))
print('Compared:', len(rows), 'Mismatches:', len(failures))
for result in failures:
    print(*result)
```

Also enumerate first-party paths with the capture exclusions above to detect additions (the row checker detects changed/missing files, not additions).

## Route and sub-page map
Route declaration: client/src/App.tsx:22–37. Providers: :39–71. All loan pages request the same loan-plus-borrowers endpoint. See coverage.md for exact file ownership and import edges.

| Entry | Page/reviewer | Local sections and status |
|---|---|---|
| / | shared | Redirect to /loans/1; retain this default. |
| /loans/:id | summary | Ratios and borrower cards; shared header, toolbar, activity. |
| /loans/:id/origination | origination | Borrower Information, Loan Details, Collateral, Product & Pricing, Fees; local selection plus existing search handling. |
| /loans/:id/decisioning | decisioning | Decisioning Summary, Borrower Financials (including balance sheet). |
| /loans/:id/closing-booking | closing-booking | Closing, Booking. |
| /loans/:id/documents | documents | Disclosures, Closing Documents; all document generation/delivery/history/edit/reset branches and nested panels belong to this reviewer. |
| /loans/:id/history | history | HistoryContent and shared activity integration. |
| unmatched route | not-found | Existing fallback component; not a loan-data error page. |
| no active route | design-system | design-system.tsx is present but not registered; audit source without adding a route. |
| no active route | coming-soon | loan-coming-soon.tsx is present but not registered; similar local placeholder helpers in other pages remain owned by those pages. |

Sub-page sources: SideNav.tsx:7–13; loan-decisioning.tsx:20–23; loan-closing-booking.tsx:20–23; DocumentsContent.tsx:214–216. Sub-pages selected by local state are not separate URL routes unless the source implements that behavior. Each page reviewer must enumerate its nested dialogs, modes and states in its report rather than limit coverage to its page entry file.

## Observed architecture
- Browser entry main.tsx imports global CSS and App. QueryClientProvider and TooltipProvider wrap the toaster and AppContent. AppContent owns GitHub sync state; loan activity and checklist providers wrap the router. Conflict dialog shares GitHub state outside the loan providers.
- Shared LoanHeader contains breadcrumb/admin sync access, stage display and tab routes; BottomToolbar owns utility panels. SideNav supplies default Origination labels unless overridden. LoanActivityPanel and ChecklistPanel are shared surfaces.
- Wouter route parameters and TanStack Query fetch /api/loans/:id. queryClient.ts joins query-key segments with slashes; queries have infinite stale time, no focus refresh and no retries. Preserve these policies until explicitly approved otherwise.
- Express registers API routes before Vite/static catch-all. storage.ts exports MemStorage; db.ts defines a separate database adapter that is not the active loan storage. No database migration is authorized. shared/schema.ts supplies types and Drizzle/Zod declarations, not proof that every runtime response is validated.
- Browser localStorage stores loan-scoped checklist/activity and document progress. Some document history is coordinated by subscriptions. This differs from server in-memory loan data and filesystem sync metadata; do not silently unify the persistence lifetimes.
- Custom GitHub routes use server/github.ts through a source-control connector. API client authentication is not application end-user authorization. Sync metadata lives under excluded .local files. No remote calls were made for this audit.
- Build: npm scripts run tsx, Vite and esbuild; output is dist/public plus dist/index.cjs. .replit contains an explicit npm build and npm start deployment command. The historical missing-run-command failure is not established in the current configuration.

## Verification boundary
Static source inspection, path/import inventory and byte fingerprints were used. The read-only command node node_modules/typescript/bin/tsc --noEmit --incremental false was run once and failed with 66 diagnostic lines, including unresolved test dependencies, calendar type mismatches and ES-target iteration errors. This is a measured baseline failure, not a regression caused by the audit; see SHARED-012. No installation or repair was attempted. Unit tests, browser tests, live API requests, publication, database access, sync operations and visual equivalence checks were not run. Performance observations below are hypotheses unless explicitly measured; file/line counts are not performance measurements.

## Final integrity check
Before handoff, all 174 manifest rows were rehashed: **zero missing or changed files**. The aggregate fingerprint matched, each path had exactly one primary-owner entry in coverage.md, and the documented checker ran successfully. shared.md contains 14 stable finding IDs with 14 explicit pending approval decisions. Git status showed only the new docs directory; no tracked application file changed during this audit.

## Manifest
Owner keys are defined in coverage.md. Ownership means review responsibility, not permission to edit. Asset rows default to shared ownership with page consumers co-reviewing references.

| Path | Bytes | SHA-256 | Primary owner | Kind |
|---|---:|---|---|---|
| `.agents/skills/figma-design-system-compliance/SKILL.md` | 5517 | `b3b8ff64b863c5933b77394487abbc43a935d5164bef78fd8bff7b7aff77331b` | shared | instruction/documentation |
| `.gitignore` | 67 | `7f3b982ac4f0d7fad59b9e5751078fe19dc6f549190b61fc266faaefeb795dfa` | shared | configuration/tooling |
| `.npmrc` | 56 | `1ded4f26f4851b35dae702edd5719d1be5ff31db6983858d088d5e6593ea7c99` | shared | configuration/tooling |
| `.nvmrc` | 8 | `56b8b5b0fc992c41263d30c3dc4a07cd5cf8cf342f136fd429809037180282c8` | shared | configuration/tooling |
| `.replit` | 1026 | `ab7209648f82ffa09908740068bd9c5d7f83585358353b59fa746dd4a576a476` | shared | configuration/tooling |
| `.replitignore` | 201 | `44e7ee407200c8a55f3ea30b8f48803562c799d1b481c8d1559fc98c467303b8` | shared | configuration/tooling |
| `CONTRIBUTING.md` | 2292 | `70939612412eaae7563d1ee5db5b1c6c67d71bdf99998055f3d37769853f5ab7` | shared | instruction/documentation |
| `SETUP.md` | 3772 | `ca659153d776b907fb2adbdb20b135f9f904ec1f92f81d5d405a30758a0e2515` | shared | instruction/documentation |
| `attached_assets/0_Screenshot_2026-09-08_at_4.59.18_PM_1788901164395.png` | 52147 | `55be3730fc8592e87a152584d71391de57810279ba77e6c2d5f760484a4ae6b5` | shared | asset |
| `attached_assets/Rate_Lock_Letter_-_Consumer_Redacted_1777397784766.pdf` | 95511 | `1e78800f9740c48be60ba5837da8e6f89f3d05989d6f73ef1a3af3ba8c32a463` | shared | asset |
| `attached_assets/Redacted-ClosingPackage_Redacted_1777397693832.pdf` | 8734674 | `2b94e8e4178bb1540377946bf3c307e694c3e49316b4c7a506690a52fa7ca730` | shared | asset |
| `attached_assets/Sample-Loan-Estimate_1776089511706.pdf` | 67862 | `456d4619624c4f7a3bf6e9d2cc72714f825e613377ac28036c084d632cd67326` | shared | asset |
| `attached_assets/SampleCD_1777397678654.pdf` | 62429 | `f0979fd83afb89dc2b35686a74805cad7009a6172f65835874bd21eafdf95e4c` | shared | asset |
| `attached_assets/Screenshot_2026-10-14_at_3.39.58_PM_1792006821810.png` | 8640 | `50abdd4fef0336864b16636f17416f7a7b733abeeeffd9a06d70c66e0f3e0582` | shared | asset |
| `attached_assets/Test_25591_4_9c1ebd4dbd_single_adhoc_test_run_(1)_1776280671096.pdf` | 468358 | `5f6efa91f3269704811951dbb332c9718b2d9be2ea15fd5820f14644de9b2812` | shared | asset |
| `attached_assets/experian-sample-report_(1)_1776280916046.pdf` | 5845994 | `601c2387b62a1a8f1425ffffcdc80a1e64ce1de0c8b1d662922350cd1f0dec01` | shared | asset |
| `attached_assets/rick_1776281894830.pdf` | 29809 | `7d12c7eb0fac73fa2c0c8563d38691d3462cfa2d0ebfd71ff9bb51e3aab947c8` | shared | asset |
| `attached_assets/screenshots/fe33a2ad-8515-4e59-b2c4-2d8455ceb970-00-22g5xa6ipcrp6_janeway_replit_dev_loans_1.png` | 32028 | `e762ea04f8d96b41f38b62a695c9499e73afeb48265317394c2d2d01a8112a46` | shared | asset |
| `attached_assets/screenshots/fe33a2ad-8515-4e59-b2c4-2d8455ceb970-00-22g5xa6ipcrp6_janeway_replit_dev_loans_1_origination.png` | 32028 | `e762ea04f8d96b41f38b62a695c9499e73afeb48265317394c2d2d01a8112a46` | shared | asset |
| `client/index.html` | 763 | `fdc09bf3aed020da532fd1cbebbc1235bd232c237ced9dc98e7113b97cd508d7` | shared | configuration/tooling |
| `client/public/at-app-disclosures.pdf` | 29809 | `7d12c7eb0fac73fa2c0c8563d38691d3462cfa2d0ebfd71ff9bb51e3aab947c8` | shared | asset |
| `client/public/decision-letter.pdf` | 468358 | `5f6efa91f3269704811951dbb332c9718b2d9be2ea15fd5820f14644de9b2812` | shared | asset |
| `client/public/favicon.png` | 1957 | `8c43a7a420a3f3fff5b43963a4a7ba2fdec63f6506e7fc4134f58d61a6e6bdcb` | shared | asset |
| `client/public/loan-estimate.pdf` | 67862 | `456d4619624c4f7a3bf6e9d2cc72714f825e613377ac28036c084d632cd67326` | shared | asset |
| `client/src/App.tsx` | 2620 | `e63f04a8097b52ec473b264ae5f0fef469fc4cbfc77f0686a03640f048aea032` | shared | source |
| `client/src/components/ConflictResolutionDialog.tsx` | 18289 | `4917b3326a59a715199fc8fc304b2536b0faa9cefdaa505a64e8a8f59db33a51` | shared | source |
| `client/src/components/GitHubSyncPanel.tsx` | 8074 | `f954a58301eb1851e9bbb622f21e16b36fec8b7fd64ea2030966a7a3533ac3c9` | shared | source |
| `client/src/components/loan/BalanceSheetSection.tsx` | 32233 | `e61278f2c23701c72fca2e39ed18167c0cbcd799df65332c805cad56ca5b4581` | decisioning | source |
| `client/src/components/loan/BookingContent.tsx` | 3434 | `d57562aa84b915b20c959f4822684f939c538b15f460192d4cfce5f52aff6b40` | closing-booking | source |
| `client/src/components/loan/BorrowerCards.tsx` | 4561 | `2177bc23703217d5899726177df5391c041d7078a01d59a433fb73ebcdfc77ea` | summary | source |
| `client/src/components/loan/BorrowerFinancialsContent.tsx` | 23405 | `fa54a4053c2bd9f7b09f2c246f19fb44d12dd024e8cd68d462aff93fb896d2ca` | decisioning | source |
| `client/src/components/loan/BorrowerInformationContent.tsx` | 41461 | `2b48d3c3120034ebc76dcfd0301fa964d989eaee577ebca393c519b6c4943690` | origination | source |
| `client/src/components/loan/ChecklistActionTimeline.tsx` | 5535 | `5db0fca131139b160a9662140f89084e48b69b2efc4114136ef66458e367476c` | shared | source |
| `client/src/components/loan/ChecklistPanel.tsx` | 7150 | `e9869121a57e5499c25c8a006989ac5cfe409d47ed51a6ec4987ca9c94e00399` | shared | source |
| `client/src/components/loan/ClosingContent.tsx` | 6442 | `ba152e3d496b60621916d61287879d0b8331d39d4da0aa4704c12ff08c102296` | closing-booking | source |
| `client/src/components/loan/ClosingDisclosureBorrowerCells.tsx` | 5653 | `71d2bdab30e5aec27fe6340952aa7972aa5dd052fc820be0cb37703182bf4d47` | documents | source |
| `client/src/components/loan/ClosingDisclosureBorrowerEditor.tsx` | 13308 | `b59ba99d7e5dd3f238e2bfc3c26f4ee7c9e7200b4183aaa77a719d20ece16d9d` | documents | source |
| `client/src/components/loan/ClosingDisclosureBorrowers.css` | 13842 | `565bfe6b2fd0828355d965476c912a9a0709841ade45f831cb8b42d1d64ef9c9` | documents | source |
| `client/src/components/loan/ClosingDocumentIcon.tsx` | 837 | `7bb718b966f43784a369b4d8060a621dc8f76b9b871bd4909e7e8dd2c46f100c` | documents | source |
| `client/src/components/loan/ClosingDocumentsContent.css` | 5643 | `c3618614e6dcd97544079239974ba6553c6ff089f4ac1732a70d76e9510b98ee` | documents | source |
| `client/src/components/loan/CollateralContent.tsx` | 25718 | `ea222e9122c51a032d13f7bcb1212b375d2af79e49a1fa92e81d454674606c46` | origination | source |
| `client/src/components/loan/DecisioningSummaryContent.tsx` | 8275 | `49309fe5038d847025ac29354e3a6caa83e26d03a02abd7ddf6a0c16fdfe10df` | decisioning | source |
| `client/src/components/loan/DisclosureDocumentsContent.tsx` | 11565 | `09f4f3adadb77bcc3e437ed58bb087b5b6643b564434a0946dfccecc4501385d` | documents | source |
| `client/src/components/loan/DocumentsContent.tsx` | 9821 | `f7e8ccf4b1998d76f8852eec6b822ee2ddf630b57f5a9f68f4cea8e74b8118a3` | documents | source |
| `client/src/components/loan/FeesContent.tsx` | 9821 | `a0d325d4bb7010df071b76c687ce2f2ff85585b99af67e80f74447cccf2a7f13` | origination | source |
| `client/src/components/loan/HistoryContent.tsx` | 21297 | `f9108e55498ba754f15484530ce3709aa34f42ce6964e643314e2fe7cd8ea9f0` | history | source |
| `client/src/components/loan/LoanActivityPanel.tsx` | 8498 | `651c8799baaa98898f611ddf8df1269bf15b50f2e30c77ca91fa37e23b224b6e` | shared | source |
| `client/src/components/loan/LoanDetailsContent.tsx` | 13706 | `30f715c662d7bcfb40ae96c3029722f27a6f7f46231bc389f837a393739d2059` | origination | source |
| `client/src/components/loan/LoanHeader.tsx` | 18523 | `e97f16da9264098ae01ef437036d37e2027655b98c0c616f5b4e601ce6ffe235` | shared | source |
| `client/src/components/loan/ProductPricingContent.tsx` | 24723 | `621750348313dc3f830508e5eb827ed05305587bb36f6ed9ab7dcb7c866521cc` | origination | source |
| `client/src/components/loan/RoadsDatePicker.tsx` | 5089 | `9af4cbaac0f4f1affa993b8ac7bc92f5922f64b309ffd6cdba5a2e789110abd6` | shared | source |
| `client/src/components/loan/RoadsDropdown.tsx` | 5616 | `89b253775914e17ef37015416ff4b57cb4a7bcad76c059dc413875fdda06b9e5` | shared | source |
| `client/src/components/loan/SideNav.tsx` | 1917 | `c19714030979a63d4b7422246cab958e27c48a1a120a691380cfbf5f8b52d175` | shared | source |
| `client/src/components/loan/SummaryRatios.tsx` | 3949 | `9c16b84f04bc85455d478a9cb0f8921a356e6254e90c4c08be881dccef7d03dd` | summary | source |
| `client/src/components/loan/__tests__/ChecklistPanel.test.tsx` | 12361 | `d3e25e57df45d293e2b1c69ac5d844a70525a413d79d3be7fabc025316321b7a` | shared | test |
| `client/src/components/loan/__tests__/ClosingDisclosureAssumedDate.test.tsx` | 7908 | `4e8cf38b23603dcbe0bbf0b9ddd3c0097cf757e1b958b7a33df0d062825b22e3` | documents | test |
| `client/src/components/loan/__tests__/ClosingDisclosureBorrowers.test.tsx` | 19077 | `999e5eac5f214d8f4b6ba3661be3c092da3430cc454dbd1f9fed90fa291041b8` | documents | test |
| `client/src/components/loan/__tests__/ClosingDisclosurePanel.test.tsx` | 9957 | `b0bfe95ccc149e1ca1adad33c6693c607454d0e0dcbf204de821357257b80002` | documents | test |
| `client/src/components/loan/__tests__/ClosingDocumentsContent.test.tsx` | 30686 | `20820a480a84f23bc0bc9db4a029ad1a9cb6e462f6228f2d490f978019846424` | documents | test |
| `client/src/components/loan/__tests__/ClosingPackageProgress.test.tsx` | 10942 | `1f188f53a3f56589d04f084876785311268894efdd75de3ecedb0c578df29c22` | documents | test |
| `client/src/components/loan/__tests__/CollateralContent.test.tsx` | 7697 | `5bd5376db7d7397ae24ae04c47bc4d63f17480cf41c1eca816301b1b07ec806d` | origination | test |
| `client/src/components/loan/__tests__/DecisioningSummaryContent.test.tsx` | 9258 | `7bcaec22a83742a753570d20ce92fa49bf0ba2822d3b5c3412cc8bdc1dc2b828` | decisioning | test |
| `client/src/components/loan/__tests__/DocumentsContent.test.tsx` | 12838 | `e558a02e3c3767a062d52c07426c5e3dc1b515b2094be39c41924dbef8b5cc55` | documents | test |
| `client/src/components/loan/__tests__/LoanActivityPanel.test.tsx` | 9581 | `0f14c31b1868654c0eec6d4e0ad1220be20eb1a99d6891c20635401bd7753358` | shared | test |
| `client/src/components/loan/__tests__/ProductPricingContent.test.tsx` | 10063 | `c18295defa28926e25d499ee2bc970f310191237e08e4e991d3d1036c374ba06` | origination | test |
| `client/src/components/ui/accordion.tsx` | 1977 | `6b84cb28b5c8e2129d854cffb8c5ba0161758d577db6db30a380cf593a8c0705` | shared | source |
| `client/src/components/ui/alert-dialog.tsx` | 4420 | `5ab57317c19d0edd8e2d6d9c98992bcefa1e023a4f90072e40364451dc18456f` | shared | source |
| `client/src/components/ui/alert.tsx` | 1584 | `ed78a053a9db783f48d5dfab7398b630f87c17ed2e237b6f30a3eb153675960c` | shared | source |
| `client/src/components/ui/aspect-ratio.tsx` | 140 | `08b0aa0b05efc573c7d63363c03e83d4b101bfeb54140764e96ddea30659cfcc` | shared | source |
| `client/src/components/ui/avatar.tsx` | 1592 | `f83b4d3f868442e571d9cf8737a9e36ba5de373f6d599c7a6ddd59c1b5c78dfa` | shared | source |
| `client/src/components/ui/badge.tsx` | 1202 | `f1f149c9db40e787a6c2ae8ee6b0fedceb4ccb68b3944f6fdca10d7fd540312e` | shared | source |
| `client/src/components/ui/breadcrumb.tsx` | 2712 | `c3d3dcb0d82fc5e91d8830bac7fead905686fe876f1f42c3ed872bb0a6b6584e` | shared | source |
| `client/src/components/ui/button.tsx` | 2359 | `d6a9b9d04cb882af71199a3cf4cb87f6cfaab44d17f871ff8a78ec2a1830511d` | shared | source |
| `client/src/components/ui/calendar.tsx` | 2571 | `2192144ec27086bf0fe705a860a67b83430f57e82036378a75f88fe00698508b` | shared | source |
| `client/src/components/ui/card.tsx` | 1904 | `48dfcf29c71644ebe3dd5d70319ac1e663c9094c7c524be0cf492048b2989eb1` | shared | source |
| `client/src/components/ui/carousel.tsx` | 6210 | `5a4ff73c804e86c873382da80c453f1399006326ef042fb984c24162ec86666e` | shared | source |
| `client/src/components/ui/chart.tsx` | 10481 | `e30219cedb35c55c2f9069f6470d60514c54c43fe0a3b641615275a2acd25f12` | shared | source |
| `client/src/components/ui/checkbox.tsx` | 1056 | `60a0084cbdfcb96e54c9f6438e9066dfe7ed0a7e421b33985d5eb57975d110a4` | shared | source |
| `client/src/components/ui/collapsible.tsx` | 329 | `f4cdd104de29928bfcd40b865c7d08eed9157a537fbb8b5e6d0921f02b63cc04` | shared | source |
| `client/src/components/ui/command.tsx` | 4885 | `924fef47d5e04a133ecc700e5881175cef1f71a338eee7c4db5cf5fc46b9c5e1` | shared | source |
| `client/src/components/ui/context-menu.tsx` | 7428 | `b3abf3bb92fc028dd9a4c5dc6a10093b7f1346be8841fabb214fa08e5f40b181` | shared | source |
| `client/src/components/ui/dialog.tsx` | 3848 | `60d5246653c714fc12a67743ee5951331ecd2548cdaef9a599922bcb14da26db` | shared | source |
| `client/src/components/ui/drawer.tsx` | 3021 | `774316527ddc577fc54012a0c898ebcf7cf8f11152126e550828b53004a5b70c` | shared | source |
| `client/src/components/ui/dropdown-menu.tsx` | 7609 | `aca10633792d03bb541e09ea106b5e1f3de429b69b3cade5ccfb7dca20289424` | shared | source |
| `client/src/components/ui/form.tsx` | 4120 | `0d812c11a1afa799fb2bfa8f1e11052eacb64252c4b52be969a5f89aae1f52fb` | shared | source |
| `client/src/components/ui/hover-card.tsx` | 1251 | `dcb793b8b1202b1634d791a993acadca0cfc3043a93b98c91a627fbff794f384` | shared | source |
| `client/src/components/ui/input-otp.tsx` | 2154 | `b06b6294edee39d817586b3cf4766de1720b06e184624d45d2bfd0f38d2a5e72` | shared | source |
| `client/src/components/ui/input.tsx` | 844 | `b5c4ff4e0a57cf16c4519165745550029d66a2e25b8b018654b60ac2c5764e79` | shared | source |
| `client/src/components/ui/label.tsx` | 710 | `e69cfc27d78c9ef31b248ab8ea4fa54327c1038843f70efb5cd85d54c0bf1e0e` | shared | source |
| `client/src/components/ui/menubar.tsx` | 8605 | `da0c7ace239ead75f7fbc46ffbae8ddf177477445354500d7304a276065ea7b3` | shared | source |
| `client/src/components/ui/navigation-menu.tsx` | 5128 | `74f3b1b937e42582093a1671cf7f5c7250cd884922d51f201632317af9c24209` | shared | source |
| `client/src/components/ui/pagination.tsx` | 2751 | `6d66283fc04f3901772f15f3108bda732efc75ce878e0d8ecf8f9fc3b0c63c26` | shared | source |
| `client/src/components/ui/popover.tsx` | 1280 | `d853c561833e545879a56e2c4de18a92653de1e55e9e7fae463540679924ac0c` | shared | source |
| `client/src/components/ui/progress.tsx` | 791 | `8c036da4baed076de68d27719929dc98151a81b51456bfa6a2488d835303b1d7` | shared | source |
| `client/src/components/ui/radio-group.tsx` | 1467 | `74f87531da1fde8d3c07dbd7b380ee6508a70d5c0af1c22e2d2c33d66cc79f10` | shared | source |
| `client/src/components/ui/resizable.tsx` | 1723 | `70d1e35a5fb0897af7063cdd841d8ed636e1c332ef7ea6469f0f175a5a93dddf` | shared | source |
| `client/src/components/ui/scroll-area.tsx` | 1642 | `d7d02600effca55d0dcadce8c09c97ebddda3a19c5fa1d52dc9f6f727b26c6b1` | shared | source |
| `client/src/components/ui/select.tsx` | 5741 | `544172f40b3ae1d86d518dbc428e4bed58b3a733644564f4907bbf0b60ba3218` | shared | source |
| `client/src/components/ui/separator.tsx` | 756 | `c956c4cca4b8442fa9314d6079b9f975e1ee39d5804aaf2966990f6258ac342a` | shared | source |
| `client/src/components/ui/sheet.tsx` | 4281 | `9051eb9d885a18c0521c63c945480effcfca29282d2a342cb3ce7f9d080c6d38` | shared | source |
| `client/src/components/ui/sidebar.tsx` | 21846 | `b023ff6245be1930e152a18c6aaa2b6dd1a11df7b05fcf41bbe483968bfb1c39` | shared | source |
| `client/src/components/ui/skeleton.tsx` | 261 | `a72a9d8fc1c1999b5411a33391c5e70048863c5865629077280e943ca85689a8` | shared | source |
| `client/src/components/ui/slider.tsx` | 1077 | `61e959d046f72e295d73a822b9afc7cc87ec6d1007905f2572e6117d7b2067b6` | shared | source |
| `client/src/components/ui/switch.tsx` | 1139 | `bd29ce723e952bc7f8fab367320347ca82fbb933f4da9872c7120d6765662ebe` | shared | source |
| `client/src/components/ui/table.tsx` | 2765 | `1da243956282c040db49d5718d2f0093a705fbbdfa3a25f51c1a31a069c45093` | shared | source |
| `client/src/components/ui/tabs.tsx` | 1883 | `d9958fd005db42bcca4f2c12ede63500e74f1a9bd82ddc3a6bf6fcb369706f07` | shared | source |
| `client/src/components/ui/textarea.tsx` | 689 | `aaf46918c590c2bf59e2afb7904dfd8e69317e12ee34ff93ed2746dd06cc994a` | shared | source |
| `client/src/components/ui/toast.tsx` | 5103 | `2a116f211bf721f30e68194a0827bb199a8f112256c975106bc6f10e672e61ab` | shared | source |
| `client/src/components/ui/toaster.tsx` | 3408 | `f93b840081a835090d27911a348ab8f0faa6e5633e51ac3d80aa91047fd9662d` | shared | source |
| `client/src/components/ui/toggle-group.tsx` | 1753 | `dba95ead40d163af6959198ded9853a2cc9282b2cb534980f99937a65edf4e2d` | shared | source |
| `client/src/components/ui/toggle.tsx` | 1527 | `c9a401b2e134f28d870f3f44330b9d91d66bd2ac7ced3ad67039a2bb3d52e8f0` | shared | source |
| `client/src/components/ui/tooltip.tsx` | 1209 | `2f26d20816448c630faccbda5ae9b4fe47c36f1fb14dbbd85b6652b7c24c1d51` | shared | source |
| `client/src/contexts/checklist-context.tsx` | 15255 | `765303a8ff0c75496d1fcbfa4e9cbaa72546cf3d12a197fcba0c8232efe42ec1` | shared | source |
| `client/src/contexts/github-sync-context.ts` | 661 | `70484426e873146f170534336ca64103d99f06442f07be406ff724ff48aca8a6` | shared | source |
| `client/src/contexts/loan-activity-context.tsx` | 5362 | `218d245eed9399c482f12eb21c01a4209e8ecea1ceb0883e2d830b819949f437` | shared | source |
| `client/src/hooks/__tests__/use-closing-disclosure-delivery.test.tsx` | 11819 | `f020afaf774ea0e6d52a2b67436ddb8bb7a6930f094fb79ab31127619b758b92` | documents | test |
| `client/src/hooks/use-closing-disclosures.ts` | 5030 | `8722211e9b4eb2fac7ca6a3e79b153e684a707b8a054e2d08335fa5aa5b62c66` | documents | source |
| `client/src/hooks/use-closing-package.ts` | 3092 | `00847dd0218ec8a3e28a9b49a70d58479b7a6e54b901aaac45e3dc8896b66d01` | documents | source |
| `client/src/hooks/use-github-sync.ts` | 4794 | `512e33b959dbfa70a38607b14d853003bd3b7e8d0f16541e7d9ef09b7807e26b` | shared | source |
| `client/src/hooks/use-mobile.tsx` | 565 | `ad0936f84f1df79d3697bfbff9c18f8ad58431c1cbaf2359c6a853b0fcc9f28b` | shared | source |
| `client/src/hooks/use-toast.ts` | 3958 | `7d740211274b1ec15817690da74cc7a7dd8c7093d617c57c03ecfd98016eb5e6` | shared | source |
| `client/src/index.css` | 7364 | `08ec13d2c8507f47d81063831d9d4d1815dae36db8012176bd988cc970939c70` | shared | source |
| `client/src/lib/__tests__/closing-disclosure-assumed-date.test.ts` | 3386 | `f3a717d083ab5c21bd9d1c33ab5286da0141a77ecca4553bbdc4913a26ac7f3a` | documents | test |
| `client/src/lib/__tests__/closing-disclosure-borrowers.test.ts` | 11473 | `cf8e47ba9ceaf05c0d3d0ac59511951459e4bae55e5b9c4732971c5541b5658a` | documents | test |
| `client/src/lib/__tests__/github-response.test.ts` | 1286 | `f9d97fdfe504d2fea255a4fc50c0a762acfb533b7a2c468f03748eb38d94dbbc` | shared | test |
| `client/src/lib/__tests__/loan-activity.test.ts` | 490 | `113a6b010aecb5cec3836239117a3ba6b9352fe3126221ba117d9353b1840b66` | shared | test |
| `client/src/lib/closing-disclosure-borrowers.ts` | 10337 | `25d6900345ee52fbc69e7b316b830b85c14d2256dae43d8e1603bcf42f92f68c` | documents | source |
| `client/src/lib/closing-disclosure-history.ts` | 4025 | `72e1050a8442fbf2ccd69181b69c5be61af99a05e7cc8a52d3f838357a8df44e` | documents | source |
| `client/src/lib/closing-package-progress.ts` | 1244 | `76308b2b4d5802715e2b7a49788d4f01a0265a27c5facb514277defb2f40f4e8` | documents | source |
| `client/src/lib/design-tokens.ts` | 2181 | `3c9be49c70294c8245487cf1d36989a813b9edf5c4c8371d2494b6646ec34f3a` | shared | source |
| `client/src/lib/github-response.ts` | 752 | `c543a6556622029307635747896e96304248b5a61c7ea75ae5ef9c83b8814720` | shared | source |
| `client/src/lib/loan-activity.ts` | 274 | `a3eb884321de4d37485710b5b92133dd42943ef19647b18720021997fb49f1f2` | shared | source |
| `client/src/lib/queryClient.ts` | 1383 | `4e32b4e5cf93a98c307883ed253a7edc4b309e2a299472c1b121626c1594b726` | shared | source |
| `client/src/lib/utils.ts` | 166 | `7c8c3dfc0cdd370d44932828eb067ef771c8fe7996693221d5d4b90af6d54f2d` | shared | source |
| `client/src/main.tsx` | 157 | `29946f51942fba11605c7595fd82b50b0d7e50148e0194fd356dacbc958f18ec` | shared | source |
| `client/src/pages/design-system.tsx` | 13881 | `96f6edb185e8b4fbe5034901176e9d9de145545f4a7e4a1defc0d1f499ed3aca` | design-system | source |
| `client/src/pages/loan-closing-booking.tsx` | 3913 | `b02c1858c031e648a5470eaffcbb201eeeec7258ce46dc9e66d74353e758d3b0` | closing-booking | source |
| `client/src/pages/loan-coming-soon.tsx` | 2756 | `7ac5a07d1825312cfefdd8012589afae8bbdb3a63fc18f8f59305118c4083892` | coming-soon | source |
| `client/src/pages/loan-decisioning.tsx` | 4210 | `35683e3b48b79bd654e753c795400f5aaa56d4d67ffd46d1f611835b8235d2e0` | decisioning | source |
| `client/src/pages/loan-documents.tsx` | 3944 | `33b39376b449aae42795052f713957cd7e1485d113ae4c6c174a61cd629b59b3` | documents | source |
| `client/src/pages/loan-history.tsx` | 2651 | `8eccfa2f9b594e10b8a2ba39d1246f8e79b5974d81d4b23320fc1921297369e3` | history | source |
| `client/src/pages/loan-origination.tsx` | 5320 | `d381474008294d950ce458aaa17e768bd366a7126e9835ec48a0eb495b9136b0` | origination | source |
| `client/src/pages/loan-summary.tsx` | 3971 | `9a67e90d1c9a4424c2229608a9bf0ba9a423390d95cdc5e2c2ff3a1f8623fd1d` | summary | source |
| `client/src/pages/not-found.tsx` | 711 | `718a41bd05a163d1db32480aba013f5fe754894e656b6542a8e4b302275b172e` | not-found | source |
| `client/src/styles/design-tokens.css` | 2995 | `6e51b38f22e12e4f35634a4f8a34e4264f0a3a3b1703684207ca566c7eec4b71` | shared | source |
| `client/src/test/setup.ts` | 121 | `21662a31e16e12436fe622ef015b1bd91fae2ec4960f7cfef618779e965d2abb` | shared | test |
| `components.json` | 459 | `ac24a8e743f3be926f7ff2bce97563097ed0c69f88fc57a7e6ec94af3615a031` | shared | configuration/tooling |
| `drizzle.config.ts` | 325 | `db80922910a890344195617c17acd664cd9b922973f607a5c6fdc0c749b4476a` | shared | configuration/tooling |
| `loan-fullpage.png` | 204605 | `babcf3bebf255ad31837f01c3f4fa45fe7a06216466e0909450c4b92a7f18eee` | shared | asset |
| `package-lock.json` | 317096 | `22cfba6c0877fa46d723ddc186a9ff026eb3712c25ef0e57c0cdeb967e2b5bc9` | shared | generated lockfile |
| `package.json` | 3860 | `e3a709a27242fa7cdf8385c115ea3a2ce4a332d1771b1de5e835b0e2bf21f753` | shared | configuration/tooling |
| `postcss.config.js` | 80 | `190c877db466995bf1482f4a16abd06e04a89ede3119341e2a86ff96e1737b27` | shared | configuration/tooling |
| `replit.md` | 8313 | `400b141d0ededd6530e657ae9e624edbb05ba75d405c1c8f9995cd77d77e8f52` | shared | instruction/documentation |
| `script/build.ts` | 1417 | `35df8bf9d4c1aad8cdff54df8108bbc964a853bbc29538ec0ec6e1b1a9b0d54f` | shared | configuration/tooling |
| `scripts/post-merge.sh` | 51 | `858bb038ee7f709625c8e6674264061ed659dc78b3da28a909fb93c00c5afe9a` | shared | configuration/tooling |
| `sedZiKBNa` | 1006 | `60e69d8c4f16fbf1bc3186bfef4d1ab2304945ab8dcf2c0edad80ee3652d1a0d` | shared | unclassified file |
| `server/__tests__/storage.test.ts` | 1325 | `685827e814f0ccd2fb60b6191aaed1b2ce7f7be03d157596d1c0696f7f43ad25` | shared | test |
| `server/conflict-detection.ts` | 5137 | `5037b313bb63c887eeec2123a6c115988d03600b5b8ae6e76ff0847206ce985b` | shared | source |
| `server/db.ts` | 395 | `ee4b295afc88a82a69e15983bcdb16c0692123c97717643ed6404194773e638b` | shared | source |
| `server/github.ts` | 8694 | `e6f5506bbf305aafbabaa37694b8d8c4967a77a4b18731fea5ac7a9655f1a313` | shared | source |
| `server/index.ts` | 2660 | `9b0f5a62495c0af6eb24993b8545bbd4043034cb7a2c2c0e8f25fd8ca46648e2` | shared | source |
| `server/pending-conflicts.ts` | 1190 | `8c518599936bdcf50b15acb0097779a903a0205a1116257b3a144d8a084d5df1` | shared | source |
| `server/routes.ts` | 30365 | `b1f60f4195b34c2f947d0cda50bedebe6a3d217bc7257fd791afc31f42ce9045` | shared | source |
| `server/static.ts` | 554 | `7ad68ceb8da0fe0b29af6d517e66cfc14f106a641de845aac4f1bd995ad24f4a` | shared | source |
| `server/storage.ts` | 3456 | `d4fb7cb2fec389b027ac9b52b13831592fc0476221210f264b32c542a71d6ab8` | shared | source |
| `server/sync-state.ts` | 867 | `e764a6f38861814dac52f45f400a10ff3d62a4667ac9cdba72c322c6fe045709` | shared | source |
| `server/vite.ts` | 1517 | `ca25d0113841b8ee747e26f8fb06f04634b8db4afb0b558cd33840b568f8f524` | shared | source |
| `shared/schema.ts` | 2694 | `9777c7e264fa4295885d34931fd8884e6765e7231d131599393d632f295a2338` | shared | source |
| `stepper-area.png` | 18662 | `f6823574b6c110a3b45db32eeba6b855b4db601f5dd0875c93c83ab5ef106087` | shared | asset |
| `stepper_focused.png` | 16390 | `a38520ec661fb1ed63aca18aaf8e97eaebfcf5e15224bffa178a0740bd1b4519` | shared | asset |
| `tailwind.config.ts` | 5309 | `dc4c25f8cdd13c655c6eafa397f44dfd8fa5c5234795e361a6d29d5430872817` | shared | configuration/tooling |
| `tsconfig.json` | 657 | `4bea0e0003e3c943f455346abc4854d1666d604adbaa6aa8eda11f94fb8f1396` | shared | configuration/tooling |
| `vite.config.ts` | 1080 | `f648b48bb45dab59d0a5e208180273da469b0a66a474dc7762e04d628291d41c` | shared | configuration/tooling |
| `vitest.config.ts` | 512 | `d09d13d206406aa9eb9e22748a6a33154975263d92c86e467f40400174d58cdc` | shared | configuration/tooling |
