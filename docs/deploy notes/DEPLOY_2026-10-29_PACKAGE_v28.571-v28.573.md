# Deploy package v28.571 to v28.573 (29-Oct-26)

Ben source HEAD: 9360cbdc (9360cbdcc21200e43d7b781a1091276d975797e7). Live before this deploy: /api/version = v28.570 (read 29-Oct-26). Status: LIVE (PR #42 merged 81e5aa27; deploy run 40824928497 green; /api/version read back v28.573 29-Oct-26)

## What changed
- v28.571: Supplier portal > CUSTOM: "Create batch with all" on the right in green, "Create batch from ticked" blue once ticked; a batch page has a 3-step stepper (1 Accept & download, 2 Make, 3 Ship) with green ticks, done steps fold to a one-line summary.
- v28.572: CUSTOM level-2 menu (Ready to batch | Batches | Sample files) and deep links: #/custom/ready, #/custom/batches, #/custom/batches/<PO ref>, #/custom/printfiles; old #/orders/custom lands on Batches. portal-view.js: host tabs get their deep-link ref and DBPortalView.setRef. hz-theme.css: level-2 show rule includes section custom.
- v28.573: Supplier portal desktop (>= 900px) gets a HORIZON-style left rail (sections with icons + counts, the active section's pages nested, shrink to icons). Phones keep the top menu. ?rail=0 turns it off. Standalone portal only; staff preview unchanged.
- Files: supply/portal-custom.js, supply/portal-view.js, supply/portal.html, supply/inject.html, supply/hz-theme.css, package.json, CHANGES.md. Client only.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to da1c2047); run-all.cjs, npm test, prebuild-race all passed; PR checks green.

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.573. Supplier portal on desktop shows the left rail; CUSTOM > Batches opens a batch with the stepper; #/custom/batches/<PO> deep link opens that batch.
