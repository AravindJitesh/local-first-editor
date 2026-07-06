import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('RLS: role and tenant isolation', () => {
  let ownerClient: ReturnType<typeof createClient>
  let viewerClient: ReturnType<typeof createClient>
  let outsiderClient: ReturnType<typeof createClient>
  let documentId: string

  beforeAll(async () => {
    ownerClient = createClient(supabaseUrl, anonKey)
    viewerClient = createClient(supabaseUrl, anonKey)
    outsiderClient = createClient(supabaseUrl, anonKey)

    async function getOrCreateUser(client: any, email: string) {
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email,
        password: 'testpass123',
      })
      if (!signInError && signInData?.user) {
        return signInData.user
      }
      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email,
        password: 'testpass123',
      })
      if (signUpError) {
        const { data: retryData } = await client.auth.signInWithPassword({
          email,
          password: 'testpass123',
        })
        if (retryData?.user) return retryData.user
        throw new Error(`Auth failed for ${email}: ${signUpError.message}`)
      }
      return signUpData.user!
    }

    const ownerUser = await getOrCreateUser(ownerClient, 'owner-test-edtech@gmail.com')
    const viewerUser = await getOrCreateUser(viewerClient, 'viewer-test-edtech@gmail.com')
    const outsiderUser = await getOrCreateUser(outsiderClient, 'outsider-test-edtech@gmail.com')

    const { data: doc } = await ownerClient
      .from('documents')
      .insert({ title: 'RLS Test Doc', owner_id: ownerUser.id } as any)
      .select()
      .single()

    documentId = (doc as any)!.id

    await ownerClient.from('collaborators').insert({
      document_id: documentId,
      user_id: ownerUser.id,
      role: 'owner',
    } as any)

    await ownerClient.from('collaborators').insert({
      document_id: documentId,
      user_id: viewerUser.id,
      role: 'viewer',
    } as any)
  })

  it('allows a viewer to read the document', async () => {
    const { data, error } = await viewerClient.from('documents').select().eq('id', documentId).single()
    expect(error).toBeNull()
    expect((data as any)?.title).toBe('RLS Test Doc')
  })

  it('rejects a viewer inserting a version', async () => {
    const { error } = await viewerClient.from('versions').insert({
      document_id: documentId,
      label: 'sneaky version',
      snapshot: Buffer.from([1, 2, 3]),
    } as any)
    expect(error).not.toBeNull()
  })

  it('denies a user from another tenant from reading the document', async () => {
    const { data } = await outsiderClient.from('documents').select().eq('id', documentId)
    expect(data).toHaveLength(0)
  })
})