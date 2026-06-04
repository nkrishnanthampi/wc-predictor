'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trophy, LayoutDashboard, Calendar, Users, Shield, LogOut, Globe, Swords } from 'lucide-react'
import clsx from 'clsx'

const NAV_LINKS = [
  { href: '/dashboard',  label: 'Home',              icon: LayoutDashboard },
  { href: '/matches',    label: 'Group Matches',     icon: Calendar },
  { href: '/knockout',   label: 'Knockout Matches',  icon: Swords },
  { href: '/teams',      label: 'Teams',             icon: Globe },
  { href: '/leagues',    label: 'My Leagues',        icon: Users },
]

export function NavBar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function navLink(href: string, label: string, Icon: React.ElementType) {
    const active = pathname.startsWith(href)
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold tracking-wide transition-colors',
          active
            ? 'bg-fifa-gold text-fifa-black'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">{label}</span>
      </Link>
    )
  }

  return (
    <nav className="bg-fifa-black text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-black text-lg tracking-tight">
            <Trophy className="h-5 w-5 text-fifa-gold" />
            <span className="hidden sm:inline">WC Predictor <span className="text-fifa-gold">2026</span></span>
            <span className="sm:hidden text-fifa-gold">2026</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}

            {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && navLink('/admin', 'Admin', Shield)}

            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>

        </div>
      </div>

      {/* Gold accent line under nav */}
      <div className="h-0.5 bg-fifa-gold" />
    </nav>
  )
}
