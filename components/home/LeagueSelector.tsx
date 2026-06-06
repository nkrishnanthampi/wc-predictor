'use client'

import { useRouter, usePathname } from 'next/navigation'

const COOKIE = 'preferred_league_id'

export function LeagueSelector({
  leagues,
  selectedLeagueId,
}: {
  leagues: { id: string; name: string }[]
  selectedLeagueId: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  function handleChange(id: string) {
    document.cookie = `${COOKIE}=${id}; path=/; max-age=31536000; SameSite=Lax`
    router.replace(`${pathname}?league=${id}`)
  }

  return (
    <select
      value={selectedLeagueId}
      onChange={e => handleChange(e.target.value)}
      className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
    >
      {leagues.map(l => (
        <option key={l.id} value={l.id}>{l.name}</option>
      ))}
    </select>
  )
}
