import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated: proxy already redirected, but if we get here
  // (e.g. login page), just render children without the nav
  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">{children}</main>
    </div>
  )
}
