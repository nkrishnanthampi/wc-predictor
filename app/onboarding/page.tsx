import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { Trophy } from 'lucide-react'
import { SetNameForm } from '@/components/onboarding/SetNameForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (profile?.display_name) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Trophy className="h-10 w-10 text-fifa-gold mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome to WC Predictor 2026</h1>
          <p className="text-gray-500 text-sm mt-1">What should we call you in the game?</p>
        </div>
        <Card>
          <CardBody>
            <SetNameForm />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
