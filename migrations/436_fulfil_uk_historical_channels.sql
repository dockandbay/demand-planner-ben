-- migration 436
-- v28.777 (Ben 11-Nov-26): the four UK historical sales channels Diviyaj is about to load into Fulfil (his email 10-Nov-26, point 6), mapped
-- before the load so the import reads them. Same mapping as the live UK channels; the DTC history uses the same Shopify-reference rule as
-- HISTORICAL dockandbay-us (an order whose reference is not a Shopify order number is a Cin7 key-account order and is dropped, as for
-- US / AU / CA). HISTORICAL TikTok UK = Shopify UK orders shipped by the seller (TikTok Shop), same as the live TikTok UK channel.
-- Additive; an existing row is left as it is.
INSERT INTO planner.fulfil_channel_map (channel_name, country, channel, kind, dtc_ref_pattern, is_historical, note, updated_by) VALUES
  ('HISTORICAL dockandbay-uk',    'UK', 'DTC', 'dtc', '^(US|AU|EU|CA|UK)-?[0-9]+[A-Z]{0,2}$|^#?[0-9]+$', true, 'Cin7 UK Shopify history (Diviyaj, Nov-26)', 'ben'),
  ('HISTORICAL dockandbay-uk-ws', 'UK', 'B2B', 'b2b', NULL, true, 'Cin7 UK wholesale history', 'ben'),
  ('HISTORICAL Amazon.co.uk',     'UK', 'FBA', 'fba', NULL, true, 'Cin7 Amazon UK history', 'ben'),
  ('HISTORICAL TikTok UK',        'UK', 'TIK', 'tik', NULL, true, 'Cin7 UK Shopify orders shipped by seller (TikTok Shop)', 'ben')
ON CONFLICT (channel_name) DO NOTHING;
