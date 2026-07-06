import { createBrowserClient } from '@supabase/ssr'
import { createMockSupabaseClient } from './mock-client'

export function createClient() {
  if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true') {
    return createMockSupabaseClient()
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}