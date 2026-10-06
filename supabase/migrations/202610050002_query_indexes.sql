-- Match the authenticated navigation count and mark-all-read filter.
create index if not exists notifications_user_unread
 on public.notifications(user_id) where read_at is null;

-- Expense history is filtered by expense and paginated newest first.
create index if not exists payment_events_expense_created_id
 on public.payment_events(expense_id,created_at desc,id);

-- Match the stable ordering used by the group's paginated lists.
create index if not exists office_expenses_group_date_id
 on public.office_expenses(group_id,expense_date desc,id);
create index if not exists group_members_group_joined_user
 on public.group_members(group_id,joined_at,user_id);
create index if not exists join_requests_group_pending_id
 on public.join_requests(group_id,id) where status='pending';
