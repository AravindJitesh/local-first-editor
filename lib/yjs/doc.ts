import * as Y from 'yjs'

const docCache = new Map<string, { ydoc: Y.Doc; persistence: any }>()

export function getDocument(documentId: string) {
  const cached = docCache.get(documentId)
  if (cached) return cached

  const ydoc = new Y.Doc()
  let persistence = null

  if (typeof window !== 'undefined') {
    try {
      const { IndexeddbPersistence } = require('y-indexeddb')
      persistence = new IndexeddbPersistence(`doc-${documentId}`, ydoc)
    } catch (e) {
      console.warn('Failed to initialize IndexedDB persistence. falling back to in-memory Yjs doc.', e)
    }
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