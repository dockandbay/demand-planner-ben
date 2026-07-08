-- Migration 004 — reference tables: batches, branches, prod_numbers (Production Planner seed, B8.7/B8.8)
-- From BATCH / BRANCH / PROD# grid exports. Small reference dimensions that PO fields point at
-- (purchase_orders.batch_id -> batches, .branch -> branches, .prod_no -> prod_numbers).
-- Not hard-FK'd yet (source data is partial); kept as text references for now.
-- HOW TO APPLY: tested on sandbox; BEN runs on live.

create table if not exists planner.batches (
  batch                text primary key,        -- e.g. "55.0326"
  batch_date           date,
  first_release_window text,
  notes                text
);

create table if not exists planner.branches (
  name                 text primary key,         -- e.g. "US Geneva", "CA FBA"
  country_code         text,
  sea_lead_time_days   int,
  air_lead_time_days   int,
  address              text,
  shipping_notes       text
);

create table if not exists planner.prod_numbers (
  id                bigint generated always as identity primary key,
  prod_no           text unique,                 -- nullable (some rows blank)
  status            text,
  xero_account_code text,
  xero_account_name text,
  xero_account_id   text
);

comment on table planner.batches      is 'Buying batches (BATCH grid) — spec B8.8.';
comment on table planner.branches     is 'Destination branches/warehouses (BRANCH grid).';
comment on table planner.prod_numbers is 'Production# -> Xero account mapping (PROD# grid).';

-- ── Seeds (generated from BATCH / BRANCH / PROD# grids) ──
insert into planner.batches (batch,batch_date,first_release_window,notes) values
('46.0824','2024-08-16',NULL,NULL),
('49.0225','2025-02-25',NULL,NULL),
('50.0325','2025-03-29',NULL,NULL),
('51.0525','2025-05-01',NULL,NULL),
('53.0825','2025-08-01',NULL,NULL),
('54.1125','2025-11-29',NULL,NULL),
('55.0326','2026-03-01','AW26',NULL),
('53.1025',NULL,NULL,NULL);

insert into planner.branches (name,country_code,sea_lead_time_days,air_lead_time_days,address,shipping_notes) values
('AU Coghlans','AU',28,7,NULL,NULL),
('AU FBA','AU',28,7,NULL,NULL),
('CA FBA','CA',42,7,NULL,NULL),
('CA Propack','CA',42,7,NULL,NULL),
('China Stock','CN',0,7,NULL,NULL),
('Direct to Client',NULL,0,7,NULL,NULL),
('Dubai','DB',28,7,NULL,NULL),
('EU iFulfillment','EU',70,7,NULL,NULL),
('EU ILG','EU',70,7,NULL,NULL),
('UK B2B JLEW','UK',60,7,NULL,NULL),
('UK B2B NEXT','UK',60,7,NULL,NULL),
('UK FBA','UK',60,7,NULL,NULL),
('UK Head Office','UK',60,7,NULL,NULL),
('UK ILG','UK',60,7,NULL,NULL),
('UK Preorder','UK',60,7,NULL,NULL),
('US FBA','US',28,7,NULL,NULL),
('US Geneva','US',28,7,NULL,NULL),
('US AWD','US',28,7,NULL,NULL);

insert into planner.prod_numbers (prod_no,status,xero_account_code,xero_account_name,xero_account_id) values
('AU',NULL,'620.00 AU','Stock Deposits and Payments for Australia','26be2878-29d6-4e26-81ce-70da78ea3f5f'),
(NULL,'Closed','620.01 P20','Stock Deposits and Payments for P20',NULL),
(NULL,'Closed','620.02 P21','Stock Deposits and Payments for P21',NULL),
(NULL,'Closed','620.03 P22','Stock Deposits and Payments for P22',NULL),
(NULL,'Closed','620.04 P23','Stock Deposits and Payments for P23',NULL),
(NULL,'Closed','620.05 P24','Stock Deposits and Payments for P24',NULL),
(NULL,'Closed','620.06 P25','Stock Deposits and Payments for P25',NULL),
(NULL,'Closed','620.06 P26','Stock Deposits and Payments for P26',NULL),
(NULL,'Closed','620.07 P27','Stock Deposits and Payments for P27',NULL),
(NULL,'Closed','620.08 P28','Stock Deposits and Payments for P28',NULL),
(NULL,'Closed','620.09 P29','Stock Deposits and Payments for P29',NULL),
(NULL,'Closed','620.10 P30','Stock Deposits and Payments for P30',NULL),
(NULL,'Closed','620.11 P31','Stock Deposits and Payments for P31',NULL),
(NULL,'Closed','620.12 P32','Stock Deposits and Payments for P32',NULL),
(NULL,'Closed','620.13 P33','Stock Deposits and Payments for P33',NULL),
(NULL,'Closed','620.14 P34','Stock Deposits and Payments for P34',NULL),
(NULL,'Closed','620.15 P35','Stock Deposits and Payments for P35',NULL),
(NULL,'Closed','620.16 P36','Stock Deposits and Payments for P36',NULL),
(NULL,'Closed','620.17 P37','Stock Deposits and Payments for P37',NULL),
(NULL,'Closed','620.18 P38','Stock Deposits and Payments for P38',NULL),
(NULL,'Closed','620.19 P39','Stock Deposits and Payments for P39',NULL),
(NULL,'Closed','620.20 P40','Stock Deposits and Payments for P40','4a073efe-1b5d-454a-bad9-70e6e1dfa16f'),
(NULL,'Closed','620.21 P41','Stock Deposits and Payments for P41','6747fc17-d749-4ad1-a0fe-e8e4806f4dcc'),
(NULL,'Closed','620.22 P42','Stock Deposits and Payments for P42','24c48860-7c6c-4bef-bc25-81232b78a023'),
(NULL,'Closed','620.23 P43','Stock Deposits and Payments for P43','357e9620-1327-4493-a8a2-9d6d5c83ea32'),
(NULL,'Closed','620.24 P44','Stock Deposits and Payments for P44','9b0a789f-27d0-4f7d-af18-b82844032a00'),
(NULL,'Closed','620.25 P45','Stock Deposits and Payments for P45','7735477a-6923-4c65-a4e9-b9bae6b4a503'),
(NULL,'Closed','620.26 P46','Stock Deposits and Payments for P46','45058c7b-2f9d-4d26-8ca3-27088cc596c7'),
(NULL,'Closed','620.27 P47','Stock Deposits and Payments for P47','79553ec3-b127-42ae-99fb-7d1ccc86b4c8'),
('P48',NULL,'620.28 P48','Stock Deposits and Payments for P48','dd4b6f3c-c0db-449c-9414-f0ed30f2cece'),
('P49',NULL,'620.29 P49','Stock Deposits and Payments for P49','4c0d137c-2ac8-45f8-a1e5-6b4f09c629a1'),
('P50',NULL,'620.30 P50','Stock Deposits and Payments for P50','46c9ed59-b7e1-4a13-9a41-64c052703234'),
('P51',NULL,'620.31 P51','Stock Deposits and Payments for P51','11b16416-89f6-42a3-b268-17d1bd661627'),
('P52',NULL,'620.32 P52','Stock Deposits and Payments for P52','ca1152fd-aeb0-403c-b9ee-1f05436c81f4'),
('P53',NULL,'620.33 P53','Stock Deposits and Payments for P53','533fe295-2e4d-4d7c-b045-a4bc819cff6a'),
('P54',NULL,'620.34 P54','Stock Deposits and Payments for P54','e4e5ff92-4348-40bd-b48e-c356c19b6b5e'),
('P55',NULL,'620.35 P55','Stock Deposits and Payments for P55','1ec63b6d-4e90-4068-9acb-818787cd77cf'),
('P56',NULL,'620.36 P56','Stock Deposits and Payments for P56','f298f18b-1eac-4305-82b9-763435df7f9a'),
('P57',NULL,'620.37 P57','Stock Deposits and Payments for P57','8f5c48ee-63e0-4931-b969-1258cb89dbde'),
('P58',NULL,'620.38 P58','Stock Deposits and Payments for P58','3991cc63-2064-4b78-a728-f59aa7e7b2e6'),
('P59',NULL,'620.39 P59','Stock Deposits and Payments for P59','2aafc600-0685-413a-aa95-ed6c8c75351f'),
('P60',NULL,'620.40 P60','Stock Deposits and Payments for P60',NULL),
(NULL,NULL,'620.41 P61','Stock Deposits and Payments for P61',NULL),
(NULL,NULL,'620.42 P62','Stock Deposits and Payments for P62',NULL),
(NULL,NULL,'620.43 P63','Stock Deposits and Payments for P63',NULL),
(NULL,NULL,'620.44 P64','Stock Deposits and Payments for P64',NULL),
(NULL,NULL,'620.45 P65','Stock Deposits and Payments for P65',NULL),
(NULL,NULL,'620.46 P66','Stock Deposits and Payments for P66',NULL),
(NULL,NULL,'620.47 P67','Stock Deposits and Payments for P67',NULL),
(NULL,NULL,'620.48 P68','Stock Deposits and Payments for P68',NULL),
(NULL,NULL,'620.49 P69','Stock Deposits and Payments for P69',NULL),
(NULL,NULL,'620.50 P70','Stock Deposits and Payments for P70',NULL),
(NULL,NULL,'620.51 P71','Stock Deposits and Payments for P71',NULL),
(NULL,NULL,'620.52 P72','Stock Deposits and Payments for P72',NULL),
(NULL,NULL,'620.53 P73','Stock Deposits and Payments for P73',NULL),
(NULL,NULL,'620.54 P74','Stock Deposits and Payments for P74',NULL),
(NULL,NULL,'620.55 P75','Stock Deposits and Payments for P75',NULL),
(NULL,NULL,'620.56 P76','Stock Deposits and Payments for P76',NULL),
(NULL,NULL,'620.57 P77','Stock Deposits and Payments for P77',NULL),
('55.0326',NULL,NULL,NULL,NULL);
