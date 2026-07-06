'use client'

import * as Y from 'yjs'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AISummary({ ydoc }: { ydoc: Y.Doc }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  async function generateSummary() {
    setLoading(true)
    const text = ydoc.getText('content').toString()

    const res = await fetch('/api/summarize', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })

    const data = await res.json()
    setSummary(data.summary ?? '')
    setLoading(false)
  }

  return (
    <div className="mt-4 border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-sm">AI Summary</h3>
        <Button size="sm" variant="outline" onClick={generateSummary} disabled={loading}>
          {loading ? 'Thinking…' : 'Summarize'}
        </Button>
      </div>
      {summary && <p className="text-sm text-gray-600">{summary}</p>}
    </div>
  )
}