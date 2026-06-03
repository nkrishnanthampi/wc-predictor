// api-football.com direct subscription (api-sports.io)
// World Cup 2026 = competition ID 1 (FIFA World Cup), season 2026

const BASE_URL = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1   // FIFA World Cup
const WC_SEASON = 2026

async function apiFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': process.env.API_FOOTBALL_KEY!,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) throw new Error(`api-football error: ${res.status} ${res.statusText}`)
  return res.json()
}

export interface ApiFixture {
  fixture: {
    id: number
    date: string
    status: { short: string; elapsed: number | null }
  }
  league: { round: string }
  teams: {
    home: { name: string }
    away: { name: string }
  }
  goals: { home: number | null; away: number | null }
}

export async function fetchFixtures(): Promise<ApiFixture[]> {
  const data = await apiFetch('/fixtures', {
    league: String(WC_LEAGUE_ID),
    season: String(WC_SEASON),
  })
  return data.response ?? []
}

export async function fetchFixtureById(fixtureId: number): Promise<ApiFixture | null> {
  const data = await apiFetch('/fixtures', { id: String(fixtureId) })
  return data.response?.[0] ?? null
}

/** Maps api-football round string → our stage enum */
export function parseStage(round: string): import('../supabase/types').MatchStage {
  const r = round.toLowerCase()
  if (r.includes('group')) return 'group'
  if (r.includes('round of 32') || r.includes('1/16')) return 'round_of_32'
  if (r.includes('round of 16') || r.includes('1/8')) return 'round_of_16'
  if (r.includes('quarter')) return 'quarter_final'
  if (r.includes('semi')) return 'semi_final'
  if (r.includes('3rd') || r.includes('third')) return 'third_place'
  if (r.includes('final')) return 'final'
  return 'group'
}


/** Maps api-football status short code → our status enum */
export function parseStatus(short: string): import('../supabase/types').MatchStatus {
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished'
  if (['1H', '2H', 'ET', 'P', 'HT', 'BT', 'LIVE'].includes(short)) return 'live'
  if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(short)) return 'postponed'
  return 'scheduled'
}
