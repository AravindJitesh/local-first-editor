'use client'

import * as Y from 'yjs'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type Version = { id: string; label: string; created_at: string }

export function VersionHistory({
  documentId,
  ydoc,
  versions,
}: {
  documentId: string
  ydoc: Y.Doc
  versions: Version[]
}) {
  const [label, setLabel] = useState('')
  const supabase = createClient()

  async function saveVersion() {
    if (!label.trim()) return
    const snapshot = Y.encodeStateAsUpdate(ydoc)

    await fetch(`/api/documents/${documentId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ label, snapshot: Array.from(snapshot) }),
    })
    setLabel('')
  }

  async function restoreVersion(versionId: string) {
    const { data } = await supabase
      .from('versions')
      .select('snapshot')
      .eq('id', versionId)
      .single()

    if (!data) return

    const snapshotUpdate = new Uint8Array(data.snapshot)
    const snapshotDoc = new Y.Doc()
    Y.applyUpdate(snapshotDoc, snapshotUpdate)

    const currentState = Y.encodeStateVector(ydoc)
    const diff = Y.encodeStateAsUpdate(snapshotDoc, currentState)

    Y.applyUpdate(ydoc, diff, 'restore')
    snapshotDoc.destroy()
  }

  return (
    <div className="flex flex-col gap-2 w-64 border-l pl-4">
      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="version name"
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <Button size="sm" onClick={saveVersion}>Save</Button>
      </div>
      {versions.map((v) => (
        <div key={v.id} className="flex justify-between items-center text-sm">
          <span>{v.label}</span>
          <Button size="sm" variant="outline" onClick={() => restoreVersion(v.id)}>
            Restore
          </Button>
        </div>
      ))}
    </div>
  )
}