-- Older audit rows may contain full media payloads from before redaction was
-- enforced. Shrink them so the audit table and API stay responsive.
UPDATE audit_log
SET details = left(details, 2000) || '… (dipotong oleh migration 010)'
WHERE length(details) > 2000;
