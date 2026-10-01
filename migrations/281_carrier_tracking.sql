-- 281: Carrier tracking cache (v27.718, Ben) — DHL Unified Tracking, samples AND bulk shipments.
--
-- One row per tracking NUMBER, shared by sample shipments (planner.sample_requests.tracking_code[_2])
-- and bulk shipments (planner.shipments.carrier_ref). A server-side poller (POST /api/tracking/poll,
-- webhook-secret gated like received-pos; plus a !VERCEL in-app timer) refreshes it from DHL and never
-- from a page view — the free "basic" DHL plan is rate-limited, so the UI only ever reads this cache.
--
-- status_code is DHL's normalised code, lower-cased: pre-transit | transit | delivered | failure | unknown.
-- events holds the raw DHL event array (jsonb) for the drawer; last_event is the newest event's text.
-- source_table / source_id record where the number was first seen (sample_requests.id as text, or
-- shipments.shipment_ref) — informational only; the write-back to shipments.tracked_delivery_date keys
-- on carrier_ref = tracking_number, so it survives the number appearing in more than one place.
--
-- Carrier-agnostic on purpose: FedEx/UPS keep the link-out for now but can reuse this table later.
-- Additive; live PRODUCT/tracking tables are empty. The DHL key stays in env (DHL_API_KEY), never here.

CREATE TABLE IF NOT EXISTS planner.carrier_tracking (
  tracking_number text PRIMARY KEY,
  carrier         text NOT NULL DEFAULT 'DHL',
  status_code     text,
  status_text     text,
  eta             date,
  delivered_at    timestamptz,
  last_event      text,
  events          jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_polled_at  timestamptz,
  source_table    text,
  source_id       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- The poller selects the next numbers to refresh by staleness, and in-transit ones more often.
CREATE INDEX IF NOT EXISTS carrier_tracking_poll_idx
  ON planner.carrier_tracking (status_code, last_polled_at);
