'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function NewDocumentButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function createDocument() {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be signed in to create a document.')
        router.push('/login')
        return
      }

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({ title: 'Untitled Document', owner_id: user.id })
        .select()
        .single()

      if (docError || !doc) {
        setError(docError?.message ?? 'Could not create document. Please try again.')
        return
      }

      const { error: collaboratorError } = await supabase.from('collaborators').insert({
        document_id: doc.id,
        user_id: user.id,
        role: 'owner',
      })

      if (collaboratorError) {
        setError(collaboratorError.message)
        return
      }

      router.push(`/documents/${doc.id}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={createDocument} disabled={loading}>
        {loading ? 'Creating…' : 'New document'}
      </Button>
      {error && (
        <p className="text-sm text-red-500 max-w-xs text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}