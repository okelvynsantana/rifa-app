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
              !isOcupado && isSelecionado && 'bg-red-600 text-white shadow-md shadow-red-500/30 scale-105 focus:ring-red-500 border-2 border-red-600',
              !isOcupado && !isSelecionado && 'bg-white border-2 border-gray-200 text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95 focus:ring-red-300',
            )}
          >
            {String(num).padStart(digits, '0')}
          </button>
        )
      })}
    </div>
  )
}
