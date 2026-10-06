-- Supabase owns authentication; every business mutation below validates auth.uid().
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 120),
 created_at timestamptz not null default now()
);
create table public.office_groups (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 name text not null check(length(name) between 1 and 120),
 currency text not null check(currency in ('VND','USD','EUR','CNY','JPY','KRW')),
 invite_token uuid not null unique default gen_random_uuid(), created_at timestamptz not null default now()
);
create table public.group_members (
 group_id uuid references public.office_groups(id) on delete cascade,
 user_id uuid references public.profiles(id), joined_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create table public.join_requests (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.office_groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id),status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),unique(group_id,user_id)
);
create table public.uploads (
 id uuid primary key, user_id uuid not null references public.profiles(id),
 group_id uuid references public.office_groups(id), kind text not null check(kind in ('receipt','qr')),
 path text not null unique, preview_path text, attached boolean not null default false, created_at timestamptz not null default now(),
 check((kind='receipt' and group_id is not null) or (kind='qr' and group_id is null))
);
create table public.bank_profiles (
 user_id uuid primary key references public.profiles(id), bank_name text not null check(length(bank_name) between 1 and 120),
 account_number text not null check(length(account_number) between 1 and 100),account_holder text not null check(length(account_holder) between 1 and 120),
 transfer_template text not null default '' check(length(transfer_template)<=500),qr_upload_id uuid references public.uploads(id), updated_at timestamptz not null default now()
);
create table public.office_expenses (
 id uuid primary key default gen_random_uuid(),group_id uuid not null references public.office_groups(id),creator_id uuid not null references public.profiles(id),
 description text not null check(length(description) between 1 and 500),amount numeric(18,2) not null check(amount>0 and amount<=1000000000000),
 expense_date date not null,receipt_upload_id uuid references public.uploads(id),
 status text not null default 'active' check(status in ('active','completed','cancelled')),has_reported boolean not null default false,
 cancel_reason text,created_at timestamptz not null default now(),check(status!='cancelled' or length(cancel_reason) between 1 and 500)
);
create table public.office_shares (
 expense_id uuid references public.office_expenses(id) on delete cascade,user_id uuid references public.profiles(id),
 amount numeric(18,2) not null check(amount>=0), payment_status text not null check(payment_status in ('pending','reported','confirmed','self')),
 reported_at timestamptz,confirmed_at timestamptz,primary key(expense_id,user_id)
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(),expense_id uuid not null references public.office_expenses(id),
 actor_id uuid not null references public.profiles(id),user_id uuid references public.profiles(id),
 action text not null check(action in ('report','confirm','reject','cancel')),created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),group_id uuid references public.office_groups(id),
 expense_id uuid references public.office_expenses(id),title text not null,read_at timestamptz,created_at timestamptz not null default now()
);
create table public.ocr_runs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),upload_id uuid not null references public.uploads(id),
 started_at timestamptz not null default now(),finished_at timestamptz
);
create index office_expenses_group_date on public.office_expenses(group_id,expense_date);
create index group_members_user on public.group_members(user_id);
create index notifications_user_created on public.notifications(user_id,created_at desc);
create index uploads_unattached on public.uploads(created_at) where not attached;
create index ocr_runs_user_started on public.ocr_runs(user_id,started_at desc);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1),'Thành viên'),120));
 return new;
end $$;
create trigger office_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,name) select id,left(coalesce(nullif(trim(raw_user_meta_data->>'name'),''),nullif(trim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1),'Thành viên'),120) from auth.users on conflict do nothing;

create function public.is_group_member(p_group_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.group_members where group_id=p_group_id and user_id=auth.uid())
$$;
create function public.can_view_profile(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()=p_user_id or exists(select 1 from public.group_members a join public.group_members b using(group_id) where a.user_id=auth.uid() and b.user_id=p_user_id)
$$;
create function public.can_view_bank(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()=p_user_id or exists(select 1 from public.office_expenses e join public.group_members m on m.group_id=e.group_id where e.creator_id=p_user_id and m.user_id=auth.uid())
$$;
create function public.can_view_upload(p_upload_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.uploads u where u.id=p_upload_id and (u.user_id=auth.uid() or (u.kind='receipt' and u.attached and public.is_group_member(u.group_id)) or (u.kind='qr' and exists(select 1 from public.bank_profiles b where b.qr_upload_id=u.id and public.can_view_bank(b.user_id)))))
$$;

alter table public.profiles enable row level security;
alter table public.office_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.bank_profiles enable row level security;
alter table public.uploads enable row level security;
alter table public.office_expenses enable row level security;
alter table public.office_shares enable row level security;
alter table public.payment_events enable row level security;
alter table public.notifications enable row level security;
alter table public.ocr_runs enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(public.can_view_profile(id) or exists(select 1 from public.join_requests r join public.office_groups g on g.id=r.group_id where r.user_id=profiles.id and g.owner_id=auth.uid()));
create policy groups_read on public.office_groups for select to authenticated using(public.is_group_member(id));
create policy members_read on public.group_members for select to authenticated using(public.is_group_member(group_id));
create policy requests_read on public.join_requests for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.office_groups g where g.id=group_id and g.owner_id=auth.uid()));
create policy banks_read on public.bank_profiles for select to authenticated using(public.can_view_bank(user_id));
create policy uploads_read on public.uploads for select to authenticated using(public.can_view_upload(id));
create policy expenses_read on public.office_expenses for select to authenticated using(public.is_group_member(group_id));
create policy shares_read on public.office_shares for select to authenticated using(exists(select 1 from public.office_expenses e where e.id=expense_id and public.is_group_member(e.group_id)));
create policy events_read on public.payment_events for select to authenticated using(exists(select 1 from public.office_expenses e where e.id=expense_id and public.is_group_member(e.group_id)));
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy ocr_read on public.ocr_runs for select to authenticated using(user_id=auth.uid());
revoke all on public.profiles,public.office_groups,public.group_members,public.join_requests,public.bank_profiles,public.uploads,public.office_expenses,public.office_shares,public.payment_events,public.notifications,public.ocr_runs from anon,authenticated;
grant select on public.profiles,public.office_groups,public.group_members,public.join_requests,public.bank_profiles,public.uploads,public.office_expenses,public.office_shares,public.payment_events,public.notifications,public.ocr_runs to authenticated;
grant update(read_at) on public.notifications to authenticated;

create function public.save_profile(p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.profiles set name=trim(p_name) where id=auth.uid();
end $$;
create function public.create_group(p_name text,p_currency text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.office_groups(owner_id,name,currency) values(auth.uid(),trim(p_name),p_currency) returning id into v_id;
 insert into public.group_members(group_id,user_id) values(v_id,auth.uid()); return v_id;
end $$;
create function public.rename_group(p_group_id uuid,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.office_groups set name=trim(p_name) where id=p_group_id and owner_id=auth.uid();
 if not found then raise exception 'Group owner required'; end if;
end $$;
create function public.rotate_invite(p_group_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
 update public.office_groups set invite_token=gen_random_uuid() where id=p_group_id and owner_id=auth.uid() returning invite_token into v_token;
 if not found then raise exception 'Group owner required'; end if; return v_token;
end $$;
create function public.invite_info(p_token uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select jsonb_build_object('group_id',g.id,'name',g.name,'status',case when public.is_group_member(g.id) then 'approved' else coalesce((select status from public.join_requests r where r.group_id=g.id and r.user_id=auth.uid()),'none') end)
 into v_result from public.office_groups g where g.invite_token=p_token;
 if v_result is null then raise exception 'Invalid invitation'; end if; return v_result;
end $$;
create function public.request_join(p_token uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_group public.office_groups;v_id uuid;v_status text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_group from public.office_groups where invite_token=p_token for update;
 if not found then raise exception 'Invalid invitation'; end if;
 if public.is_group_member(v_group.id) then raise exception 'Already a member'; end if;
 select id,status into v_id,v_status from public.join_requests where group_id=v_group.id and user_id=auth.uid();
 if v_status='pending' then return v_id; end if;
 insert into public.join_requests(group_id,user_id) values(v_group.id,auth.uid()) on conflict(group_id,user_id) do update set status='pending',created_at=now() returning id into v_id;
 insert into public.notifications(user_id,group_id,title) values(v_group.owner_id,v_group.id,'Có yêu cầu tham gia nhóm mới'); return v_id;
end $$;
create function public.decide_join(p_request_id uuid,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare v_request public.join_requests;
begin
 select * into v_request from public.join_requests where id=p_request_id for update;
 if not found or not exists(select 1 from public.office_groups where id=v_request.group_id and owner_id=auth.uid()) then raise exception 'Group owner required'; end if;
 if v_request.status!='pending' then return; end if;
 update public.join_requests set status=case when p_approve then 'approved' else 'rejected' end where id=p_request_id;
 if p_approve then insert into public.group_members(group_id,user_id) values(v_request.group_id,v_request.user_id) on conflict do nothing; end if;
 insert into public.notifications(user_id,group_id,title) values(v_request.user_id,v_request.group_id,case when p_approve then 'Yêu cầu tham gia đã được duyệt' else 'Yêu cầu tham gia đã bị từ chối' end);
end $$;

alter table public.uploads add column deleting_at timestamptz;
alter table public.ocr_runs drop constraint ocr_runs_upload_id_fkey;
alter table public.ocr_runs add foreign key(upload_id) references public.uploads(id) on delete cascade;

create function public.save_bank_profile(p_bank_name text,p_account_number text,p_account_holder text,p_transfer_template text,p_qr_upload_id uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare v_old uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 select qr_upload_id into v_old from public.bank_profiles where user_id=auth.uid() for update;
 if p_qr_upload_id is not null then
  perform 1 from public.uploads where id=p_qr_upload_id and user_id=auth.uid() and kind='qr' and deleting_at is null and preview_path is not null for update;
  if not found then raise exception 'Invalid QR upload'; end if;
  update public.uploads set attached=true where id=p_qr_upload_id;
 end if;
 insert into public.bank_profiles(user_id,bank_name,account_number,account_holder,transfer_template,qr_upload_id)
 values(auth.uid(),trim(p_bank_name),trim(p_account_number),trim(p_account_holder),coalesce(p_transfer_template,''),p_qr_upload_id)
 on conflict(user_id) do update set bank_name=excluded.bank_name,account_number=excluded.account_number,account_holder=excluded.account_holder,transfer_template=excluded.transfer_template,qr_upload_id=excluded.qr_upload_id,updated_at=now();
 if v_old is not null and v_old is distinct from p_qr_upload_id then update public.uploads set attached=false where id=v_old; end if;
end $$;
create function public.register_upload(p_group_id uuid,p_kind text,p_extension text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid();v_upload public.uploads;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_extension not in ('jpg','jpeg','png','webp','heic','heif') then raise exception 'Unsupported image extension'; end if;
 if p_kind='receipt' and not public.is_group_member(p_group_id) then raise exception 'Group membership required'; end if;
 insert into public.uploads(id,user_id,group_id,kind,path) values(v_id,auth.uid(),p_group_id,p_kind,auth.uid()::text||'/'||v_id::text||'/original.'||p_extension) returning * into v_upload;
 return to_jsonb(v_upload);
end $$;

create function public.save_expense(p_expense_id uuid,p_group_id uuid,p_description text,p_amount text,p_expense_date date,p_split_mode text,p_shares jsonb,p_receipt_upload_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_old public.office_expenses;v_amount numeric;v_dp integer;v_count integer;v_total numeric;v_base numeric;v_remaining numeric;v_row record;v_receipt uuid;
begin
 if not public.is_group_member(p_group_id) then raise exception 'Group membership required'; end if;
 select case when currency in ('VND','JPY','KRW') then 0 else 2 end into v_dp from public.office_groups where id=p_group_id;
 if p_amount !~ '^[0-9]+([.][0-9]+)?$' then raise exception 'Invalid amount'; end if;
 v_amount:=p_amount::numeric;
 if v_amount<=0 or v_amount>1000000000000 or v_amount!=round(v_amount,v_dp) then raise exception 'Invalid currency amount'; end if;
 if p_split_mode is null or p_split_mode not in ('even','custom') or p_shares is null or jsonb_typeof(p_shares)!='array' or jsonb_array_length(p_shares)=0 then raise exception 'Invalid shares'; end if;
 v_count:=jsonb_array_length(p_shares);
 if (select count(distinct (j->>'userId')::uuid) from jsonb_array_elements(p_shares) j)!=v_count then raise exception 'Duplicate share members'; end if;
 if exists(select 1 from jsonb_array_elements(p_shares) j where not exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=(j->>'userId')::uuid)) then raise exception 'Share member is not approved'; end if;
 if p_split_mode='custom' then
  if exists(select 1 from jsonb_array_elements(p_shares) j where j->>'amount' is null or j->>'amount' !~ '^[0-9]+([.][0-9]+)?$') then raise exception 'Invalid share amount'; end if;
  if exists(select 1 from jsonb_array_elements(p_shares) j where (j->>'amount')::numeric!=round((j->>'amount')::numeric,v_dp) or (j->>'amount')::numeric>1000000000000) then raise exception 'Invalid share precision'; end if;
  select sum((j->>'amount')::numeric) into v_total from jsonb_array_elements(p_shares) j;
  if v_total!=v_amount then raise exception 'Shares must sum to expense amount'; end if;
 end if;
 if p_expense_id is not null then
  select * into v_old from public.office_expenses where id=p_expense_id for update;
  if not found or v_old.creator_id!=auth.uid() or v_old.group_id!=p_group_id then raise exception 'Expense creator required'; end if;
  if v_old.has_reported or v_old.status='cancelled' then raise exception 'Expense shares are locked'; end if;
  v_id:=p_expense_id;v_receipt:=v_old.receipt_upload_id;
 else v_id:=gen_random_uuid(); end if;
 if p_receipt_upload_id is not null then
  perform 1 from public.uploads where id=p_receipt_upload_id and user_id=auth.uid() and group_id=p_group_id and kind='receipt' and deleting_at is null and preview_path is not null for update;
  if not found then raise exception 'Invalid receipt upload'; end if;
  if exists(select 1 from public.office_expenses where receipt_upload_id=p_receipt_upload_id and id!=v_id) then raise exception 'Receipt already attached'; end if;
  v_receipt:=p_receipt_upload_id;
  if v_old.receipt_upload_id is not null and v_old.receipt_upload_id!=v_receipt then update public.uploads set attached=false where id=v_old.receipt_upload_id; end if;
  update public.uploads set attached=true where id=v_receipt;
 end if;
 if p_expense_id is null then
  insert into public.office_expenses(id,group_id,creator_id,description,amount,expense_date,receipt_upload_id) values(v_id,p_group_id,auth.uid(),trim(p_description),v_amount,p_expense_date,v_receipt);
 else
  update public.office_expenses set description=trim(p_description),amount=v_amount,expense_date=p_expense_date,receipt_upload_id=v_receipt,status='active' where id=v_id;
  delete from public.office_shares where expense_id=v_id;
 end if;
 v_base:=trunc(v_amount/v_count,v_dp);v_remaining:=v_amount;
 for v_row in select (j->>'userId')::uuid as user_id,case when p_split_mode='custom' then (j->>'amount')::numeric else null end as amount,row_number() over(order by (j->>'userId')::uuid) as position from jsonb_array_elements(p_shares) j order by (j->>'userId')::uuid loop
  v_total:=case when p_split_mode='custom' then v_row.amount when v_row.position=v_count then v_remaining else v_base end;
  v_remaining:=v_remaining-v_total;
  insert into public.office_shares(expense_id,user_id,amount,payment_status) values(v_id,v_row.user_id,v_total,case when v_row.user_id=auth.uid() or v_total=0 then 'self' else 'pending' end);
 end loop;
 if not exists(select 1 from public.office_shares where expense_id=v_id and payment_status='pending') then update public.office_expenses set status='completed' where id=v_id; end if;
 insert into public.notifications(user_id,group_id,expense_id,title) select user_id,p_group_id,v_id,case when p_expense_id is null then 'Bạn có khoản chia tiền mới' else 'Khoản chia tiền đã được cập nhật' end from public.office_shares where expense_id=v_id and user_id!=auth.uid();
 return v_id;
end $$;
create function public.edit_expense_metadata(p_expense_id uuid,p_description text,p_expense_date date) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.office_expenses set description=trim(p_description),expense_date=p_expense_date where id=p_expense_id and creator_id=auth.uid() and status!='cancelled';
 if not found then raise exception 'Active expense creator required'; end if;
end $$;
create function public.payment_action(p_expense_id uuid,p_action text,p_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_expense public.office_expenses;v_share public.office_shares;v_next text;v_recipient uuid;
begin
 select * into v_expense from public.office_expenses where id=p_expense_id for update;
 if not found or not public.is_group_member(v_expense.group_id) then raise exception 'Group membership required'; end if;
 if v_expense.status='cancelled' then raise exception 'Expense cancelled'; end if;
 select * into v_share from public.office_shares where expense_id=p_expense_id and user_id=p_user_id;
 if not found or v_share.payment_status='self' then raise exception 'No payable share'; end if;
 if p_action='report' then
  if auth.uid()!=p_user_id then raise exception 'Can only report your own payment'; end if;
  if v_share.payment_status in ('reported','confirmed') then return; end if;
  v_next:='reported';v_recipient:=v_expense.creator_id;
 elsif p_action in ('confirm','reject') then
  if auth.uid()!=v_expense.creator_id then raise exception 'Expense creator required'; end if;
  if p_action='confirm' and v_share.payment_status='confirmed' then return; end if;
  if p_action='reject' and v_share.payment_status='pending' then return; end if;
  if v_share.payment_status!='reported' then raise exception 'Payment must first be reported'; end if;
  v_next:=case when p_action='confirm' then 'confirmed' else 'pending' end;v_recipient:=p_user_id;
 else raise exception 'Invalid payment action'; end if;
 update public.office_shares set payment_status=v_next,reported_at=case when v_next='reported' then now() when v_next='pending' then null else reported_at end,confirmed_at=case when v_next='confirmed' then now() else null end where expense_id=p_expense_id and user_id=p_user_id;
 update public.office_expenses set has_reported=true where id=p_expense_id;
 insert into public.payment_events(expense_id,actor_id,user_id,action) values(p_expense_id,auth.uid(),p_user_id,p_action);
 insert into public.notifications(user_id,group_id,expense_id,title) values(v_recipient,v_expense.group_id,p_expense_id,case p_action when 'report' then 'Thành viên đã báo chuyển tiền' when 'confirm' then 'Khoản chuyển tiền đã được xác nhận' else 'Khoản chuyển tiền chưa được xác nhận' end);
 if not exists(select 1 from public.office_shares where expense_id=p_expense_id and payment_status in ('pending','reported')) then update public.office_expenses set status='completed' where id=p_expense_id; end if;
end $$;
create function public.cancel_expense(p_expense_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v_expense public.office_expenses;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_expense from public.office_expenses where id=p_expense_id for update;
 if not found or v_expense.creator_id!=auth.uid() then raise exception 'Expense creator required'; end if;
 if length(trim(p_reason)) not between 1 and 500 or p_reason is null then raise exception 'Cancellation reason required'; end if;
 if v_expense.status='cancelled' then return; end if;
 update public.office_expenses set status='cancelled',cancel_reason=trim(p_reason) where id=p_expense_id;
 insert into public.payment_events(expense_id,actor_id,action) values(p_expense_id,auth.uid(),'cancel');
 insert into public.notifications(user_id,group_id,expense_id,title) select user_id,v_expense.group_id,p_expense_id,'Khoản chi đã bị hủy; kiểm tra đối soát' from public.office_shares where expense_id=p_expense_id and user_id!=auth.uid();
end $$;

create function public.begin_ocr(p_upload_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Profile row serializes requests even before a first OCR row exists.
 perform 1 from public.profiles where id=auth.uid() for update;
 perform 1 from public.uploads where id=p_upload_id and user_id=auth.uid() and kind='receipt' and deleting_at is null and preview_path is not null for update;
 if not found then raise exception 'Invalid OCR upload'; end if;
 if exists(select 1 from public.ocr_runs where user_id=auth.uid() and finished_at is null and started_at>now()-interval '45 seconds') then raise exception 'OCR already running'; end if;
 if (select count(*) from public.ocr_runs where user_id=auth.uid() and started_at>now()-interval '1 minute')>=10 then raise exception 'OCR rate limit exceeded'; end if;
 insert into public.ocr_runs(user_id,upload_id) values(auth.uid(),p_upload_id) returning id into v_id; return v_id;
end $$;
create function public.finish_ocr(p_run_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.ocr_runs set finished_at=coalesce(finished_at,now()) where id=p_run_id and user_id=auth.uid();
 if not found then raise exception 'OCR run owner required'; end if;
end $$;
create function public.claim_cleanup_uploads(p_before timestamptz,p_limit integer default 100) returns setof public.uploads language plpgsql security definer set search_path='' as $$
begin
 if p_limit not between 1 and 1000 then raise exception 'Invalid cleanup batch size'; end if;
 return query with candidates as (
 select u.id from public.uploads u where not u.attached and u.created_at<p_before and not exists(select 1 from public.ocr_runs r where r.upload_id=u.id and r.finished_at is null and r.started_at>now()-interval '45 seconds') order by u.created_at limit p_limit for update skip locked
 ) update public.uploads u set deleting_at=coalesce(u.deleting_at,now()) from candidates c where u.id=c.id returning u.*;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('office-images','office-images',false,15728640,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy office_images_insert on storage.objects for insert to authenticated with check(bucket_id='office-images' and exists(select 1 from public.uploads u where u.path=name and u.user_id=auth.uid() and u.deleting_at is null and not u.attached));
create policy office_images_read on storage.objects for select to authenticated using(bucket_id='office-images' and exists(select 1 from public.uploads u where (u.path=name or u.preview_path=name) and public.can_view_upload(u.id)));
-- Do not permit object overwrite/deletion from clients, including expense creators.

revoke execute on function public.handle_new_user() from public,anon,authenticated;
revoke execute on function public.claim_cleanup_uploads(timestamptz,integer) from public,anon,authenticated;
grant execute on function public.claim_cleanup_uploads(timestamptz,integer) to service_role;
grant all on public.profiles,public.office_groups,public.group_members,public.join_requests,public.bank_profiles,public.uploads,public.office_expenses,public.office_shares,public.payment_events,public.notifications,public.ocr_runs to service_role;
-- Supabase's default privileges grant anon function access; explicitly close every RPC.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_group_member','can_view_profile','can_view_bank','can_view_upload','save_profile','create_group','rename_group','rotate_invite','invite_info','request_join','decide_join','save_bank_profile','register_upload','save_expense','edit_expense_metadata','payment_action','cancel_expense','begin_ocr','finish_ocr') loop
  execute 'revoke execute on function '||f.signature||' from public,anon';
  execute 'grant execute on function '||f.signature||' to authenticated';
 end loop;
end $$;
