import * as Y from 'yjs'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type ConnectionStatus = 'offline' | 'connecting' | 'online'

export class SupabaseYjsProvider {
  private ydoc: Y.Doc
  private documentId: string
  private channel: RealtimeChannel | null = null
  private supabase = createClient()
  private updateQueue: Uint8Array[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private onStatusChange: (status: ConnectionStatus) => void

  constructor(
    documentId: string,
    ydoc: Y.Doc,
    onStatusChange: (status: ConnectionStatus) => void
  ) {
    this.documentId = documentId
    this.ydoc = ydoc
    this.onStatusChange = onStatusChange

    this.ydoc.on('update', this.handleLocalUpdate)
    this.connect()

    window.addEventListener('online', () => this.connect())
    window.addEventListener('offline', () => this.onStatusChange('offline'))
  }

  private connect() {
    if (!navigator.onLine) {
      this.onStatusChange('offline')
      return
    }

    this.onStatusChange('connecting')

    this.channel = this.supabase
      .channel(`doc-sync-${this.documentId}`, { config: { private: true } })
      .on('broadcast', { event: 'yjs-update' }, (payload: any) => {
        const update = new Uint8Array(payload.payload.update)
        Y.applyUpdate(this.ydoc, update, 'remote')
      })
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          this.onStatusChange('online')
          this.flushQueue()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.onStatusChange('offline')
          this.scheduleReconnect()
        }
      })
  }

  private scheduleReconnect(attempt = 1) {
    const delay = Math.min(1000 * 2 ** attempt, 15000)
    setTimeout(() => this.connect(), delay)
  }

  private handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === 'remote') return
    this.updateQueue.push(update)
    this.scheduleFlush()
  }

  private scheduleFlush() {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => this.flushQueue(), 250)
  }

  private flushQueue() {
    this.flushTimer = null
    if (!this.channel || this.updateQueue.length === 0) return
    if (!navigator.onLine) return

    const merged = Y.mergeUpdates(this.updateQueue)
    this.updateQueue = []

    this.channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { update: Array.from(merged) },
    })
  }

  destroy() {
    this.ydoc.off('update', this.handleLocalUpdate)
    this.channel?.unsubscribe()
    if (this.flushTimer) clearTimeout(this.flushTimer)
  }
}