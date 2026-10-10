create extension if not exists pgcrypto with schema extensions;

create type public.verification_status as enum ('unverified', 'pending', 'approved', 'rejected', 'expired', 'revoked');
create type public.listing_type as enum ('sale', 'rent', 'lend');
create type public.listing_condition as enum ('like_new', 'good', 'well_loved');
create type public.listing_status as enum ('draft', 'active', 'reserved', 'sold', 'archived', 'removed');
create type public.request_status as enum ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'returned');
create type public.deal_status as enum ('draft', 'active', 'paused', 'expired', 'archived');
create type public.app_role as enum ('student', 'admin', 'business');

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text not null,
  region text not null,
  country text not null default 'US',
  website text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete set null,
  display_name text not null check (char_length(display_name) between 2 and 80),
  avatar_path text,
  role public.app_role not null default 'student',
  verification_status public.verification_status not null default 'unverified',
  public_id uuid not null unique default gen_random_uuid(),
  verified_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((verification_status = 'approved') = (verified_until is not null))
);

create table public.college_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  college_name text not null check (char_length(college_name) between 2 and 160),
  city text not null check (char_length(city) between 2 and 100),
  region text not null check (char_length(region) between 2 and 100),
  contact_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete set null,
  demo_seller_name text,
  college_id uuid not null references public.colleges(id) on delete restrict,
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) between 10 and 4000),
  category text not null check (category in ('Books', 'Electronics', 'Bikes', 'Clothing', 'Dorm & home', 'Other')),
  listing_type public.listing_type not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  price_unit text not null default 'total' check (price_unit in ('total', 'day', 'week', 'semester')),
  condition public.listing_condition not null,
  pickup_area text not null check (char_length(pickup_area) between 2 and 120),
  search_document tsvector generated always as (to_tsvector('english', title || ' ' || description)) stored,
  available_from date,
  available_until date,
  status public.listing_status not null default 'active',
  image_paths text[] not null default '{}',
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((listing_type = 'lend' and price = 0) or (listing_type <> 'lend' and price > 0)),
  check (demo or seller_id is not null),
  check ((listing_type <> 'rent') or price_unit <> 'total'),
  check (available_until is null or available_from is null or available_until >= available_from)
);
create index listings_browse_idx on public.listings (college_id, category, listing_type, status, created_at desc);
create index listings_search_idx on public.listings using gin (search_document);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.item_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 5 and 1000),
  status public.request_status not null default 'pending',
  requested_from date,
  requested_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> seller_id),
  check (requested_until is null or requested_from is null or requested_until >= requested_from)
);
create index item_requests_incoming_idx on public.item_requests (seller_id, status, created_at desc);
create index item_requests_outgoing_idx on public.item_requests (requester_id, status, created_at desc);

create function public.transition_item_request(p_request_id uuid, p_actor uuid, p_action text, p_return_by date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row record;
  listing_row record;
  transaction_row record;
begin
  select * into request_row
  from public.item_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Request not found'; end if;

  if p_action in ('accept', 'reject') then
    if request_row.seller_id <> p_actor then raise exception 'Only the listing owner can respond to this request'; end if;
    if request_row.status <> 'pending' then raise exception 'This request has already been answered'; end if;
    if p_action = 'reject' then
      update public.item_requests set status = 'rejected' where id = p_request_id;
      return jsonb_build_object('status', 'rejected');
    end if;

    select * into listing_row from public.listings where id = request_row.listing_id for update;
    if not found or listing_row.status <> 'active' then raise exception 'This listing is no longer available'; end if;
    if listing_row.listing_type = 'rent' and (p_return_by is null or p_return_by <= current_date) then
      raise exception 'Choose a future return date for this rental';
    end if;
    if listing_row.listing_type = 'lend' and p_return_by is null then
      raise exception 'Choose a return date for this lending request';
    end if;
    if listing_row.listing_type = 'sale' and p_return_by is not null then
      raise exception 'A return date only applies to rental or lending requests';
    end if;

    update public.item_requests
      set status = 'accepted', requested_until = coalesce(request_row.requested_until, p_return_by)
      where id = p_request_id;
    insert into public.transactions (request_id, listing_id, buyer_id, seller_id, amount, status, return_by)
      values (request_row.id, listing_row.id, request_row.requester_id, request_row.seller_id, listing_row.price, 'reserved', p_return_by)
      returning * into transaction_row;
    update public.listings set status = 'reserved' where id = listing_row.id;
    return jsonb_build_object('status', 'accepted', 'transaction_id', transaction_row.id, 'return_by', transaction_row.return_by);
  end if;

  select * into transaction_row
  from public.transactions
  where request_id = p_request_id
  for update;
  if not found then raise exception 'Transaction not found'; end if;
  if p_actor <> transaction_row.seller_id and p_actor <> transaction_row.buyer_id then
    raise exception 'Only the transaction participants can update this request';
  end if;

  if p_action = 'complete' then
    if transaction_row.status <> 'reserved' then raise exception 'This transaction is no longer reserved'; end if;
    update public.transactions set status = 'completed' where id = transaction_row.id;
    update public.item_requests set status = 'completed' where id = p_request_id;
    if (select listing_type from public.listings where id = transaction_row.listing_id) = 'sale' then
      update public.listings set status = 'sold' where id = transaction_row.listing_id;
    end if;
    return jsonb_build_object('status', 'completed');
  end if;

  if p_action = 'return' then
    if transaction_row.status <> 'completed' then raise exception 'Only completed rentals and lending can be returned'; end if;
    if (select listing_type from public.listings where id = transaction_row.listing_id) = 'sale' then
      raise exception 'A sale cannot be marked as returned';
    end if;
    update public.transactions set status = 'returned' where id = transaction_row.id;
    update public.item_requests set status = 'returned' where id = p_request_id;
    update public.listings set status = 'active' where id = transaction_row.listing_id;
    return jsonb_build_object('status', 'returned');
  end if;

  raise exception 'Unsupported request action';
end;
$$;
revoke execute on function public.transition_item_request(uuid, uuid, text, date) from public, anon, authenticated;
grant execute on function public.transition_item_request(uuid, uuid, text, date) to service_role;
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.item_requests(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'cancelled', 'returned')),
  return_by date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete restrict,
  legal_name text not null check (char_length(legal_name) between 2 and 120),
  enrollment_status text not null check (enrollment_status in ('currently_enrolled', 'incoming_student', 'recently_graduated')),
  document_path text not null,
  status public.verification_status not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'revoked')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index verification_queue_idx on public.verification_submissions (status, created_at);
create unique index one_pending_verification_per_user
  on public.verification_submissions (user_id) where status = 'pending';

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  description text,
  website text,
  verified boolean not null default false,
  active boolean not null default false,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  college_id uuid references public.colleges(id) on delete set null,
  title text not null check (char_length(title) between 4 and 160),
  offer text not null check (char_length(offer) between 4 and 500),
  description text not null default '',
  category text not null check (category in ('Food', 'Technology', 'Stationery', 'Transport', 'Other')),
  terms text not null default 'One redemption per verified student.',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status public.deal_status not null default 'draft',
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
create index active_deals_idx on public.deals (status, category, expires_at);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null unique,
  redeemed_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid references public.profiles(id) on delete set null,
  unique (deal_id, user_id)
);

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger listings_updated_at before update on public.listings for each row execute function public.set_updated_at();
create trigger requests_updated_at before update on public.item_requests for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();

create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;

create function public.prevent_profile_privilege_escalation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role') then
    if new.role is distinct from old.role
      or new.verification_status is distinct from old.verification_status
      or new.public_id is distinct from old.public_id
      or new.verified_until is distinct from old.verified_until then
      raise exception 'Protected profile attributes can only be changed by authorized server operations';
    end if;
  end if;
  return new;
end;
$$;
create trigger protect_profile_fields before update on public.profiles for each row execute function public.prevent_profile_privilege_escalation();

create function public.prevent_business_privilege_escalation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role')
    and (new.owner_id is distinct from old.owner_id
      or new.verified is distinct from old.verified
      or new.active is distinct from old.active
      or new.demo is distinct from old.demo) then
    raise exception 'Business approval is managed by CampusLoop administrators';
  end if;
  return new;
end;
$$;
create trigger protect_business_approval before update on public.businesses for each row execute function public.prevent_business_privilege_escalation();

create function public.prevent_listing_demo_escalation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role')
    and (new.demo is distinct from old.demo or new.seller_id is distinct from old.seller_id) then
    raise exception 'Listing ownership and demo status cannot be changed';
  end if;
  return new;
end;
$$;
create trigger protect_listing_demo before update on public.listings for each row execute function public.prevent_listing_demo_escalation();

create function public.prevent_deal_demo_escalation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role')
    and new.demo is distinct from old.demo then
    raise exception 'Demo status is managed by CampusLoop administrators';
  end if;
  return new;
end;
$$;
create trigger protect_deal_demo before update on public.deals for each row execute function public.prevent_deal_demo_escalation();

create function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();

alter table public.colleges enable row level security;
alter table public.profiles enable row level security;
alter table public.college_requests enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.item_requests enable row level security;
alter table public.transactions enable row level security;
alter table public.verification_submissions enable row level security;
alter table public.businesses enable row level security;
alter table public.deals enable row level security;
alter table public.redemptions enable row level security;
alter table public.listing_reports enable row level security;

create policy "Anyone can browse active colleges" on public.colleges for select using (active or public.is_admin());
create policy "Admins manage colleges" on public.colleges for all using (public.is_admin()) with check (public.is_admin());

create policy "Profiles are visible to authenticated campus members" on public.profiles for select to authenticated using (true);
create policy "Students create their own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()) and role = 'student' and verification_status = 'unverified');
create policy "Students update their profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Students submit college requests" on public.college_requests for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
create policy "Students view their college requests" on public.college_requests for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "Admins review college requests" on public.college_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Anyone can browse active listings" on public.listings for select to anon, authenticated using (
  status = 'active'
  or seller_id = (select auth.uid())
  or public.is_admin()
  or exists (
    select 1 from public.transactions t
    where t.listing_id = listings.id and t.buyer_id = (select auth.uid())
  )
);
create policy "Students create own listings" on public.listings for insert to authenticated with check (seller_id = (select auth.uid()) and status in ('draft', 'active') and demo = false);
create policy "Sellers manage their own listings" on public.listings for update to authenticated using (seller_id = (select auth.uid()) or public.is_admin()) with check (seller_id = (select auth.uid()) or public.is_admin());
create policy "Sellers archive their own listings" on public.listings for delete to authenticated using (seller_id = (select auth.uid()) or public.is_admin());

create policy "Students view their favorites" on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "Students manage their favorites" on public.favorites for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Students remove their favorites" on public.favorites for delete to authenticated using (user_id = (select auth.uid()));

create policy "Requesters and sellers view item requests" on public.item_requests for select to authenticated using (requester_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_admin());
create policy "Students request active listings" on public.item_requests for insert to authenticated with check (
  requester_id = (select auth.uid())
  and status = 'pending'
  and exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = seller_id and l.status = 'active')
  and exists (select 1 from public.profiles p where p.id = seller_id and p.college_id = (select college_id from public.profiles where id = (select auth.uid())))
);

create policy "Transaction participants can view transactions" on public.transactions for select to authenticated using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_admin());

create policy "Students view their verification submissions" on public.verification_submissions for select to authenticated using (user_id = (select auth.uid()));
create policy "Students submit verification for themselves" on public.verification_submissions for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');

create policy "Businesses are visible with their active deals" on public.businesses for select to anon, authenticated using ((active and verified) or demo or owner_id = (select auth.uid()) or public.is_admin());
create policy "Business owners create their profile" on public.businesses for insert to authenticated with check (owner_id = (select auth.uid()) and active = false and verified = false);
create policy "Business owners update their profile" on public.businesses for update to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());

create policy "Students view active deals" on public.deals for select to anon, authenticated using (
  status = 'active' and starts_at <= now() and expires_at > now()
  and exists (
    select 1 from public.businesses b
    where b.id = business_id
      and (b.demo or (b.active and b.verified))
  )
  and (college_id is null or college_id = (select college_id from public.profiles where id = (select auth.uid())))
  or public.is_admin()
);
create policy "Business owners manage their deals" on public.deals for all to authenticated using (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())) or public.is_admin()
) with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())) or public.is_admin()
);

create policy "Students see their own redemptions" on public.redemptions for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

create policy "Students file their own listing reports" on public.listing_reports for insert to authenticated with check (reporter_id = (select auth.uid()) and status = 'open');
create policy "Students view their reports and admins review all" on public.listing_reports for select to authenticated using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "Admins review listing reports" on public.listing_reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.colleges, public.listings, public.deals, public.businesses to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.colleges to authenticated;
grant insert, update, delete on public.listings, public.favorites to authenticated;
grant select, insert on public.item_requests to authenticated;
grant select on public.transactions to authenticated;
grant select, insert on public.verification_submissions to authenticated;
grant select, insert, update on public.college_requests to authenticated;
grant insert, select, update on public.businesses, public.deals to authenticated;
grant select on public.redemptions to authenticated;
grant insert, select, update on public.listing_reports to authenticated;

insert into public.colleges (name, city, region, country)
values
  ('Stanford University', 'Stanford', 'California', 'US'),
  ('University of California, Berkeley', 'Berkeley', 'California', 'US')
on conflict (name) do nothing;

insert into public.businesses (id, owner_id, name, description, verified, active, demo)
values
  ('10000000-0000-4000-8000-000000000001', null, 'Study Grounds', 'Illustrative campus coffee offer. Demo only.', false, false, true),
  ('10000000-0000-4000-8000-000000000002', null, 'Paper & Pine', 'Illustrative stationery offer. Demo only.', false, false, true),
  ('10000000-0000-4000-8000-000000000003', null, 'Bytewise', 'Illustrative student technology offer. Demo only.', false, false, true),
  ('10000000-0000-4000-8000-000000000004', null, 'Campus Cycle Co.', 'Illustrative campus cycling offer. Demo only.', false, false, true)
on conflict (id) do nothing;

insert into public.deals (business_id, title, offer, description, category, terms, starts_at, expires_at, status, demo)
values
  ('10000000-0000-4000-8000-000000000001', 'Study Grounds', '15% off your next coffee', 'Show your student ID in store.', 'Food', 'One demo redemption per student. Not redeemable with any real business.', '2026-10-01T00:00:00Z', '2026-10-31T23:59:59Z', 'active', true),
  ('10000000-0000-4000-8000-000000000002', 'Paper & Pine', 'Buy 2 notebooks, get 1 free', 'In-store. Student ID required.', 'Stationery', 'One demo redemption per student. Not redeemable with any real business.', '2026-10-01T00:00:00Z', '2026-11-12T23:59:59Z', 'active', true),
  ('10000000-0000-4000-8000-000000000003', 'Bytewise', '₹2,500 off accessories', 'Use your student offer at checkout.', 'Technology', 'One demo redemption per student. Not redeemable with any real business.', '2026-10-01T00:00:00Z', '2026-11-30T23:59:59Z', 'active', true),
  ('10000000-0000-4000-8000-000000000004', 'Campus Cycle Co.', 'Free safety check with any tune-up', 'One redemption per student.', 'Transport', 'One demo redemption per student. Not redeemable with any real business.', '2026-10-01T00:00:00Z', '2026-10-28T23:59:59Z', 'active', true);

insert into public.listings (id, seller_id, demo_seller_name, college_id, title, description, category, listing_type, price, price_unit, condition, pickup_area, image_paths, demo)
values
  ('20000000-0000-4000-8000-000000000001', null, 'Olivia Chen', (select id from public.colleges where name = 'Stanford University'), 'Campbell Biology, 12th Edition', 'A helpful textbook in like-new condition, ready for its next reader.', 'Books', 'sale', 3150, 'total', 'like_new', 'Main Quad', array['https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=720&q=82'], true),
  ('20000000-0000-4000-8000-000000000002', null, 'Marcus Reed', (select id from public.colleges where name = 'Stanford University'), 'TI-84 Plus CE Graphing Calculator', 'Graphing calculator in good working condition.', 'Electronics', 'sale', 4300, 'total', 'good', 'Engineering Quad', array['https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=720&q=82'], true),
  ('20000000-0000-4000-8000-000000000003', null, 'Jamie Park', (select id from public.colleges where name = 'University of California, Berkeley'), 'Trek FX 1 Hybrid Bike', 'A campus bike available for short-term rentals.', 'Bikes', 'rent', 750, 'day', 'good', 'Berkeley campus', array['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=720&q=82'], true),
  ('20000000-0000-4000-8000-000000000004', null, 'Daniel Kim', (select id from public.colleges where name = 'Stanford University'), 'MacBook Air M2 · 13 inch', 'MacBook Air in like-new condition.', 'Electronics', 'sale', 51500, 'total', 'like_new', 'Main Quad', array['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=720&q=82'], true),
  ('20000000-0000-4000-8000-000000000005', null, 'Priya Shah', (select id from public.colleges where name = 'University of California, Berkeley'), 'Organic Chemistry Molecular Model Kit', 'Free lending of a molecular model kit for your chemistry class.', 'Books', 'lend', 0, 'total', 'good', 'Berkeley campus', array['https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=720&q=82'], true),
  ('20000000-0000-4000-8000-000000000006', null, 'Sofia Rivera', (select id from public.colleges where name = 'Stanford University'), 'White cotton lab coat · size M', 'Clean lab coat in good condition.', 'Clothing', 'sale', 1500, 'total', 'good', 'Science Quad', array['https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=720&q=82'], true),
  ('20000000-0000-4000-8000-000000000007', null, 'Noah Patel', (select id from public.colleges where name = 'Stanford University'), 'Mini rice cooker, perfect for dorms', 'A small rice cooker for temporary dorm use.', 'Dorm & home', 'rent', 330, 'day', 'good', 'Graduate housing', array['https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=720&q=82'], true),
  ('20000000-0000-4000-8000-000000000008', null, 'Avery Johnson', (select id from public.colleges where name = 'University of California, Berkeley'), 'The Design of Everyday Things', 'A well-kept design classic ready for another reader.', 'Books', 'sale', 1150, 'total', 'like_new', 'Berkeley campus', array['https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=720&q=82'], true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "Anyone can view listing photos" on storage.objects for select to anon, authenticated using (bucket_id = 'listing-images');
create policy "Students upload their own listing photos" on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students update their own listing photos" on storage.objects for update to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students delete their own listing photos" on storage.objects for delete to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Students upload private verification evidence" on storage.objects for insert to authenticated with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students read their own verification evidence" on storage.objects for select to authenticated using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students replace their own verification evidence" on storage.objects for update to authenticated using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Students delete their own verification evidence" on storage.objects for delete to authenticated using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
