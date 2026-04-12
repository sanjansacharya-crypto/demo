-- LAB INVENTORY MANAGEMENT - IDEAL SCHEMA
-- This schema implement professional standards for lab management.

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. INVENTORY TABLE
create table if not exists public.inventory (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    category text default 'Uncategorized',
    total_quantity integer not null default 0 check (total_quantity >= 0),
    available_quantity integer not null default 0 check (available_quantity <= total_quantity),
    min_borrow_quantity integer not null default 1 check (min_borrow_quantity > 0),
    image_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. REQUESTS TABLE
create table if not exists public.requests (
    id uuid primary key default uuid_generate_v4(),
    student_name text not null,
    student_id text, -- Roll number or Email
    inventory_id uuid references public.inventory(id) on delete restrict,
    quantity integer not null check (quantity > 0),
    purpose text,
    status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 4. BORROWINGS TABLE
create table if not exists public.borrowings (
    id uuid primary key default uuid_generate_v4(),
    request_id uuid unique references public.requests(id) on delete cascade,
    due_date timestamptz not null,
    returned_at timestamptz,
    status text default 'active' check (status in ('active', 'returned', 'overdue')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 5. AUDIT LOGS (Traceability)
create table if not exists public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    table_name text not null,
    record_id uuid not null,
    action text not null,
    old_data jsonb,
    new_data jsonb,
    performed_by text, -- Firebase UID or Email
    timestamp timestamptz default now()
);

-- 6. INDEXES for Performance
create index if not exists idx_inventory_name on public.inventory(name);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_borrowings_status on public.borrowings(status);

-- 7. TRIGGERS for Updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_inventory_modtime before update on public.inventory for each row execute procedure update_updated_at_column();
create trigger update_requests_modtime before update on public.requests for each row execute procedure update_updated_at_column();
create trigger update_borrowings_modtime before update on public.borrowings for each row execute procedure update_updated_at_column();

-- 8. VIEWS
-- Stock alert view (items below min threshold or 0)
create or replace view public.stock_alerts as
select * from public.inventory
where available_quantity <= 0 or (total_quantity < 5);

-- Defaulters view
create or replace view public.defaulters as
select 
    b.*, 
    r.student_name, 
    i.name as component_name 
from public.borrowings b
join public.requests r on b.request_id = r.id
join public.inventory i on r.inventory_id = i.id
where (b.status = 'active' and b.due_date < now()) or b.status = 'overdue';

-- 9. ROW LEVEL SECURITY (RLS)
alter table public.inventory enable row level security;
alter table public.requests enable row level security;
alter table public.borrowings enable row level security;
alter table public.audit_logs enable row level security;

-- Simplified policies for development
create policy "Public Read" on public.inventory for select using (true);
create policy "Public Insert" on public.inventory for insert with check (true);
create policy "Public Update" on public.inventory for update using (true);
create policy "Full Access Requests" on public.requests for all using (true);
create policy "Full Access Borrowings" on public.borrowings for all using (true);
create policy "Full Access Logs" on public.audit_logs for all using (true);
