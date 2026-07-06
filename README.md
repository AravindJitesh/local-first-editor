This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Local-First Collaborative Document Editor

## Architecture
Edits live in a Y.Doc (Yjs CRDT) persisted to IndexedDB in the browser — that's the
source of truth for what the user sees, online or not. A Supabase Realtime broadcast
channel carries debounced, merged Yjs update bytes between clients once a connection
exists; there's no dedicated WebSocket server to run or scale separately.

## Why Yjs over Operational Transformation
OT needs a central server to sequence every operation, which conflicts with "start
typing with no network." CRDTs merge two divergent update sets deterministically
with no server arbitration required, which is what makes true offline-first possible.

## Why Supabase
Postgres, Auth, Row Level Security, and Realtime in one project meant no separate
auth service or hand-rolled pub/sub layer.

## Conflict resolution & restore safety
Concurrent edits merge automatically via Yjs's CRDT algorithm — order and timing
don't affect the final result (see __tests__/merge.test.ts). Restoring a version
never overwrites shared state; it computes the diff between the snapshot and the
current document (Y.encodeStateAsUpdate against the current state vector) and
applies only that diff, so a restore merges like any other edit and can't destroy
concurrent work from other collaborators.

## Known limitations
- A single Y.Doc's update history grows unbounded until compacted; this project
  snapshots on-demand but doesn't yet garbage-collect old Yjs updates automatically.
- Supabase Realtime broadcast has per-message size limits; very large simultaneous
  edits could need chunking in a production version.

## Scaling beyond one server
Realtime and Postgres are already externally hosted and horizontally scalable
under Supabase. The main scaling lever would be sharding documents across multiple
Realtime channels/projects by document ID range, and periodically compacting each
Y.Doc's update log into a single snapshot to bound storage growth.

## Testing
- `npm test` — unit tests: CRDT merge convergence, payload validation
- `npm run test:integration` — RLS/role enforcement against a live Supabase project
- `npx playwright test` — e2e offline-edit convergence across two browser contexts