'use client'

import { useEffect } from 'react'

const SCROLL_KEY = 'matches-scroll-y'

export function MatchListScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved != null) {
      window.scrollTo(0, parseInt(saved, 10))
      sessionStorage.removeItem(SCROLL_KEY)
    }
  }, [])

  return (
    <div onClick={() => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))}>
      {children}
    </div>
  )
}
