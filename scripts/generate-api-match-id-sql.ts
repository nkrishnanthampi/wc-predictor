/**
 * Generates SQL UPDATE statements to set api_match_id and kickoff_time on all
 * matches to the values returned by football-data.org.
 *
 * Run AFTER sync-team-names.ts --apply (team names must already match the API).
 *
 * Usage:
 *   npx tsx scripts/generate-api-match-id-sql.ts
 *   npx tsx scripts/generate-api-match-id-sql.ts --prod   # use .env.local
 *
 * Output: SQL statements you can paste into the Supabase SQL editor.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const PROD    = process.argv.includes('--prod')
const FD_BASE = 'https://api.football-data.org/v4'

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

interface FdMatch {
  id: number
  utcDate: string
  homeTeam: { name: string }
  awayTeam: { name: string }
}

interface DbMatch {
  id: string
  home_team: string | null
  away_team: string | null
  api_match_id: number | null
  kickoff_time: string
}

async function main() {
  console.log(`Fetching from football-data.org...`)
  const res = await fetch(`${FD_BASE}/competitions/WC/matches?season=2026`, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY! },
  })
  if (!res.ok) {
    console.error(`football-data.org: ${res.status} ${res.statusText}`)
    process.exit(1)
  }
  const { matches: apiMatches } = await res.json() as { matches: FdMatch[] }
  console.log(`  → ${apiMatches.length} API fixtures\n`)

  const { data: dbMatches, error } = await supabase
    .from('matches')
    .select('id, home_team, away_team, api_match_id, kickoff_time')
    .is('generated_for_user_id', null)

  if (error) { console.error('DB error:', error.message); process.exit(1) }
  const db = dbMatches as DbMatch[]
  console.log(`  → ${db.length} DB matches\n`)

  const dbByPair = new Map<string, DbMatch>()
  for (const m of db) {
    dbByPair.set(`${norm(m.home_team)}|${norm(m.away_team)}`, m)
  }

  const sql: string[] = []
  const unmatched: string[] = []

  for (const f of apiMatches) {
    const key = `${norm(f.homeTeam.name)}|${norm(f.awayTeam.name)}`
    const dbMatch = dbByPair.get(key)

    if (!dbMatch) {
      unmatched.push(`${f.homeTeam.name} vs ${f.awayTeam.name}`)
      continue
    }

    const home = f.homeTeam.name.replace(/'/g, "''")
    const away = f.awayTeam.name.replace(/'/g, "''")
    const apiTime = new Date(f.utcDate).toISOString()
    const dbTime  = new Date(dbMatch.kickoff_time).toISOString()

    const idChanged   = dbMatch.api_match_id !== f.id
    const timeChanged = apiTime !== dbTime

    if (!idChanged && !timeChanged) continue

    const changes: string[] = []
    if (idChanged)   changes.push(`api_match_id: ${dbMatch.api_match_id} → ${f.id}`)
    if (timeChanged) changes.push(`kickoff_time: ${dbTime} → ${apiTime}`)
    console.log(`  ${f.homeTeam.name} vs ${f.awayTeam.name}: ${changes.join(' | ')}`)

    sql.push(
      `UPDATE public.matches SET api_match_id = ${f.id}, kickoff_time = '${apiTime}' WHERE home_team = '${home}' AND away_team = '${away}';`
    )
  }

  if (unmatched.length > 0) {
    console.log(`\n⚠ Not matched in DB (${unmatched.length}) — run sync-team-names.ts first:`)
    for (const s of unmatched) console.log(`  ${s}`)
  }

  console.log(`\nTotal statements: ${sql.length}`)

  if (sql.length === 0) {
    console.log('All api_match_id and kickoff_time values are already up to date.')
    return
  }

  console.log('\n── SQL ────────────────────────────────────────────────────────────────────\n')
  for (const s of sql) console.log(s)
  console.log('\n── End of SQL ─────────────────────────────────────────────────────────────')
}

main().catch(err => { console.error(err); process.exit(1) })
