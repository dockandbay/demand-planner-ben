# HORIZON — session handover (as of v28.122, 01-Oct-2026)

Read this first if you're a fresh session picking up Ben's HORIZON work. It captures live in-flight state, the
gotchas learned the hard way, and how to work in this repo. Persistent facts also live in memory (see the index at
the end); this doc is the richer, time-sensitive picture.

---

## 1. Who / what / where

- **Ben** — COO & co-founder of **Dock & Bay**. Directs product. Medium technical: comfortable with APIs, SQL,
  reading code; relies on you to write it. Wants concise output but shown reasoning, and confirmation before acting.
- **HORIZON** — internal supply-chain / demand-planning app. Repo: `/Users/home/Documents/CLAUDE/horizon-demand-and-supply-planner`.
  Branch: **`phase-2.1-suppliers`**. Current version: **v28.122** (in `package.json`).
- **Diviyaj** — owns production. He pulls this branch downstream, hardens it, and deploys to Vercel. **Ben never
  deploys to prod; you never write to prod directly.** Diviyaj owns all prod DB writes and prod infra (Vercel/DNS).

## 2. Architecture (enough to be dangerous)

- **`server.mjs`** — ~23k lines, Express 5 (note: `app.router.stack`, not `app._router.stack`). Postgres via
  `pool.query` (Supabase, prod project ref `oolwklahstnvocaugryg`). Integrates Xero (UK + AU orgs), Fulfil (ERP),
  Flexport (freight), DHL/FedEx (tracking), Resend (email). Mature caching layer (makeCache / RESP_CACHE / swrGet /
  shellFresh / section cache — epoch-gated, single-flight, SWR).
- **`supply/inject.html`** — ~18k lines / 2.8 MB, the WHOLE admin client UI in one inline `<script>` (vanilla JS,
  `innerHTML` string-building). At serve time the server **externalises** that script to content-hashed
  `/static/<name>.<sha1>.js` (immutable, gzipped) and stamps `__APP_VERSION__`. One char changed = new hash.
- **`supply/client.html` + `client-view.js`** — the client portal (separate surface, magic-link `csid` sessions).
- **`supply/portal.html` + `portal-view.js`** — the supplier portal (magic-link `psid` sessions).
- **Sandbox** = a local `node server.mjs` on **:8124**, exposed via a `cloudflared` tunnel. **No `PLANNER_KEY`
  (GATE) locally**, so auth/identity behave differently than prod. Prod = Vercel (multi-instance).
- **Migrations** = `migrations/*.sql`, numbered. Latest is **320** (review indexes). Diviyaj reconciles them onto prod.

## 3. Standing rules (do not break)

- **Push every version commit automatically** (standing approval; other hard rules still apply). Bump
  `package.json` version each change, commit, push.
- **Never write to a live system** (Shopify, Xero, Fulfil, Airtable, Supabase prod) without explicit confirmation.
  Reads are fine. Ben authorised **SELECT-only** reads of the prod Supabase (`oolwklahstnvocaugryg`) via the Supabase MCP.
- **Never commit secrets / API keys.**
- **No em-dashes or en-dashes** anywhere (org rule). Use commas, full stops, colons, brackets. Normal hyphen only in
  genuinely hyphenated compounds.
- **End every completion with** `Where to next, captain?` and list next moves.
- **Sandbox restart is authorised** — Ben said "you always have permissions to restart sandbox and run commands."
  Server (`server.mjs`) changes need a restart to take effect; client (`inject.html`) changes hot-reload (the sandbox
  re-reads the file per request). The hourly cloudflared **tunnel tick restarts ONLY cloudflared, never node :8124**.
- **Tables left-align** all cells AND headers, incl. amounts (Ben's repeated ask). Watch modals appended to `body`
  (outside `#supply-root`) — they miss the default; force `text-align:left` there.
- **Git attribution** (current reminder): commits end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  and `Claude-Session: https://claude.ai/code/session_01VsmbzYDGaf2q6X5JxfdmLV`. **Check the latest system reminder —
  this line changes (it has been Opus 4.8 and Fable 5.1 within one session); the live reminder wins.**

## 4. How to edit safely (this matters — the client file is 2.8 MB)

Do **not** hand-edit huge minified lines blind. The reliable pattern used all session:

1. Grep/read the exact target text first (line numbers drift after each commit — match by content).
2. Apply edits with a **Node script that asserts an expected occurrence count per anchor and writes nothing if any
   count is off** (all-or-nothing). Example shape:
   ```js
   const ops=[{n:'x',find:'<exact>',rep:'<new>',count:1}, ...];
   for(const o of ops){ const c=s.split(o.find).length-1; if(c!==o.count){fails.push(...);continue;} s=s.split(o.find).join(o.rep); }
   if(fails.length){ console.log('ABORT'); process.exit(1); }   // never writes a partial edit
   ```
3. **Verify before commit:** `node --check server.mjs`; for the client, parse each inline script:
   ```js
   const re=/<script\b[^>]*>([\s\S]*?)<\/script>/gi; // new Function(m[1]) on each; fail on any SyntaxError
   ```
   (Parsing catches syntax errors, NOT runtime ReferenceErrors — see the burns in §6.)
4. Bump version, commit (attribution lines), push. If a server change: restart the sandbox and confirm
   `curl -s --retry 25 --retry-connrefused --retry-delay 1 http://localhost:8124/api/version`.
   Restart = `kill $(lsof -nP -iTCP:8124 -sTCP:LISTEN -t) ; cd <repo> && nohup node server.mjs > /tmp/horizon-8124.log 2>&1 & disown`.
   First request after a restart is slow (~18s) — it rebuilds the static bundle; retry the curl.

## 5. Current prod state + what's pending (THE important bit)

**Prod is on v28.118** (Diviyaj deployed the v28.080–103 and v28.104–118 packages; migrations 316→320 applied).

**A HOTFIX package v28.119→v28.122 is written and pushed, NOT yet deployed** →
`docs/deploy notes/DEPLOY_2026-09-30_HOTFIX_v28.119-v28.122.md`. **Deploy v28.122 first — it fixes a live outage:**
- **v28.122 fixes "menus flash / won't load / super slow" on prod.** The auto-update poll (`inject.html` ~18210)
  reloads the whole app whenever `/api/version !== BOOT`, and every menu click is a `hashchange` that triggers that
  reload with no throttle → any persistent version mismatch = reload on every click. Prod-only (multi-instance skew,
  or `__APP_VERSION__` not stamped so BOOT never matches). Fixed with two client guards (ignore un-stamped placeholder;
  throttle reloads to ≤1 / 2 min). Sandbox can't reproduce it (single instance, versions match). Diviyaj has a curl
  check in the note to confirm the prod trigger.
- **v28.121** fixed two v28.120 regressions Diviyaj caught: S2 auth now uses `cookieUser(req)` under GATE (v28.120's
  `req._authEmail` didn't exist on prod → everyone got "session expired"; he reverted on prod); xeroFetch retries 503
  on GET only.
- **v28.120** mirrors Diviyaj's own prod hotfixes: `_resolveAllPoLinks(opts = {})`, Xero 429 backoff + save-progress
  watermark, Flexport default 25/page + `?per=`/`?max_pages=`.
- **v28.119** new feature: live DHL/FedEx tracking pill + modal on the Samples tab (no migration/config).

**Open items (Ben's queue):**
- **Confirm v28.122 settles prod** once Diviyaj deploys it (waiting on him).
- **Combined-bill link action** — 4 real Xero bills won't auto-link because one bill covers multiple POs and its ref
  starts with only one of them (matcher requires "ref starts with the PO"). Offered: a small admin action to attach a
  bill to several POs. ~half a day. Ben to choose vs hand-linking.
- **S7** — Xero payment amounts are taken from the request body (NaN→0, negatives pass the guard). Fix = re-derive
  amount + account server-side from the PO/deposit row. **Needs Ben's nod** (changes the payment-posting flow).
- **Flexport cron** is OFF on prod pending Ben's review. Confirmed EXPECTED: the freight jump (255 POs/£614k →
  696/£2.23M) is coverage, not double-count (`flexport_shipments_effective` = API `UNION ALL` legacy-not-in-API).
- **Client portal** `client.dockandbay.com` is LIVE (verified: portal at `/`, admin APIs 404 on that host).
- **The code review** (30-Sep) — artifact https://claude.ai/artifact/X7Phne3R9TathTA2hSXwe6, 77 findings P0/P1/P2.
  Done: the P0/quick-win subset (v28.116 server + v28.117/118 client) and S2 (v28.121). Open: S7, S19–S39 (batching,
  infra), and all P2 structural (C21 one `hzTimeline`, C22 split the single script, C23 fetch layer, etc.).

## 6. Gotchas learned this session (avoid re-learning)

- **Never reimplement prod-auth internals on assumption.** v28.120 guessed `req._authEmail` existed on prod; it
  didn't, git merged it with no conflict, and it took prod down (everyone "session expired"). Auth code that only runs
  under GATE **cannot be tested in the ungated sandbox** — be conservative, and **state in the deploy note what the
  change assumes prod provides.** `cookieUser(req)` is Diviyaj's prod harness (the signed `pu` cookie); it is NOT in
  this repo. `cookieVal(req,name)` (exists here) just reads a cookie value.
- **Parse-check ≠ runtime-safe.** A removed function still referenced, or an undefined identifier reached only at
  click time, passes `new Function` parsing but throws live. Grep for references to anything you delete.
- **The version-poll reload-loop** (§5, v28.122) is the mechanism behind "the app keeps reloading / won't settle."
- **Diagnose prod client bugs by reproducing in a browser** (claude-in-chrome) against the sandbox (localhost:8124,
  no auth) — read console errors + network. If it's clean on sandbox, suspect a prod-only condition (GATE, multi-
  instance version skew, data volume).
- **Editing the same anchor twice** or after a prior commit shifts line numbers — always re-grep; the assert-count
  script protects you.

## 7. Recent version history (v28.104→122, one-liners)

104 client subdomain router · 105 drop PayPal pay-from · 106 cross-org loan payments (paying-org dropdown, 901) ·
107/109 AU bill migration (Xero UK→AU, code 625) + contact auto-create · 108 sidebar L2/L3 action counters ·
110 left-align payment modals · 111 product status "Stop development" + sample real dates · 112 Samples arriving soon ·
113 PRODUCT grid layout per user · 114 inline dev-request form + address autocomplete · 115 timelines = 2-tab
conversation (Messages / Record of change) · 116 review server P0 (S1/S3/S4/S5/S6/S8/S9/S12/S13/S14/S15/S31/S40) +
mig 320 indexes · 117 review client (C1 XSS esc, C2, C4 lazy imgs, C7 poll, C13, C25, C29) + timeline indent tweak ·
118 review client C8/C14 · 119 samples live tracking pill · 120 upstream prod fixes · 121 fix 120 regressions ·
122 fix prod menu reload-loop.

## 8. Memory index (loaded each session via MEMORY.md)

Key files under `~/.claude/projects/-Users-home-Documents-CLAUDE/memory/`:
`horizon-prod-deploy-state` (current prod + hotfixes), `horizon-code-review-2026-09-30` (the review plan + IDs),
`sandbox-restart-permission`, `tables-left-align`, `always-push-every-version`, `feedback-where-to-next`,
`horizon-perf-audit-2026-09-30` (earlier load-time audit, shipped), plus queued-feature notes.

## 9. Suggested first moves for the next session

1. Check whether Diviyaj deployed **v28.122** and prod menus are stable (ask Ben / check prod `/api/version` vs the
   served bundle's `var BOOT='…'`).
2. Then, at Ben's direction: the **combined-bill link action**, or **S7**, or resume the review **P1/P2** backlog.
