import * as Y from 'yjs'

type Persistence = {
  destroy: () => void
}

const docCache = new Map<string, { ydoc: Y.Doc; persistence: Persistence | null }>()

export function getDocument(documentId: string) {
  const cached = docCache.get(documentId)
  if (cached) return cached

  const ydoc = new Y.Doc()
  const persistence = null

  if (typeof window !== 'undefined') {
    import('y-indexeddb')
      .then(({ IndexeddbPersistence }) => {
        const current = docCache.get(documentId)
        if (!current || current.ydoc !== ydoc || current.persistence) return
        current.persistence = new IndexeddbPersistence(`doc-${documentId}`, ydoc)
      })
      .catch((error: unknown) => {
        console.warn('Failed to initialize IndexedDB persistence. falling back to in-memory Yjs doc.', error)
      })
  }

  const entry = { ydoc, persistence }
  docCache.set(documentId, entry)
  return entry
}

export function destroyDocument(documentId: string) {
  const entry = docCache.get(documentId)
  if (!entry) return
  entry.persistence?.destroy()
  entry.ydoc.destroy()
  docCache.delete(documentId)
}
