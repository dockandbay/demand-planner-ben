-- Key-account carton label format (v26.603). Links a client (key account) to a client-specific carton-label
-- generator — e.g. 'paper_store' enables the Paper Store carton labels button on a PO's Client/FBA tab.
-- Set in CONFIG ▸ Key Accounts. Blank/null = no client-specific label format. Additive.
ALTER TABLE planner.key_accounts ADD COLUMN IF NOT EXISTS carton_label_format text;
