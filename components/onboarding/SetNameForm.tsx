'use client'

import { useFormStatus } from 'react-dom'
import { setDisplayName } from '@/app/onboarding/actions'
import { Button } from '@/components/ui/Button'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Saving…' : 'Get started →'}
    </Button>
  )
}

export function SetNameForm() {
  return (
    <form action={setDisplayName} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={40}
          autoFocus
          placeholder="e.g. Alex, The Predictor…"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <SubmitButton />
    </form>
  )
}
