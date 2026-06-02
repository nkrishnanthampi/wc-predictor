import { format, formatDistanceToNow } from 'date-fns'
import type { MatchStage } from './supabase/types'

export function formatKickoff(iso: string): string {
  const d = new Date(iso)
  return format(d, "EEE d MMM, HH:mm 'UTC'xxx")
}

export function formatKickoffShort(iso: string): string {
  const d = new Date(iso)
  return format(d, 'd MMM HH:mm')
}

export function kickoffRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function matchResultLabel(homeScore: number | null, awayScore: number | null): string {
  if (homeScore === null || awayScore === null) return 'vs'
  return `${homeScore} – ${awayScore}`
}

export function isPredictionLocked(kickoffTime: string): boolean {
  return new Date(kickoffTime) <= new Date()
}

export const STAGE_LABELS: Record<MatchStage, string> = {
  group:         'Group Stage',
  round_of_32:   'Round of 32',
  round_of_16:   'Round of 16',
  quarter_final: 'Quarter-Final',
  semi_final:    'Semi-Final',
  third_place:   '3rd Place Play-off',
  final:         'Final',
}

export const WC_TEAMS_2026 = [
  'Argentina', 'Australia', 'Belgium', 'Brazil', 'Cameroon', 'Canada', 'Chile',
  'Colombia', 'Costa Rica', 'Croatia', 'Denmark', 'Ecuador', 'Egypt', 'England',
  'France', 'Germany', 'Ghana', 'Honduras', 'Hungary', 'Iran', 'Japan', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Panama', 'Paraguay', 'Peru',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Slovenia', 'South Korea', 'Spain', 'Switzerland', 'Tunisia', 'Turkey', 'Ukraine',
  'United States', 'Uruguay', 'Venezuela', 'Wales', 'Other'
].sort()
