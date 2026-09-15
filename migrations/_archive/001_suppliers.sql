-- Migration 001 — suppliers (Production Planner, spec B8.7)
-- Reconciled against the real SUPPLIER-INPUT.csv (13 rows). Supplier terms drive every
-- downstream payment calc (deposit/completion/balance, catch-up, FX) and PO/Order-Plan
-- scheduling. Root table of Phase 2.
--
-- Schema choice: lives in the existing `planner` schema (same as the demand-planner tables)
-- so the current server needs no search-path/connection changes.
--
-- HOW TO APPLY: Claude tests this on Ben's sandbox; BEN runs the final file on the live
-- Supabase instance himself (no live writes from Claude). The DDL + seed below are one file
-- so a single run on live reproduces the sandbox exactly.
--
-- Modelling decisions taken from the real data (CONFIRM the flagged ones):
--   * `code` is nullable+unique — Transfer and Huzhou have no code yet (multiple NULLs OK).   [CONFIRM codes]
--   * `kind` distinguishes production suppliers from freight/internal payees                   [CONFIRM]
--       (DHL AU -> 'freight', Transfer -> 'internal', everyone else -> 'supplier').
--   * payment %s / credit fields are NULLABLE; blanks load as NULL and the payment engine
--     coalesces NULL -> 0. The =100 sum rule is documented, NOT enforced (Transfer & Nice
--     Look are 0/0/0 today).
--   * `default_currency` is NOT in the export — defaulting all to USD.                          [CONFIRM per-supplier currency]

create table if not exists planner.suppliers (
  id                        bigint generated always as identity primary key,
  code                      text unique,                 -- short PO code; nullable (some rows lack one)
  name                      text not null,               -- friendly name (e.g. "Jinma (merry)")
  business_name             text,                        -- legal entity
  kind                      text not null default 'supplier'
                               check (kind in ('supplier','freight','internal','other')),
  default_currency          text not null default 'USD'
                               check (default_currency in ('USD','GBP','EUR','AUD','CAD')),

  -- Milestone payment split, % of PO value. Expected to total 100 for production suppliers;
  -- not enforced (real data has unset rows). NULL is treated as 0 by the payment engine.
  start_deposit_pct         numeric(5,2),
  completion_pct            numeric(5,2),
  balance_pct               numeric(5,2),

  -- Balance due timing. credit_days feeds the balance due date (spec B8.7).
  credit_days               int,
  credit_type               text check (credit_type in ('on_shipment','on_clearance')),
  credit_fee_on_balance_pct numeric(5,2),

  production_days           int,                          -- production lead time (days)
  incoterm                  text,                         -- optional (not in current export)

  -- Contact / address (from the export)
  contact_name              text,
  email                     text,
  phone                     text,
  address_1                 text,
  address_2                 text,
  city                      text,
  state                     text,
  country                   text,
  postcode                  text,

  active                    boolean not null default true,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table planner.suppliers is 'Supplier/payee master + payment terms (Production Planner, spec B8.7). Seeded from SUPPLIER-INPUT.csv.';

-- ── Seed (generated from SUPPLIER-INPUT.csv; %s parsed, credit_type normalised, blanks -> NULL; currency per Ben) ──
insert into planner.suppliers (code,name,business_name,kind,default_currency,start_deposit_pct,completion_pct,balance_pct,credit_days,credit_type,credit_fee_on_balance_pct,production_days,contact_name,email,phone,address_1,address_2,city,state,country,postcode,notes) values
('XR','XR Textile','WUJIANG XIANGRUI CHEMICAL FIBER CO., LTD','supplier','USD',30.0,20.0,50.0,60,'on_clearance',0.0,60,'Alice','yw11@xrtextile.com','+86 133 7516 3580','Group 3, Xiaowei Village, Pingwang Town','Suzhou, 215200, Jiangsu Sheng','Suzhou',NULL,'China','215200','to do. add fields like payment terms and names/address'),
('LX','Lixin','SUZHOU ROMROL FASHION GROUP CO., LTD','supplier','USD',30.0,20.0,50.0,90,'on_clearance',NULL,60,'Jack','Jack.Zhang@lixintex.com.cn','+86 158 5165 2355','NO.1022th, 2nd NANHUAN ROAD','SSHENGZE TOWN WUJIANG','Suzhou',NULL,'China','215228',NULL),
('JM','Jinma (merry)','SUZHOU DETAO TEXTILE','supplier','USD',0.0,0.0,100.0,60,'on_shipment',NULL,45,'Merry','jiyushuang86@hotmail.com','+86 13584948372','NO.168,SHUNXIN EAST ROAD, SHENGZE,','WUJIANG, JIANGSU','Suzhou',NULL,'China','215228',NULL),
('BE','Bright Eagle (Rebecca)','Shaoxing Bright Eagle Textile Co., Ltd.','supplier','USD',0.0,0.0,100.0,0,'on_shipment',NULL,45,'Rebecca','rebeccaying7@hotmail.com',NULL,'#604-5 Huatai Building,Keqiao District,','Shaoxing City, Zhejiang,','Shaoxing City',NULL,'China','312030',NULL),
('WK','Weierken','Fuzhou Enxin International Business Co., Ltd.','supplier','USD',30.0,NULL,70.0,30,'on_shipment',NULL,60,'Sammie','sale6@weierken.com','+8613599449150','Building2, Jinniu Mountain Internet Industrial Park, No.528 Xihong Road','Gulou District, Fuzhou, Fujian','Fuzhou',NULL,'China','350002',NULL),
('BL','Ballast','Ballast Outdoor Gear,LLC.','supplier','USD',30.0,35.0,35.0,60,'on_shipment',NULL,60,'Brian','brian@ballastgear.com','+1 404-228-3768','639 Hardendorf Ave','Atlanta, GA','Atlanta','GA','United States','30307',NULL),
('MQ','MQ Print','SHANGHAI CHENGUAN IMPORT AND EXPORT CO.,LTD / & SHANGHAI CONGRUI PRINTIING & PACKAGING CO.,LTD','supplier','USD',50.0,NULL,50.0,0,'on_shipment',NULL,45,'Sherry','sales@mq-print.com',NULL,'ROOM302, NO3, LANE 678 ZHIJIANGXI ROAD','JINGAN DISTRICT, SHANGHAI','Shanghai',NULL,'China','200070',NULL),
('DHL AU','DHL AU',NULL,'freight','AUD',NULL,NULL,100.0,30,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(NULL,'Transfer',NULL,'internal','USD',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('SP','Spectas','Spectas','supplier','GBP',50.0,50.0,NULL,NULL,'on_shipment',NULL,60,'Chris','cgiambarrese@spectas.global','423.892.3720',NULL,NULL,NULL,NULL,'United Kingdom',NULL,NULL),
('FY','Shaoxing Fengying (Belinda)','SHAOXING FENGYING TEXTILE & GARMENT CO.,LTD','supplier','USD',30.0,0.0,70.0,NULL,'on_shipment',NULL,60,'Sabrina',NULL,NULL,'Room 205,No.7 Caojiang Road, Jishan Street','uecheng District, Shaoxing City,Zhejiang Province','Shaoxing City',NULL,'China','312000',NULL),
(NULL,'Huzhou Double Qing (Ribbon)','HUZHOU SHUANGQING GARMENT ACCESSORY CO., LTD','supplier','USD',0.0,0.0,100.0,NULL,'on_shipment',NULL,45,'Jenn','doublecowribbon@yeah.net','‭+86 130 5997 6162‬','NO.200 YUEHE STREET','WUXING DISTRICT, HUZHOU CITY, ZHEJIANG','HUZHOU CITY',NULL,'China','313000',NULL),
('NL','Nice Look','Shandong Nicelook co.,Ltd','supplier','USD',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Shirley Tang','shirley@nicelook.com.cn','+8618963118080','A208,NO.11D CHUANGKE ROAD, JINGYUAN STREET','HUANCUI,WEIHAI,SHANDONG','Weihai',NULL,'China','264200',NULL);
