-- Seed the PRODUCT component catalogue (planner.component_types) with a sensible D&B starter set.
-- Idempotent: ON CONFLICT (name) DO NOTHING — never clobbers a type Ben has already edited.
-- default_supplier '' = "= product supplier"; printed paper/card items default to MQ Print.
-- Optional on live (Ben's call) — mirrors what the sandbox shows.

INSERT INTO planner.component_types (name, default_supplier, sampling_mode, sort, active) VALUES
  ('Product body',   '',         'sampled',     1,  true),
  ('Pouch',          '',         'sampled',     2,  true),
  ('Box',            'MQ Print', 'sampled',     3,  true),
  ('Hang tag',       'MQ Print', 'sampled',     4,  true),
  ('Care label',     'MQ Print', 'sampled',     5,  true),
  ('Woven label',    '',         'sampled',     6,  true),
  ('Belly band',     'MQ Print', 'sampled',     7,  true),
  ('Sticker / seal', 'MQ Print', 'sampled',     8,  true),
  ('Insert card',    'MQ Print', 'sampled',     9,  true),
  ('Polybag',        '',         'spec_linked', 10, true)
ON CONFLICT (name) DO NOTHING;

-- Remove the stray 'Hang Tag' duplicate created by an earlier test prompt (distinct from 'Hang tag').
DELETE FROM planner.component_types WHERE name = 'Hang Tag';
