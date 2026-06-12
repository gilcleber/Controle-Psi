-- Create the user_licenses table
create table public.user_licenses (
  user_id uuid references auth.users not null primary key,
  email text,
  status text default 'pending', -- 'pending', 'active', 'blocked'
  expiration_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.user_licenses enable row level security;

-- Policy: Users can view their own license
create policy "Users can view own license" on public.user_licenses
  for select using (auth.uid() = user_id);

-- Policy: Users can insert their own license (needed for the first login creation logic if not using triggers)
create policy "Users can insert own license" on public.user_licenses
  for insert with check (auth.uid() = user_id);

-- Policy: Admin can view all licenses
-- REPLACE 'gilcleberproducoes@gmail.com' WITH YOUR ADMIN EMAIL IF DIFFERENT
create policy "Admin can view all licenses" on public.user_licenses
  for select using (auth.jwt() ->> 'email' = 'gilcleberproducoes@gmail.com');

-- Policy: Admin can update licenses
create policy "Admin can update licenses" on public.user_licenses
  for update using (auth.jwt() ->> 'email' = 'gilcleberproducoes@gmail.com');

-- Policy: Admin can delete licenses (optional)
create policy "Admin can delete licenses" on public.user_licenses
  for delete using (auth.jwt() ->> 'email' = 'gilcleberproducoes@gmail.com');
