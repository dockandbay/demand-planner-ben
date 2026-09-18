-- 144: seed the approved branch delivery notes on LIVE, then stamp them onto all OPEN POs + shipments.
-- Values are the ones Ben approved (already applied in sandbox). Safe / re-runnable:
--   • branch upserts set the note by name (idempotent)
--   • PO / shipment stamping only fills BLANK override fields on OPEN records (never clobbers an edited note
--     or a completed/cancelled record).
-- The app already falls back PO→branch when the PO field is blank; this materialises it so open shipments
-- (which inherit from the master PO at creation) also carry the note.

-- 1) Branch delivery notes (the approved text per branch)
UPDATE planner.branches SET delivery_notes = $$Max pallet height: 2m
Pallet specification: 1200 x 1000mm
Floor loading: No
Pallet labels required: Yes — ASN Label$$ WHERE name = 'AU Coghlans';

UPDATE planner.branches SET delivery_notes = $$Max pallet height: 1.8m
Pallet specification: 1200 x 1000mm
Floor loading: No
Pallet labels required: Pallet & Carton labels$$ WHERE name = 'AU FBA';

UPDATE planner.branches SET delivery_notes = $$Max pallet height: 1.8m
Pallet specification: 1200 x 1000mm
Floor loading: No
Pallet labels required: Pallet & Carton labels$$ WHERE name = 'CA FBA';

UPDATE planner.branches SET delivery_notes = $$Max pallet height: 1.5m
Pallet specification: 1200 x 800mm (Europe)
Floor loading: No
Pallet labels required: Yes — IDN Label$$ WHERE name = 'EU iFulfillment';

UPDATE planner.branches SET delivery_notes = $$Max pallet height: 1.8m
Pallet specification: 1200 x 1000mm
Floor loading: No
Pallet labels required: Pallet & Carton labels$$ WHERE name = 'UK FBA';

UPDATE planner.branches SET delivery_notes = $$Max pallet height: 2m
Pallet specification: 1200 x 1000mm
Floor loading: No
Pallet labels required: No, just pallet numbers$$ WHERE name = 'UK ILG';

UPDATE planner.branches SET delivery_notes = $$Max pallet height: 1.8m
Pallet specification: 1200 x 1000mm
Floor loading: No
Pallet labels required: Pallet & Carton labels$$ WHERE name = 'US FBA';

UPDATE planner.branches SET delivery_notes = $$Max pallet height: 2m
Pallet specification: 1200 x 1000mm
Floor loading: Yes
Pallet labels required: No, just pallet numbers$$ WHERE name = 'US Geneva';

-- 2) Stamp OPEN purchase orders from their branch (only where the PO override is blank)
UPDATE planner.purchase_orders po
   SET branch_delivery_notes = b.delivery_notes
  FROM planner.branches b
 WHERE b.name = po.branch
   AND coalesce(b.delivery_notes,'') <> ''
   AND coalesce(po.branch_delivery_notes,'') = ''
   AND coalesce(po.status,'') NOT ILIKE '%complete%'
   AND coalesce(po.status,'') NOT ILIKE '%cancel%';

-- 3) Stamp OPEN shipments from their master PO's branch (only where the shipment note is blank)
UPDATE planner.shipments s
   SET delivery_notes = b.delivery_notes
  FROM planner.purchase_orders p
  JOIN planner.branches b ON b.name = p.branch
 WHERE p.po = coalesce(nullif(s.master_po,''), s.shipment_ref)
   AND coalesce(b.delivery_notes,'') <> ''
   AND coalesce(s.delivery_notes,'') = ''
   AND coalesce(s.status,'') NOT ILIKE '%complete%'
   AND coalesce(s.status,'') NOT ILIKE '%deliver%';
