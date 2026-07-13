-- Super-administrator launch controls. External legal review is recommended,
-- but is deliberately nonblocking under the July 13, 2026 launch directive.
create table if not exists public.pgws_platform_settings (
  singleton boolean primary key default true check (singleton = true),
  public_mode text not null default 'preview' check (public_mode in ('preview','live')),
  applications_open boolean not null default false,
  voting_open boolean not null default false,
  legal_review_completed boolean not null default false,
  scholarship_terms_approved boolean not null default true,
  voting_rules_approved boolean not null default true,
  processing_fee_terms_approved boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.pgws_platform_settings(
  singleton, scholarship_terms_approved, voting_rules_approved, processing_fee_terms_approved
) values(true, true, true, true)
on conflict(singleton) do update set
  scholarship_terms_approved=true,
  voting_rules_approved=true,
  processing_fee_terms_approved=true;

-- Publish the current agreement while retaining an internal indicator that
-- external legal review has not yet been completed.
update public.pgws_agreement_versions set active=false where active=true;
insert into public.pgws_agreement_versions(
  version_label, effective_date, source_sha256, source_markdown, sections,
  governing_law_approved, active, published_at
) values (
  '2027.07.13-current',
  date '2026-07-13',
  '6990d7bf10a12a30beefb339850f02812efa98d172457972745e64cc3453b701',
  $agreement$
MISS PRETTY GIRLS WHO SERVE 2027 APPLICANT AND CONTESTANT AGREEMENT

This is the current agreement for real applications. Applications are free. Voting is $2.50 per vote and represents 85% of the final score; performance represents 15%. The first-place title is Miss Pretty Girls Who Serve and receives 10% of verified gross voting donations before processing fees, with a $1,000 minimum and $2,500 maximum. The second-place title is Miss Pretty Girls University and receives $500. An optional third-place title and $250 scholarship may be activated before voting. Failed, refunded, disputed, charged-back, fraudulent, duplicate, voided, and late transactions are excluded. Scholarship payments are intended to be sent by Zelle on crowning day after the final audit. Proof of enrollment is not required.

SECTION 41 — GOVERNING LAW
The governing-law, venue, dispute-resolution, and severability provisions of this Agreement may be supplemented or revised after external legal review. If a later revision materially affects an applicant or contestant, the organization will provide notice and require re-acknowledgment or re-signature where appropriate or required. Until then, the remaining published terms govern participation to the extent permitted by applicable law.
$agreement$,
  jsonb_build_object(
    'competition_year', 2027,
    'application_fee', 0,
    'vote_price', 2.50,
    'voting_weight_percent', 85,
    'performance_weight_percent', 15,
    'legal_review_status', 'recommended_nonblocking',
    'section_41_status', 'temporary_current_provision'
  ),
  false,
  true,
  now()
)
on conflict(version_label) do update set
  effective_date=excluded.effective_date,
  source_sha256=excluded.source_sha256,
  source_markdown=excluded.source_markdown,
  sections=excluded.sections,
  governing_law_approved=false,
  active=true,
  published_at=now();

create or replace function public.pgws_guard_platform_launch()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.pgws_has_role(array['super_admin']) then
    raise exception 'Only a national super administrator can change launch controls.';
  end if;

  if new.applications_open and not exists (
    select 1 from public.pgws_agreement_versions where active=true
  ) then
    raise exception 'Publish an active current agreement version before opening applications.';
  end if;

  new.public_mode := case when new.applications_open or new.voting_open then 'live' else 'preview' end;
  new.updated_by := auth.uid();
  new.updated_at := now();

  if new.applications_open and not old.applications_open then
    insert into public.pgws_audit_log(
      actor_id, action, entity_type, entity_id, old_value, new_value, reason
    ) values (
      auth.uid(),
      'applications_opened',
      'platform_settings',
      'singleton',
      jsonb_build_object('applications_open', old.applications_open, 'legal_review_completed', old.legal_review_completed),
      jsonb_build_object('applications_open', true, 'legal_review_completed', new.legal_review_completed),
      case when new.legal_review_completed
        then 'Super administrator intentionally opened real applications.'
        else 'Super administrator intentionally opened real applications before external legal review; legal review remains recommended and nonblocking.'
      end
    );
  end if;

  if new.voting_open and not old.voting_open then
    insert into public.pgws_audit_log(
      actor_id, action, entity_type, entity_id, old_value, new_value, reason
    ) values (
      auth.uid(), 'voting_opened', 'platform_settings', 'singleton',
      jsonb_build_object('voting_open', old.voting_open),
      jsonb_build_object('voting_open', true),
      'Super administrator intentionally opened live voting.'
    );
  end if;
  return new;
end $$;

drop trigger if exists pgws_platform_launch_guard on public.pgws_platform_settings;
create trigger pgws_platform_launch_guard before update on public.pgws_platform_settings
for each row execute function public.pgws_guard_platform_launch();

-- Current agreement signatures require an active frozen agreement version,
-- all required initials, and the complete acknowledgment record. External
-- legal review status is not a signature or application-submission blocker.
create or replace function public.pgws_validate_signature()
returns trigger language plpgsql security definer set search_path=public as $$
declare initial_count integer;
begin
  if not exists(select 1 from public.pgws_applications a where a.id=new.application_id and a.user_id=new.user_id)
    then raise exception 'Signature does not match the applicant record.'; end if;
  if not exists(select 1 from public.pgws_agreement_versions v where v.id=new.agreement_version_id and v.active=true)
    then raise exception 'Only the active current agreement version may be signed.'; end if;
  select count(*) into initial_count from public.pgws_agreement_initials i
  where i.application_id=new.application_id and i.user_id=new.user_id and i.agreement_version_id=new.agreement_version_id
    and i.section_number=any(array[2,3,7,9,10,12,14,16,17,19,20,26,29,30,33]);
  if initial_count<>15 then raise exception 'All 15 required initials must be recorded before signing.'; end if;
  if coalesce(jsonb_array_length(new.acknowledgment_snapshot->'items'),0)<>21
    then raise exception 'All 21 final acknowledgments must be frozen in the signed record.'; end if;
  if position(new.user_id::text in new.signature_object_path)<>1
    then raise exception 'Signature storage path is not owned by the applicant.'; end if;
  return new;
end $$;

create or replace function public.pgws_guard_application_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid()=old.user_id and not public.pgws_has_role(array['competition_admin','super_admin']) then
    if new.user_id is distinct from old.user_id then raise exception 'Application ownership cannot be changed.'; end if;
    if new.status is distinct from old.status and not (old.status in ('draft','correction_requested') and new.status='submitted')
      then raise exception 'Applicants cannot assign administrative statuses.'; end if;
    if new.status='submitted' and old.status is distinct from new.status and not exists (
      select 1 from public.pgws_platform_settings where singleton=true and applications_open=true
    ) then raise exception 'Applications are currently closed. Your draft remains saved.'; end if;
    if old.status not in ('draft','correction_requested') and new.answers is distinct from old.answers
      then raise exception 'Submitted responses require an approved correction request.'; end if;
    if new.agreement_status is distinct from old.agreement_status and not (
      new.agreement_status='signed' and exists(select 1 from public.pgws_agreement_signatures s where s.application_id=old.id and s.user_id=old.user_id)
    ) then raise exception 'Agreement status must come from a valid signed record.'; end if;
  end if;
  return new;
end $$;

alter table public.pgws_platform_settings enable row level security;
drop policy if exists "platform settings public read" on public.pgws_platform_settings;
create policy "platform settings public read" on public.pgws_platform_settings for select using (true);
drop policy if exists "platform settings super admin manage" on public.pgws_platform_settings;
create policy "platform settings super admin manage" on public.pgws_platform_settings for update
using (public.pgws_has_role(array['super_admin'])) with check (public.pgws_has_role(array['super_admin']));
grant select on public.pgws_platform_settings to anon, authenticated;
grant update on public.pgws_platform_settings to authenticated;
