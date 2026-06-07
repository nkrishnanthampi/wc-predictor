import { LoginForm } from '@/components/ui/LoginForm'
import { Trophy } from 'lucide-react'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; message?: string }>
}) {
  const { message, redirectTo } = await searchParams

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

        {message && (
          <div className="mb-4 bg-red-500/20 border border-red-400 text-white text-sm rounded-lg px-4 py-3">
            Auth error: <strong>{message}</strong>
          </div>
        )}

        <LoginForm redirectTo={redirectTo} />

        <p className="text-center mt-6 text-xs text-green-200">
          Sign in with a magic link — no password needed.
        </p>
      </div>
    </div>
  )
}
