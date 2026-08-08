-- The New Beauty Issue contestant campaign workspace.
-- Keeps the accepted cohort focused, gives contestants a safe publish flow,
-- and gives staff one operational record per contestant.

alter table public.pgws_contestants
  add column if not exists instagram_url text,
  add column if not exists profile_published_at timestamptz;

create table if not exists public.pgws_contestant_operations (
  contestant_id uuid primary key references public.pgws_contestants(id) on delete cascade,
  training_registered boolean not null default false,
  training_attended boolean not null default false,
  training_participation_complete boolean not null default false,
  service_complete boolean not null default false,
  instagram_video_posted boolean not null default false,
  announcement_graphic_sent boolean not null default false,
  voting_graphic_sent boolean not null default false,
  recommendation_letter_ready boolean not null default false,
  verified_service_hours numeric(6,2) not null default 0 check (verified_service_hours between 0 and 500),
  internal_notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.pgws_contestant_operations enable row level security;
grant select, insert, update on public.pgws_contestant_operations to authenticated;

drop policy if exists "contestant operations staff read" on public.pgws_contestant_operations;
create policy "contestant operations staff read" on public.pgws_contestant_operations
for select using (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));

drop policy if exists "contestant operations admin manage" on public.pgws_contestant_operations;
create policy "contestant operations admin manage" on public.pgws_contestant_operations
for all using (public.pgws_has_role(array['competition_admin','super_admin']))
with check (public.pgws_has_role(array['competition_admin','super_admin']));

insert into public.pgws_contestant_operations(contestant_id)
select id from public.pgws_contestants
on conflict(contestant_id) do nothing;

create or replace function public.pgws_save_campaign_draft(
  p_public_name text,
  p_biography text,
  p_scripture text,
  p_platform text,
  p_headshot_public_path text default null,
  p_campaign_video_url text default null,
  p_instagram_url text default null
) returns public.pgws_contestants
language plpgsql security definer set search_path=public as $$
declare result public.pgws_contestants; caller uuid:=auth.uid();
begin
  if caller is null then raise exception 'Please sign in again.'; end if;
  if char_length(trim(coalesce(p_public_name,'')))<2 then raise exception 'Enter the public name you want supporters to see.'; end if;
  update public.pgws_contestants
  set public_name=trim(p_public_name),
      biography=nullif(trim(coalesce(p_biography,'')),''),
      scripture=nullif(trim(coalesce(p_scripture,'')),''),
      platform=nullif(trim(coalesce(p_platform,'')),''),
      headshot_public_path=coalesce(nullif(trim(coalesce(p_headshot_public_path,'')),''),headshot_public_path),
      campaign_video_url=nullif(trim(coalesce(p_campaign_video_url,'')),''),
      instagram_url=nullif(trim(coalesce(p_instagram_url,'')),''),
      public_profile_status=case when public_profile_status='archived' then 'archived' else 'draft' end,
      updated_at=now()
  where user_id=caller
    and exists(select 1 from public.pgws_applications a where a.id=pgws_contestants.application_id and a.status='accepted')
  returning * into result;
  if result.id is null then raise exception 'An active accepted-contestant profile is required.'; end if;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
  values(caller,'campaign_profile_saved','contestant',result.id::text,jsonb_build_object('status',result.public_profile_status),'Contestant saved a campaign profile draft.');
  return result;
end $$;

create or replace function public.pgws_publish_campaign_profile(
  p_public_name text,
  p_biography text,
  p_scripture text,
  p_platform text,
  p_headshot_public_path text,
  p_campaign_video_url text,
  p_instagram_url text
) returns public.pgws_contestants
language plpgsql security definer set search_path=public as $$
declare result public.pgws_contestants; caller uuid:=auth.uid();
begin
  if caller is null then raise exception 'Please sign in again.'; end if;
  if char_length(trim(coalesce(p_public_name,'')))<2 then raise exception 'Add your public name before publishing.'; end if;
  if char_length(trim(coalesce(p_biography,'')))<40 then raise exception 'Your public biography must be at least 40 characters.'; end if;
  if char_length(trim(coalesce(p_platform,'')))<40 then raise exception 'Explain your service and advocacy platform in at least 40 characters.'; end if;
  if char_length(trim(coalesce(p_scripture,'')))<2 then raise exception 'Add your signature scripture before publishing.'; end if;
  if nullif(trim(coalesce(p_headshot_public_path,'')),'') is null then raise exception 'Upload your official headshot before publishing.'; end if;
  if coalesce(p_campaign_video_url,'') !~* '^https?://' then raise exception 'Paste a complete campaign video link beginning with http:// or https://.'; end if;
  if coalesce(p_instagram_url,'') !~* '^https?://' then raise exception 'Paste the complete Instagram post link before publishing.'; end if;
  update public.pgws_contestants
  set public_name=trim(p_public_name),biography=trim(p_biography),scripture=trim(p_scripture),platform=trim(p_platform),
      headshot_public_path=trim(p_headshot_public_path),campaign_video_url=trim(p_campaign_video_url),instagram_url=trim(p_instagram_url),
      public_profile_status='published',profile_published_at=now(),updated_at=now()
  where user_id=caller
    and exists(select 1 from public.pgws_applications a where a.id=pgws_contestants.application_id and a.status='accepted')
  returning * into result;
  if result.id is null then raise exception 'An active accepted-contestant profile is required.'; end if;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
  values(caller,'campaign_profile_published','contestant',result.id::text,jsonb_build_object('status','published','has_headshot',true,'has_video',true,'has_instagram_post',true),'Contestant published her completed campaign profile.');
  return result;
end $$;

create or replace function public.pgws_staff_update_contestant_operations(
  p_contestant_id uuid,
  p_updates jsonb,
  p_reason text
) returns public.pgws_contestant_operations
language plpgsql security definer set search_path=public as $$
declare result public.pgws_contestant_operations; caller uuid:=auth.uid();
begin
  if not public.pgws_has_role(array['competition_admin','super_admin']) then raise exception 'Competition administrator access required.'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'A short update reason is required.'; end if;
  insert into public.pgws_contestant_operations(contestant_id) values(p_contestant_id) on conflict(contestant_id) do nothing;
  update public.pgws_contestant_operations set
    training_registered=coalesce((p_updates->>'training_registered')::boolean,training_registered),
    training_attended=coalesce((p_updates->>'training_attended')::boolean,training_attended),
    training_participation_complete=coalesce((p_updates->>'training_participation_complete')::boolean,training_participation_complete),
    service_complete=coalesce((p_updates->>'service_complete')::boolean,service_complete),
    instagram_video_posted=coalesce((p_updates->>'instagram_video_posted')::boolean,instagram_video_posted),
    announcement_graphic_sent=coalesce((p_updates->>'announcement_graphic_sent')::boolean,announcement_graphic_sent),
    voting_graphic_sent=coalesce((p_updates->>'voting_graphic_sent')::boolean,voting_graphic_sent),
    recommendation_letter_ready=coalesce((p_updates->>'recommendation_letter_ready')::boolean,recommendation_letter_ready),
    verified_service_hours=coalesce((p_updates->>'verified_service_hours')::numeric,verified_service_hours),
    internal_notes=case when p_updates ? 'internal_notes' then nullif(trim(p_updates->>'internal_notes'),'') else internal_notes end,
    updated_by=caller,updated_at=now()
  where contestant_id=p_contestant_id returning * into result;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
  values(caller,'contestant_operations_updated','contestant',p_contestant_id::text,p_updates,trim(p_reason));
  return result;
end $$;

create or replace function public.pgws_staff_save_performance_score(
  p_contestant_id uuid,
  p_category text,
  p_points numeric,
  p_reason text
) returns public.pgws_performance_scores
language plpgsql security definer set search_path=public as $$
declare result public.pgws_performance_scores; caller uuid:=auth.uid(); allowed_max numeric;
begin
  if not public.pgws_has_role(array['reviewer','competition_admin','super_admin']) then raise exception 'Authorized scoring access required.'; end if;
  allowed_max:=case p_category
    when 'official_campaign_video' then 40
    when 'application_quality' then 10
    when 'training_attendance' then 10
    when 'training_participation' then 15
    when 'service_advocacy' then 10
    when 'portal_compliance' then 5
    when 'campaign_professionalism' then 10
    else null end;
  if allowed_max is null then raise exception 'Choose a valid rubric category.'; end if;
  if p_points<0 or p_points>allowed_max then raise exception 'Score must be between 0 and the category maximum.'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'Document a scoring reason.'; end if;
  insert into public.pgws_performance_scores(contestant_id,category,points,max_points,entered_by,correction_reason)
  values(p_contestant_id,p_category,p_points,allowed_max,caller,trim(p_reason))
  on conflict(contestant_id,category) do update set points=excluded.points,max_points=excluded.max_points,entered_by=caller,correction_reason=trim(p_reason),updated_at=now()
  returning * into result;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason)
  values(caller,'performance_score_saved','contestant',p_contestant_id::text,jsonb_build_object('category',p_category,'points',p_points,'max_points',allowed_max),trim(p_reason));
  return result;
end $$;

grant execute on function public.pgws_save_campaign_draft(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.pgws_publish_campaign_profile(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.pgws_staff_update_contestant_operations(uuid,jsonb,text) to authenticated;
grant execute on function public.pgws_staff_save_performance_score(uuid,text,numeric,text) to authenticated;

-- Accepted applicants are the active cohort. If staff changes a decision later,
-- preserve the record and audit history but remove it from public/active use.
update public.pgws_contestants c set public_profile_status='archived',updated_at=now()
where not exists(select 1 from public.pgws_applications a where a.id=c.application_id and a.status='accepted');
