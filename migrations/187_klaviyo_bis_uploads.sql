-- Per-market Klaviyo BIS upload metadata (SUG-0018, v26.611): last file uploaded per market (filename, who, when,
-- how many SKUs). Powers the DEMAND ▸ Inputs ▸ Klaviyo BIS status line. Additive.
CREATE TABLE IF NOT EXISTS planner.klaviyo_bis_uploads (
  market      text PRIMARY KEY,     -- UK / US / EU / AU
  filename    text,
  uploaded_by text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  n_skus      integer NOT NULL DEFAULT 0,
  total_subs  integer NOT NULL DEFAULT 0
);
