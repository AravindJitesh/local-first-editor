import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const requestSchema = z.object({
  text: z.string().min(1).max(20000),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    prompt: `Summarize this document in two short sentences:\n\n${parsed.data.text}`,
  })

  return NextResponse.json({ summary: text })
}