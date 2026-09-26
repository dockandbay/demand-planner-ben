-- 136: simplify a sample request's OWN status to PLANNED / SHIPPED / CANCELLED (mirrors the PO grid's
-- "our status"). The supplier's granular state stays in production_status ("supplier status"). Accept step dropped.
update planner.sample_requests
   set status = case
     when status ilike 'cancel%'   then 'CANCELLED'
     when status ilike 'ship%'
       or status ilike 'complete%' then 'SHIPPED'
     else 'PLANNED' end
 where coalesce(status,'') = '' or status not in ('PLANNED','SHIPPED','CANCELLED');
