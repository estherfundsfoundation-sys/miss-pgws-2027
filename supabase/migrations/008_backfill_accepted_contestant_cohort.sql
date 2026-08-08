-- Backfill every accepted application into the active contestant cohort.
-- Earlier bulk acceptance repaired application statuses directly, so those
-- records did not pass through the one-at-a-time status RPC that creates a
-- pgws_contestants row.

insert into public.pgws_contestants (
  application_id,
  user_id,
  public_slug,
  public_name,
  college,
  biography,
  scripture,
  platform,
  public_profile_status
)
select
  a.id,
  a.user_id,
  'contestant-' || left(a.user_id::text, 8),
  coalesce(
    nullif(trim(a.answers->>'preferred_name'), ''),
    nullif(trim(p.preferred_name), ''),
    nullif(trim(a.answers->>'full_legal_name'), ''),
    nullif(trim(p.legal_name), ''),
    'Accepted contestant'
  ),
  coalesce(
    nullif(trim(a.answers->>'college_university'), ''),
    nullif(trim(a.answers->>'college'), ''),
    nullif(trim(p.college), '')
  ),
  coalesce(nullif(trim(a.answers->>'biography'), ''), nullif(trim(a.answers->>'short_biography'), '')),
  coalesce(nullif(trim(a.answers->>'signature_scripture'), ''), nullif(trim(a.answers->>'scripture'), '')),
  coalesce(nullif(trim(a.answers->>'platform'), ''), nullif(trim(a.answers->>'advocacy_platform'), '')),
  'draft'
from public.pgws_applications a
left join public.pgws_profiles p on p.user_id = a.user_id
where a.status = 'accepted'
on conflict (application_id) do update set
  public_name = coalesce(nullif(pgws_contestants.public_name, ''), excluded.public_name),
  college = coalesce(nullif(pgws_contestants.college, ''), excluded.college),
  biography = coalesce(nullif(pgws_contestants.biography, ''), excluded.biography),
  scripture = coalesce(nullif(pgws_contestants.scripture, ''), excluded.scripture),
  platform = coalesce(nullif(pgws_contestants.platform, ''), excluded.platform),
  public_profile_status = case when pgws_contestants.public_profile_status = 'archived' then 'draft' else pgws_contestants.public_profile_status end,
  updated_at = now();

insert into public.pgws_user_roles(user_id, role, active)
select a.user_id, 'contestant'::public.pgws_role, true
from public.pgws_applications a
where a.status = 'accepted'
on conflict(user_id, role) do update set active=true, revoked_by=null, revoked_at=null;

insert into public.pgws_contestant_operations(contestant_id)
select c.id
from public.pgws_contestants c
join public.pgws_applications a on a.id=c.application_id
where a.status='accepted'
on conflict(contestant_id) do nothing;

insert into public.pgws_audit_log(actor_id, action, entity_type, entity_id, new_value, reason)
values(
  auth.uid(),
  'accepted_contestant_cohort_backfilled',
  'contestant_cohort',
  '2027',
  jsonb_build_object(
    'accepted_applications', (select count(*) from public.pgws_applications where status='accepted'),
    'active_contestants', (select count(*) from public.pgws_contestants where public_profile_status<>'archived')
  ),
  'Created missing contestant workspace records for all previously accepted applicants.'
);
