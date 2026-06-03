'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Clock, X } from 'lucide-react'

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EffectiveDateForm({ currentValue }: { currentValue: string | null }) {
  const router = useRouter()
  const [dateInput, setDateInput] = useState(currentValue ? toDatetimeLocalValue(currentValue) : '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function setDate() {
    if (!dateInput) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/set-effective-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date(dateInput).toISOString() }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage('Effective date set.')
        router.refresh()
      } else {
        setMessage(`Error: ${json.error}`)
      }
    } catch {
      setMessage('Network error')
    }
    setLoading(false)
  }

  async function clearDate() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/set-effective-date', { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setDateInput('')
        setMessage('Cleared — using real time.')
        router.refresh()
      } else {
        setMessage(`Error: ${json.error}`)
      }
    } catch {
      setMessage('Network error')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {currentValue && (
        <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Simulating: <strong>{new Date(currentValue).toUTCString()}</strong>
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          value={dateInput}
          onChange={e => setDateInput(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={loading}
        />
        <Button onClick={setDate} disabled={loading || !dateInput} variant="primary" size="sm">
          Set
        </Button>
        {currentValue && (
          <Button onClick={clearDate} disabled={loading} variant="secondary" size="sm">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  )
}
