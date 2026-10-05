-- Generate 19,985 random synthetic benefit records using a PL/pgSQL function
-- This avoids LATERAL join issues with CTEs

CREATE OR REPLACE FUNCTION seed_random_benefit_records(n int)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  inst_ids uuid[] := ARRAY[
    'a82add65-7ff7-4964-b958-d911d0b79ffc',
    '7596c490-d494-4609-a17c-5cada5946cab',
    '6675abd9-a34c-4aac-b4fe-7893a1885bff',
    'cd7b46a9-c248-4f1a-9997-92787c448078',
    '82b1702c-8dd6-498c-aa72-f10ddd3fd94c',
    'b4f370ea-e2ee-4ca7-9206-a5d519a63a88',
    '57b82154-7a14-4c5d-962a-2aad31c56090',
    'e1912fd8-032e-4cc0-bbce-eff8f671e408',
    '7dbf1aa3-c11d-4ca5-b85f-23ea552fea0d',
    'f018951b-f4ec-4ba6-a47f-85d897526d15'
  ];
  bt_ids uuid[] := ARRAY[
    '079f0cd5-1390-43cb-a902-62968a874fa6',
    '8aaf8d4f-f6ae-435e-8433-7cfed62d166e',
    '6c9e13af-4f4f-425d-84d6-2330ada41659',
    '78b765b6-5dd2-4b49-bdbd-c57efe1a7ba8',
    '82f9536b-19e1-46e3-893a-44761d527878',
    '62faaaae-7314-4ff3-84da-d1b9083f7300',
    '35d1dbd6-a8aa-4d21-9659-a253d8c64dc0',
    'a7f5850e-84c1-4747-b272-a0a5349d7a5f',
    '1b52f7b4-2ce2-4369-99d3-d2ffc6d686df',
    '11502a39-90ce-42c0-97bc-4071eb45ec76'
  ];
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
  employers text[] := ARRAY[
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
  i int;
  r1 float; r2 float; r3 float; r4 float; r5 float;
  holder_name text;
  nat_id text;
  dob text;
  phone text;
  email text;
  employer text;
  emp_num text;
  ref_num text;
  inst_id uuid;
  bt_id uuid;
  status text;
  batch_size int := 1000;
  batch_count int;
BEGIN
  batch_count := n / batch_size;
  FOR batch_count IN 0..batch_count LOOP
    FOR i IN 1..LEAST(batch_size, n - batch_count * batch_size) LOOP
      r1 := random(); r2 := random(); r3 := random(); r4 := random(); r5 := random();
      holder_name := names[(r1 * array_length(names,1) + 1)::int];
      inst_id := inst_ids[(r2 * array_length(inst_ids,1) + 1)::int];
      bt_id := bt_ids[(r3 * array_length(bt_ids,1) + 1)::int];
      nat_id := lpad((r1*99+1)::int::text,2,'0') || lpad((r2*12+1)::int::text,2,'0') || lpad((r3*31+1)::int::text,2,'0') || lpad((r4*9+1)::int::text,1,'0') || lpad((r5*9999+1)::int::text,4,'0');
      dob := (DATE '1950-01-01' + (r1*20000)::int)::text;
      phone := '+264 ' || lpad((r2*19+81)::int::text,2,'0') || ' ' || lpad((r3*899+100)::int::text,3,'0') || ' ' || lpad((r4*8999+1000)::int::text,4,'0');
      email := CASE WHEN r1 < 0.65 THEN LOWER(SUBSTRING(email_prefixes[(r2*array_length(email_prefixes,1)+1)::int],1,20)) || '@demo.owafind.local' ELSE NULL END;
      employer := employers[(r3*array_length(employers,1)+1)::int];
      emp_num := CASE WHEN r2 < 0.55 THEN 'EMP-' || lpad((r3*9999+1)::int::text,4,'0') || '-' || (r4*20+2000)::int::text ELSE NULL END;
      ref_num := 'SEED-RND-' || lpad((batch_count * batch_size + i)::text, 6, '0');
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
    COMMIT;
  END LOOP;
END;
$$;
