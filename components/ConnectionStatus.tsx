import { Badge } from '@/components/ui/badge'

export function ConnectionStatus({ status }: { status: 'offline' | 'connecting' | 'online' }) {
  const config = {
    online: { label: 'Synced', variant: 'default' as const },
    connecting: { label: 'Connecting…', variant: 'secondary' as const },
    offline: { label: 'Offline — editing locally', variant: 'destructive' as const },
  }[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}