'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export function JoinLeagueButton({ leagueId, userId }: { leagueId: string; userId: string }) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function join() {
    setJoining(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('league_members')
      .insert({ league_id: leagueId, user_id: userId })

    if (err) {
      setError(err.message)
      setJoining(false)
    } else {
      router.push(`/leagues/${leagueId}`)
    }
  }

  return (
    <div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <Button onClick={join} disabled={joining} size="lg" className="w-full">
        {joining ? 'Joining…' : 'Join league'}
      </Button>
    </div>
  )
}
