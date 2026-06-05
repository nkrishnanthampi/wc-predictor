'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Summary {
  apiTotal: number
  dbTotal: number
  matched: number
  onlyInApi: number
  onlyInDb: number
  withDifferences: number
}

interface FixtureRef {
  home: string | null
  away: string | null
  date: string
  stage: string
}

interface Difference {
  home_api: string; away_api: string
  home_db: string | null; away_db: string | null
  kickoff_api: string; kickoff_db: string
  stage_api: string; stage_db: string
  fields: string[]
  swapped: boolean
}

interface CompareResult {
  summary: Summary
  onlyInApi: FixtureRef[]
  onlyInDb: (FixtureRef & { id: string })[]
  differences: Difference[]
}

function Section({ title, count, color, children }: {
  title: string
  count: number
  color: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (count === 0) return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="text-green-600">✓</span> {title}: none
    </div>
  )
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-sm font-medium ${color} flex items-center gap-1`}
      >
        {open ? '▾' : '▸'} {title}: {count}
      </button>
      {open && <div className="mt-2 space-y-1 max-h-72 overflow-y-auto pl-3 border-l-2 border-gray-200">
        {children}
      </div>}
    </div>
  )
}

export function CompareFixturesPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function compare() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/compare-fixtures')
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setResult(json)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={compare} disabled={loading} variant="secondary">
        {loading ? 'Comparing…' : 'Compare with football-data.org'}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            {[
              { label: 'API fixtures', value: result.summary.apiTotal },
              { label: 'DB matches', value: result.summary.dbTotal },
              { label: 'Matched', value: result.summary.matched },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg py-2">
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Section title="Only in API (not in DB)" count={result.summary.onlyInApi} color="text-blue-600">
              {result.onlyInApi.map((f, i) => (
                <p key={i} className="text-xs text-gray-700">
                  {f.date} — <span className="font-medium">{f.home} vs {f.away}</span> ({f.stage})
                </p>
              ))}
            </Section>

            <Section title="Only in DB (not in API)" count={result.summary.onlyInDb} color="text-amber-600">
              {result.onlyInDb.map((f, i) => (
                <p key={i} className="text-xs text-gray-700">
                  {f.date} — <span className="font-medium">{f.home} vs {f.away}</span> ({f.stage})
                </p>
              ))}
            </Section>

            <Section title="Matched but with differences" count={result.summary.withDifferences} color="text-orange-600">
              {result.differences.map((d, i) => (
                <div key={i} className="text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">
                  <p className="font-medium">
                    API: {d.home_api} vs {d.away_api}
                    {d.swapped && <span className="ml-1 text-amber-600">(home/away swapped)</span>}
                  </p>
                  <p className="text-gray-500">DB: {d.home_db} vs {d.away_db}</p>
                  <p>Differences: <span className="text-orange-600">{d.fields.filter(f => f !== 'teams_swapped').join(', ') || '—'}</span></p>
                  {d.fields.includes('kickoff_date') && (
                    <p className="text-gray-500">Date: API {d.kickoff_api.slice(0, 10)} / DB {d.kickoff_db.slice(0, 10)}</p>
                  )}
                  {d.fields.includes('stage') && (
                    <p className="text-gray-500">Stage: API {d.stage_api} / DB {d.stage_db}</p>
                  )}
                </div>
              ))}
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}
