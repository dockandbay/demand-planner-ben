# Live write 22-Oct-26: agent client accounts use their Fulfil agent codes

Ben approved in chat 22-Oct-26 ("Yes, update the 6"). Live project oolwklahstnvocaugryg, planner.clients ids 1, 5, 6, 8, 15, 16.

## Before (backup)
All six had the same visibility, set by migration 366 on 13-Oct-26:
`{"tag":"","modes":["company_email"],"emails":[],"channels":[],"companies":[]}`

| id | client | rep group fulfil_codes |
| --- | --- | --- |
| 1 | SHAUBEN | appelman |
| 5 | Agent - Harper Group | harpergroup, harpers |
| 6 | Agent - Ideco | ideco |
| 8 | Agent - Roadrunner | roadrunners |
| 15 | Agent - Patrickco | patrick |
| 16 | Agent - TJ | TJ |

## Change
visibility.modes = ["agent_code"], visibility.agent_codes = the rep group's fulfil_codes (lower case); other keys kept.

## Rollback
```sql
UPDATE planner.clients
SET visibility = '{"tag":"","modes":["company_email"],"emails":[],"channels":[],"companies":[]}'::jsonb,
    updated_by = 'rollback agent codes 22-Oct-26', updated_at = now()
WHERE id IN (1,5,6,8,15,16);
```

## Live Fulfil agent codes found (metafield agent_code on sale.sale, 145 orders)
appelman 71, ideco 20, harpergroup 18, tj 16, patrick 16, roadrunners 2, harpers 2. No code for the other 12 agents.
