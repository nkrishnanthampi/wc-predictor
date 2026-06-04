'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 -ml-1 transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  )
}
