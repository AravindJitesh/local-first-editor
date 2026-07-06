import { NextResponse } from 'next/server'

// Persist updates in-memory on the server.
// Using a global variable because Next.js dev server retains it.
const globalUpdates: { [docId: string]: { timestamp: number; update: number[] }[] } = {}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docId = searchParams.get('documentId')
  const since = parseInt(searchParams.get('since') || '0', 10)

  if (!docId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
  }

  const updates = globalUpdates[docId] || []
  const newUpdates = updates.filter(u => u.timestamp > since)

  return NextResponse.json({
    updates: newUpdates.map(u => u.update),
    timestamp: updates.length > 0 ? updates[updates.length - 1].timestamp : since
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !body.documentId || !body.update) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { documentId, update } = body
  if (!globalUpdates[documentId]) {
    globalUpdates[documentId] = []
  }

  const timestamp = Date.now()
  globalUpdates[documentId].push({ timestamp, update })

  return NextResponse.json({ success: true, timestamp })
}
