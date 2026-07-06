import { MockRealtimeChannel } from '../yjs/mock-channel'

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
                        return { data: { title: 'Mock Document' }, error: null }
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
                    return { data: { title: 'Mock Document' }, error: null }
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
                    return Promise.resolve(onfulfilled({
                      data: [
                        { role: 'owner', documents: { id: 'mock-doc-id', title: 'Mock Document', created_at: new Date().toISOString() } }
                      ],
                      error: null
                    }))
                  }
                  return Promise.resolve(onfulfilled({ data: [], error: null }))
                }
              }
              return eqResult
            },
            single: async () => {
              if (table === 'documents') {
                return { data: { title: 'Mock Document' }, error: null }
              }
              return { data: null, error: null }
            },
            then: (onfulfilled: any) => {
              if (table === 'collaborators') {
                return Promise.resolve(onfulfilled({
                  data: [
                    { role: 'owner', documents: { id: 'mock-doc-id', title: 'Mock Document', created_at: new Date().toISOString() } }
                  ],
                  error: null
                }))
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
        }
      }
      return builder
    },
    channel: (topic: string) => {
      return new MockRealtimeChannel(topic)
    }
  }
}
