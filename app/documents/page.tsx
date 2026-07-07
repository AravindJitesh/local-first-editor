import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { NewDocumentButton } from './NewDocumentButton'

type Collaboration = {
  role: string
  documents: {
    id: string
    title: string
    created_at: string
  }
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: collaborations } = await supabase
    .from('collaborators')
    .select('role, documents(id, title, created_at)')
    .eq('user_id', user.id)

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Your documents</h1>
        <NewDocumentButton />
      </div>

      <ul className="flex flex-col gap-2">
        {(collaborations as Collaboration[] | null)?.map((c) => (
          <li key={c.documents.id} className="border rounded-lg p-4 flex justify-between items-center">
            <div>
              <Link href={`/documents/${c.documents.id}`} className="font-medium underline">
                {c.documents.title}
              </Link>
              <p className="text-sm text-gray-500 capitalize">{c.role}</p>
            </div>
            <Link href={`/documents/${c.documents.id}`}>
              <Button variant="outline" size="sm">
                Open
              </Button>
            </Link>
          </li>
        ))}
      </ul>

      {collaborations?.length === 0 && (
        <p className="text-gray-500">No documents yet. Create your first one.</p>
      )}
    </div>
  )
}
