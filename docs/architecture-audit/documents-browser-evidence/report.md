# Documents browser audit

## Scope and isolation

- Tested only `http://127.0.0.1:4173/verification/documents/index.html` and its synthetic `/loans/one/documents` fixture route in a fresh Playwright context (`UTC`).
- The browser allowed only same-origin static HTML/JS/CSS. All other requests, including external fonts and PDFs, were blocked. No live app, workflow, production data, or dependencies were touched.
- Fixture time was fixed at `2026-10-14T16:00:00Z`; native timers remained real. The fixture cleared localStorage and seeded 16 synthetic Closing Disclosure rows on each index load. Reloads used the original index URL because the app route is synthetic.

## Results

### Success, editor, and keyboard

- Default success loaded the loan Documents shell and 16 CD rows (`CD 16` through `CD 1`).
- The history table scrolls horizontally. At 1024×768 its region was 719px wide with `scrollWidth=1203`; at 768×900 it was 463px wide with `scrollWidth=1172`.
- Editing CD 1 opened the “Closing Disclosure Delivery” sheet. At 1440×900 it measured 584×900 at x=856. Opening the sheet focused the “About delivery method” summary; one Tab moved focus to the first native Delivery Method select. ArrowDown changed its value to `Blend` immediately (no persistent native menu was captured).
- Escape closed the sheet and returned focus to the invoking row edit button. Clicking the help `?` opened a tooltip reading “Manual tracking only. No disclosure documents are sent.” Escape from that state closed both tooltip and sheet and returned focus to the row edit button.
- Cancel discarded an unsaved `Blend` selection; CD 1 remained “Not recorded.” Saving borrower A as Mail with delivery date `2026-10-05` closed the editor, but the CD 1 row displayed “Partially recorded” for delivery date and method; there was no visible confirmation or validation message.
- At 599×900 the sheet filled the viewport and its fields were single-column. Its body was a 697px viewport over 840px of content, with bottom actions visible; scrolling the sheet revealed borrower B’s lower fields without moving the app background. At exactly 600px the full-width/single-column layout remained. At 601px the sheet became a 584×900 drawer at x=17, with two-column field pairs and 675px of body content fitting without vertical overflow.
- The app content pane is the vertical row scroller, not the browser page: at 768×900 it measured 528×640 with `scrollHeight=1307`, and scrolling it to `scrollTop=600` revealed CD 12 through CD 1 while the bottom toolbar stayed visible at y=864. The table’s own region remained horizontally scrollable.

### Responsive geometry and observed awkwardness

- Captures were made at 1440×900, 1024×768, 390×844, 599×900, 600×900, 601×900, 766×900, 767×900, and 768×900.
- At 390×844, the fixed-width left navigation leaves only a 101px history viewport (`scrollWidth=1172`). The Closing Documents panel and top navigation are substantially clipped; the bottom toolbar’s `scrollWidth` was 532px versus a 390px viewport.
- At 599px the history viewport was 310px and the toolbar overflowed by 37px (`scrollWidth=636`). At 600px the toolbar was 637px wide internally; at 601px it remained 637px internally. At 766, 767, and 768px all five toolbar buttons fit (client and scroll widths equal the viewport), with unchanged 36px height, button widths about 98–120px, and the same computed styles. The `(max-width: 767px)` media query changes truth value at 767/768, but no visible/computed toolbar change was observed there.
- At 768px, the loan content pane itself has a 960px scroll width while the page shell clips horizontal overflow; the table remains 1172px wide inside its 463px history viewport. This produces real column clipping rather than a wider page-level scrollbar.
- The required external-font requests were blocked. CSS declares `"Source Sans Pro", sans-serif`, but `document.fonts` had no loaded faces and the resource list had no font files. All visual geometry here is therefore fallback-font-limited.

### Package, reset, and fixture scenarios

- Closing Package is an in-page tab; generation completed on the real timer and showed `Last Generated: 10/14/2026 04:00 PM`. View recorded an attempted `window.open` for the package PDF (`_blank`, `noopener,noreferrer`), spawned no new page, and did not change route; the PDF request was blocked. Deliver marked `10/14/2026 04:00 PM` as delivered and the UI states no documents are sent.
- Disclosures → Closing Documents → Closing Package stayed on `/loans/one/documents`; the generated/delivered package state persisted through the sidebar roundtrip.
- “Reset Closing Disclosure” emptied the 16-row CD history. The fixture overrides `window.confirm` to return `true`, so this pass cannot assess whether the app normally presents a confirmation; the separately generated/delivered Closing Package state persisted after the scoped reset. No global reset control was visible, so global reset was not attempted.
- `?scenario=empty` displayed empty At-App and Loan Estimate panels, but still seeded 16 CD rows; those rows showed “No borrowers.” This is the fixture’s configured empty-borrower scenario, not an empty row list.
- `?scenario=404` and `?scenario=invalid` both displayed the same generic “Failed to load loan data” shell.
- `?scenario=delayed` initially displayed “Loading loan details...”; after the fixture’s real 2-second delay it resolved to the normal Documents shell and 16 CD rows.

## Screenshot evidence

The browser harness attached screenshots automatically; IDs below identify the captured observations:

- Desktop/table: `0c8j8n` (1440×900), `zy44jy` (1024×768), `482xxz` (768×900).
- Narrow geometry: `n7vnqm` (390×844), `6zbxgj` (599×900), `18v72h` (766×900), `ftx91t` (767×900).
- Sheet: `ujq97d` and `yv6977` (599×900), `x81jdc` (600×900), `kfi7zr` (601×900), `mefenc` (help tooltip).
- Flows: `qxn0fv` (save result), `i3cy3v` (initial package), `sx1kue` (generated package), `tnroad` (delivered), `avxtob` (sidebar roundtrip), `eckgcw` (scoped reset), `2t62h6`/`948q1f` (empty), `n63b7o` (404), `xbyew5` (invalid), `7xdq47`/`2kpgr6` (delayed loading and completion), `d28eqi` (lower rows and inner scroll).

The browser tool exposes these screenshots as attached observation IDs, not as local image files. To avoid violating the harness restriction against manually invoking `page.screenshot()`, no PNG/JPEG files were exported during this pass. See `screenshots/README.md` for this limitation and the evidence IDs.
