-- Add 5 more institutions (10 total)
INSERT INTO institutions (name, short_name, type, description, contact_email, contact_phone, address)
VALUES
  ('Oshana Provident Fund', 'OPF2', 'PENSION_FUND', 'Fictional demo provident fund for Oshana region.', 'claims@oshanaprovident.demo', '+264 65 222 1006', '45 Oshakati Road, Oshakati, Namibia'),
  ('Desert Life Assurance', 'DLA', 'LIFE_INSURANCE', 'Fictional demo life assurance company.', 'info@desertlife.demo', '+264 61 222 1007', '89 Independence Avenue, Windhoek, Namibia'),
  ('Coastal Benefits Society', 'CBS', 'EMPLOYEE_BENEFIT', 'Fictional demo employee benefits society for coastal regions.', 'support@coastalbenefits.demo', '+264 64 222 1008', '23 Strand Street, Swakopmund, Namibia'),
  ('Kavango Savings Fund', 'KSF', 'PENSION_FUND', 'Fictional demo savings fund serving Kavango regions.', 'help@kavangosavings.demo', '+264 66 222 1009', '78 Rundu Main Road, Rundu, Namibia'),
  ('Highveld Insurance Group', 'HIG', 'LIFE_INSURANCE', 'Fictional demo insurance group.', 'claims@highveldinsurance.demo', '+264 61 222 1010', '12 Sam Nujoma Drive, Windhoek, Namibia')
ON CONFLICT DO NOTHING;

-- Add 4 more benefit types (10 total)
INSERT INTO benefit_types (name, description, category)
VALUES
  ('Disability Benefit', 'Benefits payable in case of disability.', 'DISABILITY'),
  ('Medical Aid Benefit', 'Medical aid and health-related benefits.', 'MEDICAL'),
  ('Retrenchment Benefit', 'Benefits payable upon retrenchment.', 'EMPLOYEE_BENEFIT'),
  ('Spouse Benefit', 'Benefits payable to surviving spouse.', 'LIFE_INSURANCE')
ON CONFLICT DO NOTHING;
