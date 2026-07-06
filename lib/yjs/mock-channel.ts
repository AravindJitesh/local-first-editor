type BroadcastCallback = (payload: any) => void

export class MockRealtimeChannel {
  private topic: string
  private documentId: string
  private listeners: { [event: string]: BroadcastCallback[] } = {}
  private pollIntervalId: any = null
  private lastTimestamp: number = 0

  constructor(topic: string) {
    this.topic = topic
    this.documentId = topic.replace('doc-sync-', '')
    this.startPolling()
  }

  private startPolling() {
    if (typeof window === 'undefined') return
    
    const poll = async () => {
      if (!navigator.onLine) return
      
      try {
        const res = await fetch(`/api/mock-sync?documentId=${this.documentId}&since=${this.lastTimestamp}`)
        if (!res.ok) return
        const data = await res.json()
        
        if (data.updates && data.updates.length > 0) {
          this.lastTimestamp = data.timestamp
          const callbacks = this.listeners['broadcast:yjs-update'] || []
          data.updates.forEach((updateArray: number[]) => {
            callbacks.forEach(cb => cb({ payload: { update: updateArray } }))
          })
        }
      } catch (err) {
        // Ignore network errors when offline
      }
    }

    this.pollIntervalId = setInterval(poll, 45)
  }

  on(type: string, filter: any, callback: BroadcastCallback) {
    if (type === 'broadcast' && filter.event === 'yjs-update') {
      const key = 'broadcast:yjs-update'
      if (!this.listeners[key]) {
        this.listeners[key] = []
      }
      this.listeners[key].push(callback)
    }
    return this
  }

  subscribe(callback?: (status: string) => void) {
    setTimeout(() => {
      if (callback) callback('SUBSCRIBED')
    }, 0)
    return this
  }

  send(data: any) {
    if (typeof window !== 'undefined' && navigator.onLine && data.payload?.update) {
      fetch('/api/mock-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: this.documentId,
          update: data.payload.update
        })
      }).catch(() => {
        // Ignore errors during offline mode
      })
    }
    return 'ok'
  }

  unsubscribe() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId)
    }
  }
}
