'use client'

import * as Y from 'yjs'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AISummary({ ydoc }: { ydoc: Y.Doc }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  async function generateSummary() {
    setLoading(true)
    try {
      // Extract plain text from Tiptap XML fragment by stripping tags
      const xmlFragment = ydoc.getXmlFragment('content')
      const xmlString = xmlFragment.toString()
      let text = xmlString ? xmlString.replace(/<[^>]*>/g, ' ').trim() : ''

      // Fallback to Y.Text content for unit tests and fallback compatibility
      if (!text) {
        text = ydoc.getText('content').toString().trim()
      }

      if (!text) {
        setSummary('The document is empty. Type some content first to generate a summary.')
        return
      }

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setSummary(`Failed to generate summary: ${errData.error || 'Server error'}`)
        return
      }

      const data = await res.json()
      setSummary(data.summary ?? '')
    } catch (err) {
      console.error('Error generating summary:', err)
      setSummary('Failed to contact the summarization service. Please check your network and API keys.')
    } finally {
      setLoading(false)
    }
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