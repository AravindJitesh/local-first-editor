import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

const docCache = new Map<string, { ydoc: Y.Doc; persistence: IndexeddbPersistence }>()

export function getDocument(documentId: string) {
  const cached = docCache.get(documentId)
  if (cached) return cached

  const ydoc = new Y.Doc()
  const persistence = new IndexeddbPersistence(`doc-${documentId}`, ydoc)

  const entry = { ydoc, persistence }
  docCache.set(documentId, entry)
  return entry
}

export function destroyDocument(documentId: string) {
  const entry = docCache.get(documentId)
  if (!entry) return
  entry.persistence.destroy()
  entry.ydoc.destroy()
  docCache.delete(documentId)
}