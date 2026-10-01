-- 284: per-sample short code for the QR / phone-scan flow (v27.744, Ben — PRODUCT split P4).
--
-- Each product_dev_samples row gets a 3-char Crockford-base32 short code (e.g. "A31"), printed as text
-- and encoded in a QR on the sample card. Scanning it (or typing the code) opens the phone sample card.
-- Crockford alphabet omits I L O U to stay unambiguous on paper. Unique (partial index; NULLs allowed
-- because the code is assigned lazily by the server for any row that somehow still lacks one).

ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS short_code text;
CREATE UNIQUE INDEX IF NOT EXISTS product_dev_samples_short_code_uidx
  ON planner.product_dev_samples (short_code) WHERE short_code IS NOT NULL;

-- Backfill every existing sample with a unique random code (retry on the rare collision).
DO $$
DECLARE
  r record;
  code text;
  alph text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   -- Crockford base32 (no I L O U)
  i int;
BEGIN
  FOR r IN SELECT id FROM planner.product_dev_samples WHERE short_code IS NULL LOOP
    LOOP
      code := '';
      FOR i IN 1..3 LOOP
        code := code || substr(alph, 1 + floor(random() * 32)::int, 1);
      END LOOP;
      BEGIN
        UPDATE planner.product_dev_samples SET short_code = code WHERE id = r.id;
        EXIT;   -- assigned OK
      EXCEPTION WHEN unique_violation THEN
        -- collision, try another code
      END;
    END LOOP;
  END LOOP;
END $$;
