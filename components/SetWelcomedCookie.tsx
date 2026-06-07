'use client'

import { useEffect } from 'react'

export function SetWelcomedCookie() {
  useEffect(() => {
    document.cookie = 'wcp_welcomed=1; path=/; max-age=31536000; SameSite=Lax'
  }, [])
  return null
}
