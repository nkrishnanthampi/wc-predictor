import type { MatchStage } from '../supabase/types'

const STAGE_MULTIPLIER: Record<MatchStage, number> = {
  group:        1,
  round_of_32:  2,
  round_of_16:  3,
  quarter_final: 4,
  semi_final:   5,
  third_place:  3,
  final:        6,
}

/** Returns the winner: 'home', 'away', or 'draw' */
function getWinner(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home'
  if (away > home) return 'away'
  return 'draw'
}

export function calculatePoints(
  stage: MatchStage,
  actualHome: number,
  actualAway: number,
  predictedHome: number,
  predictedAway: number
): number {
  const multiplier = STAGE_MULTIPLIER[stage]
  const actualWinner = getWinner(actualHome, actualAway)
  const predictedWinner = getWinner(predictedHome, predictedAway)

  if (actualHome === predictedHome && actualAway === predictedAway) {
    // Exact score: 2 points × multiplier
    return 2 * multiplier
  }
  if (actualWinner === predictedWinner) {
    // Correct winner only: 1 point × multiplier
    return 1 * multiplier
  }
  return 0
}

export const TOURNAMENT_WINNER_POINTS = 10

export function stageLabel(stage: MatchStage): string {
  const labels: Record<MatchStage, string> = {
    group:         'Group Stage',
    round_of_32:   'Round of 32',
    round_of_16:   'Round of 16',
    quarter_final: 'Quarter-final',
    semi_final:    'Semi-final',
    third_place:   '3rd Place',
    final:         'Final',
  }
  return labels[stage]
}

export function maxPointsForStage(stage: MatchStage): number {
  return 2 * STAGE_MULTIPLIER[stage]
}
