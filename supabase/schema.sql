-- Lab Inventory Management Schema

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Inventory Table
create table if not exists public.inventory (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    total_quantity integer not null default 0,
    available_quantity integer not null default 0,
    image_url text,
    min_borrow_quantity integer not null default 1,
    created_at timestamptz default now()
);

-- 3. Student Requests Table
create table if not exists public.requests (
    id uuid primary key default uuid_generate_v4(),
    student_name text not null,
    component_id uuid references public.inventory(id) on delete cascade,
    quantity integer not null,
    purpose text,
    duration text,
    status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
    created_at timestamptz default now()
);

-- 4. Borrowings Table
create table if not exists public.borrowings (
    id uuid primary key default uuid_generate_v4(),
    request_id uuid references public.requests(id) on delete cascade,
    due_date timestamptz not null,
    status text default 'active' check (status in ('active', 'returned')),
    created_at timestamptz default now()
);

-- 5. Helper function for stock alerts (low stock < 5)
create or replace view public.low_stock_view as
select * from public.inventory
where available_quantity < 5 or available_quantity = 0;

-- 6. Helper function for defaulters
create or replace view public.defaulters_view as
select 
    b.*, 
    r.student_name, 
    i.name as component_name 
from public.borrowings b
join public.requests r on b.request_id = r.id
join public.inventory i on r.component_id = i.id
where b.status = 'active' and b.due_date < now();

-- Enable RLS (simplified for demo/dev)
alter table public.inventory enable row level security;
alter table public.requests enable row level security;
alter table public.borrowings enable row level security;

create policy "Allow public read access" on public.inventory for select using (true);
create policy "Allow public insert access" on public.inventory for insert with check (true);
create policy "Allow public update access" on public.inventory for update using (true);

create policy "Allow public access for requests" on public.requests for all using (true);
create policy "Allow public access for borrowings" on public.borrowings for all using (true);
