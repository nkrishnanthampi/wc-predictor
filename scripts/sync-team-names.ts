/**
 * Syncs team names (and api_match_id) in the matches table to match
 * football-data.org canonical names for WC 2026.
 *
 * Also updates:
 *  - tournament_predictions.predicted_winner for any renamed teams
 *  - WC_TEAMS_2026 array in lib/utils.ts
 *
 * Usage:
 *   npx tsx scripts/sync-team-names.ts              # dry run (no writes)
 *   npx tsx scripts/sync-team-names.ts --apply      # write changes
 *
 * Env vars required (loaded from .env.development.local by default,
 * or .env.local if --prod is passed):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FOOTBALL_DATA_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const APPLY = process.argv.includes('--apply')
const PROD  = process.argv.includes('--prod')
const FD_BASE = 'https://api.football-data.org/v4'

// ── Load env file ────────────────────────────────────────────────────────────
const envFile = PROD ? '.env.local' : '.env.development.local'
try {
  const raw = fs.readFileSync(path.join(process.cwd(), envFile), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#\s][^=]*?)\s*=\s*(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  console.log(`Loaded ${envFile}\n`)
} catch {
  console.log(`${envFile} not found — relying on process.env\n`)
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_API_KEY } = process.env
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FOOTBALL_DATA_API_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_API_KEY')
  process.exit(1)
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim()
}

// ── Types ────────────────────────────────────────────────────────────────────
interface FdMatch {
  id: number
  utcDate: string
  stage: string
  homeTeam: { name: string }
  awayTeam: { name: string }
}

interface DbMatch {
  id: string
  home_team: string | null
  away_team: string | null
  api_match_id: number | null
  kickoff_time: string
  stage: string
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(APPLY
    ? `APPLY mode (${PROD ? 'PRODUCTION' : 'local'}) — changes will be written\n`
    : `DRY RUN (${PROD ? 'PRODUCTION' : 'local'}) — pass --apply to commit changes\n`
  )

  // 1. Fetch from football-data.org
  console.log('Fetching from football-data.org...')
  const res = await fetch(`${FD_BASE}/competitions/WC/matches?season=2026`, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY! },
  })
  if (!res.ok) {
    console.error(`football-data.org: ${res.status} ${res.statusText}`)
    process.exit(1)
  }
  const { matches: apiMatches } = await res.json() as { matches: FdMatch[] }
  console.log(`  → ${apiMatches.length} API fixtures\n`)

  // 2. Fetch DB matches (real ones only)
  const { data: dbMatches, error: dbErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, api_match_id, kickoff_time, stage')
    .is('generated_for_user_id', null)

  if (dbErr) { console.error('DB error:', dbErr.message); process.exit(1) }
  console.log(`${(dbMatches as DbMatch[]).length} DB matches\n`)

  // 3. Build lookup by normalised pair
  const dbByPair = new Map<string, DbMatch>()
  for (const m of dbMatches as DbMatch[]) {
    dbByPair.set(`${norm(m.home_team)}|${norm(m.away_team)}`, m)
  }

  // 4. Diff
  const exactUpdates:   Array<{ id: string; home_team: string; away_team: string; api_match_id: number; log: string }> = []
  const swappedUpdates: Array<{ id: string; home_team: string; away_team: string; apiId: number; apiHome: string; apiAway: string; dbHome: string | null; dbAway: string | null }> = []
  const unmatchedApi:   Array<string> = []
  const nameChanges = new Map<string, string>()   // old → new (for tournament_predictions / utils.ts)

  for (const f of apiMatches) {
    const key         = `${norm(f.homeTeam.name)}|${norm(f.awayTeam.name)}`
    const reversedKey = `${norm(f.awayTeam.name)}|${norm(f.homeTeam.name)}`

    let dbMatch = dbByPair.get(key)
    let swapped = false
    if (!dbMatch) { dbMatch = dbByPair.get(reversedKey); swapped = !!dbMatch }

    if (!dbMatch) {
      unmatchedApi.push(`${f.homeTeam.name} vs ${f.awayTeam.name}`)
      continue
    }

    if (swapped) {
      // DB home ↔ API away; DB away ↔ API home.
      // Fix spelling preserving DB home/away order. Do NOT update api_match_id —
      // setting it here would cause sync-results to assign goals.home to the wrong team.
      const newDbHome = f.awayTeam.name
      const newDbAway = f.homeTeam.name
      const parts: string[] = []
      if (dbMatch.home_team !== newDbHome) { parts.push(`home "${dbMatch.home_team}" → "${newDbHome}"`); nameChanges.set(dbMatch.home_team!, newDbHome) }
      if (dbMatch.away_team !== newDbAway) { parts.push(`away "${dbMatch.away_team}" → "${newDbAway}"`); nameChanges.set(dbMatch.away_team!, newDbAway) }
      if (parts.length > 0 || dbMatch.api_match_id !== f.id) {
        swappedUpdates.push({
          id: dbMatch.id,
          home_team: newDbHome,
          away_team: newDbAway,
          apiId: f.id,
          apiHome: f.homeTeam.name,
          apiAway: f.awayTeam.name,
          dbHome: dbMatch.home_team,
          dbAway: dbMatch.away_team,
        })
      }
      continue
    }

    // Exact match — safe to update everything
    const parts: string[] = []
    if (dbMatch.home_team !== f.homeTeam.name) { parts.push(`home "${dbMatch.home_team}" → "${f.homeTeam.name}"`); nameChanges.set(dbMatch.home_team!, f.homeTeam.name) }
    if (dbMatch.away_team !== f.awayTeam.name) { parts.push(`away "${dbMatch.away_team}" → "${f.awayTeam.name}"`); nameChanges.set(dbMatch.away_team!, f.awayTeam.name) }
    if (dbMatch.api_match_id !== f.id)          parts.push(`api_match_id ${dbMatch.api_match_id} → ${f.id}`)

    if (parts.length > 0) {
      exactUpdates.push({
        id: dbMatch.id,
        home_team: f.homeTeam.name,
        away_team: f.awayTeam.name,
        api_match_id: f.id,
        log: parts.join(', '),
      })
    }
  }

  // 5. tournament_predictions
  const { data: tpRows } = await supabase.from('tournament_predictions').select('id, predicted_winner')
  const tpUpdates: Array<{ id: string; oldName: string; newName: string }> = []
  for (const tp of tpRows ?? []) {
    const newName = nameChanges.get(tp.predicted_winner)
    if (newName) tpUpdates.push({ id: tp.id, oldName: tp.predicted_winner, newName })
  }

  // 6. WC_TEAMS_2026 in lib/utils.ts
  const utilsPath = path.join(process.cwd(), 'lib', 'utils.ts')
  let utilsContent = fs.readFileSync(utilsPath, 'utf8')
  let newUtilsContent = utilsContent
  const utilsChanges: string[] = []
  for (const [oldName, newName] of nameChanges) {
    if (newUtilsContent.includes(`'${oldName}'`)) {
      newUtilsContent = newUtilsContent.replaceAll(`'${oldName}'`, `'${newName}'`)
      utilsChanges.push(`  '${oldName}' → '${newName}'`)
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`=== Exact updates (${exactUpdates.length}) ===`)
  for (const u of exactUpdates) console.log(`  ${u.log}`)

  if (swappedUpdates.length > 0) {
    console.log(`\n=== Swapped home/away — spelling fixed, api_match_id SKIPPED (${swappedUpdates.length}) ===`)
    console.log('  ⚠ Review these manually. To fix sync-results for these matches you will need to')
    console.log('    either swap home/away in the DB or accept manual score entry.\n')
    for (const u of swappedUpdates) {
      console.log(`  API: ${u.apiHome} (home) vs ${u.apiAway} (away)`)
      console.log(`   DB: ${u.dbHome} (home) vs ${u.dbAway} (away)`)
      console.log(`  SQL: UPDATE public.matches SET home_team = '${u.apiHome}', away_team = '${u.apiAway}' WHERE home_team = '${u.dbHome}' AND away_team = '${u.dbAway}';`)
      console.log()
    }
  }


  console.log(`\n=== tournament_predictions (${tpUpdates.length}) ===`)
  for (const u of tpUpdates) console.log(`  "${u.oldName}" → "${u.newName}"`)

  console.log(`\n=== WC_TEAMS_2026 in lib/utils.ts (${utilsChanges.length}) ===`)
  for (const c of utilsChanges) console.log(c)

  if (!APPLY) {
    console.log('\n─── Dry run complete. Pass --apply to write changes. ───')
    return
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  console.log('\nApplying...')

  for (const u of exactUpdates) {
    const { error } = await supabase.from('matches')
      .update({ home_team: u.home_team, away_team: u.away_team, api_match_id: u.api_match_id })
      .eq('id', u.id)
    console.log(error ? `  ✗ match ${u.id}: ${error.message}` : `  ✓ ${u.log}`)
  }

  for (const u of swappedUpdates) {
    const { error } = await supabase.from('matches')
      .update({ home_team: u.home_team, away_team: u.away_team })
      .eq('id', u.id)
    console.log(error ? `  ✗ match ${u.id}: ${error.message}` : `  ✓ [SWAPPED] ${u.dbHome} → ${u.home_team} | ${u.dbAway} → ${u.away_team}`)
  }

  for (const u of tpUpdates) {
    const { error } = await supabase.from('tournament_predictions')
      .update({ predicted_winner: u.newName })
      .eq('id', u.id)
    console.log(error ? `  ✗ prediction ${u.id}: ${error.message}` : `  ✓ prediction "${u.oldName}" → "${u.newName}"`)
  }

  if (utilsChanges.length > 0) {
    fs.writeFileSync(utilsPath, newUtilsContent, 'utf8')
    console.log(`  ✓ lib/utils.ts updated`)
  }

  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })
