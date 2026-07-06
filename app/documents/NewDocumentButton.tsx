'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function NewDocumentButton() {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function createDocument() {
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Please enter a document title.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be signed in to create a document.')
        router.push('/login')
        return
      }

      const { data: docId, error: docError } = await supabase.rpc('create_document', {
        document_title: trimmed,
      })

      if (docError || !docId) {
        setError(docError?.message ?? 'Could not create document. Please try again.')
        return
      }

      router.push(`/documents/${docId}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2 w-full max-w-lg">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') createDocument()
          }}
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Document title"
          aria-label="Document title"
          disabled={loading}
        />
        <Button onClick={createDocument} disabled={loading || !title.trim()}>
          {loading ? 'Creating…' : 'New document'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-500 max-w-xs text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}