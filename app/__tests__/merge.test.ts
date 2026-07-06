import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'

describe('CRDT merge convergence', () => {
  it('converges to the same document regardless of update order', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()

    docA.getText('content').insert(0, 'Hello')
    docB.getText('content').insert(0, 'Hola')

    const updateA = Y.encodeStateAsUpdate(docA)
    const updateB = Y.encodeStateAsUpdate(docB)

    const mergedForward = new Y.Doc()
    Y.applyUpdate(mergedForward, updateA)
    Y.applyUpdate(mergedForward, updateB)

    const mergedBackward = new Y.Doc()
    Y.applyUpdate(mergedBackward, updateB)
    Y.applyUpdate(mergedBackward, updateA)

    expect(mergedForward.getText('content').toString()).toBe(
      mergedBackward.getText('content').toString()
    )
  })
})