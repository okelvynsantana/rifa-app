import Link from 'next/link'
import { Ticket } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
            <Ticket size={16} className="text-white" />
          </div>
          <span className="text-lg">RifaApp</span>
        </Link>
      </div>
    </header>
  )
}
