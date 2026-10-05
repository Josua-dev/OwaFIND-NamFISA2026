-- Helper function to get random element from a text array
CREATE OR REPLACE FUNCTION random_element(arr text[])
RETURNS text
LANGUAGE sql
AS $$
  SELECT arr[(random() * array_length(arr, 1) + 1)::int];
$$;

-- 5 guaranteed exact-match records for demo beneficiary (Thabo Nghimtina, national_id 90010180001)
-- Score = 1.0 GREEN: national_id(0.40)+dob(0.15)+name(0.15)+phone(0.10)+email(0.05)+employer(0.15)
INSERT INTO benefit_records (institution_id, benefit_type_id, holder_name, holder_national_id, holder_date_of_birth, holder_phone, holder_email, holder_employer, holder_employee_number, reference_number, estimated_value_min, estimated_value_max, currency, status)
SELECT
  i.id, bt.id, 'Thabo Nghimtina', '90010180001', '1990-01-01',
  '+264 81 234 5678', 'beneficiary@demo.owafind.local',
  'Namdeb Diamond Corporation', 'NDC-2009-0156',
  'SEED-GUARANTEED-' || i.short_name || '-' || bt.name,
  (random() * 100000 + 50000)::numeric,
  (random() * 100000 + 150000)::numeric, 'NAD', 'UNCLAIMED'
FROM institutions i CROSS JOIN benefit_types bt
WHERE i.short_name IN ('OPF','NRS','NSL','NEF','NBA')
  AND bt.name IN ('Pension Benefit','Retirement Fund Benefit','Life Insurance Benefit','Employee Benefit','Death Benefit')
ORDER BY i.short_name, bt.name LIMIT 5;

-- 5 near-match records (same national_id + dob + name + employer, different phone, no email)
-- Score ~0.85 GREEN
INSERT INTO benefit_records (institution_id, benefit_type_id, holder_name, holder_national_id, holder_date_of_birth, holder_phone, holder_email, holder_employer, holder_employee_number, reference_number, estimated_value_min, estimated_value_max, currency, status)
SELECT
  i.id, bt.id, 'Thabo Nghimtina', '90010180001', '1990-01-01',
  '+264 81 999 8888', NULL, 'Namdeb Diamond Corporation', NULL,
  'SEED-NEAR-' || i.short_name || '-' || bt.name,
  (random() * 80000 + 30000)::numeric,
  (random() * 80000 + 110000)::numeric, 'NAD', 'UNCLAIMED'
FROM institutions i CROSS JOIN benefit_types bt
WHERE i.short_name IN ('OPF2','DLA','CBS','KSF','HIG')
  AND bt.name IN ('Pension Benefit','Retirement Fund Benefit','Life Insurance Benefit','Employee Benefit','Funeral Benefit')
ORDER BY i.short_name, bt.name LIMIT 5;

-- 5 partial-match records (same national_id only, different name/dob)
-- Score ~0.40 AMBER
INSERT INTO benefit_records (institution_id, benefit_type_id, holder_name, holder_national_id, holder_date_of_birth, holder_phone, holder_email, holder_employer, holder_employee_number, reference_number, estimated_value_min, estimated_value_max, currency, status)
SELECT
  i.id, bt.id, 'T Nghimtina', '90010180001', '1985-03-20',
  '+264 82 555 4444', NULL, 'Old Mutual Namibia', NULL,
  'SEED-PARTIAL-' || i.short_name || '-' || bt.name,
  (random() * 60000 + 20000)::numeric,
  (random() * 60000 + 80000)::numeric, 'NAD', 'UNCLAIMED'
FROM institutions i CROSS JOIN benefit_types bt
WHERE i.short_name IN ('OPF','NRS','NBA','OPF2','KSF')
  AND bt.name IN ('Pension Benefit','Retirement Fund Benefit','Disability Benefit','Funeral Benefit','Medical Aid Benefit')
ORDER BY i.short_name, bt.name LIMIT 5;
