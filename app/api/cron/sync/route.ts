import { runSync } from '@/lib/sync/run-sync'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSync()
    console.log('[cron/sync]', result)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[cron/sync] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
