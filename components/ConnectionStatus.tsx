'use client'

import { Badge } from '@/components/ui/badge'

const states = {
  offline: {
    label: 'Offline',
    variant: 'destructive' as const,
    className: '',
  },
  connecting: {
    label: 'Connecting…',
    variant: 'secondary' as const,
    className: 'text-gray-900',
  },
  online: {
    label: 'Online',
    variant: 'default' as const,
    className: '',
  },
}

export function ConnectionStatus({
  status,
}: {
  status: 'offline' | 'connecting' | 'online'
}) {
  const state = states[status]

  return (
    <Badge
      variant={state.variant}
      className={state.className}
    >
      {state.label}
    </Badge>
  )
}