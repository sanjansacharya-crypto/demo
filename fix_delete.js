import fs from 'fs';

const sql = `
-- Add missing DELETE policy on inventory
do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'Public Delete' and tablename = 'inventory') then
        create policy "Public Delete" on public.inventory for delete using (true);
    end if;
end $$;

-- Also add delete policy on audit_logs just in case
do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'Allow Delete Requests' and tablename = 'requests') then
        create policy "Allow Delete Requests" on public.requests for delete using (true);
    end if;
end $$;
`;

async function apply() {
    const response = await fetch('https://api.supabase.com/v1/projects/tkkgxfotzknomaktktuu/database/query', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer sbp_50a9260b591b23232e5bad0bf6f67653b50fd976',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(text);
}

apply();
