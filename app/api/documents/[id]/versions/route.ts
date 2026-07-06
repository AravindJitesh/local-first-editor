import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024

const versionSchema = z.object({
  label: z.string().min(1).max(100),
  snapshot: z.array(z.number().int().min(0).max(255)).max(MAX_SNAPSHOT_BYTES),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = versionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const { error } = await supabase.from('versions').insert({
    document_id: id,
    label: parsed.data.label,
    snapshot: Buffer.from(parsed.data.snapshot),
    created_by: user.user.id,
  })

  if (error) {
    return NextResponse.json({ error: 'insert failed' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}