'use client'

import { useRouter, usePathname } from 'next/navigation'

export function LeagueSelector({
  leagues,
  selectedLeagueId,
}: {
  leagues: { id: string; name: string }[]
  selectedLeagueId: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <select
      value={selectedLeagueId}
      onChange={e => router.replace(`${pathname}?league=${e.target.value}`)}
      className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
    >
      {leagues.map(l => (
        <option key={l.id} value={l.id}>{l.name}</option>
      ))}
    </select>
  )
}
