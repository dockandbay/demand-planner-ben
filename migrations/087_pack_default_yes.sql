-- 087: default the standard Dock & Bay packing to YES — Polybags, D&B Product barcodes, D&B Carton labels.
-- New POs default these three to true; existing POs that have NO packing detail set yet are initialised to
-- Yes (one-time init — only touches truly-untouched POs so it's safe to re-run and never overrides a PO
-- where D&B has already entered any packing/labelling content). Run right after 086.

ALTER TABLE planner.purchase_orders
  ALTER COLUMN pack_polybags     SET DEFAULT true,
  ALTER COLUMN pack_dnb_barcodes SET DEFAULT true,
  ALTER COLUMN pack_dnb_carton   SET DEFAULT true;

UPDATE planner.purchase_orders
   SET pack_polybags = true, pack_dnb_barcodes = true, pack_dnb_carton = true
 WHERE NOT pack_polybags AND NOT pack_dnb_barcodes AND NOT pack_rfid_barcodes
   AND NOT pack_dnb_carton AND NOT pack_client_carton
   AND coalesce(pack_polybags_notes,'')='' AND coalesce(pack_dnb_barcodes_notes,'')=''
   AND coalesce(pack_rfid_barcodes_notes,'')='' AND coalesce(pack_dnb_carton_notes,'')=''
   AND coalesce(pack_client_carton_notes,'')='' AND coalesce(pack_pallet_notes,'')=''
   AND coalesce(pack_other_notes,'')='';
