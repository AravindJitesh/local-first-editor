import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          Local-First Collaborative Document Editor
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Write instantly, work offline, and sync seamlessly once reconnected. A premium real-time document editor powered by CRDTs.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          {user ? (
            <Link
              href="/documents"
              className="px-6 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition"
            >
              Go to Documents
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-6 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 text-base font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg shadow-sm transition"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
