-- 142: let Dock & Bay approve a supplier's portal-submitted additional costs (freight / tooling / surcharges).
-- Reviewed + edited + approved on the admin PO ▸ Payments tab; the supplier still adds/edits them in the portal.
ALTER TABLE planner.portal_additional_costs
  ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;
