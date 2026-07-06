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

    await ownerClient.auth.signUp({ email: 'owner-test@example.com', password: 'testpass123' })
    await viewerClient.auth.signUp({ email: 'viewer-test@example.com', password: 'testpass123' })
    await outsiderClient.auth.signUp({ email: 'outsider-test@example.com', password: 'testpass123' })

    const { data: owner } = await ownerClient.auth.signInWithPassword({
      email: 'owner-test@example.com',
      password: 'testpass123',
    })

    const { data: doc } = await ownerClient
      .from('documents')
      .insert({ title: 'RLS Test Doc', owner_id: owner.user!.id } as any)
      .select()
      .single()

    documentId = (doc as any)!.id

    await ownerClient.from('collaborators').insert({
      document_id: documentId,
      user_id: owner.user!.id,
      role: 'owner',
    } as any)

    const { data: viewer } = await viewerClient.auth.signInWithPassword({
      email: 'viewer-test@example.com',
      password: 'testpass123',
    })

    await ownerClient.from('collaborators').insert({
      document_id: documentId,
      user_id: viewer.user!.id,
      role: 'viewer',
    } as any)

    await outsiderClient.auth.signInWithPassword({
      email: 'outsider-test@example.com',
      password: 'testpass123',
    })
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