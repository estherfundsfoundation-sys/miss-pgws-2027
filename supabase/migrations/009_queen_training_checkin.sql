-- Self-service Queen Training attendance check-in and official 10-point award.
create table if not exists public.pgws_queen_training_checkins (
  id uuid primary key default gen_random_uuid(),
  contestant_id uuid not null references public.pgws_contestants(id) on delete cascade,
  event_key text not null,
  checked_in_at timestamptz not null default now(),
  attendance_points numeric(6,2) not null default 10,
  source text not null default 'self_service',
  unique(contestant_id, event_key)
);
alter table public.pgws_queen_training_checkins enable row level security;
create or replace function public.pgws_record_queen_training_checkin(
  p_contestant_id uuid,
  p_event_key text default 'queen-training-2026'
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  contestant public.pgws_contestants;
  checkin public.pgws_queen_training_checkins;
  staff_user_id uuid;
  inserted boolean := false;
begin
  if p_event_key <> 'queen-training-2026' then
    raise exception 'Unknown Queen Training event.';
  end if;

  select c.* into contestant
  from public.pgws_contestants c
  join public.pgws_applications a on a.id=c.application_id
  where c.id=p_contestant_id and a.status='accepted';
  if contestant.id is null then raise exception 'Accepted contestant record not found.'; end if;

  insert into public.pgws_queen_training_checkins(contestant_id,event_key)
  values(contestant.id,p_event_key)
  on conflict(contestant_id,event_key) do nothing
  returning * into checkin;

  if checkin.id is not null then
    inserted := true;
  else
    select * into checkin from public.pgws_queen_training_checkins
    where contestant_id=contestant.id and event_key=p_event_key;
  end if;

  select r.user_id into staff_user_id
  from public.pgws_user_roles r
  where r.active=true and r.role in ('super_admin','competition_admin')
  order by case r.role when 'super_admin' then 1 else 2 end, r.created_at
  limit 1;
  if staff_user_id is null then raise exception 'Competition scoring administrator is not configured.'; end if;

  insert into public.pgws_performance_scores(contestant_id,category,points,max_points,entered_by,correction_reason)
  values(contestant.id,'queen_training_attendance_and_punctuality',10,10,staff_user_id,'Automatic Queen Training attendance check-in · August 15, 2026')
  on conflict(contestant_id,category) do update set
    points=greatest(pgws_performance_scores.points,excluded.points),
    max_points=10,
    updated_at=now();

  if inserted then
    insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
    values(staff_user_id,'queen_training_check_in','contestant',contestant.id::text,
      jsonb_build_object('event_key',p_event_key,'points',10,'checked_in_at',checkin.checked_in_at),
      'Contestant completed self-service Queen Training attendance verification.');
  end if;

  return jsonb_build_object(
    'already_checked_in',not inserted,
    'checked_in_at',checkin.checked_in_at,
    'name',coalesce(contestant.public_name,'Sister'),
    'points',10
  );
end;
$$;
revoke all on table public.pgws_queen_training_checkins from anon, authenticated;
revoke all on function public.pgws_record_queen_training_checkin(uuid,text) from public, anon, authenticated;
grant execute on function public.pgws_record_queen_training_checkin(uuid,text) to service_role;
