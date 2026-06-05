'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from './Button'
import { Mail } from 'lucide-react'

export function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; message?: string }>
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setStep('code')
      setTimeout(() => codeRef.current?.focus(), 50)
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="bg-white rounded-2xl p-6 shadow-xl">
        <p className="text-sm text-gray-600 mb-4">
          We sent an 8-digit code to <strong>{email}</strong>. Enter it below.
        </p>
        <div className="mb-4">
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Verification code
          </label>
          <input
            id="code"
            ref={codeRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{8}"
            maxLength={8}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading || code.length !== 8}>
          {loading ? 'Verifying…' : 'Sign in'}
        </Button>

        <button
          type="button"
          onClick={() => { setStep('email'); setCode(''); setError('') }}
          className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Back / use a different email
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={sendCode} className="bg-white rounded-2xl p-6 shadow-xl">
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        <Mail className="h-4 w-4" />
        {loading ? 'Sending…' : 'Send code'}
      </Button>
    </form>
  )
}
