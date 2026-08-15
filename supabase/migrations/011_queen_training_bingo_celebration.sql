-- Queen Training Bingo Celebration (migration 011).
-- Contestants earn a separate five-point engagement bonus for a completed upload.
-- The bonus is displayed separately from the official 100-point performance rubric.
-- Starbucks winners are drawn by authorized staff with an auditable deterministic draw.

create table if not exists public.pgws_bingo_submissions (
  id uuid primary key default gen_random_uuid(),
  contestant_id uuid not null unique references public.pgws_contestants(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  object_path text not null,
  original_name text not null,
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  byte_size bigint not null check (byte_size between 1 and 15728640),
  integrity_confirmed boolean not null check (integrity_confirmed=true),
  status text not null default 'submitted' check (status in ('submitted','winner','ineligible')),
  bonus_points smallint not null default 5 check (bonus_points between 0 and 5),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pgws_bingo_draws (
  id uuid primary key default gen_random_uuid(),
  eligible_count integer not null check (eligible_count >= 1),
  winner_count integer not null check (winner_count between 1 and 20),
  reason text not null,
  drawn_by uuid not null references auth.users(id),
  drawn_at timestamptz not null default now()
);

create table if not exists public.pgws_bingo_draw_winners (
  draw_id uuid not null references public.pgws_bingo_draws(id) on delete cascade,
  submission_id uuid not null unique references public.pgws_bingo_submissions(id) on delete cascade,
  contestant_id uuid not null unique references public.pgws_contestants(id) on delete cascade,
  winner_order integer not null check (winner_order between 1 and 20),
  created_at timestamptz not null default now(),
  primary key(draw_id, submission_id),
  unique(draw_id, winner_order)
);

alter table public.pgws_bingo_submissions enable row level security;
alter table public.pgws_bingo_draws enable row level security;
alter table public.pgws_bingo_draw_winners enable row level security;

grant select on public.pgws_bingo_submissions to authenticated;
grant select on public.pgws_bingo_draws to authenticated;
grant select on public.pgws_bingo_draw_winners to authenticated;

drop policy if exists "contestants read own bingo submission" on public.pgws_bingo_submissions;
create policy "contestants read own bingo submission" on public.pgws_bingo_submissions
for select using (user_id=auth.uid() or public.pgws_has_role(array['reviewer','competition_admin','super_admin']));

drop policy if exists "bingo draws staff read" on public.pgws_bingo_draws;
create policy "bingo draws staff read" on public.pgws_bingo_draws
for select using (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));

drop policy if exists "bingo winners staff read" on public.pgws_bingo_draw_winners;
create policy "bingo winners staff read" on public.pgws_bingo_draw_winners
for select using (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));

create or replace function public.pgws_submit_bingo_sheet(
  p_object_path text,
  p_original_name text,
  p_content_type text,
  p_byte_size bigint,
  p_integrity_confirmed boolean
) returns public.pgws_bingo_submissions
language plpgsql security definer set search_path=public as $$
declare
  caller uuid:=auth.uid();
  contestant public.pgws_contestants;
  result public.pgws_bingo_submissions;
begin
  if caller is null then raise exception 'Please sign in again.'; end if;
  select c.* into contestant
  from public.pgws_contestants c
  join public.pgws_applications a on a.id=c.application_id
  where c.user_id=caller and a.status='accepted'
  limit 1;
  if contestant.id is null then raise exception 'An active accepted-contestant record is required.'; end if;
  if p_integrity_confirmed is not true then raise exception 'Confirm that this is your completed Bingo sheet.'; end if;
  if p_content_type not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'Upload a JPG, PNG, WebP, or PDF Bingo sheet.'; end if;
  if p_byte_size<1 or p_byte_size>15728640 then raise exception 'Your Bingo file must be 15 MB or smaller.'; end if;
  if position(caller::text || '/bingo/' || contestant.id::text || '/' in p_object_path)<>1 then raise exception 'The Bingo upload path is not owned by this contestant.'; end if;
  if char_length(trim(coalesce(p_original_name,'')))<1 then raise exception 'The uploaded file name is missing.'; end if;

  insert into public.pgws_bingo_submissions(
    contestant_id,user_id,object_path,original_name,content_type,byte_size,integrity_confirmed,status,bonus_points
  ) values(
    contestant.id,caller,trim(p_object_path),trim(p_original_name),p_content_type,p_byte_size,true,'submitted',5
  )
  on conflict(contestant_id) do update set
    object_path=excluded.object_path,
    original_name=excluded.original_name,
    content_type=excluded.content_type,
    byte_size=excluded.byte_size,
    integrity_confirmed=true,
    status=case when pgws_bingo_submissions.status='winner' then 'winner' else 'submitted' end,
    bonus_points=5,
    submitted_at=now(),
    updated_at=now()
  returning * into result;

  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
  values(caller,'bingo_sheet_submitted','contestant',contestant.id::text,
    jsonb_build_object('submission_id',result.id,'bonus_points',result.bonus_points,'content_type',result.content_type,'byte_size',result.byte_size),
    'Contestant uploaded a completed Queen Training Bingo sheet and received the engagement bonus.');
  return result;
end $$;

create or replace function public.pgws_staff_draw_bingo_winners(
  p_winner_count integer,
  p_reason text
) returns setof public.pgws_bingo_submissions
language plpgsql security definer set search_path=public as $$
declare
  caller uuid:=auth.uid();
  v_draw_id uuid;
  eligible integer;
begin
  if not public.pgws_has_role(array['competition_admin','super_admin']) then raise exception 'Competition administrator access required.'; end if;
  if p_winner_count<1 or p_winner_count>20 then raise exception 'Choose between 1 and 20 winners.'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'Add a short reason for the gift-card drawing.'; end if;

  select count(*) into eligible
  from public.pgws_bingo_submissions s
  where s.status='submitted'
    and not exists(select 1 from public.pgws_bingo_draw_winners w where w.submission_id=s.id);
  if eligible<p_winner_count then raise exception 'Only % eligible undrawn Bingo submissions are available.', eligible; end if;

  insert into public.pgws_bingo_draws(eligible_count,winner_count,reason,drawn_by)
  values(eligible,p_winner_count,trim(p_reason),caller)
  returning id into v_draw_id;

  insert into public.pgws_bingo_draw_winners(draw_id,submission_id,contestant_id,winner_order)
  select v_draw_id, ranked.id, ranked.contestant_id, ranked.winner_order
  from (
    select s.id,s.contestant_id,row_number() over(order by digest(s.id::text || v_draw_id::text,'sha256'))::integer as winner_order
    from public.pgws_bingo_submissions s
    where s.status='submitted'
      and not exists(select 1 from public.pgws_bingo_draw_winners w where w.submission_id=s.id)
    order by digest(s.id::text || v_draw_id::text,'sha256')
    limit p_winner_count
  ) ranked;

  update public.pgws_bingo_submissions s set status='winner',updated_at=now()
  where exists(select 1 from public.pgws_bingo_draw_winners w where w.draw_id=v_draw_id and w.submission_id=s.id);

  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
  values(caller,'bingo_gift_card_draw_completed','bingo_draw',v_draw_id::text,
    jsonb_build_object('eligible_count',eligible,'winner_count',p_winner_count),trim(p_reason));

  return query
  select s.* from public.pgws_bingo_submissions s
  join public.pgws_bingo_draw_winners w on w.submission_id=s.id
  where w.draw_id=v_draw_id
  order by w.winner_order;
end $$;

grant execute on function public.pgws_submit_bingo_sheet(text,text,text,bigint,boolean) to authenticated;
grant execute on function public.pgws_staff_draw_bingo_winners(integer,text) to authenticated;
