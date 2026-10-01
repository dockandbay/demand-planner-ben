-- 323_payment_fx_region.sql  (v28.133, Ben) — a supplier payment is per Xero org: UK and AU are separate payments.
-- Ben 01-Oct-26: "AU deposits cannot mix with UK deposits on a single payment … the AU deposit MUST be paid from the AU
-- business, the payment bill must go into the AU Xero org." The Payments Report now groups by date + supplier + REGION,
-- so the bank amount / FX recorded per payment needs the region in its key.
--
-- Every existing row becomes region 'UK' (the default), so all current bank amounts keep matching their payments
-- exactly as before; only new AU payments get 'AU' rows. Tiny table (~420 rows) → the key swap is near-instant.
-- APPLY BEFORE deploying v28.133 code (the code reads/writes payment_fx.region). Safe to re-run. One transaction.
BEGIN;

ALTER TABLE planner.payment_fx ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'UK';

DO $m$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_fx_region_chk' AND conrelid = 'planner.payment_fx'::regclass) THEN
    ALTER TABLE planner.payment_fx ADD CONSTRAINT payment_fx_region_chk CHECK (region IN ('UK', 'AU'));
  END IF;
  -- Widen the primary key (run_date, supplier) → (run_date, supplier, region), only if it is still the 2-column one.
  IF (SELECT array_agg(a.attname::text ORDER BY k.ord)
        FROM pg_constraint c
        CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
       WHERE c.conrelid = 'planner.payment_fx'::regclass AND c.contype = 'p') = ARRAY['run_date', 'supplier'] THEN
    ALTER TABLE planner.payment_fx DROP CONSTRAINT payment_fx_pkey;
    ALTER TABLE planner.payment_fx ADD CONSTRAINT payment_fx_pkey PRIMARY KEY (run_date, supplier, region);
  END IF;
END
$m$;

COMMIT;

-- Post-check: SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='payment_fx_pkey';
--   expect PRIMARY KEY (run_date, supplier, region)
