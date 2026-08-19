-- Keep Queen Training attendance under the single canonical rubric key.
-- Older self-check-ins used queen_training_attendance_and_punctuality,
-- which caused duplicated totals after staff later used training_attendance.

insert into public.pgws_performance_scores (
  contestant_id,
  category,
  points,
  max_points,
  entered_by,
  correction_reason,
  created_at,
  updated_at
)
select
  legacy.contestant_id,
  'training_attendance',
  legacy.points,
  legacy.max_points,
  legacy.entered_by,
  'Normalized verified Queen Training attendance from legacy category.',
  legacy.created_at,
  now()
from public.pgws_performance_scores legacy
where legacy.category = 'queen_training_attendance_and_punctuality'
on conflict (contestant_id, category) do update
set points = greatest(public.pgws_performance_scores.points, excluded.points),
    max_points = greatest(public.pgws_performance_scores.max_points, excluded.max_points),
    correction_reason = 'Normalized verified Queen Training attendance from legacy category.',
    updated_at = now();

delete from public.pgws_performance_scores
where category = 'queen_training_attendance_and_punctuality';

create or replace function public.pgws_record_queen_training_checkin(
  p_contestant_id uuid,
  p_event_key text default 'queen-training-2026'
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  contestant public.pgws_contestants;
  checkin public.pgws_queen_training_checkins;
  staff_user_id uuid;
  inserted boolean := false;
begin
  if p_event_key <> 'queen-training-2026' then raise exception 'Unknown Queen Training event.'; end if;
  select c.* into contestant from public.pgws_contestants c join public.pgws_applications a on a.id=c.application_id where c.id=p_contestant_id and a.status='accepted';
  if contestant.id is null then raise exception 'Accepted contestant record not found.'; end if;
  insert into public.pgws_queen_training_checkins(contestant_id,event_key)
  values(contestant.id,p_event_key)
  on conflict(contestant_id,event_key) do nothing returning * into checkin;
  if checkin.id is not null then inserted := true;
  else select * into checkin from public.pgws_queen_training_checkins where contestant_id=contestant.id and event_key=p_event_key;
  end if;
  select r.user_id into staff_user_id from public.pgws_user_roles r where r.active=true and r.role in ('super_admin','competition_admin') order by case r.role when 'super_admin' then 1 else 2 end, r.granted_at limit 1;
  if staff_user_id is null then raise exception 'Competition scoring administrator is not configured.'; end if;
  insert into public.pgws_performance_scores(contestant_id,category,points,max_points,entered_by,correction_reason)
  values(contestant.id,'training_attendance',10,10,staff_user_id,'Automatic Queen Training attendance check-in - August 15, 2026')
  on conflict(contestant_id,category) do update set
    points=greatest(pgws_performance_scores.points,excluded.points),
    max_points=excluded.max_points,
    correction_reason=excluded.correction_reason,
    updated_at=now();
  if inserted then
    insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
    values(staff_user_id,'queen_training_check_in','contestant',contestant.id::text,jsonb_build_object('event_key',p_event_key,'points',10,'checked_in_at',checkin.checked_in_at),'Contestant completed self-service Queen Training attendance verification.');
  end if;
  return jsonb_build_object('already_checked_in',not inserted,'checked_in_at',checkin.checked_in_at,'name',coalesce(contestant.public_name,'Sister'),'points',10);
end;$$;

revoke all on function public.pgws_record_queen_training_checkin(uuid,text) from public, anon, authenticated;
grant execute on function public.pgws_record_queen_training_checkin(uuid,text) to service_role;
