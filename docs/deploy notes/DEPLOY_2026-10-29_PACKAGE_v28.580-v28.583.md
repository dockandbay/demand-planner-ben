# Deploy package v28.580-v28.583 (29-Oct-26)

Ben source HEAD: 0f2a9eae (0f2a9eae946d6455dda0a344a3262b9e7a426b1d). Live before this deploy: /api/version = v28.579 (read 29-Oct-26). Status: PENDING PR (migration 401 to run on live first)

## What changed
- v28.580: HOME (click the HORIZON logo, #/home): Needs you, To do, most visited pages, status cards by area, recent supply changes. Personal To do list: top bar drawer next to Inbox (add, edit, delete, done). New API GET/POST /api/todos, PATCH/DELETE /api/todos/:id (scoped to the caller; exempt from the edit-rights gate), GET /api/home.
- v28.581: Supplier portal HOME, the page the portal opens on: open actions, unread messages, new POs and payments (14 days), profile prompts. New API GET /api/portal/home (portal session).
- v28.582: PRODUCT: the same component type can be added more than once (count + numbered names) and components renamed in place (Libby, 3 x Core Product on the Christmas tea towel).
- v28.583: To do drawer Open and Done tabs.
- Files: server.mjs, supply/inject.html, supply/portal-view.js, migrations/401_user_todos.sql, package.json, CHANGES.md.

## Env vars
None new.

## Migrations
**401_user_todos.sql** (planner.user_todos, additive). Run on live BEFORE the merge, then read back.

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to 0f2a9eae); run-all.cjs, npm test, prebuild-race all passed.

## After merge
Read back /api/version = v28.583; HOME opens from the logo; To do drawer adds an item; supplier portal opens on HOME.
