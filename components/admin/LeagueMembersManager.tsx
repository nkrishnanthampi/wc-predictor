'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { UserPlus, X } from 'lucide-react'

interface Profile {
  id: string
  email: string
  display_name: string
}

interface Member extends Profile {
  joined_at: string
}

interface League {
  id: string
  name: string
  members: Member[]
}

interface Props {
  leagues: League[]
  allUsers: Profile[]
}

export function LeagueMembersManager({ leagues, allUsers }: Props) {
  return (
    <div className="space-y-6">
      {leagues.map(league => (
        <LeagueCard key={league.id} league={league} allUsers={allUsers} />
      ))}
    </div>
  )
}

function LeagueCard({ league, allUsers }: { league: League; allUsers: Profile[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const memberIds = new Set(league.members.map(m => m.id))
  const available = allUsers.filter(u => !memberIds.has(u.id))

  async function addUser() {
    if (!selectedUserId) return
    setFeedback('')
    const res = await fetch('/api/admin/league-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: league.id, userId: selectedUserId }),
    })
    const data = await res.json()
    if (res.ok) {
      setSelectedUserId('')
      setFeedback('User added.')
      startTransition(() => router.refresh())
    } else {
      setFeedback(data.error ?? 'Failed to add user')
    }
  }

  async function removeUser(userId: string) {
    setRemovingId(userId)
    setFeedback('')
    const res = await fetch('/api/admin/league-members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: league.id, userId }),
    })
    const data = await res.json()
    setRemovingId(null)
    if (res.ok) {
      setFeedback('User removed.')
      startTransition(() => router.refresh())
    } else {
      setFeedback(data.error ?? 'Failed to remove user')
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div>
          <p className="font-semibold text-gray-900">{league.name}</p>
          <p className="text-xs text-gray-500">{league.members.length} member{league.members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {league.members.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No members yet.</p>
        ) : (
          league.members.map(member => (
            <div key={member.id} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {member.display_name || <span className="italic text-gray-400">No name</span>}
                </p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
              <button
                onClick={() => removeUser(member.id)}
                disabled={removingId === member.id || isPending}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 p-1"
                title="Remove from league"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add user */}
      {available.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add user</p>
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={e => { setSelectedUserId(e.target.value); setFeedback('') }}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a user…</option>
              {available.map(u => (
                <option key={u.id} value={u.id}>
                  {u.display_name ? `${u.display_name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={addUser}
              disabled={!selectedUserId || isPending}
            >
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      )}

      {available.length === 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 italic">All registered users are already in this league.</p>
        </div>
      )}

      {feedback && (
        <div className="px-4 pb-3 bg-gray-50">
          <p className="text-xs text-gray-600">{feedback}</p>
        </div>
      )}
    </div>
  )
}
