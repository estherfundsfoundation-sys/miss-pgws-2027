-- Working staff review actions, audited status decisions, contestant profiles,
-- and approved public campaign media.

create or replace function public.pgws_staff_update_application_status(
  p_application_id uuid,
  p_status public.pgws_application_status,
  p_reason text
) returns public.pgws_applications
language plpgsql security definer set search_path=public as $$
declare prior public.pgws_applications; updated public.pgws_applications; caller uuid:=auth.uid();
begin
  if not public.pgws_has_role(array['competition_admin','super_admin']) then raise exception 'Competition administrator access required.'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'A reason of at least 5 characters is required.'; end if;
  select * into prior from public.pgws_applications where id=p_application_id for update;
  if prior.id is null then raise exception 'Application not found.'; end if;
  update public.pgws_applications set status=p_status,updated_at=now() where id=p_application_id returning * into updated;
  insert into public.pgws_status_history(application_id,from_status,to_status,reason,changed_by) values(p_application_id,prior.status::text,p_status::text,trim(p_reason),caller);
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,old_value,new_value,reason)
  values(caller,'application_status_changed','application',p_application_id::text,jsonb_build_object('status',prior.status),jsonb_build_object('status',p_status),trim(p_reason));
  if p_status='accepted' then
    insert into public.pgws_contestants(application_id,user_id,public_slug,public_name,college,biography,scripture,platform)
    values(prior.id,prior.user_id,'contestant-'||left(prior.user_id::text,8),coalesce(prior.answers->>'preferred_name',prior.answers->>'full_legal_name','Accepted contestant'),coalesce(prior.answers->>'college_university',prior.answers->>'college'),coalesce(prior.answers->>'biography',prior.answers->>'short_biography'),coalesce(prior.answers->>'signature_scripture',prior.answers->>'scripture'),coalesce(prior.answers->>'platform',prior.answers->>'advocacy_platform'))
    on conflict(application_id) do update set public_name=coalesce(excluded.public_name,pgws_contestants.public_name),college=coalesce(excluded.college,pgws_contestants.college),biography=coalesce(excluded.biography,pgws_contestants.biography),scripture=coalesce(excluded.scripture,pgws_contestants.scripture),platform=coalesce(excluded.platform,pgws_contestants.platform),updated_at=now();
  end if;
  return updated;
end $$;

create or replace function public.pgws_staff_add_note(p_application_id uuid,p_body text,p_visibility text default 'competition_admin') returns uuid
language plpgsql security definer set search_path=public as $$
declare note_id uuid; caller uuid:=auth.uid();
begin
  if not public.pgws_has_role(array['reviewer','competition_admin','super_admin']) then raise exception 'Staff access required.'; end if;
  if char_length(trim(coalesce(p_body,'')))<5 then raise exception 'A note of at least 5 characters is required.'; end if;
  if p_visibility not in ('review_team','competition_admin','super_admin') then raise exception 'Invalid note visibility.'; end if;
  insert into public.pgws_private_notes(application_id,author_id,body,visibility) values(p_application_id,caller,trim(p_body),p_visibility) returning id into note_id;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason) values(caller,'private_note_added','application',p_application_id::text,jsonb_build_object('note_id',note_id,'visibility',p_visibility),'Staff documented a private application note.');
  return note_id;
end $$;

create or replace function public.pgws_staff_request_correction(p_application_id uuid,p_message text,p_fields jsonb default '[]'::jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare request_id uuid; target_user uuid; caller uuid:=auth.uid();
begin
  if not public.pgws_has_role(array['competition_admin','super_admin']) then raise exception 'Competition administrator access required.'; end if;
  if char_length(trim(coalesce(p_message,'')))<10 then raise exception 'Explain the correction in at least 10 characters.'; end if;
  select user_id into target_user from public.pgws_applications where id=p_application_id;
  insert into public.pgws_correction_requests(application_id,user_id,field_name,current_value,requested_value,reason,status)
  values(p_application_id,target_user,'staff_requested_fields',null,coalesce(p_fields,'[]'::jsonb)::text,trim(p_message),'pending') returning id into request_id;
  perform public.pgws_staff_update_application_status(p_application_id,'correction_requested',trim(p_message));
  return request_id;
end $$;

create or replace function public.pgws_staff_save_review(p_application_id uuid,p_scores jsonb,p_recommendation text,p_reason text) returns uuid
language plpgsql security definer set search_path=public as $$
declare review_id uuid; caller uuid:=auth.uid();
begin
  if not public.pgws_has_role(array['reviewer','competition_admin','super_admin']) then raise exception 'Reviewer access required.'; end if;
  if p_recommendation not in ('accept','waitlist','decline','needs_correction') then raise exception 'Choose a valid recommendation.'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'A review reason is required.'; end if;
  insert into public.pgws_reviews(application_id,reviewer_id,rubric_version,scores,recommendation,submitted_at)
  values(p_application_id,caller,'2027-v1',coalesce(p_scores,'{}'::jsonb),p_recommendation,now())
  on conflict(application_id,reviewer_id) do update set scores=excluded.scores,recommendation=excluded.recommendation,submitted_at=now(),updated_at=now() returning id into review_id;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason) values(caller,'review_submitted','application',p_application_id::text,jsonb_build_object('review_id',review_id,'recommendation',p_recommendation,'scores',p_scores),trim(p_reason));
  return review_id;
end $$;

drop function if exists public.pgws_save_contestant_profile(text,text,text,text);
create or replace function public.pgws_save_contestant_profile(p_public_name text,p_biography text,p_scripture text,p_platform text,p_headshot_public_path text default null,p_campaign_video_url text default null) returns public.pgws_contestants
language plpgsql security definer set search_path=public as $$
declare result public.pgws_contestants; caller uuid:=auth.uid();
begin
  if char_length(trim(coalesce(p_public_name,'')))<2 then raise exception 'Enter the public name you want donors to see.'; end if;
  if char_length(trim(coalesce(p_biography,'')))<40 then raise exception 'Your public biography must be at least 40 characters.'; end if;
  update public.pgws_contestants set public_name=trim(p_public_name),biography=trim(p_biography),scripture=trim(p_scripture),platform=trim(p_platform),headshot_public_path=coalesce(nullif(trim(p_headshot_public_path),''),headshot_public_path),campaign_video_url=coalesce(nullif(trim(p_campaign_video_url),''),campaign_video_url),public_profile_status='review',updated_at=now() where user_id=caller returning * into result;
  if result.id is null then raise exception 'An accepted contestant profile is required.'; end if;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,new_value,reason) values(caller,'contestant_profile_submitted','contestant',result.id::text,jsonb_build_object('status','review','has_headshot',result.headshot_public_path is not null,'has_video',result.campaign_video_url is not null),'Contestant submitted public campaign profile for staff review.');
  return result;
end $$;

create or replace function public.pgws_staff_publish_profile(p_contestant_id uuid,p_publish boolean,p_reason text) returns public.pgws_contestants
language plpgsql security definer set search_path=public as $$
declare prior public.pgws_contestants; result public.pgws_contestants; caller uuid:=auth.uid();
begin
  if not public.pgws_has_role(array['competition_admin','super_admin']) then raise exception 'Competition administrator access required.'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'A publication reason is required.'; end if;
  select * into prior from public.pgws_contestants where id=p_contestant_id for update;
  update public.pgws_contestants set public_profile_status=case when p_publish then 'published' else 'hidden' end,updated_at=now() where id=p_contestant_id returning * into result;
  insert into public.pgws_audit_log(actor_id,action,entity_type,entity_id,old_value,new_value,reason) values(caller,case when p_publish then 'contestant_profile_published' else 'contestant_profile_hidden' end,'contestant',p_contestant_id::text,jsonb_build_object('status',prior.public_profile_status),jsonb_build_object('status',result.public_profile_status),trim(p_reason));
  return result;
end $$;

grant execute on function public.pgws_staff_update_application_status(uuid,public.pgws_application_status,text) to authenticated;
grant execute on function public.pgws_staff_add_note(uuid,text,text) to authenticated;
grant execute on function public.pgws_staff_request_correction(uuid,text,jsonb) to authenticated;
grant execute on function public.pgws_staff_save_review(uuid,jsonb,text,text) to authenticated;
grant execute on function public.pgws_save_contestant_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.pgws_staff_publish_profile(uuid,boolean,text) to authenticated;

update storage.buckets set file_size_limit=262144000,allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'] where id='pgws-public';
drop policy if exists "public content contestant upload" on storage.objects;
create policy "public content contestant upload" on storage.objects for insert to authenticated with check (
  bucket_id='pgws-public' and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.pgws_contestants c where c.user_id=auth.uid())
);
drop policy if exists "public content contestant update" on storage.objects;
create policy "public content contestant update" on storage.objects for update to authenticated using (
  bucket_id='pgws-public' and (storage.foldername(name))[1]=auth.uid()::text
) with check (bucket_id='pgws-public' and (storage.foldername(name))[1]=auth.uid()::text);
