import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-black">
          Local-First Collaborative Document Editor
        </h1>
        <p className="max-w-3xl mx-auto text-lg leading-8 text-gray-600">
          local-first collaborative document editor — like a lightweight Google Docs. You can type immediately, keep working offline, and when you reconnect, edits from multiple people merge automatically. It’s deployed on Vercel, backed by Supabase for auth and security, and uses Yjs CRDTs so there’s no central server sequencing every keystroke.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-6 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition"
          >
            Get Started
          </Link>
          <Link
            href="/documents"
            className="px-6 py-3 text-base font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg shadow-sm transition"
          >
            Go to Documents
          </Link>
        </div>
      </div>
    </div>
  )
}
