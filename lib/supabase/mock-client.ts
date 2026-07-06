import { MockRealtimeChannel } from '../yjs/mock-channel'

const MOCK_DOCS_KEY = 'mock_documents'

type MockDoc = { id: string; title: string; created_at: string }

function readMockDocs(): MockDoc[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(MOCK_DOCS_KEY) || '[]')
}

function writeMockDocs(docs: MockDoc[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MOCK_DOCS_KEY, JSON.stringify(docs))
}

function getMockDocTitle(docId: string) {
  const doc = readMockDocs().find((d) => d.id === docId)
  return doc?.title ?? 'Mock Document'
}

export function createMockSupabaseClient(): any {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'mock-user-123',
            email: 'mock@example.com',
          }
        },
        error: null
      }),
      signUp: async ({ email }: { email: string }) => ({
        data: {
          user: {
            id: 'mock-user-123',
            email,
          }
        },
        error: null
      }),
      signInWithPassword: async ({ email }: { email: string }) => ({
        data: {
          user: {
            id: 'mock-user-123',
            email,
          }
        },
        error: null
      }),
    },
    from: (table: string) => {
      const builder = {
        select: (columns?: string) => {
          const selectResult = {
            eq: (col: string, val: any) => {
              const eqResult = {
                eq: (col2: string, val2: any) => {
                  const eq2Result = {
                    single: async () => {
                      if (table === 'collaborators') {
                        return { data: { role: 'owner' }, error: null }
                      }
                      if (table === 'documents') {
                        return { data: { title: getMockDocTitle(val) }, error: null }
                      }
                      return { data: null, error: null }
                    }
                  }
                  return eq2Result
                },
                single: async () => {
                  if (table === 'collaborators') {
                    return { data: { role: 'owner' }, error: null }
                  }
                  if (table === 'documents') {
                    return { data: { title: getMockDocTitle(val) }, error: null }
                  }
                  if (table === 'versions') {
                    if (typeof window !== 'undefined') {
                      const saved = localStorage.getItem(`mock_version_${val}`)
                      if (saved) {
                        return { data: { snapshot: JSON.parse(saved) }, error: null }
                      }
                    }
                    return { data: { snapshot: [] }, error: null }
                  }
                  return { data: null, error: null }
                },
                order: (colOrder: string, options?: any) => {
                  return {
                    then: (onfulfilled: any) => {
                      let list = []
                      if (typeof window !== 'undefined') {
                        list = JSON.parse(localStorage.getItem('mock_versions') || '[]')
                      }
                      return Promise.resolve(onfulfilled({ data: list, error: null }))
                    }
                  }
                },
                then: (onfulfilled: any) => {
                  if (table === 'collaborators') {
                    const docs = readMockDocs()
                    const list = docs.length > 0
                      ? docs.map((doc) => ({
                          role: 'owner',
                          documents: doc,
                        }))
                      : [{
                          role: 'owner',
                          documents: {
                            id: 'mock-doc-id',
                            title: 'Mock Document',
                            created_at: new Date().toISOString(),
                          },
                        }]
                    return Promise.resolve(onfulfilled({ data: list, error: null }))
                  }
                  return Promise.resolve(onfulfilled({ data: [], error: null }))
                }
              }
              return eqResult
            },
            single: async () => {
              if (table === 'documents') {
                return { data: { title: getMockDocTitle('mock-doc-id') }, error: null }
              }
              return { data: null, error: null }
            },
            then: (onfulfilled: any) => {
              if (table === 'collaborators') {
                const docs = readMockDocs()
                const list = docs.length > 0
                  ? docs.map((doc) => ({
                      role: 'owner',
                      documents: doc,
                    }))
                  : [{
                      role: 'owner',
                      documents: {
                        id: 'mock-doc-id',
                        title: 'Mock Document',
                        created_at: new Date().toISOString(),
                      },
                    }]
                return Promise.resolve(onfulfilled({ data: list, error: null }))
              }
              return Promise.resolve(onfulfilled({ data: [], error: null }))
            }
          }
          return selectResult
        },
        insert: (data: any) => {
          const insertResult = {
            select: () => {
              return {
                single: async () => {
                  if (table === 'documents') {
                    return { data: { id: 'mock-doc-id', title: data.title }, error: null }
                  }
                  return { data: null, error: null }
                }
              }
            },
            then: (onfulfilled: any) => {
              if (table === 'versions') {
                if (typeof window !== 'undefined') {
                  const list = JSON.parse(localStorage.getItem('mock_versions') || '[]')
                  const newVer = {
                    id: `v-${Date.now()}`,
                    label: data.label,
                    created_at: new Date().toISOString()
                  }
                  list.unshift(newVer)
                  localStorage.setItem('mock_versions', JSON.stringify(list))
                  localStorage.setItem(`mock_version_${newVer.id}`, JSON.stringify(data.snapshot))
                }
              }
              return Promise.resolve(onfulfilled({ error: null }))
            }
          }
          return insertResult
        },
        update: (data: any) => {
          return {
            eq: (col: string, val: any) => {
              return Promise.resolve({ error: null })
            }
          }
        },
        delete: () => {
          return {
            eq: (col: string, val: any) => {
              return Promise.resolve({ error: null })
            }
          }
        }
      }
      return builder
    },
    channel: (topic: string) => {
      return new MockRealtimeChannel(topic)
    },
    rpc: (fn: string, args?: Record<string, unknown>) => {
      if (fn === 'create_document') {
        const docId = `mock-doc-${Date.now()}`
        const title = (args?.document_title as string) || 'Untitled Document'
        const docs = readMockDocs()
        docs.unshift({ id: docId, title, created_at: new Date().toISOString() })
        writeMockDocs(docs)
        return Promise.resolve({ data: docId, error: null })
      }
      if (fn === 'update_document_title') {
        const docId = args?.document_id as string
        const title = (args?.new_title as string)?.trim()
        if (!title) {
          return Promise.resolve({ data: null, error: { message: 'Title cannot be empty' } })
        }
        const docs = readMockDocs()
        const index = docs.findIndex((doc) => doc.id === docId)
        if (index === -1) {
          return Promise.resolve({ data: null, error: { message: 'Not authorized to rename this document' } })
        }
        docs[index] = { ...docs[index], title }
        writeMockDocs(docs)
        return Promise.resolve({ data: null, error: null })
      }
      if (fn === 'delete_document') {
        const docId = args?.document_id as string
        const docs = readMockDocs()
        const next = docs.filter((doc) => doc.id !== docId)
        if (next.length === docs.length) {
          return Promise.resolve({ data: null, error: { message: 'Not authorized to delete this document' } })
        }
        writeMockDocs(next)
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
  }
}
