'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trophy, LayoutDashboard, Calendar, Users, Shield, LogOut } from 'lucide-react'
import clsx from 'clsx'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/matches', label: 'Matches', icon: Calendar },
  { href: '/leagues', label: 'My Leagues', icon: Users },
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

  return (
    <nav className="bg-green-700 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <Trophy className="h-5 w-5 text-yellow-300" />
            <span className="hidden sm:inline">WC Predictor 2026</span>
            <span className="sm:hidden">WC 2026</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-600'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}

            {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <Link
                href="/admin"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-600'
                )}
              >
                <Shield className="h-4 w-4" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}

            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-green-100 hover:bg-green-600 transition-colors ml-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
