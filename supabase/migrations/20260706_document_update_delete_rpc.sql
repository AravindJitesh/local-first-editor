-- RPC helpers for rename and delete (avoids silent RLS failures on update/delete).

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

-- Also allow editors/owners via collaborators to update directly (fallback for clients not yet on RPC).
drop policy if exists "owners can update their documents" on documents;
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
