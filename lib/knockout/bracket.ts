import type { Match, MatchStage } from '@/lib/supabase/types'

export interface TeamRecord {
  team: string
  group: string
  points: number
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  gd: number
}

type PredMap = Map<string, { home: number; away: number }>

// Adjacent group pairs — defines which groups swap 1st/2nd places in the R32 bracket.
// Each pair (X, Y) produces two R32 matches: 1X vs 2Y and 1Y vs 2X.
// This ensures same-group teams are in separate R32 matches and can only meet in R16 or later.
const GROUP_PAIRS: [string, string][] = [
  ['A', 'B'], ['C', 'D'], ['E', 'F'],
  ['G', 'H'], ['I', 'J'], ['K', 'L'],
]

// ─── Schedule ────────────────────────────────────────────────────────────────
// Official FIFA World Cup 2026 knockout round kickoff times (UTC).
// All times converted from BST (UTC+1). Matches listed in bracket slot order.
export const STAGE_KICKOFFS: Partial<Record<MatchStage, string[]>> = {
  round_of_32: [
    '2026-06-28T19:00:00Z', // 28 Jun 20:00 BST
    '2026-06-29T20:30:00Z', // 29 Jun 21:30 BST
    '2026-06-29T17:00:00Z', // 29 Jun 18:00 BST
    '2026-06-30T01:00:00Z', // 30 Jun 02:00 BST
    '2026-06-30T21:00:00Z', // 30 Jun 22:00 BST
    '2026-06-30T17:00:00Z', // 30 Jun 18:00 BST
    '2026-07-01T00:00:00Z', // 01 Jul 01:00 BST
    '2026-07-01T01:00:00Z', // 01 Jul 02:00 BST
    '2026-07-01T16:00:00Z', // 01 Jul 17:00 BST
    '2026-07-02T00:00:00Z', // 02 Jul 01:00 BST
    '2026-07-02T19:00:00Z', // 02 Jul 20:00 BST
    '2026-07-02T23:00:00Z', // 03 Jul 00:00 BST
    '2026-07-03T03:00:00Z', // 03 Jul 04:00 BST
    '2026-07-03T18:00:00Z', // 03 Jul 19:00 BST
    '2026-07-03T22:00:00Z', // 03 Jul 23:00 BST
    '2026-07-04T01:30:00Z', // 04 Jul 02:30 BST
  ],
  round_of_16: [
    '2026-07-04T17:00:00Z', // 04 Jul 18:00 BST
    '2026-07-04T21:00:00Z', // 04 Jul 22:00 BST
    '2026-07-07T00:00:00Z', // 07 Jul 01:00 BST
    '2026-07-06T19:00:00Z', // 06 Jul 20:00 BST
    '2026-07-05T20:00:00Z', // 05 Jul 21:00 BST
    '2026-07-06T00:00:00Z', // 06 Jul 01:00 BST
    '2026-07-07T20:00:00Z', // 07 Jul 21:00 BST
    '2026-07-07T16:00:00Z', // 07 Jul 17:00 BST
  ],
  quarter_final: [
    '2026-07-09T20:00:00Z', // 09 Jul 21:00 BST
    '2026-07-10T19:00:00Z', // 10 Jul 20:00 BST
    '2026-07-11T21:00:00Z', // 11 Jul 22:00 BST
    '2026-07-12T01:00:00Z', // 12 Jul 02:00 BST
  ],
  semi_final: [
    '2026-07-14T19:00:00Z', // 14 Jul 20:00 BST — SF1
    '2026-07-15T19:00:00Z', // 15 Jul 20:00 BST — SF2
  ],
  final: ['2026-07-19T19:00:00Z'], // 19 Jul 20:00 BST
}

// Match number base per stage for generated fixtures.
// Uses values well above the 104 real WC matches (72 group + 32 knockout).
export const STAGE_MATCH_NUM_BASE: Partial<Record<MatchStage, number>> = {
  round_of_32:   2001,
  round_of_16:   2017,
  quarter_final: 2025,
  semi_final:    2029,
  final: 2031,
}

// ─── Standings ───────────────────────────────────────────────────────────────

function sortTeams(a: TeamRecord, b: TeamRecord): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.gd !== a.gd) return b.gd - a.gd
  if (b.gf !== a.gf) return b.gf - a.gf
  return a.team.localeCompare(b.team)
}

/**
 * Compute group standings for all groups.
 * Uses actual scores for finished matches, user predictions for others,
 * and defaults to 0–0 when no prediction exists.
 */
export function computeGroupStandings(
  groupMatches: Match[],
  predMap: PredMap,
): Map<string, TeamRecord[]> {
  const records = new Map<string, TeamRecord>()

  function getRecord(team: string, group: string): TeamRecord {
    const key = `${group}:${team}`
    if (!records.has(key)) {
      records.set(key, { team, group, points: 0, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0 })
    }
    return records.get(key)!
  }

  for (const m of groupMatches) {
    if (!m.home_team || !m.away_team || !m.group_name) continue

    let hs: number, as_: number
    if (m.status === 'finished' && m.home_score != null && m.away_score != null) {
      hs = m.home_score; as_ = m.away_score
    } else {
      const pred = predMap.get(m.id)
      hs = pred?.home ?? 0; as_ = pred?.away ?? 0
    }

    const home = getRecord(m.home_team, m.group_name)
    const away = getRecord(m.away_team, m.group_name)

    home.played++; away.played++
    home.gf += hs; home.ga += as_; home.gd = home.gf - home.ga
    away.gf += as_; away.ga += hs; away.gd = away.gf - away.ga

    if (hs > as_) {
      home.wins++; home.points += 3; away.losses++
    } else if (as_ > hs) {
      away.wins++; away.points += 3; home.losses++
    } else {
      home.draws++; home.points++; away.draws++; away.points++
    }
  }

  const byGroup = new Map<string, TeamRecord[]>()
  for (const r of records.values()) {
    if (!byGroup.has(r.group)) byGroup.set(r.group, [])
    byGroup.get(r.group)!.push(r)
  }
  for (const [g, teams] of byGroup) {
    byGroup.set(g, [...teams].sort(sortTeams))
  }
  return byGroup
}

// ─── Bracket construction ────────────────────────────────────────────────────

/**
 * Build 16 R32 fixture pairs from group standings.
 *
 * Each adjacent group pair (A↔B, C↔D, …) contributes 2 R32 matches:
 *   • 1st of group X vs 2nd of group Y
 *   • 1st of group Y vs 2nd of group X
 *
 * The 8 best third-place teams fill the remaining 4 matches (ranked 1st vs 8th, 2nd vs 7th, …).
 */
export function buildR32Pairs(
  standings: Map<string, TeamRecord[]>,
): Array<{ home: string; away: string }> {
  const allThirds: TeamRecord[] = []
  for (const teams of standings.values()) {
    if (teams[2]) allThirds.push(teams[2])
  }
  allThirds.sort(sortTeams)
  const bestThirds = allThirds.slice(0, 8)

  const pairs: Array<{ home: string; away: string }> = []

  // 12 matches from group pairs
  for (const [g1, g2] of GROUP_PAIRS) {
    const s1 = standings.get(g1)
    const s2 = standings.get(g2)
    pairs.push({ home: s1?.[0]?.team ?? 'TBD', away: s2?.[1]?.team ?? 'TBD' })
    pairs.push({ home: s2?.[0]?.team ?? 'TBD', away: s1?.[1]?.team ?? 'TBD' })
  }

  // 4 matches for best 8 thirds (top vs bottom seeded)
  for (let i = 0; i < 4; i++) {
    pairs.push({
      home: bestThirds[i]?.team ?? 'TBD',
      away: bestThirds[7 - i]?.team ?? 'TBD',
    })
  }

  return pairs // 16 pairs total
}

// ─── Match resolution ────────────────────────────────────────────────────────

/**
 * Determine the winner and loser of a knockout match.
 * Actual scores take priority; falls back to user prediction; then 0–0 default.
 * On a draw (including the 0–0 default) the home team advances.
 */
export function resolveWinner(
  match: Match,
  predMap: PredMap,
): { winner: string; loser: string } {
  let hs: number, as_: number

  if (match.status === 'finished' && match.home_score != null && match.away_score != null) {
    hs = match.home_score; as_ = match.away_score
  } else {
    const pred = predMap.get(match.id)
    hs = pred?.home ?? 0; as_ = pred?.away ?? 0
  }

  const home = match.home_team ?? 'TBD'
  const away = match.away_team ?? 'TBD'
  return as_ > hs
    ? { winner: away, loser: home }
    : { winner: home, loser: away }
}

/**
 * Pair consecutive match winners — used when building R16, QF, and SF fixtures.
 * Matches must be sorted in bracket order (ascending match_number).
 * Winner of match i plays winner of match i+1, for even i.
 */
export function buildWinnerPairs(
  matches: Match[],
  predMap: PredMap,
): Array<{ home: string; away: string }> {
  const pairs: Array<{ home: string; away: string }> = []
  for (let i = 0; i + 1 < matches.length; i += 2) {
    pairs.push({
      home: resolveWinner(matches[i], predMap).winner,
      away: resolveWinner(matches[i + 1], predMap).winner,
    })
  }
  return pairs
}

/**
 * Build the Final fixture pair from the 2 semi-final matches.
 * The 3rd place play-off is excluded — it does not count towards predictions.
 * Returns null if fewer than 2 SF matches are available.
 */
export function buildFinalPair(
  sfMatches: Match[],
  predMap: PredMap,
): { home: string; away: string } | null {
  if (sfMatches.length < 2) return null
  const r1 = resolveWinner(sfMatches[0], predMap)
  const r2 = resolveWinner(sfMatches[1], predMap)
  return { home: r1.winner, away: r2.winner }
}

// ─── Completion check ────────────────────────────────────────────────────────

/**
 * A round is complete when every match in it is either finished (real result)
 * or has been predicted by the user.
 */
export function isRoundComplete(
  matches: Match[],
  predMap: PredMap,
): boolean {
  return matches.length > 0 &&
    matches.every(m => m.status === 'finished' || predMap.has(m.id))
}
