create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Document',
  owner_id uuid references auth.users not null,
  created_at timestamptz default now()
);

create table collaborators (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents on delete cascade not null,
  user_id uuid references auth.users not null,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  unique (document_id, user_id)
);

create table versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents on delete cascade not null,
  label text not null,
  snapshot bytea not null,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

alter table documents enable row level security;
alter table collaborators enable row level security;
alter table versions enable row level security;

create policy "collaborators can view their documents"
on documents for select
using (
  exists (
    select 1 from collaborators
    where collaborators.document_id = documents.id
    and collaborators.user_id = auth.uid()
  )
);

create policy "owners can update their documents"
on documents for update
using (owner_id = auth.uid());

create policy "user sees their own collaborator rows"
on collaborators for select
using (user_id = auth.uid());

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

create policy "collaborators can read versions"
on versions for select
using (
  exists (
    select 1 from collaborators
    where collaborators.document_id = versions.document_id
    and collaborators.user_id = auth.uid()
  )
);