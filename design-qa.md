# Approved visual refresh — design QA

Date: 2026-09-07

**final result: passed**

Latest scoped update, 2026-09-08: the user approved the existing text and requested diagrams, tables and continuous backgrounds. Eight Scenes now use semantic visual structures, with no change to the research baseline. Three viewport checks and independent content/visual reviews passed; two table/connector P2 issues were fixed. The complete current record is [visualization-content-and-qa.md](docs/visualization-content-and-qa.md). The September 7 approved-scale comparison below remains the historical design baseline.

## Scope and reference

The user approved the reduced-scale commerce concept after reviewing the larger first draft. The selected reference is `exec-bbbfe02c-3156-4c2b-a337-d7fe5fb9ffce.png` (1586 × 992), generated in this conversation. It guides type scale, open rows, dark palette, red accents and the relative prominence of the main conclusion. Existing official game assets and the locked research remain authoritative for actual content.

All 23 existing Scenes were updated. This is an in-place revision of the existing repository and GitHub Pages site; no replacement repository or hosting address was created.

## Visual comparison

Reference and implementation were opened and compared together at the same 1586 × 992 viewport and Scene 09 default state. The browser harness screenshot was cropped to the iframe and normalized to the reference dimensions. The comparison images record the first pass and the corrected pass:

- [First comparison](docs/redesign-qa/commerce-comparison-first.jpg)
- [Corrected comparison](docs/redesign-qa/commerce-comparison-second.jpg)

| Surface | Checked result |
|---|---|
| Structure and composition | Four open lifecycle rows, one dominant heading, risk question below the rows; no permanent sidebar |
| Spacing and alignment | Shared content grid; row rules aligned to their own rows; explanatory details follow the core content |
| Typography | Moderate filled Chinese headings; readable supporting text; repeated English and version metadata removed |
| Color and assets | Continuous blue-black surface, off-white text and red accents; original official assets retain aspect ratio |
| Interaction states | Working drawer, focused/selected tabs, disclosure states, anchor navigation and reduced-motion control |

Resolved issues: P2 row accent positioning, excess lead text before the primary rows, overlong risk emphasis, and type scale below the selected reference; P1 collapsed esports column after the old number was removed; P1 legacy narrow mobile social column; P2 drawer opening focus; P2 work evidence mislabeled as public product facts. All were corrected and rechecked.

Remaining P3: browser Chinese font rasterization differs slightly from the generated reference. Web text remains selectable and responsive. No remaining P0/P1/P2 issue was found.

## Responsive and interaction verification

The actual page was rendered in the cloud browser. Requested viewport dimensions were reproduced using the same-origin development QA iframe: 1440 × 900, 1366 × 768 and 390 × 844. All 23 Scenes were inspected across these dimensions, including whole-scene overviews and actual-size reading/interaction checks. Contact sheets are overview evidence, not a claim that their scaled text is the live font size.

- [Desktop layout](docs/redesign-qa/layout-desktop.json), [laptop layout](docs/redesign-qa/layout-laptop.json), [mobile layout](docs/redesign-qa/layout-mobile.json): no horizontal overflow in measured content.
- [Laptop 01–06](docs/redesign-qa/laptop-sheet-01.jpg), [laptop 07–12](docs/redesign-qa/laptop-sheet-07.jpg), [mobile 01–06](docs/redesign-qa/mobile-sheet-01.jpg), [mobile 07–12](docs/redesign-qa/mobile-sheet-07.jpg).
- Independent visual review covered Scenes 13–23 at all three sizes. Scene 16 was recaptured after its grid fix; Scenes 17, 19, 20, 21 and 22 retain readable comparisons and uncropped primary assets. Full-body Jett remains separate from the conclusion text.
- [Interaction results](docs/redesign-qa/interactions.json): drawer focus entry, both focus-trap directions, Escape focus return, user/esports tabs, keyboard tab selection, mobile scene jump, mechanism disclosure, and conclusion with art hidden all passed.
- A fresh direct preview tab was opened at the site root. No site-origin JavaScript errors were observed. The browser extension emitted one metadata error unrelated to the site.
- `node scripts/build.mjs`, `node --check app.js` and `git diff --check` passed. The build contains 23 Scenes, 16 source entries and 16 files, with no added runtime dependencies.

## Content regression

Compared with release `ceff04defc3c1e6426a252e8b595dbc2def7a9c8`: all 23 Scene IDs and 23 baseline mappings remain; all 76 previous unique links remain (77 now, including the new body shortcut); all 19 external unique links, 16 source entries and 13 image references remain. All 11 distinct image files and the report PDF are byte-identical. No duplicate IDs or missing fragment targets were found.

Scene 09 retains the caveat that these systems describe different responsibilities rather than a mandatory path for one player or skin. Scene 20 retains the final conditional judgment about sustained behavior. Source notes and repeated supporting detail were moved to disclosures; critical limitations remain in the reading flow. Both authentic work outputs are labeled “真实工作产出”. Independent content review found no blocker.

**CONTENT LOCKED remains valid.** This QA concerns the approved visual refresh; the original audit and content-lock documents remain the baseline evidence. Public deployment verification is recorded separately in `docs/visual-refresh-deployment-qa.json` after release.
