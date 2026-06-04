import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const TEAM_CODES: Record<string, string> = {
  'Argentina':     'ar',
  'Australia':     'au',
  'Belgium':       'be',
  'Brazil':        'br',
  'Cameroon':      'cm',
  'Canada':        'ca',
  'Chile':         'cl',
  'Colombia':      'co',
  'Costa Rica':    'cr',
  'Croatia':       'hr',
  'Denmark':       'dk',
  'Ecuador':       'ec',
  'Egypt':         'eg',
  'England':       'gb-eng',
  'France':        'fr',
  'Germany':       'de',
  'Ghana':         'gh',
  'Honduras':      'hn',
  'Hungary':       'hu',
  'Iran':          'ir',
  'Japan':         'jp',
  'Mexico':        'mx',
  'Morocco':       'ma',
  'Netherlands':   'nl',
  'New Zealand':   'nz',
  'Nigeria':       'ng',
  'Panama':        'pa',
  'Paraguay':      'py',
  'Peru':          'pe',
  'Poland':        'pl',
  'Portugal':      'pt',
  'Qatar':         'qa',
  'Romania':       'ro',
  'Saudi Arabia':  'sa',
  'Senegal':       'sn',
  'Serbia':        'rs',
  'Slovenia':      'si',
  'South Korea':   'kr',
  'Spain':         'es',
  'Switzerland':   'ch',
  'Tunisia':       'tn',
  'Turkey':        'tr',
  'Ukraine':       'ua',
  'United States': 'us',
  'USA':           'us',
  'Uruguay':       'uy',
  'Venezuela':     've',
  'Wales':         'gb-wls',
  // Additional teams from API / qualifiers
  'Algeria':                  'dz',
  'Austria':                  'at',
  'Bosnia and Herzegovina':   'ba',
  'Cape Verde':               'cv',
  'Czechia':                  'cz',
  'Czech Republic':           'cz',
  'Haiti':                    'ht',
  'Ivory Coast':              'ci',
  "Côte d'Ivoire":            'ci',
  'Jordan':                   'jo',
  'Scotland':                 'gb-sct',
  'South Africa':             'za',
  'Curacao':                  'cw',
  'Curaçao':                  'cw',
  'DR Congo':                 'cd',
  'Democratic Republic of Congo': 'cd',
  'Iraq':                     'iq',
  'Norway':                   'no',
  'Sweden':                   'se',
  'Uzbekistan':               'uz',
}

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BRACKET_SIDES.map(([sideLabel, groupLetters]) => (
            <div key={sideLabel}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{sideLabel}</h2>
              <div className="flex flex-col gap-2">
                {groupLetters
                  .filter(letter => groups.has(letter))
                  .map(letter => (
                    <div key={letter} className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Group {letter}</span>
                      </div>
                      {[...groups.get(letter)!].sort().map(team => (
                        <Link
                          key={team}
                          href={`/teams/${encodeURIComponent(team)}`}
                          title="Click to see details"
                          className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-50 last:border-0 hover:bg-green-50 hover:text-green-700 transition-colors"
                        >
                          {TEAM_CODES[team] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`https://flagcdn.com/20x15/${TEAM_CODES[team]}.png`}
                              width={20}
                              height={15}
                              alt={`${team} flag`}
                              className="shrink-0 rounded-sm shadow-sm"
                            />
                          )}
                          <span className="text-sm text-gray-700">{team}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
