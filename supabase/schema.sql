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
  owner_id = auth.uid()
  or exists (
    select 1 from collaborators
    where collaborators.document_id = documents.id
    and collaborators.user_id = auth.uid()
  )
);

create policy "owners and editors can update documents"
on documents for update
using (
  owner_id = auth.uid()
  or exists (
    select 1 from collaborators
    where collaborators.document_id = documents.id
    and collaborators.user_id = auth.uid()
    and collaborators.role in ('owner', 'editor')
  )
);

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

-- Write policies for documents
create policy "authenticated users can insert documents"
on documents for insert
to authenticated
with check (owner_id = auth.uid());

create policy "owners can delete their documents"
on documents for delete
using (owner_id = auth.uid());

-- Write policies for collaborators
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

create policy "owners can update collaborators"
on collaborators for update
using (
  exists (
    select 1 from documents where documents.id = document_id and documents.owner_id = auth.uid()
  )
);

create policy "owners can delete collaborators"
on collaborators for delete
using (
  exists (
    select 1 from documents where documents.id = document_id and documents.owner_id = auth.uid()
  )
);

-- Realtime transport layer channel RLS policies on realtime.messages
alter table realtime.messages enable row level security;

create policy "Allow collaborators to listen to channel"
on realtime.messages
for select
to authenticated
using (
  exists (
    select 1 from collaborators
    where ('doc-sync-' || collaborators.document_id::text) = realtime.topic()
    and collaborators.user_id = auth.uid()
  )
);

create policy "Allow owners and editors to publish to channel"
on realtime.messages
for insert
to authenticated
with check (
  exists (
    select 1 from collaborators
    where ('doc-sync-' || collaborators.document_id::text) = realtime.topic()
    and collaborators.user_id = auth.uid()
    and collaborators.role in ('owner', 'editor')
  )
);

-- Atomic document creation (avoids RLS chicken-and-egg on insert + collaborator row)
create or replace function public.create_document(document_title text default 'Untitled Document')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_doc_id uuid;
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into documents (title, owner_id)
  values (document_title, uid)
  returning id into new_doc_id;

  insert into collaborators (document_id, user_id, role)
  values (new_doc_id, uid, 'owner');

  return new_doc_id;
end;
$$;

grant execute on function public.create_document(text) to authenticated;

create or replace function public.update_document_title(document_id uuid, new_title text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if trim(new_title) = '' then
    raise exception 'Title cannot be empty';
  end if;

  if not exists (
    select 1 from documents d
    where d.id = document_id
    and (
      d.owner_id = uid
      or exists (
        select 1 from collaborators c
        where c.document_id = d.id
        and c.user_id = uid
        and c.role in ('owner', 'editor')
      )
    )
  ) then
    raise exception 'Not authorized to rename this document';
  end if;

  update documents set title = trim(new_title) where id = document_id;
end;
$$;

create or replace function public.delete_document(document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from documents d
    where d.id = document_id
    and d.owner_id = uid
  ) then
    raise exception 'Not authorized to delete this document';
  end if;

  delete from documents where id = document_id;
end;
$$;

grant execute on function public.update_document_title(uuid, text) to authenticated;
grant execute on function public.delete_document(uuid) to authenticated;