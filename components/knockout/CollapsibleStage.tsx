'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  title: string
  defaultOpen: boolean
  badges?: React.ReactNode
  meta?: React.ReactNode
  children: React.ReactNode
}

export function CollapsibleStage({ title, defaultOpen, badges, meta, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-3 rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</span>
          {badges}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {meta}
          <ChevronDown className={clsx('h-4 w-4 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>

      {open && children}
    </div>
  )
}
