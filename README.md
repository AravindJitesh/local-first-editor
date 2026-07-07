# Local-First Collaborative Document Editor

A lightweight Google Docs-style editor built with Next.js, Supabase, TipTap, and Yjs. The editor is designed around a local-first model: users can type immediately, keep working offline, and merge edits from multiple clients when they reconnect.

## Evaluation Coverage

| Criteria | Where it is addressed |
| --- | --- |
| Offline sync | `lib/yjs/doc.ts`, `lib/yjs/supabase-provider.ts`, `lib/yjs/mock-channel.ts`, `e2e/offline-sync.spec.ts` |
| Deterministic conflict resolution | Yjs CRDT updates, covered by `__tests__/merge.test.ts` |
| Version history | `components/VersionHistory.tsx`, `app/documents/[id]/versions/route.ts`, Supabase `versions` table |
| Validation | Zod payload checks in `app/documents/[id]/versions/route.ts` and `__tests__/validation.test.ts` |
| Authentication and authorization | Supabase Auth, middleware protection, RLS policies in `supabase/schema.sql`, integration test in `__tests__/rls.integration.test.ts` |
| UI and accessibility | Clear document list, editor region labeling, keyboard-accessible version naming, connection status indicator |
| CI/CD | `.github/workflows/playwright.yml` runs lint, unit tests, build, and Playwright e2e tests |

## Architecture

Edits live in a Y.Doc persisted to IndexedDB in the browser. That local Y.Doc is the source of truth for the typing experience, so editing does not wait for a server round trip.

When a network connection is available, `SupabaseYjsProvider` listens for local Yjs updates, batches rapid typing for 100ms, merges queued updates with `Y.mergeUpdates`, and sends the compacted update over a private Supabase Realtime channel. Remote updates are applied with origin `remote`, so they do not echo back into the outbound queue.

In mock/test mode, `MockRealtimeChannel` simulates the same broadcast behavior with a local API route so the offline-sync e2e test can run without a live Supabase project.

## Conflict Resolution

The app uses Yjs CRDTs instead of Operational Transformation. OT usually requires a central authority to sequence every operation; CRDT updates can be produced offline and merged later in any order.

The merge property is tested in `__tests__/merge.test.ts`: applying update A then B produces the same document content as applying B then A. The offline e2e test opens two clients, disconnects both, types divergent edits, reconnects, and verifies both clients converge without losing either edit.

## Version History

Users can save named versions from the current Y.Doc state. Version payloads are validated before insert and stored in Supabase as binary snapshots.

Restore is intentionally merge-like rather than a blind database overwrite. The client loads the saved Yjs snapshot into a temporary Y.Doc, replaces the shared editor fragment inside a Yjs transaction, and lets that transaction sync like any other edit. That means restore participates in the same CRDT pipeline and remains visible to other collaborators through normal sync.

## Auth And Authorization

Authenticated users can create documents through RPC helpers that atomically insert the document and collaborator row. Documents, collaborators, versions, and Realtime messages are protected by RLS policies. The integration test verifies that:

- A collaborator can read a shared document.
- A viewer cannot insert a version.
- An unrelated authenticated user cannot read another document.

## Real-World Considerations

### Document State Growth

Yjs updates are efficient for editing, but an endlessly edited document can accumulate a large update history. A production deployment should add scheduled compaction:

- Store append-only updates for audit/recovery.
- Periodically materialize a compact snapshot with `Y.encodeStateAsUpdate`.
- Keep recent incremental updates after the snapshot for fast catch-up.
- Archive or delete superseded updates after the retention window.

This bounds load time, IndexedDB usage, Realtime catch-up size, and database storage while preserving restore points.

### Large Updates And Transport Limits

Supabase Realtime broadcasts can hit message-size limits for pasted content, images, or large restores. Production handling should:

- Split large Yjs updates into chunks with document ID, update ID, sequence number, total count, and checksum.
- Reassemble chunks before applying the update.
- Fall back to a database-backed update record when the payload exceeds the Realtime threshold.
- Apply idempotency keys so retries do not duplicate an update.

### Rapid Typing And Client Lag

The provider batches local updates for 100ms and merges the queue before sending. This keeps typing responsive and avoids one network message per keystroke. For larger teams, the next optimization would be adaptive flushing: short delays while typing normally, longer batching during paste/import operations, and backpressure when the outbound queue grows.

### Reconnect And Offline Behavior

Local edits are available immediately because IndexedDB persists the Y.Doc. When the browser goes offline, the provider marks the connection offline and keeps local updates queued. When the browser returns online, it reconnects to the private channel and flushes the merged queue.

Production hardening should also include exponential reconnect jitter, an explicit "sync pending" count, and a durable outbound queue if edits must survive browser tab crashes before IndexedDB persistence catches up.

### Security Boundaries

The client is not trusted to enforce access. Authorization lives in Supabase RLS and RPC functions. Private Realtime channels are scoped by document ID, and policies check collaborator membership before allowing read or write events.

### Observability

Useful production metrics would include update queue length, flush latency, reconnect count, Y.Doc encoded size, snapshot save time, restore time, and rejected RLS operations. These are the signals that reveal slow documents, oversized updates, and authorization regressions.

## Running Locally

```bash
npm ci
NEXT_PUBLIC_MOCK_SUPABASE=true npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run test:unit -- --run
npm run build
npx playwright test
```

For live authorization testing, set Supabase environment variables and run:

```bash
npm run test:integration
```

## Deployment

The app is compatible with Vercel. Required production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Any provider key needed by `app/api/summarize/route.ts`

The GitHub Actions workflow validates lint, unit tests, production build, and Playwright e2e coverage on pushes and pull requests.
