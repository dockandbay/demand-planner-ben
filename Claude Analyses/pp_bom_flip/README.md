# PP prepack BOM flip (Fulfil, live since 21-Oct-26)

Ship the prepack (PP-) when the warehouse has it, the loose singles when it does not.

**Why:** Fulfil always explodes a kit with its lowest-sequence BOM and ignores stock (proven in
sandbox 20-Oct-26, ticket raised with Fulfil). So each kit (e.g. UK-TOWLB-CAB-LG-6SETI) has two
BOMs, "1 x PP" and the singles, and this script sets which one is sequence 10:

- PP available at the market warehouse >= 1 (`--min-pp`): PP BOM 10, singles 20
- otherwise: singles 10, PP 20

One-time setup per kit (`--setup`): create the "1 x PP" BOM and turn off the PP SKU's own
built-on-the-fly BOM (otherwise the PP line re-explodes to singles).

Mapping: Horizon `planner.prepack_map` exported to `prepack_map.json`. Kits are `<UK|US|EU|AU>-<set>`,
checked at UKILG / USGENEVA_STD / EUIFUL / AUCOGHLANS. Stock is derived from stock moves because
live's per-location quantity fields return 0 over the API.

## Files

| File | Purpose |
|---|---|
| `pp_bom_flip.py` | The run. Dry run by default; `--apply` writes (live also needs `--confirm-live`) |
| `ledger_live.jsonl` | Every write, logged before it is sent, with the old value |
| `CHANGES_live.md` | Readable change log, rebuilt after each run |
| `revert.py` | Undo a run (`--run <id>`) or everything (`--all`); dry run by default |
| `monitor.py` | Read-only: orders with changed kits, expected vs actual explosion |
| `runs/` | Per-run CSV of every kit checked |
| `live_snapshot_before_setup_2026-10-21.json` | Live BOM state before any change |

## Schedule (Claude Code session, Ben)

Twice daily at 07:47 / 14:47: `python3 -I pp_bom_flip.py --env live --apply --setup --confirm-live`.
Monitor every 3 hours. Long term this should move to n8n (Diviyaj).
