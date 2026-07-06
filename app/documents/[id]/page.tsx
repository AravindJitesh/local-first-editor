import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { DocumentClient } from './DocumentClient'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: collaborator } = await supabase
    .from('collaborators')
    .select('role')
    .eq('document_id', id)
    .eq('user_id', user.id)
    .single()

  if (!collaborator) notFound()

  const { data: doc } = await supabase.from('documents').select('title').eq('id', id).single()
  const { data: versions } = await supabase
    .from('versions')
    .select('id, label, created_at')
    .eq('document_id', id)
    .order('created_at', { ascending: false })

  return (
    <DocumentClient
      documentId={id}
      title={doc?.title ?? 'Untitled'}
      role={collaborator.role}
      versions={versions ?? []}
    />
  )
}