-- 344_so_push_modes.sql (v28.234, Ben 09-Oct-26)
-- Validate sales order can now change a line's fulfilment method (From stock / Back order / Drop ship) as well as its
-- supplier. The push audit records the method before and after. Additive and idempotent; the code works before this is
-- applied (it stores the row without the two columns).
ALTER TABLE planner.so_supplier_pushes ADD COLUMN IF NOT EXISTS old_mode text;
ALTER TABLE planner.so_supplier_pushes ADD COLUMN IF NOT EXISTS new_mode text;
