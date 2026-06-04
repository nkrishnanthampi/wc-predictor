const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
const HEADERS = { 'User-Agent': 'Mozilla/5.0' }

// Competition slugs to try per team — errors are swallowed, so irrelevant ones are harmless
const COMPETITION_SLUGS = [
  'fifa.friendly',
  // WC qualifiers per confederation
  'fifa.worldq.uefa',
  'fifa.worldq.afc',
  'fifa.worldq.concacaf',
  'fifa.worldq.conmebol',
  'fifa.worldq.caf',
  'fifa.worldq.ofc',
  // Continental tournaments
  'concacaf.nations.league',
  'conmebol.america',
  'concacaf.gold',
  'uefa.euro',
  'afc.asian.cup',
  'caf.africa_cup',
  'ofc.nations.cup',
  'fifa.world',
]

async function espnFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: HEADERS,
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

export interface EspnTeam {
  id: string
  displayName: string
  abbreviation: string
  rank?: number
}

export interface EspnResult {
  date: string
  competition: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homeId: string
}

// Official renames or spellings that differ from common DB names
const ESPN_NAME_MAP: Record<string, string> = {
  'turkey': 'turkiye',
}

// Strip diacritics (U+0300–U+036F) and punctuation for fuzzy matching
function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-&'.,()\s]/g, '')
}

export async function fetchEspnTeamByName(name: string): Promise<EspnTeam | null> {
  const data = await espnFetch('/fifa.friendly/teams')
  if (!data) return null
  const teams: { team: EspnTeam }[] = data.sports?.[0]?.leagues?.[0]?.teams ?? []

  const mapped = ESPN_NAME_MAP[name.toLowerCase()] ?? name
  const normSearch = norm(mapped)

  return (
    teams.find(t =>
      norm(t.team.displayName) === normSearch ||
      t.team.abbreviation.toLowerCase() === mapped.toLowerCase()
    )?.team ?? null
  )
}

async function fetchCompetitionResults(slug: string, teamId: string): Promise<EspnResult[]> {
  const data = await espnFetch(`/${slug}/teams/${teamId}/schedule`)
  if (!data?.events) return []

  const results: EspnResult[] = []
  for (const event of data.events) {
    const comp = event.competitions?.[0]
    if (!comp?.status?.type?.completed) continue

    const [c0, c1] = comp.competitors ?? []
    if (!c0 || !c1) continue

    const homeScore = parseFloat(c0.score?.displayValue ?? c0.score?.value ?? '0')
    const awayScore = parseFloat(c1.score?.displayValue ?? c1.score?.value ?? '0')

    if (isNaN(homeScore) || isNaN(awayScore)) continue

    results.push({
      date: event.date,
      competition: slug,
      homeTeam: c0.team?.displayName ?? '',
      awayTeam: c1.team?.displayName ?? '',
      homeScore,
      awayScore,
      homeId: c0.team?.id ?? '',
    })
  }
  return results
}

export async function fetchEspnTeamResults(teamId: string, count = 10): Promise<EspnResult[]> {
  const allResults = await Promise.all(
    COMPETITION_SLUGS.map(slug => fetchCompetitionResults(slug, teamId))
  )

  const seen = new Set<string>()
  const combined: EspnResult[] = []

  for (const batch of allResults) {
    for (const r of batch) {
      const key = `${r.date.slice(0, 10)}-${r.homeTeam}-${r.awayTeam}`
      if (!seen.has(key)) {
        seen.add(key)
        combined.push(r)
      }
    }
  }

  return combined
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)
}
