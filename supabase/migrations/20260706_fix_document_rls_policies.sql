-- Run this in Supabase Dashboard → SQL Editor if "New document" fails silently.
-- Ensures document write policies exist and owners can read their own documents.

alter table documents enable row level security;
alter table collaborators enable row level security;
alter table versions enable row level security;

drop policy if exists "collaborators can view their documents" on documents;
create policy "collaborators can view their documents"
on documents for select
using (
  owner_id = auth.uid()
  or exists (
    select 1 from collaborators
    where collaborators.document_id = documents.id
    and collaborators.user_id = auth.uid()
  )
);

drop policy if exists "owners can update their documents" on documents;
create policy "owners can update their documents"
on documents for update
using (owner_id = auth.uid());

drop policy if exists "authenticated users can insert documents" on documents;
create policy "authenticated users can insert documents"
on documents for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "owners can delete their documents" on documents;
create policy "owners can delete their documents"
on documents for delete
using (owner_id = auth.uid());

drop policy if exists "user sees their own collaborator rows" on collaborators;
create policy "user sees their own collaborator rows"
on collaborators for select
using (user_id = auth.uid());

drop policy if exists "owners can insert collaborators" on collaborators;
create policy "owners can insert collaborators"
on collaborators for insert
to authenticated
with check (
  (role = 'owner' and user_id = auth.uid() and exists (
    select 1 from documents where documents.id = document_id and documents.owner_id = auth.uid()
  ))
  or
  exists (
    select 1 from documents where documents.id = document_id and documents.owner_id = auth.uid()
  )
);

drop policy if exists "owners can update collaborators" on collaborators;
create policy "owners can update collaborators"
on collaborators for update
using (
  exists (
    select 1 from documents where documents.id = document_id and documents.owner_id = auth.uid()
  )
);

drop policy if exists "owners can delete collaborators" on collaborators;
create policy "owners can delete collaborators"
on collaborators for delete
using (
  exists (
    select 1 from documents where documents.id = document_id and documents.owner_id = auth.uid()
  )
);

drop policy if exists "editors and owners can insert versions" on versions;
create policy "editors and owners can insert versions"
on versions for insert
with check (
  exists (
    select 1 from collaborators
    where collaborators.document_id = versions.document_id
    and collaborators.user_id = auth.uid()
    and collaborators.role in ('owner', 'editor')
  )
);

drop policy if exists "collaborators can read versions" on versions;
create policy "collaborators can read versions"
on versions for select
using (
  exists (
    select 1 from collaborators
    where collaborators.document_id = versions.document_id
    and collaborators.user_id = auth.uid()
  )
);
