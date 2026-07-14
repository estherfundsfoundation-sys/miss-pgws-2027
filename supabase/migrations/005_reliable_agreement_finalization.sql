-- Makes agreement signing retry-safe and repairs submitted applications that
-- were left at 95% after a partially completed signature attempt.

drop policy if exists "private uploads own update" on storage.objects;
create policy "private uploads own update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pgws-private'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pgws-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "initials own update" on public.pgws_agreement_initials;
create policy "initials own update"
on public.pgws_agreement_initials
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.pgws_finalize_agreement(
  p_application_id uuid,
  p_agreement_version_id uuid,
  p_initials jsonb,
  p_applicant_snapshot jsonb,
  p_acknowledgment_snapshot jsonb,
  p_signature_object_path text,
  p_signature_method text,
  p_user_agent text,
  p_immutable_record_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  signature_id uuid;
  initials_count integer;
begin
  if caller_id is null then
    raise exception 'Please sign in again before attaching the agreement.';
  end if;

  if not exists (
    select 1
    from public.pgws_applications a
    where a.id = p_application_id
      and a.user_id = caller_id
      and a.status not in ('withdrawn', 'archived')
  ) then
    raise exception 'The application does not belong to the signed-in applicant or cannot accept an agreement.';
  end if;

  if not exists (
    select 1
    from public.pgws_agreement_versions v
    where v.id = p_agreement_version_id and v.active = true
  ) then
    raise exception 'The current agreement version is unavailable. Please refresh and try again.';
  end if;

  if jsonb_typeof(p_initials) <> 'array' or jsonb_array_length(p_initials) <> 15 then
    raise exception 'All 15 required initials must be provided.';
  end if;

  select count(distinct item.section_number)
  into initials_count
  from jsonb_to_recordset(p_initials) as item(section_number integer, initials text)
  where item.section_number = any(array[2,3,7,9,10,12,14,16,17,19,20,26,29,30,33])
    and char_length(trim(item.initials)) between 2 and 4;

  if initials_count <> 15 then
    raise exception 'Every required section must contain valid initials.';
  end if;

  insert into public.pgws_agreement_initials (
    application_id, agreement_version_id, user_id, section_number, initials
  )
  select
    p_application_id,
    p_agreement_version_id,
    caller_id,
    item.section_number,
    upper(trim(item.initials))
  from jsonb_to_recordset(p_initials) as item(section_number integer, initials text)
  on conflict (application_id, agreement_version_id, section_number)
  do update set
    initials = excluded.initials,
    user_id = caller_id,
    initialed_at = now();

  if coalesce(jsonb_array_length(p_acknowledgment_snapshot->'items'), 0) <> 21
     or coalesce((p_acknowledgment_snapshot->>'accepted')::boolean, false) is not true then
    raise exception 'Complete all final acknowledgments before signing.';
  end if;

  if p_signature_method not in ('drawn', 'uploaded') then
    raise exception 'The signature method is invalid.';
  end if;

  if position(caller_id::text || '/' || p_application_id::text || '/' in p_signature_object_path) <> 1 then
    raise exception 'The signature file is not attached to this applicant record.';
  end if;

  select s.id
  into signature_id
  from public.pgws_agreement_signatures s
  where s.application_id = p_application_id
    and s.agreement_version_id = p_agreement_version_id
    and s.user_id = caller_id;

  if signature_id is null then
    insert into public.pgws_agreement_signatures (
      application_id, agreement_version_id, user_id,
      applicant_snapshot, acknowledgment_snapshot,
      signature_object_path, signature_method, final_checkbox,
      user_agent, immutable_record_hash
    ) values (
      p_application_id, p_agreement_version_id, caller_id,
      p_applicant_snapshot, p_acknowledgment_snapshot,
      p_signature_object_path, p_signature_method, true,
      p_user_agent, p_immutable_record_hash
    ) returning id into signature_id;
  end if;

  update public.pgws_applications
  set
    agreement_status = 'signed',
    completion_percent = case
      when status in ('submitted', 'under_review', 'waitlisted', 'accepted', 'declined')
        then 100
      else completion_percent
    end,
    updated_at = now()
  where id = p_application_id and user_id = caller_id;

  insert into public.pgws_audit_log (
    actor_id, action, entity_type, entity_id, new_value, reason
  ) values (
    caller_id,
    'agreement_attached',
    'application',
    p_application_id::text,
    jsonb_build_object(
      'agreement_version_id', p_agreement_version_id,
      'signature_id', signature_id,
      'agreement_status', 'signed'
    ),
    'Applicant completed and attached the current agreement.'
  );

  return signature_id;
end;
$$;

revoke all on function public.pgws_finalize_agreement(uuid,uuid,jsonb,jsonb,jsonb,text,text,text,text) from public;
grant execute on function public.pgws_finalize_agreement(uuid,uuid,jsonb,jsonb,jsonb,text,text,text,text) to authenticated;

-- Compatibility path for the agreement page that was already deployed before
-- pgws_finalize_agreement was introduced. This lets submitted 95% records
-- attach their agreement without changing or reopening their responses.
create or replace function public.pgws_sign_agreement(
  p_application_id uuid,
  p_agreement_version_id uuid,
  p_applicant_snapshot jsonb,
  p_acknowledgment_snapshot jsonb,
  p_signature_object_path text,
  p_signature_method text,
  p_user_agent text,
  p_immutable_record_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  signature_id uuid;
  required_initial_count integer;
begin
  if caller_id is null then
    raise exception 'Please sign in again before attaching the agreement.';
  end if;

  if not exists (
    select 1 from public.pgws_applications a
    where a.id = p_application_id
      and a.user_id = caller_id
      and a.status not in ('withdrawn', 'archived')
  ) then
    raise exception 'The application does not belong to the signed-in applicant or cannot accept an agreement.';
  end if;

  if not exists (
    select 1 from public.pgws_agreement_versions v
    where v.id = p_agreement_version_id and v.active = true
  ) then
    raise exception 'The current agreement version is unavailable. Please refresh and try again.';
  end if;

  select count(*) into required_initial_count
  from public.pgws_agreement_initials i
  where i.application_id = p_application_id
    and i.user_id = caller_id
    and i.agreement_version_id = p_agreement_version_id
    and i.section_number = any(array[2,3,7,9,10,12,14,16,17,19,20,26,29,30,33]);

  if required_initial_count <> 15 then
    raise exception 'All 15 required initials must be saved before signing.';
  end if;

  if coalesce(jsonb_array_length(p_acknowledgment_snapshot->'items'), 0) <> 21
     or coalesce((p_acknowledgment_snapshot->>'accepted')::boolean, false) is not true then
    raise exception 'Complete all final acknowledgments before signing.';
  end if;

  if p_signature_method not in ('drawn', 'uploaded') then
    raise exception 'The signature method is invalid.';
  end if;

  if position(caller_id::text || '/' || p_application_id::text || '/' in p_signature_object_path) <> 1 then
    raise exception 'The signature file is not attached to this applicant record.';
  end if;

  select s.id into signature_id
  from public.pgws_agreement_signatures s
  where s.application_id = p_application_id
    and s.agreement_version_id = p_agreement_version_id
    and s.user_id = caller_id;

  if signature_id is null then
    insert into public.pgws_agreement_signatures (
      application_id, agreement_version_id, user_id,
      applicant_snapshot, acknowledgment_snapshot,
      signature_object_path, signature_method, final_checkbox,
      user_agent, immutable_record_hash
    ) values (
      p_application_id, p_agreement_version_id, caller_id,
      p_applicant_snapshot, p_acknowledgment_snapshot,
      p_signature_object_path, p_signature_method, true,
      p_user_agent, p_immutable_record_hash
    ) returning id into signature_id;
  end if;

  update public.pgws_applications
  set
    agreement_status = 'signed',
    completion_percent = case
      when status in ('submitted', 'under_review', 'waitlisted', 'accepted', 'declined')
        then 100
      else completion_percent
    end,
    updated_at = now()
  where id = p_application_id and user_id = caller_id;

  return signature_id;
end;
$$;

revoke all on function public.pgws_sign_agreement(uuid,uuid,jsonb,jsonb,text,text,text,text) from public;
grant execute on function public.pgws_sign_agreement(uuid,uuid,jsonb,jsonb,text,text,text,text) to authenticated;
