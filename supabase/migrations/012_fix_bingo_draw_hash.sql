-- Use PostgreSQL's built-in MD5 hash for a deterministic, auditable draw order.
-- The new draw UUID is unknown before each draw and acts as the random salt.

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
    select s.id,s.contestant_id,row_number() over(order by md5(s.id::text || v_draw_id::text))::integer as winner_order
    from public.pgws_bingo_submissions s
    where s.status='submitted'
      and not exists(select 1 from public.pgws_bingo_draw_winners w where w.submission_id=s.id)
    order by md5(s.id::text || v_draw_id::text)
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

grant execute on function public.pgws_staff_draw_bingo_winners(integer,text) to authenticated;
