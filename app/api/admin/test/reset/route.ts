import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const NUM_USERS = 100
const BATCH = 10

const FIRST_NAMES = [
  'Alice', 'Ben', 'Carlos', 'Diana', 'Ethan', 'Fatima', 'George', 'Hannah', 'Ivan', 'Jasmine',
  'Kai', 'Layla', 'Marco', 'Nadia', 'Oscar', 'Priya', 'Quinn', 'Rafael', 'Sofia', 'Tariq',
  'Uma', 'Victor', 'Wendy', 'Xander', 'Yara', 'Zane', 'Amara', 'Bruno', 'Chloe', 'Diego',
  'Elena', 'Felix', 'Grace', 'Hugo', 'Isla', 'Jonas', 'Kira', 'Luca', 'Mia', 'Noah',
  'Olivia', 'Pedro', 'Rosa', 'Sam', 'Tina', 'Umar', 'Vera', 'Will', 'Xena', 'Yusuf',
]

const LAST_NAMES = [
  'Adams', 'Baker', 'Chen', 'Davis', 'Evans', 'Fischer', 'Garcia', 'Harris', 'Ibrahim', 'Jones',
  'Kim', 'Lopez', 'Miller', 'Nguyen', 'Okafor', 'Patel', 'Quinn', 'Rivera', 'Smith', 'Taylor',
  'Ueda', 'Vargas', 'Wang', 'Xavier', 'Yildiz', 'Zhang', 'Anderson', 'Brown', 'Costa', 'Diaz',
  'Edwards', 'Ferreira', 'Gonzalez', 'Hassan', 'Ito', 'Jackson', 'Kumar', 'Lewis', 'Müller', 'Nakamura',
  'Owens', 'Park', 'Rossi', 'Santos', 'Thomas', 'Uzun', 'Vitale', 'Wilson', 'Xu', 'Yamamoto',
]

const used = new Set<string>()
function randomName(): string {
  let name: string
  let attempts = 0
  do {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
    name = `${first} ${last}`
    attempts++
  } while (used.has(name) && attempts < 200)
  used.add(name)
  return name
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminDb = createAdminClient()

  // Wipe predictions, generated fixtures, knockout real fixtures, group match scores
  await adminDb.from('predictions').delete().not('id', 'is', null)
  await adminDb.from('matches').delete().not('generated_for_user_id', 'is', null)
  await adminDb.from('matches').delete().neq('stage', 'group').is('generated_for_user_id', null)
  await adminDb.from('matches').update({
    home_score: null, away_score: null,
    status: 'scheduled', manual_override: false,
    updated_at: new Date().toISOString(),
  }).eq('stage', 'group')

  // Remove old test users (cascade deletes their profiles/memberships)
  const { data: { users: allUsers } } = await adminDb.auth.admin.listUsers({ perPage: 1000 })
  const testUsers = (allUsers ?? []).filter(u => u.email?.startsWith('testuser_'))
  await Promise.all(testUsers.map(u => adminDb.auth.admin.deleteUser(u.id)))

  // Remove old test leagues
  await adminDb.from('leagues').delete().like('name', 'Test League%')

  // Create NUM_USERS test users in batches, then set display names directly on profiles
  // (the handle_new_user trigger always writes display_name='', so we patch it afterwards)
  used.clear()
  const userIds: string[] = []
  const profileUpdates: { id: string; display_name: string }[] = []

  for (let b = 0; b < NUM_USERS / BATCH; b++) {
    const names = Array.from({ length: BATCH }, () => randomName())
    const results = await Promise.all(
      names.map((_, i) => {
        const n = String(b * BATCH + i + 1).padStart(3, '0')
        return adminDb.auth.admin.createUser({
          email: `testuser_${n}@test.local`,
          password: 'Test1234!',
          email_confirm: true,
        })
      })
    )
    for (let i = 0; i < results.length; i++) {
      const { data } = results[i]
      if (data.user) {
        userIds.push(data.user.id)
        profileUpdates.push({ id: data.user.id, display_name: names[i] })
      }
    }
  }

  // Patch display names in batches of 20
  for (let i = 0; i < profileUpdates.length; i += 20) {
    await Promise.all(
      profileUpdates.slice(i, i + 20).map(({ id, display_name }) =>
        adminDb.from('profiles').update({ display_name }).eq('id', id)
      )
    )
  }

  // Create test league and add all test users + admin
  const { data: league } = await adminDb.from('leagues').insert({
    name: 'Test League 2026',
    created_by: user.id,
  }).select('id').single()

  if (!league) return NextResponse.json({ error: 'Failed to create test league' }, { status: 500 })

  await adminDb.from('league_members').insert(
    [...userIds, user.id].map(userId => ({ league_id: league.id, user_id: userId }))
  )

  return NextResponse.json({ success: true, usersCreated: userIds.length, leagueId: league.id })
}
