import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-final',
  semi_final: 'Semi-final',
  third_place: 'Third Place Play-off',
  final: 'Final',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')
  const stage = searchParams.get('stage') ?? 'group'

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ error: 'homeTeam and awayTeam are required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI predictions not configured' }, { status: 503 })
  }

  const stageLabel = STAGE_LABELS[stage] ?? stage

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Predict the most likely final score for this FIFA World Cup 2026 match:

${homeTeam} (home) vs ${awayTeam} (away) — ${stageLabel}

Consider which team is stronger. Favour the stronger team to win. Typical scores are 1-0, 2-0, 2-1, 3-1. Only predict a draw if the teams are genuinely evenly matched.

Reply with EXACTLY 3 lines and nothing else:
HOME:2
AWAY:1
REASON:Brazil's attacking depth gives them the edge.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const homeMatch = text.match(/HOME\s*:\s*(\d+)/i)
  const awayMatch = text.match(/AWAY\s*:\s*(\d+)/i)
  const reasonMatch = text.match(/REASON\s*:\s*(.+)/i)

  if (!homeMatch || !awayMatch) {
    return NextResponse.json({ error: 'Could not parse AI response', detail: text }, { status: 502 })
  }

  return NextResponse.json({
    homeScore: Math.min(9, parseInt(homeMatch[1], 10)),
    awayScore: Math.min(9, parseInt(awayMatch[1], 10)),
    rationale: reasonMatch?.[1]?.trim() ?? '',
  })
}
