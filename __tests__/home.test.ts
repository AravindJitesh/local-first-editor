import { describe, expect, it } from 'vitest'
import { shouldRedirectToDocuments } from '../lib/home'

describe('home routing', () => {
  it('keeps the landing page visible for signed-in users', () => {
    expect(shouldRedirectToDocuments({ id: 'user-1' } as { id: string })).toBe(false)
  })

  it('does not redirect anonymous visitors', () => {
    expect(shouldRedirectToDocuments(null)).toBe(false)
  })
})
