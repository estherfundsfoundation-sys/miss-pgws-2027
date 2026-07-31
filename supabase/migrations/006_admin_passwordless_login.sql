-- Server-only throttle state for Miss PGWS national staff login codes.
-- No OTP values, passwords, or authentication secrets are stored here.
create table if not exists public.pgws_admin_login_requests (
  email text primary key,
  last_requested_at timestamptz not null default now(),
  request_count bigint not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  constraint pgws_admin_login_requests_lowercase_email check (email = lower(email))
);

alter table public.pgws_admin_login_requests enable row level security;

revoke all on table public.pgws_admin_login_requests from anon, authenticated;

comment on table public.pgws_admin_login_requests is
  'Server-only throttle state for national staff passwordless login. No OTP values are stored.';
