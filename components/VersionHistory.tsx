'use client'

import * as Y from 'yjs'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  const [localVersions, setLocalVersions] = useState(versions)
  const [saving, setSaving] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true') {
      const fetchMockVersions = async () => {
        const { data } = await supabase
          .from('versions')
          .select('id, label, created_at')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
        if (data) setLocalVersions(data as any)
      }
      fetchMockVersions()
    } else {
      setLocalVersions(versions)
    }
  }, [versions, documentId, supabase])

  async function saveVersion() {
    const trimmed = label.trim()
    if (!trimmed || saving) return

    setSaving(true)
    setError(null)

    try {
      const snapshot = Y.encodeStateAsUpdate(ydoc)

      if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true') {
        const { error: insertErr } = await supabase.from('versions').insert({
          document_id: documentId,
          label: trimmed,
          snapshot: Array.from(snapshot),
        } as any)
        if (insertErr) throw new Error(insertErr.message)

        const { data } = await supabase
          .from('versions')
          .select('id, label, created_at')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
        if (data) setLocalVersions(data as any)

        setLabel('')
        router.refresh()
        return
      }

      const response = await fetch(`/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: trimmed,
          snapshot: Array.from(snapshot),
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? 'Could not save version.')
      }

      setLabel('')
      setLocalVersions((prev) => [
        {
          id: `pending-${Date.now()}`,
          label: trimmed,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save version.')
    } finally {
      setSaving(false)
    }
  }

  function decodeSnapshot(snapshot: unknown): Uint8Array | null {
    if (snapshot instanceof Uint8Array) return snapshot
    if (snapshot instanceof ArrayBuffer) return new Uint8Array(snapshot)
    if (ArrayBuffer.isView(snapshot)) return new Uint8Array((snapshot as ArrayBufferView).buffer)
    if (Array.isArray(snapshot)) return new Uint8Array(snapshot as number[])
    if (typeof snapshot === 'object' && snapshot !== null && 'data' in snapshot && Array.isArray((snapshot as any).data)) {
      return new Uint8Array((snapshot as any).data)
    }
    if (typeof snapshot === 'string') {
      const trimmed = snapshot.trim()

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            return new Uint8Array(parsed as number[])
          }
          if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).data)) {
            return new Uint8Array((parsed as any).data)
          }
        } catch {
          // Fall through to other parsing below
        }
      }

      if (/^\\x[0-9a-fA-F]+$/.test(trimmed)) {
        const hex = trimmed.slice(2)
        const bytes = hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
        return new Uint8Array(bytes)
      }

      if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
        const bytes = trimmed.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
        return new Uint8Array(bytes)
      }

      if (/^[0-9]+(,[0-9]+)*$/.test(trimmed)) {
        return new Uint8Array(trimmed.split(',').map((item) => Number(item.trim())))
      }

      try {
        const raw = typeof atob === 'function'
          ? atob(trimmed)
          : Buffer.from(trimmed, 'base64').toString('binary')
        return new Uint8Array(Array.from(raw, (c) => c.charCodeAt(0)))
      } catch {
        return null
      }
    }
    return null
  }

  async function restoreVersion(versionId: string) {
    if (restoringId) return

    setRestoringId(versionId)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('versions')
        .select('snapshot')
        .eq('id', versionId)
        .single()

      if (fetchError || !data) {
        throw new Error(fetchError?.message ?? 'Could not load version.')
      }

      const snapshotUpdate = decodeSnapshot(data.snapshot)
      if (!snapshotUpdate) {
        throw new Error('Invalid snapshot data.')
      }

      const snapshotDoc = new Y.Doc()
      Y.applyUpdate(snapshotDoc, snapshotUpdate)

      ydoc.transact(() => {
        const currentFragment = ydoc.getXmlFragment('content')
        const snapshotFragment = snapshotDoc.getXmlFragment('content')
        if (currentFragment.length > 0) {
          currentFragment.delete(0, currentFragment.length)
        }
        const clonedChildren = snapshotFragment.toArray().map((item: any) => {
          return typeof item.clone === 'function' ? item.clone() : item
        })
        currentFragment.insert(0, clonedChildren)

        const shareType = ydoc.share.get('content')
        if (!shareType || shareType instanceof Y.Text) {
          const currentText = ydoc.getText('content')
          const snapshotText = snapshotDoc.getText('content')
          if (currentText.length > 0) {
            currentText.delete(0, currentText.length)
          }
          if (snapshotText.length > 0) {
            currentText.insert(0, snapshotText.toString())
          }
        }
      }, 'restore')

      snapshotDoc.destroy()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore version.')
    } finally {
      setRestoringId(null)
    }
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveVersion()
          }}
          placeholder="Version name"
          className="border rounded px-2 py-1 text-sm flex-1"
          aria-label="Version name"
          disabled={saving}
        />

        <Button size="sm" onClick={saveVersion} disabled={saving || !label.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {localVersions.map((v) => (
          <li
            key={v.id}
            className="flex justify-between items-center text-sm"
          >
            <span>{v.label}</span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreVersion(v.id)}
              disabled={restoringId !== null || v.id.startsWith('pending-')}
            >
              {restoringId === v.id ? 'Restoring…' : 'Restore'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}