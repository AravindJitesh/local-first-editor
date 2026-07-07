'use client'

import dynamic from 'next/dynamic'
import { getDocument, destroyDocument } from '@/lib/yjs/doc'
import { VersionHistory } from '@/components/VersionHistory'
import { AISummary } from '@/components/AISummary'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const Editor = dynamic(() => import('@/components/Editor').then((m) => m.Editor), {
  ssr: false,
  loading: () => <div className="min-h-[400px] flex items-center justify-center text-gray-400">Loading editor…</div>,
})

type Version = { id: string; label: string; created_at: string }

export function DocumentClient({
  documentId,
  title,
  role,
  versions,
}: {
  documentId: string
  title: string
  role: string
  versions: Version[]
}) {
  const { ydoc } = getDocument(documentId)
  const canEdit = role === 'owner' || role === 'editor'
  const isOwner = role === 'owner'
  
  const [docTitle, setDocTitle] = useState(title)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setDocTitle(title)
  }, [title])

  async function handleTitleChange(newTitle: string) {
    setIsEditingTitle(false)
    setActionError(null)
    const trimmed = newTitle.trim()
    if (!trimmed || trimmed === title) {
      setDocTitle(title)
      return
    }
    setIsSavingTitle(true)
    try {
      const { error } = await supabase.rpc('update_document_title', {
        document_id: documentId,
        new_title: trimmed,
      })
      if (error) {
        setDocTitle(title)
        setActionError(error.message || 'Could not rename document.')
        return
      }
      setDocTitle(trimmed)
      router.refresh()
    } finally {
      setIsSavingTitle(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this document?')) return
    setActionError(null)
    setIsDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_document', {
        document_id: documentId,
      })
      if (error) {
        setActionError(error.message || 'Could not delete document.')
        return
      }
      destroyDocument(documentId)
      router.push('/documents')
      router.refresh()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <Link href="/documents" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition">
        ← Back to Documents
      </Link>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 mr-4">
          {isEditingTitle && canEdit ? (
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              onBlur={() => handleTitleChange(docTitle)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleChange(docTitle)
                if (e.key === 'Escape') {
                  setDocTitle(title)
                  setIsEditingTitle(false)
                }
              }}
              className="text-2xl font-semibold border-b focus:outline-none w-full max-w-md py-1"
              autoFocus
              disabled={isSavingTitle}
              aria-label="Document Title"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 
                className={`text-2xl font-semibold ${canEdit ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 px-2 py-1 rounded transition' : ''}`}
                onClick={() => canEdit && !isSavingTitle && setIsEditingTitle(true)}
                title={canEdit ? 'Click to rename' : undefined}
              >
                {docTitle}
              </h1>
              {isSavingTitle && (
                <span className="text-sm text-gray-400">Saving…</span>
              )}
              {canEdit && !isSavingTitle && (
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                  aria-label="Edit title"
                >
                  ✎
                </button>
              )}
            </div>
          )}
        </div>
        
        {isOwner && (
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete Document'}
          </Button>
        )}
      </div>

      {actionError && (
        <p className="text-sm text-red-500 mb-4" role="alert">
          {actionError}
        </p>
      )}

      <div className="flex gap-6">
        <div className="flex-1">
          <EditorErrorBoundary>
            <Editor documentId={documentId} canEdit={canEdit} />
          </EditorErrorBoundary>
          <AISummary ydoc={ydoc} />
        </div>
        <VersionHistory documentId={documentId} ydoc={ydoc} versions={versions} />
      </div>
    </div>
  )
}