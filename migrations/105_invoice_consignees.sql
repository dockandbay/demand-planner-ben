-- 105_invoice_consignees.sql
-- CONFIG-managed consignee + notify-party addresses per delivery country, for the invoice/packing generator.
-- Fallback: the generator uses the UK row for any country not present here.

CREATE TABLE IF NOT EXISTS planner.invoice_consignees (
  country          text PRIMARY KEY,
  consignee        text,
  notify_party     text,
  port_of_discharge text,
  updated_at       timestamptz DEFAULT now(),
  updated_by       text
);

INSERT INTO planner.invoice_consignees (country, consignee, notify_party) VALUES
('UK','Dock & Bay LTD
3rd Floor 86-90 Paul Street, 
London, England, EC2A 4NE
Attn: Ben Muller
ben@dockandbay.com
+61 404 637 403
Tax number: GB212507156','ILG c/o Dock & Bay
Unit 2 Space Gatwick
Faraday Road
Crawley
RH10 9BJ Ph: 07960 100 293
Attn: Aaron Hale 
aaronh@ilguk.com'),
('US','Dock & Bay Ltd Corp
8 Hutchins Way
Westford, MA
018862942
Attn: Ben Muller
ben@dockandbay.com
+61 404 637 403
Tax number: 98126 2923 (EIN)','Geneva10 Fulfillment 
1501 E. Wisconsin Street, 
Dock Doors K, L, M, 
Delavan, WI 53115 Attention: Matt Barta
ph. (262) 2292637
 +1 2629034347'),
('EU','Dock & Bay LTD
3rd Floor 86-90 Paul Street, 
London, England, EC2A 4NE
Attn: Ben Muller
ben@dockandbay.com
+61 404 637 403
UK VAT: GB212507156
FR VAT: FR09842854630
FR EORI: FRGB842854630
','IFulfilment, Harderhook 19, 46395 Bocholt, Germany 
Ph: 01425 200 200

Harriet Cubitt harriet.cubitt@ifglobal.com

UK office on 01425200200'),
('AU','Dock & Bay PTY LTD
PO Box 8006
Tumbi Umbi
2261 NSW
Australia
Attn: Ben Muller
ben@dockandbay.com
+61 404 637 403
Tax number: 13608596229 (ABN)','DOK/Coghlans
4-8 Ferndell Street
South Granville, NSW, 2142, Australia
receiving@coghlan.com.au
D: +61 2 9828 0111')
ON CONFLICT (country) DO UPDATE SET consignee=excluded.consignee, notify_party=excluded.notify_party, updated_at=now();
