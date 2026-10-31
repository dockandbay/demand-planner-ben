-- 407 (v28.603, Ben 31-Oct-26): CLIENT > B2B forecast. Replaces the "B2B - Direct to Client Forecast" Google Sheet
-- (tab B2B_DIRECT_FORECAST) that Andy's budget workbook imports. Spec: docs/specs/b2b-forecast.md.
-- One row per client order (or forecast bucket), its payment schedule, and an audit trail Chief uses for "what moved".

create table if not exists planner.b2b_forecast_orders (
  id                bigserial primary key,
  client_id         integer references planner.clients(id),      -- null allowed (forecast buckets, unmatched names)
  client_label      text not null,                                -- the name as the sheet / sales call it
  reference         text,                                         -- PO / note / order number
  order_type        text not null check (order_type in
                     ('UK Wholesale','US Wholesale','EU Wholesale','International Distributor','AU Distributor')),
  entity            text not null default 'UK' check (entity in ('UK','AU')),   -- AU Distributor rows are the AU entity
  bucket            boolean not null default false,               -- a forecast bucket ("UK Jan Key Accounts"), not a real order
  value_source      numeric(14,2) not null,                       -- order value NET, ex tax, in the order currency
  currency          text not null check (currency in ('GBP','USD','EUR','AUD','CAD')),
  confirmed         boolean not null default false,
  status            text not null default 'forecast' check (status in
                     ('forecast','confirmed','shipped','invoiced','paid','cancelled')),
  order_date        date,
  payment_terms     text,
  ship_date         date,
  fulfil_order_refs text[] default '{}',                          -- Fulfil sales order numbers / customer refs once raised
  owner_email       text,                                         -- salesperson who owns the row
  cogs_pct          numeric(5,4),                                 -- null = the type default (0.45)
  notes             text,
  -- calculated on every save / recalc (so a number can always be traced)
  value_gbp         numeric(14,2),
  fx_rate           numeric(12,6),                                -- order currency per 1 GBP used for value_gbp
  fx_source         text,                                         -- e.g. "fx_rates FY2026"
  fulfil_status     jsonb,                                        -- last Fulfil read: {state, shipped_value, orders:[...], at}
  import_flags      jsonb,                                        -- dates that failed to parse on import: [{field, raw}]
  created_by text, created_at timestamptz default now(),
  updated_by text, updated_at timestamptz default now()
);
create index if not exists b2b_forecast_orders_client on planner.b2b_forecast_orders (client_id);

create table if not exists planner.b2b_forecast_payments (
  id         bigserial primary key,
  order_id   bigint not null references planner.b2b_forecast_orders(id) on delete cascade,
  seq        smallint not null,          -- 1, 2, 3 ...
  due_date   date,                       -- null allowed, flagged red (missing from cash)
  pct        numeric(6,3) not null,      -- 30 = 30%
  unique (order_id, seq)
);

create table if not exists planner.b2b_forecast_changes (
  id bigserial primary key, order_id bigint, field text, old_value text, new_value text,
  changed_by text, changed_at timestamptz default now()
);
create index if not exists b2b_forecast_changes_at on planner.b2b_forecast_changes (changed_at);
create index if not exists b2b_forecast_changes_order on planner.b2b_forecast_changes (order_id);

-- Edit grant (view = anyone with CLIENT). Ben 31-Oct-26: admins + Mikey, Madison, Liam, Hanna (hanna@).
alter table planner.app_permissions add column if not exists b2b_forecast_edit boolean default false;
insert into planner.app_permissions (email, b2b_forecast_edit, updated_at, updated_by)
  values ('mikey@dockandbay.com', true, now(), 'migration 407'), ('madison@dockandbay.com', true, now(), 'migration 407'),
         ('liam@dockandbay.com', true, now(), 'migration 407'), ('hanna@dockandbay.com', true, now(), 'migration 407')
  on conflict (email) do update set b2b_forecast_edit = true, updated_at = now(), updated_by = 'migration 407';
