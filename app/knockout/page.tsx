import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'
import { formatKickoffShort, isPredictionLocked, STAGE_LABELS, matchResultLabel } from '@/lib/utils'
import { getEffectiveDate } from '@/lib/effective-date'
import type { Match, MatchStage } from '@/lib/supabase/types'
import { Lock, CheckCircle, Circle, CircleDot, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { MatchListScroll } from '@/components/matches/MatchListScroll'
import {
  computeGroupStandings,
  buildR32Pairs,
  buildWinnerPairs,
  buildFinalPair,
  isRoundComplete,
  STAGE_KICKOFFS,
  STAGE_MATCH_NUM_BASE,
} from '@/lib/knockout/bracket'

type PredMap = Map<string, { home: number; away: number }>

// ─── Fixture generation ───────────────────────────────────────────────────────
// Runs server-side on every page load; inserts only what is missing.
// Each subsequent round is gated behind completing predictions for the previous round.

async function generateMissingFixtures(
  userId: string,
  allMatches: Match[],
  predMap: PredMap,
): Promise<Match[]> {
  const admin = createAdminClient()
  const newMatches: Match[] = []
  const running = [...allMatches]

  /** Return generated + real matches for a stage, sorted in bracket order. */
  function effective(stage: MatchStage): Match[] {
    return running
      .filter(m => m.stage === stage && (m.generated_for_user_id === null || m.generated_for_user_id === userId))
      .sort((a, b) => (a.match_number ?? 9999) - (b.match_number ?? 9999))
  }

  async function insert(
    pairs: Array<{ home: string; away: string }>,
    stage: MatchStage,
  ): Promise<Match[]> {
    const kickoffs = STAGE_KICKOFFS[stage] ?? []
    const matchNumBase = STAGE_MATCH_NUM_BASE[stage] ?? 9000
    const rows = pairs.map((p, i) => ({
      stage,
      home_team: p.home,
      away_team: p.away,
      kickoff_time: kickoffs[i] ?? kickoffs[kickoffs.length - 1] ?? new Date().toISOString(),
      status: 'scheduled' as const,
      match_number: matchNumBase + i,
      generated_for_user_id: userId,
      updated_at: new Date().toISOString(),
    }))
    const { data, error } = await admin.from('matches').insert(rows).select()
    if (error) console.error(`Failed to generate ${stage} fixtures:`, error.message)
    return (data ?? []) as Match[]
  }

  const groupMatches = running.filter(m => m.stage === 'group')

  // R32 — derived from group standings (no completion gate: group is already verified upstream)
  if (effective('round_of_32').length === 0 && groupMatches.length > 0) {
    const standings = computeGroupStandings(groupMatches, predMap)
    const created = await insert(buildR32Pairs(standings), 'round_of_32')
    newMatches.push(...created); running.push(...created)
  }

  // R16 — only when all R32 matches are predicted or finished
  const r32 = effective('round_of_32')
  if (r32.length >= 16 && isRoundComplete(r32, predMap) && effective('round_of_16').length === 0) {
    const created = await insert(buildWinnerPairs(r32, predMap), 'round_of_16')
    newMatches.push(...created); running.push(...created)
  }

  // QF — only when all R16 matches are predicted or finished
  const r16 = effective('round_of_16')
  if (r16.length >= 8 && isRoundComplete(r16, predMap) && effective('quarter_final').length === 0) {
    const created = await insert(buildWinnerPairs(r16, predMap), 'quarter_final')
    newMatches.push(...created); running.push(...created)
  }

  // SF — only when all QF matches are predicted or finished
  const qf = effective('quarter_final')
  if (qf.length >= 4 && isRoundComplete(qf, predMap) && effective('semi_final').length === 0) {
    const created = await insert(buildWinnerPairs(qf, predMap), 'semi_final')
    newMatches.push(...created); running.push(...created)
  }

  // Final — only when both SF matches are predicted or finished
  // (3rd place play-off is excluded — it does not count towards predictions)
  const sf = effective('semi_final')
  if (sf.length >= 2 && isRoundComplete(sf, predMap) && effective('final').length === 0) {
    const pair = buildFinalPair(sf, predMap)
    if (pair) {
      const cF = await insert([pair], 'final')
      newMatches.push(...cF)
    }
  }

  return newMatches
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KnockoutMatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: rawMatches } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff_time', { ascending: true })

  const { data: myPredictions } = await supabase
    .from('predictions')
    .select('match_id, predicted_home_score, predicted_away_score, points_awarded')
    .eq('user_id', user.id)

  const predMap: PredMap = new Map(
    myPredictions?.map(p => [p.match_id, { home: p.predicted_home_score, away: p.predicted_away_score }]) ?? []
  )
  const predDisplayMap = new Map(myPredictions?.map(p => [p.match_id, p]) ?? [])

  const asOf = await getEffectiveDate()

  // Gate: all predictable group matches must be predicted before knockout bracket opens
  const allGroupPredicted =
    (rawMatches ?? []).some(m => m.stage === 'group') &&
    (rawMatches ?? []).filter(m =>
      m.stage === 'group' &&
      !predMap.has(m.id) &&
      m.status !== 'finished' &&
      m.status !== 'live' &&
      !isPredictionLocked(m.kickoff_time, asOf)
    ).length === 0

  let allMatches = rawMatches ?? []

  if (allGroupPredicted) {
    const created = await generateMissingFixtures(user.id, allMatches, predMap)
    if (created.length > 0) allMatches = [...allMatches, ...created]
  }

  // For each knockout stage: prefer real API matches; fall back to user-generated matches
  const knockoutStageOrder: MatchStage[] = [
    'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final',
  ]

  const stageData = new Map<MatchStage, { matches: Match[]; isGenerated: boolean }>()
  for (const stage of knockoutStageOrder) {
    const real = allMatches.filter(m => m.stage === stage && m.generated_for_user_id === null)
    const generated = allMatches.filter(
      m => m.stage === stage && m.generated_for_user_id === user.id
    ).sort((a, b) => (a.match_number ?? 9999) - (b.match_number ?? 9999))

    if (real.length > 0) stageData.set(stage, { matches: real, isGenerated: false })
    else if (generated.length > 0) stageData.set(stage, { matches: generated, isGenerated: true })
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function renderMatchCard(match: Match) {
    const pred = predDisplayMap.get(match.id)
    const locked = isPredictionLocked(match.kickoff_time, asOf)
    const isFinished = match.status === 'finished'

    return (
      <Link key={match.id} href={`/matches/${match.id}`}>
        <Card className={clsx(
          'hover:shadow-md transition-shadow cursor-pointer',
          !isFinished && locked && !pred && 'opacity-60',
        )}>
          <CardBody className="py-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {isFinished ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : pred ? (
                  <CircleDot className="h-5 w-5 text-blue-500" />
                ) : locked ? (
                  <Lock className="h-5 w-5 text-gray-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <span className="truncate">{match.home_team ?? 'TBD'}</span>
                  <span className="text-gray-400 shrink-0">
                    {isFinished ? matchResultLabel(match.home_score, match.away_score) : 'vs'}
                  </span>
                  <span className="truncate">{match.away_team ?? 'TBD'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatKickoffShort(match.kickoff_time)}
                </p>

                {(isFinished || pred) && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span>
                      <span className="text-gray-400">Result </span>
                      <span className="font-semibold text-gray-700">
                        {isFinished ? matchResultLabel(match.home_score, match.away_score) : 'TBC'}
                      </span>
                    </span>
                    <span className="text-gray-300">·</span>
                    <span>
                      <span className="text-gray-400">Pick </span>
                      {pred ? (
                        <span className="font-semibold text-gray-700">
                          {pred.predicted_home_score} – {pred.predicted_away_score}
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-400">0 – 0 (assumed)</span>
                      )}
                    </span>
                    {isFinished && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className={clsx(
                          'font-bold',
                          pred?.points_awarded != null && pred.points_awarded > 0
                            ? 'text-green-600'
                            : 'text-gray-400',
                        )}>
                          {pred?.points_awarded != null
                            ? pred.points_awarded > 0 ? `+${pred.points_awarded} pts` : '0 pts'
                            : '0 pts'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!isFinished && !pred && (
                <span className="shrink-0 text-xs font-medium">
                  {locked
                    ? <span className="text-gray-400">Not predicted</span>
                    : <span className="text-green-600">Predict →</span>}
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      </Link>
    )
  }

  function renderStageSection(stage: MatchStage, matches: Match[], isGenerated: boolean) {
    const finished = matches.filter(m => m.status === 'finished')
    const upcoming = matches.filter(m => m.status !== 'finished')
    const isCompleted = upcoming.length === 0 && finished.length > 0
    const hasBoth = upcoming.length > 0 && finished.length > 0

    return (
      <details key={stage} open={!isCompleted} className="group mb-3 rounded-lg border border-gray-200 overflow-hidden">
        <summary className="flex cursor-pointer select-none list-none items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              {STAGE_LABELS[stage]}
            </h2>
            {isGenerated && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">predicted</span>
            )}
            {isCompleted && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">complete</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {upcoming.length > 0 && (
              <span>{upcoming.length} upcoming</span>
            )}
            {finished.length > 0 && (
              <span>{finished.length} finished</span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </div>
        </summary>

        <div className="divide-y divide-gray-100">
          {upcoming.length > 0 && (
            <div className="px-4 py-3">
              {hasBoth && (
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Upcoming</p>
              )}
              <div className="space-y-2">
                {upcoming.map(m => renderMatchCard(m))}
              </div>
            </div>
          )}
          {finished.length > 0 && (
            <div className="px-4 py-3">
              {hasBoth && (
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Finished</p>
              )}
              <div className="space-y-2">
                {finished.map(m => renderMatchCard(m))}
              </div>
            </div>
          )}
        </div>
      </details>
    )
  }

  // Separator shown between two stages when the current stage is locked
  function renderLockGate(lockedStage: MatchStage, prevStage: MatchStage, prevMatches: Match[]) {
    const remaining = prevMatches.filter(
      m => m.status !== 'finished' && !predMap.has(m.id)
    ).length
    return (
      <div
        key={`lock-${lockedStage}`}
        className="mb-8 flex items-center gap-3 rounded-lg border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400"
      >
        <Lock className="h-4 w-4 shrink-0 text-gray-300" />
        <span>
          Predict all{' '}
          <span className="font-medium text-gray-500">{STAGE_LABELS[prevStage]}</span>{' '}
          matches to unlock{' '}
          <span className="font-medium text-gray-500">{STAGE_LABELS[lockedStage]}</span>
          {remaining > 0 && <span className="ml-1 text-gray-400">({remaining} remaining)</span>}
        </span>
      </div>
    )
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  return (
    <MatchListScroll>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Knockout Matches</h1>

        {!allGroupPredicted ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Complete all group stage predictions to unlock your knockout bracket.
          </div>
        ) : (
          <>
            {[...stageData.values()].some(d => d.isGenerated) && (
              <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                Your bracket is generated from your predictions. Predict each round to set the teams for the next — on a predicted draw the home team advances.
              </div>
            )}

            {knockoutStageOrder.map((stage, idx) => {
              const data = stageData.get(stage)
              if (data) {
                return renderStageSection(stage, data.matches, data.isGenerated)
              }

              // Stage not yet generated — show a gate if the previous stage exists
              const prevStage = knockoutStageOrder[idx - 1]
              const prevData = prevStage ? stageData.get(prevStage) : undefined
              if (prevData && !isRoundComplete(prevData.matches, predMap)) {
                // Only show a single gate for the first locked stage; subsequent locked
                // stages are implied and don't need separate messages
                const earlierLockExists = knockoutStageOrder
                  .slice(0, idx)
                  .some(s => !stageData.has(s))
                if (!earlierLockExists) {
                  return renderLockGate(stage, prevStage, prevData.matches)
                }
              }

              return null
            })}
          </>
        )}
      </div>
    </MatchListScroll>
  )
}
