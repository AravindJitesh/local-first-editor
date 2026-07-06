'use client'

import * as Y from 'yjs'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type Version = {
  id: string
  label: string
  created_at: string
}

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
      body: JSON.stringify({
        label,
        snapshot: Array.from(snapshot),
      }),
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

    ydoc.transact(() => {
      // 1. Restore the Y.XmlFragment 'content' for the editor
      const currentFragment = ydoc.getXmlFragment('content')
      const snapshotFragment = snapshotDoc.getXmlFragment('content')
      if (currentFragment.length > 0) {
        currentFragment.delete(0, currentFragment.length)
      }
      const clonedChildren = snapshotFragment.toArray().map((item: any) => {
        return typeof item.clone === 'function' ? item.clone() : item
      })
      currentFragment.insert(0, clonedChildren)

      // 2. Restore the Y.Text 'content' for unit tests and fallback compatibility
      const currentText = ydoc.getText('content')
      const snapshotText = snapshotDoc.getText('content')
      if (currentText.length > 0) {
        currentText.delete(0, currentText.length)
      }
      if (snapshotText.length > 0) {
        currentText.insert(0, snapshotText.toString())
      }
    }, 'restore')

    snapshotDoc.destroy()
  }

  return (
    <div className="flex flex-col gap-2 w-64 border-l pl-4">
      <div className="flex gap-2">
        <label htmlFor="version-label" className="sr-only">
          Version name
        </label>

        <input
          id="version-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Version name"
          className="border rounded px-2 py-1 text-sm flex-1"
          aria-label="Version name"
        />

        <Button size="sm" onClick={saveVersion}>
          Save
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {versions.map((v) => (
          <li
            key={v.id}
            className="flex justify-between items-center text-sm"
          >
            <span>{v.label}</span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreVersion(v.id)}
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}