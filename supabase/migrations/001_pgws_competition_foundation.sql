-- Miss Pretty Girls Who Serve 2027 — secure competition foundation
-- Run in a dedicated Supabase project. Never paste a secret/service key into browser code.

create extension if not exists pgcrypto;

do $$ begin
  create type public.pgws_role as enum ('applicant','contestant','reviewer','competition_admin','finance_admin','super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pgws_application_status as enum ('draft','submitted','under_review','correction_requested','waitlisted','accepted','declined','withdrawn','archived');
exception when duplicate_object then null; end $$;

create table if not exists public.pgws_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legal_name text,
  preferred_name text,
  email text,
  phone text,
  college text,
  date_of_birth date,
  email_verified boolean not null default false,
  notification_preferences jsonb not null default '{"email":true,"sms":false,"calendar":true}'::jsonb,
  account_status text not null default 'pending_verification' check (account_status in ('pending_verification','active','temporarily_locked','suspended','withdrawn','archived','deleted','deactivated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pgws_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.pgws_role not null,
  active boolean not null default true,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  unique(user_id, role)
);

create or replace function public.pgws_has_role(check_roles text[])
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.pgws_user_roles r where r.user_id=auth.uid() and r.active=true and r.role::text=any(check_roles)); $$;

revoke all on function public.pgws_has_role(text[]) from public;
grant execute on function public.pgws_has_role(text[]) to authenticated;

create table if not exists public.pgws_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status public.pgws_application_status not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  agreement_status text not null default 'not_started' check (agreement_status in ('not_started','in_progress','signed','superseded','voided')),
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pgws_application_files (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pgws_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  field_key text not null,
  bucket text not null default 'pgws-private',
  object_path text not null,
  original_name text not null,
  content_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  review_status text not null default 'pending' check (review_status in ('pending','approved','replacement_requested','rejected')),
  uploaded_at timestamptz not null default now(),
  unique(application_id, field_key, object_path)
);

create table if not exists public.pgws_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  version_label text not null unique,
  effective_date date,
  source_sha256 text not null,
  source_markdown text not null,
  sections jsonb not null,
  governing_law_approved boolean not null default false,
  active boolean not null default false,
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pgws_agreement_initials (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pgws_applications(id) on delete cascade,
  agreement_version_id uuid not null references public.pgws_agreement_versions(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_number integer not null check (section_number between 1 and 42),
  initials text not null check (char_length(trim(initials)) between 2 and 4),
  initialed_at timestamptz not null default now(),
  unique(application_id, agreement_version_id, section_number)
);

create table if not exists public.pgws_agreement_signatures (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pgws_applications(id) on delete cascade,
  agreement_version_id uuid not null references public.pgws_agreement_versions(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  applicant_snapshot jsonb not null,
  acknowledgment_snapshot jsonb not null,
  signature_object_path text not null,
  signature_method text not null check (signature_method in ('drawn','uploaded')),
  final_checkbox boolean not null check (final_checkbox=true),
  signed_at timestamptz not null default now(),
  signed_pdf_object_path text,
  ip_hash text,
  user_agent text,
  immutable_record_hash text not null,
  unique(application_id, agreement_version_id)
);

create table if not exists public.pgws_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pgws_applications(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  rubric_version text not null,
  scores jsonb not null default '{}'::jsonb,
  recommendation text check (recommendation in ('accept','waitlist','decline','needs_correction')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id, reviewer_id)
);

create table if not exists public.pgws_private_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pgws_applications(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  visibility text not null default 'competition_admin' check (visibility in ('review_team','competition_admin','super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.pgws_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.pgws_applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table if not exists public.pgws_contestants (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.pgws_applications(id),
  user_id uuid not null unique references auth.users(id),
  public_slug text unique,
  public_name text,
  college text,
  biography text,
  scripture text,
  platform text,
  headshot_public_path text,
  campaign_video_url text,
  public_profile_status text not null default 'draft' check (public_profile_status in ('draft','review','published','hidden','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pgws_performance_scores (
  id uuid primary key default gen_random_uuid(),
  contestant_id uuid not null references public.pgws_contestants(id) on delete cascade,
  category text not null,
  points numeric(6,2) not null default 0,
  max_points numeric(6,2) not null,
  entered_by uuid not null references auth.users(id),
  correction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contestant_id, category)
);

create table if not exists public.pgws_vote_totals (
  contestant_id uuid primary key references public.pgws_contestants(id) on delete cascade,
  verified_votes integer not null default 0 check (verified_votes >= 0),
  verified_amount_cents bigint not null default 0 check (verified_amount_cents >= 0),
  provisional_rank integer,
  last_synced_at timestamptz,
  audit_status text not null default 'provisional' check (audit_status in ('provisional','under_audit','final'))
);

create table if not exists public.pgws_correction_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  application_id uuid references public.pgws_applications(id),
  field_name text not null,
  current_value text,
  requested_value text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','declined','completed')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pgws_security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.pgws_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  occurred_at timestamptz not null default now()
);

create or replace function public.pgws_touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create or replace function public.pgws_protect_profile_identity() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid()=old.user_id then
    if new.email is distinct from old.email then raise exception 'Email changes must use the secure authentication flow.'; end if;
    if exists(select 1 from public.pgws_applications a where a.user_id=old.user_id and a.status not in ('draft','correction_requested'))
       and (new.legal_name is distinct from old.legal_name or new.date_of_birth is distinct from old.date_of_birth)
    then raise exception 'Submitted identity fields require an approved correction request.'; end if;
  end if;
  return new;
end $$;
create or replace function public.pgws_handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.pgws_profiles(user_id,legal_name,email,phone,college,email_verified)
  values(new.id,new.raw_user_meta_data->>'full_name',new.email,new.raw_user_meta_data->>'phone',new.raw_user_meta_data->>'school',new.email_confirmed_at is not null)
  on conflict(user_id) do nothing;
  insert into public.pgws_user_roles(user_id,role,active) values(new.id,'applicant',true) on conflict(user_id,role) do nothing;
  insert into public.pgws_applications(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end $$;
create or replace function public.pgws_sync_auth_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.pgws_profiles set email=new.email,email_verified=(new.email_confirmed_at is not null),updated_at=now() where user_id=new.id;
  return new;
end $$;
create or replace function public.pgws_guard_application_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid()=old.user_id and not public.pgws_has_role(array['competition_admin','super_admin']) then
    if new.user_id is distinct from old.user_id then raise exception 'Application ownership cannot be changed.'; end if;
    if new.status is distinct from old.status and not (old.status in ('draft','correction_requested') and new.status='submitted')
      then raise exception 'Applicants cannot assign administrative statuses.'; end if;
    if old.status not in ('draft','correction_requested') and new.answers is distinct from old.answers
      then raise exception 'Submitted responses require an approved correction request.'; end if;
    if new.agreement_status is distinct from old.agreement_status and not (
      new.agreement_status='signed' and exists(select 1 from public.pgws_agreement_signatures s where s.application_id=old.id and s.user_id=old.user_id)
    ) then raise exception 'Agreement status must come from a valid signed record.'; end if;
  end if;
  return new;
end $$;
create or replace function public.pgws_validate_signature() returns trigger language plpgsql security definer set search_path=public as $$
declare initial_count integer;
begin
  if not exists(select 1 from public.pgws_applications a where a.id=new.application_id and a.user_id=new.user_id)
    then raise exception 'Signature does not match the applicant record.'; end if;
  if not exists(select 1 from public.pgws_agreement_versions v where v.id=new.agreement_version_id and v.active=true and v.governing_law_approved=true)
    then raise exception 'Only an active attorney-approved agreement version may be signed.'; end if;
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

drop trigger if exists pgws_auth_user_created on auth.users;
create trigger pgws_auth_user_created after insert on auth.users for each row execute function public.pgws_handle_new_user();
drop trigger if exists pgws_auth_user_synced on auth.users;
create trigger pgws_auth_user_synced after update of email,email_confirmed_at on auth.users for each row execute function public.pgws_sync_auth_user();
drop trigger if exists pgws_profiles_touch on public.pgws_profiles;
create trigger pgws_profiles_touch before update on public.pgws_profiles for each row execute function public.pgws_touch_updated_at();
drop trigger if exists pgws_profiles_identity_guard on public.pgws_profiles;
create trigger pgws_profiles_identity_guard before update on public.pgws_profiles for each row execute function public.pgws_protect_profile_identity();
drop trigger if exists pgws_applications_touch on public.pgws_applications;
create trigger pgws_applications_touch before update on public.pgws_applications for each row execute function public.pgws_touch_updated_at();
drop trigger if exists pgws_applications_guard on public.pgws_applications;
create trigger pgws_applications_guard before update on public.pgws_applications for each row execute function public.pgws_guard_application_update();
drop trigger if exists pgws_signature_validation on public.pgws_agreement_signatures;
create trigger pgws_signature_validation before insert on public.pgws_agreement_signatures for each row execute function public.pgws_validate_signature();

alter table public.pgws_profiles enable row level security;
alter table public.pgws_user_roles enable row level security;
alter table public.pgws_applications enable row level security;
alter table public.pgws_application_files enable row level security;
alter table public.pgws_agreement_versions enable row level security;
alter table public.pgws_agreement_initials enable row level security;
alter table public.pgws_agreement_signatures enable row level security;
alter table public.pgws_reviews enable row level security;
alter table public.pgws_private_notes enable row level security;
alter table public.pgws_status_history enable row level security;
alter table public.pgws_contestants enable row level security;
alter table public.pgws_performance_scores enable row level security;
alter table public.pgws_vote_totals enable row level security;
alter table public.pgws_correction_requests enable row level security;
alter table public.pgws_security_events enable row level security;
alter table public.pgws_audit_log enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.pgws_agreement_versions, public.pgws_contestants, public.pgws_vote_totals to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "profiles own read" on public.pgws_profiles for select using (user_id=auth.uid());
create policy "profiles own safe update" on public.pgws_profiles for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "profiles staff read" on public.pgws_profiles for select using (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "roles own read" on public.pgws_user_roles for select using (user_id=auth.uid());
create policy "roles admin manage" on public.pgws_user_roles for all using (public.pgws_has_role(array['super_admin'])) with check (public.pgws_has_role(array['super_admin']));
create policy "applications own read" on public.pgws_applications for select using (user_id=auth.uid());
create policy "applications own draft update" on public.pgws_applications for update using (user_id=auth.uid() and status in ('draft','correction_requested')) with check (user_id=auth.uid());
create policy "applications staff read" on public.pgws_applications for select using (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "applications admin update" on public.pgws_applications for update using (public.pgws_has_role(array['competition_admin','super_admin']));
create policy "files own read" on public.pgws_application_files for select using (user_id=auth.uid());
create policy "files own insert" on public.pgws_application_files for insert with check (user_id=auth.uid());
create policy "files staff read" on public.pgws_application_files for select using (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "agreement active read" on public.pgws_agreement_versions for select using (active=true or public.pgws_has_role(array['competition_admin','super_admin']));
create policy "agreement admin manage" on public.pgws_agreement_versions for all using (public.pgws_has_role(array['competition_admin','super_admin'])) with check (public.pgws_has_role(array['competition_admin','super_admin']));
create policy "initials own read" on public.pgws_agreement_initials for select using (user_id=auth.uid());
create policy "initials own insert" on public.pgws_agreement_initials for insert with check (user_id=auth.uid());
create policy "initials staff read" on public.pgws_agreement_initials for select using (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "signatures own read" on public.pgws_agreement_signatures for select using (user_id=auth.uid());
create policy "signatures own insert" on public.pgws_agreement_signatures for insert with check (user_id=auth.uid() and final_checkbox=true);
create policy "signatures staff read" on public.pgws_agreement_signatures for select using (public.pgws_has_role(array['competition_admin','super_admin']));
create policy "reviews assigned read" on public.pgws_reviews for select using (reviewer_id=auth.uid() or public.pgws_has_role(array['competition_admin','super_admin']));
create policy "reviews assigned write" on public.pgws_reviews for all using (reviewer_id=auth.uid() or public.pgws_has_role(array['competition_admin','super_admin'])) with check (reviewer_id=auth.uid() or public.pgws_has_role(array['competition_admin','super_admin']));
create policy "notes staff" on public.pgws_private_notes for all using (public.pgws_has_role(array['reviewer','competition_admin','super_admin'])) with check (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "history own read" on public.pgws_status_history for select using (exists(select 1 from public.pgws_applications a where a.id=application_id and a.user_id=auth.uid()));
create policy "history staff manage" on public.pgws_status_history for all using (public.pgws_has_role(array['competition_admin','super_admin'])) with check (public.pgws_has_role(array['competition_admin','super_admin']));
create policy "contestants public published" on public.pgws_contestants for select using (public_profile_status='published' or user_id=auth.uid() or public.pgws_has_role(array['competition_admin','super_admin']));
create policy "contestants admin manage" on public.pgws_contestants for all using (public.pgws_has_role(array['competition_admin','super_admin'])) with check (public.pgws_has_role(array['competition_admin','super_admin']));
create policy "scores contestant read own" on public.pgws_performance_scores for select using (exists(select 1 from public.pgws_contestants c where c.id=contestant_id and c.user_id=auth.uid()) or public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "scores staff manage" on public.pgws_performance_scores for all using (public.pgws_has_role(array['reviewer','competition_admin','super_admin'])) with check (public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "vote totals public read" on public.pgws_vote_totals for select using (true);
create policy "vote totals finance manage" on public.pgws_vote_totals for all using (public.pgws_has_role(array['finance_admin','super_admin'])) with check (public.pgws_has_role(array['finance_admin','super_admin']));
create policy "corrections own" on public.pgws_correction_requests for select using (user_id=auth.uid());
create policy "corrections own insert" on public.pgws_correction_requests for insert with check (user_id=auth.uid());
create policy "corrections admin" on public.pgws_correction_requests for all using (public.pgws_has_role(array['competition_admin','super_admin'])) with check (public.pgws_has_role(array['competition_admin','super_admin']));
create policy "security own read" on public.pgws_security_events for select using (user_id=auth.uid());
create policy "security admin read" on public.pgws_security_events for select using (public.pgws_has_role(array['super_admin']));
create policy "audit admin read" on public.pgws_audit_log for select using (public.pgws_has_role(array['super_admin']));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pgws-private','pgws-private',false,26214400,array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/quicktime'])
on conflict(id) do update set public=false;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pgws-public','pgws-public',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true;

create policy "private uploads own read" on storage.objects for select to authenticated using (bucket_id='pgws-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private uploads own insert" on storage.objects for insert to authenticated with check (bucket_id='pgws-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private uploads staff read" on storage.objects for select to authenticated using (bucket_id='pgws-private' and public.pgws_has_role(array['reviewer','competition_admin','super_admin']));
create policy "public content read" on storage.objects for select using (bucket_id='pgws-public');
create policy "public content admin manage" on storage.objects for all to authenticated using (bucket_id='pgws-public' and public.pgws_has_role(array['competition_admin','super_admin'])) with check (bucket_id='pgws-public' and public.pgws_has_role(array['competition_admin','super_admin']));

-- Staff access must be granted to immutable auth.users IDs, never trusted from an email alone.
-- Example after the staff member has created and verified an account:
-- insert into public.pgws_user_roles(user_id,role,active)
-- select id,'super_admin',true from auth.users where email='nationals@estherfundsinc.org'
-- on conflict(user_id,role) do update set active=true;
