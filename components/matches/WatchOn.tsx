'use client'

import { useEffect, useState } from 'react'
import { Tv } from 'lucide-react'
import { getBroadcastersForTimezone, type Broadcaster } from '@/lib/broadcasters'

const MAX_CHANNELS = 3

export function WatchOn() {
  const [channels, setChannels] = useState<Broadcaster[] | null>(null)

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setChannels(getBroadcastersForTimezone(tz))
  }, [])

  if (!channels) return null

  const displayed = channels.slice(0, MAX_CHANNELS)
  const overflow = channels.length - MAX_CHANNELS

  const allFree = channels.every(c => c.free)
  const allPaid = channels.every(c => !c.free)
  const tag = allFree ? 'free' : allPaid ? 'subscription' : null

  return (
    <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
      <Tv className="h-3 w-3 shrink-0" />
      <span>
        {displayed.map(c => c.name).join(' · ')}
        {overflow > 0 && ` +${overflow}`}
        {tag && <span className="ml-1 text-gray-300">({tag})</span>}
      </span>
    </p>
  )
}
