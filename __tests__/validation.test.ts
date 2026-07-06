import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const versionSchema = z.object({
  label: z.string().min(1).max(100),
  snapshot: z.array(z.number().int().min(0).max(255)).max(1000),
})

describe('version payload validation', () => {
  it('rejects an oversized snapshot array', () => {
    const oversized = { label: 'test', snapshot: new Array(2000).fill(1) }
    expect(versionSchema.safeParse(oversized).success).toBe(false)
  })

  it('rejects a missing label', () => {
    const bad = { snapshot: [1, 2, 3] }
    expect(versionSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts a valid payload', () => {
    const good = { label: 'v1', snapshot: [1, 2, 3] }
    expect(versionSchema.safeParse(good).success).toBe(true)
  })
})