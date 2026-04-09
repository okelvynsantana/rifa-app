'use client'

import { cn, padNumber } from '@/lib/utils'
import { NumeroRifa } from '@/lib/supabase/types'

interface NumeroGridProps {
  total: number
  numeros: NumeroRifa[]
  selecionados: number[]
  onToggle: (numero: number) => void
  disabled?: boolean
}

export default function NumeroGrid({
  total,
  numeros,
  selecionados,
  onToggle,
  disabled,
}: NumeroGridProps) {
  const statusMap = new Map(numeros.map((n) => [n.numero, n.status]))
  const digits = String(total).length

  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total <= 100 ? 10 : total <= 200 ? 10 : 10}, 1fr)` }}>
      {Array.from({ length: total }, (_, i) => i + 1).map((num) => {
        const status = statusMap.get(num) || 'disponivel'
        const isSelecionado = selecionados.includes(num)
        const isOcupado = status === 'pago' || status === 'reservado'

        return (
          <button
            key={num}
            disabled={isOcupado || disabled}
            onClick={() => onToggle(num)}
            className={cn(
              'aspect-square rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              isOcupado && status === 'pago' && 'bg-blue-500 text-white cursor-not-allowed opacity-80',
              isOcupado && status === 'reservado' && 'bg-amber-400 text-white cursor-not-allowed opacity-80',
              !isOcupado && isSelecionado && 'bg-violet-600 text-white shadow-md shadow-violet-500/30 scale-105 focus:ring-violet-500',
              !isOcupado && !isSelecionado && 'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700 active:scale-95 focus:ring-violet-300',
            )}
          >
            {String(num).padStart(digits, '0')}
          </button>
        )
      })}
    </div>
  )
}
