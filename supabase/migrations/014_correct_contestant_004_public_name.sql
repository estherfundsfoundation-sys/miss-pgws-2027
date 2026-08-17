-- Correct the duplicated surname reported by contestant #004.
update public.pgws_contestants
set public_name = 'Gemima Dernier',
    updated_at = now()
where contestant_number = 4
  and public_name is distinct from 'Gemima Dernier';
