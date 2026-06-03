'use client'

import { useEffect, useState } from 'react'
import type { TeamResult } from '@/app/api/team-results/route'
import clsx from 'clsx'

interface Props {
  homeTeam: string
  awayTeam: string
}

interface Results {
  home: TeamResult[]
  away: TeamResult[]
}

function outcomeLabel(result: TeamResult): { label: string; className: string } {
  const { homeGoals, awayGoals, wasHome } = result
  if (homeGoals == null || awayGoals == null) return { label: '–', className: 'text-gray-400' }
  const teamGoals = wasHome ? homeGoals : awayGoals
  const oppGoals = wasHome ? awayGoals : homeGoals
  if (teamGoals > oppGoals) return { label: 'W', className: 'text-green-600 font-bold' }
  if (teamGoals < oppGoals) return { label: 'L', className: 'text-red-500 font-bold' }
  return { label: 'D', className: 'text-yellow-600 font-bold' }
}

function scoreLabel(result: TeamResult): string {
  if (result.homeGoals == null || result.awayGoals == null) return '–'
  return `${result.homeGoals} – ${result.awayGoals}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function ResultsTable({ team, results }: { team: string; results: TeamResult[] }) {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{team}</h3>
      <div className="space-y-1">
        {results.map((r, i) => {
          const outcome = outcomeLabel(r)
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={clsx('w-4 shrink-0 text-center', outcome.className)}>{outcome.label}</span>
              <span className="w-16 shrink-0 text-gray-400">{formatDate(r.date)}</span>
              <span className="shrink-0 font-semibold text-gray-700">{scoreLabel(r)}</span>
              <span className="truncate text-gray-500">vs {r.opponent}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TeamResults({ homeTeam, awayTeam }: Props) {
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/team-results?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setResults(data)
      })
      .catch(() => setError('Failed to load results'))
      .finally(() => setLoading(false))
  }, [homeTeam, awayTeam])

  if (loading) return <p className="text-xs text-gray-400 mt-4">Loading recent results…</p>
  if (error) return <p className="text-xs text-red-400 mt-4">{error}</p>

  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Last 10 results</h2>
      <div className="flex gap-6">
        <ResultsTable team={homeTeam} results={results!.home} />
        <ResultsTable team={awayTeam} results={results!.away} />
      </div>
    </div>
  )
}
