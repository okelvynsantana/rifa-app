'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Ticket, Home, Plus, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center">
            <Ticket size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Admin</span>
        </div>

        <nav className="flex items-center gap-1">
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors',
              pathname === '/admin'
                ? 'bg-red-50 text-red-600'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <Home size={15} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/admin/nova-rifa"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors',
              pathname === '/admin/nova-rifa'
                ? 'bg-red-50 text-red-600'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nova Rifa</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
