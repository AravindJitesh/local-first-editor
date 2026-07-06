'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { useEffect, useState } from 'react'
import { getDocument } from '@/lib/yjs/doc'
import { SupabaseYjsProvider } from '@/lib/yjs/supabase-provider'
import { ConnectionStatus } from './ConnectionStatus'

export function Editor({ documentId, canEdit }: { documentId: string; canEdit: boolean }) {
  const [status, setStatus] = useState<'offline' | 'connecting' | 'online'>('offline')
  const [provider, setProvider] = useState<SupabaseYjsProvider | null>(null)
  const { ydoc } = getDocument(documentId)

  useEffect(() => {
    const p = new SupabaseYjsProvider(documentId, ydoc, setStatus)
    setProvider(p)
    return () => p.destroy()
  }, [documentId, ydoc])

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      Collaboration.configure({ document: ydoc, field: 'content' }),
    ],
    editable: canEdit,
  })

  return (
  <div className="flex flex-col gap-3">
    <ConnectionStatus status={status} />

    <div
      role="region"
      aria-label="Document editor"
      className="border rounded-lg p-4 min-h-[400px] prose"
    >
      <EditorContent
        editor={editor}
        aria-multiline="true"
      />
    </div>
  </div>
)
}