import { LoginForm } from '@/components/ui/LoginForm'
import { Trophy } from 'lucide-react'

export default function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; message?: string }>
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-600 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 p-4 rounded-full">
              <Trophy className="h-12 w-12 text-yellow-300" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">WC Predictor 2026</h1>
          <p className="mt-2 text-green-100">
            Predict every match. Outscore your friends.
          </p>
        </div>

        <LoginForm searchParams={searchParams} />

        <p className="text-center mt-6 text-xs text-green-200">
          Sign in with a magic link — no password needed.
        </p>
      </div>
    </div>
  )
}
