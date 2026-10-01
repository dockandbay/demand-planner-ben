-- 016_shipments.sql — real, editable shipment records (v20.3)
--
-- Until now "shipments" were virtual: POs grouped by purchase_orders.shipment_ref, with the
-- master implied (the PO whose number == shipment_ref) and dates read from the linked Flexport
-- record / the master PO's landing_date_overide. This table makes shipments first-class so they
-- can be created/edited and so a shipment's dates OVERRIDE the dates on every PO aboard it.
--
-- Model (Ben's spec):
--   • shipment_ref  — the shipment's reference, usually the master PO's number.
--   • master_po     — the PO where stock consolidates (the "master"); defaults to shipment_ref.
--   • carrier/ref   — Flexport / DHL / FedEx + the carrier's tracking ref (sync feed key).
--   • dates         — departure/landing/delivery/arrival. When set, these OVERRIDE the PO's
--                     landing_date_overide / delivery_date_overide for every PO with this
--                     shipment_ref. Left NULL → the PO falls back to its own override / Flexport.
--   • status/notes  — manual status override (else derived from the POs) + free notes.
--
-- Reflect-the-ERP principle: a PO is assigned to a shipment via purchase_orders.shipment_ref
-- (unchanged); this table only adds the shipment-level attributes that have no home on the PO.

CREATE TABLE IF NOT EXISTS planner.shipments (
  shipment_ref   text PRIMARY KEY,
  master_po      text,
  carrier        text,
  carrier_ref    text,
  departure_date date,
  landing_date   date,
  delivery_date  date,
  arrival_date   date,
  status         text,
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Seed one row per shipment_ref already in use. master_po = shipment_ref (the convention), and
-- carrier/carrier_ref from any linked Flexport reference on the group. Dates are left NULL on
-- purpose: an empty shipment date means "inherit" (PO override ▸ Flexport), so seeding does not
-- freeze today's Flexport dates into manual overrides — the user fills them in to override.
INSERT INTO planner.shipments (shipment_ref, master_po, carrier, carrier_ref)
SELECT sr.shipment_ref,
       sr.shipment_ref,
       CASE WHEN fr.flexport_reference IS NOT NULL THEN 'Flexport' END,
       fr.flexport_reference
FROM (SELECT DISTINCT shipment_ref FROM planner.purchase_orders
      WHERE shipment_ref IS NOT NULL AND shipment_ref <> '') sr
LEFT JOIN LATERAL (
  SELECT max(flexport_reference) flexport_reference FROM planner.purchase_orders
  WHERE shipment_ref = sr.shipment_ref AND flexport_reference IS NOT NULL AND flexport_reference <> ''
) fr ON true
ON CONFLICT (shipment_ref) DO NOTHING;
