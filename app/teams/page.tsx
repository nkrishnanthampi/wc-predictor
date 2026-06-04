import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

const BRACKET_SIDES: [string, string[]][] = [
  ['Side 1', ['A', 'B', 'C', 'E', 'F', 'I']],
  ['Side 2', ['D', 'G', 'H', 'J', 'K', 'L']],
]

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('group_name, home_team, away_team')
    .eq('stage', 'group')
    .not('group_name', 'is', null)
    .not('home_team', 'is', null)
    .not('away_team', 'is', null)

  const groups = new Map<string, Set<string>>()
  for (const m of matches ?? []) {
    if (!m.group_name || !m.home_team || !m.away_team) continue
    if (!groups.has(m.group_name)) groups.set(m.group_name, new Set())
    groups.get(m.group_name)!.add(m.home_team)
    groups.get(m.group_name)!.add(m.away_team)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">World Cup 2026 Teams</h1>

      {groups.size === 0 ? (
        <p className="text-sm text-gray-500">Teams will appear here once fixtures are synced by an admin.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {BRACKET_SIDES.map(([sideLabel, groupLetters]) => (
            <div key={sideLabel}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">{sideLabel}</h2>
              <div className="flex flex-col gap-4">
                {groupLetters
                  .filter(letter => groups.has(letter))
                  .map(letter => (
                    <Card key={letter}>
                      <CardHeader>
                        <h3 className="font-semibold text-gray-900">Group {letter}</h3>
                      </CardHeader>
                      <CardBody className="p-0">
                        {[...groups.get(letter)!].sort().map(team => (
                          <Link
                            key={team}
                            href={`/teams/${encodeURIComponent(team)}`}
                            className="flex items-center px-5 py-3 border-b border-gray-50 last:border-0 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                          >
                            {team}
                          </Link>
                        ))}
                      </CardBody>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
