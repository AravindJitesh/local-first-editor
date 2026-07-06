'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function NewDocumentButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function createDocument() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({ title: 'Untitled Document', owner_id: user.id })
      .select()
      .single()

    if (error || !doc) {
      setLoading(false)
      return
    }

    await supabase.from('collaborators').insert({
      document_id: doc.id,
      user_id: user.id,
      role: 'owner',
    })

    router.push(`/documents/${doc.id}`)
  }

  return (
    <Button onClick={createDocument} disabled={loading}>
      {loading ? 'Creating…' : 'New document'}
    </Button>
  )
}