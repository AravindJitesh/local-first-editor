'use client'

import dynamic from 'next/dynamic'
import { getDocument } from '@/lib/yjs/doc'
import { VersionHistory } from '@/components/VersionHistory'
import { AISummary } from '@/components/AISummary'

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

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
      <div className="flex gap-6">
        <div className="flex-1">
          <Editor documentId={documentId} canEdit={canEdit} />
          <AISummary ydoc={ydoc} />
        </div>
        <VersionHistory documentId={documentId} ydoc={ydoc} versions={versions} />
      </div>
    </div>
  )
}