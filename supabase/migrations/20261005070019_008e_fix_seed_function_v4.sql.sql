CREATE OR REPLACE FUNCTION seed_random_benefit_records(n int)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  names text[] := ARRAY[
    'Johannes Shilongo','Maria Nghipandwa','David Hamukwaya','Sarah Nangula',
    'Michael Amupadhi','Elizabeth Shetunyenga','Petrus Hango','Aina Kavari',
    'Simon Shixoleni','Ndapewa Iilonga','Ernest Nghimtina','Petrina Nashandi',
    'Absalom Iyambo','Beata Haingura','Filippus Shilongo','Gabi Nghifenwa',
    'Hafeni Tjingaete','Ina Mulonga','Jakob Hamukwaya','Kornelia Nambahu',
    'Lazarus Shixundeni','Martina Nghivale','Nashilongo Amutenya','Olavi Nghipangelwa',
    'Pendukeni Hamukwaya','Quintin Tjahahu','Rebecca Shanghwa','Salomo Nghivandja',
    'Tangeni Shilongo','Uakendisa Mwiya','Vemunu Tjingaete','Anna Nghipandwa',
    'Benjamin Hamukwaya','Cecilia Shilongo','Daniel Nghivale','Esther Nangula',
    'Frans Amupadhi','Gertrud Shetunyenga','Hilma Hango','Irmgard Kavari',
    'Josef Shixoleni','Klaudia Iilonga','Lukas Nghimtina','Margaret Nashandi',
    'Nathanael Iyambo','Ottilie Haingura','Paulus Shilongo','Rachel Nghifenwa',
    'Samuel Tjingaete','Teresia Mulonga','Ueutjera Hamukwaya','Victor Nambahu',
    'Willem Shixundeni','Yvonne Amutenya','Zacharias Nghipangelwa','Naemi Shilongo',
    'Frieda Nangula','Gideon Hamukwaya','Helena Nghivale'
  ];
  employers_arr text[] := ARRAY[
    'Ministry of Education','Namdeb Diamond Corporation','Old Mutual Namibia',
    'Ministry of Health','City of Windhoek','NamPower','NamWater',
    'Ministry of Finance','Road Authority','Nampost','Telecom Namibia',
    'MTC','Bank of Namibia','FNB Namibia','Standard Bank Namibia',
    'Ministry of Defence','Namibia Wildlife Resorts','TransNamib',
    'Namibia Breweries','GIPF','Sanlam Namibia','Alexander Forbes Namibia',
    'Ohlthaver & List','Salt Company Walvis Bay'
  ];
  email_prefixes text[] := ARRAY[
    'j.shilongo','m.nghipandwa','d.hamukwaya','s.nangula','m.amupadhi',
    'e.shetunyenga','p.hango','a.kavari','s.shixoleni','n.iilonga',
    'e.nghimtina','p.nashandi','a.iyambo','b.haingura','f.shilongo',
    'g.nghifenwa','h.tjingaete','i.mulonga','j.hamukwaya','k.nambahu'
  ];
  counter int := 0;
  r1 float; r2 float; r3 float; r4 float; r5 float;
  holder_name text;
  nat_id text;
  dob date;
  phone text;
  email text;
  employer text;
  emp_num text;
  ref_num text;
  inst_id uuid;
  bt_id uuid;
  status text;
  n_names int;
  n_emp int;
  n_email int;
  idx int;
BEGIN
  n_names := array_length(names, 1);
  n_emp := array_length(employers_arr, 1);
  n_email := array_length(email_prefixes, 1);

  WHILE counter < n LOOP
    counter := counter + 1;
    r1 := random(); r2 := random(); r3 := random(); r4 := random(); r5 := random();

    SELECT id INTO inst_id FROM institutions ORDER BY random() LIMIT 1;
    SELECT id INTO bt_id FROM benefit_types ORDER BY random() LIMIT 1;

    idx := LEAST(n_names, GREATEST(1, floor(r1 * n_names)::int + 1));
    holder_name := names[idx];

    nat_id := lpad((r1*99+1)::int::text,2,'0') || lpad((r2*12+1)::int::text,2,'0') || lpad((r3*31+1)::int::text,2,'0') || lpad((r4*9+1)::int::text,1,'0') || lpad((r5*9999+1)::int::text,4,'0');
    dob := DATE '1950-01-01' + (r1*20000)::int;
    phone := '+264 ' || lpad((r2*19+81)::int::text,2,'0') || ' ' || lpad((r3*899+100)::int::text,3,'0') || ' ' || lpad((r4*8999+1000)::int::text,4,'0');

    idx := LEAST(n_email, GREATEST(1, floor(r2 * n_email)::int + 1));
    email := CASE WHEN r1 < 0.65 THEN LOWER(SUBSTRING(email_prefixes[idx],1,20)) || '@demo.owafind.local' ELSE NULL END;

    idx := LEAST(n_emp, GREATEST(1, floor(r3 * n_emp)::int + 1));
    employer := employers_arr[idx];

    emp_num := CASE WHEN r2 < 0.55 THEN 'EMP-' || lpad((r3*9999+1)::int::text,4,'0') || '-' || (r4*20+2000)::int::text ELSE NULL END;
    ref_num := 'SEED-RND-' || lpad(counter::text, 6, '0');
    status := CASE WHEN r3 < 0.85 THEN 'UNCLAIMED' WHEN r3 < 0.94 THEN 'CLAIMED' ELSE 'UNDER_REVIEW' END;

    INSERT INTO benefit_records (
      institution_id, benefit_type_id, holder_name, holder_national_id,
      holder_date_of_birth, holder_phone, holder_email, holder_employer,
      holder_employee_number, reference_number, estimated_value_min,
      estimated_value_max, currency, status
    ) VALUES (
      inst_id, bt_id, holder_name, nat_id, dob, phone, email, employer,
      emp_num, ref_num,
      (r1*200000+10000)::numeric, (r2*200000+210000)::numeric, 'NAD', status
    );
  END LOOP;
END;
$$;
