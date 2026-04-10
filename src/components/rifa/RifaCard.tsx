import Link from 'next/link'
import { Calendar, Trophy, Users, Tag } from 'lucide-react'
import { Rifa } from '@/lib/supabase/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

interface RifaCardProps {
  rifa: Rifa
  numerosVendidos?: number
}

export default function RifaCard({ rifa, numerosVendidos = 0 }: RifaCardProps) {
  const progresso = Math.round((numerosVendidos / rifa.total_numeros) * 100)
  const temPromocao = !!(rifa.preco_promocional && rifa.min_numeros_promocao)
  const desconto = temPromocao
    ? Math.round((1 - rifa.preco_promocional! / rifa.preco_numero) * 100)
    : 0

  const statusVariant = {
    ativa: 'success',
    encerrada: 'default',
    sorteada: 'purple',
  }[rifa.status] as 'success' | 'default' | 'purple'

  const statusLabel = {
    ativa: 'Ativa',
    encerrada: 'Encerrada',
    sorteada: 'Sorteada',
  }[rifa.status]

  const coverImage = rifa.imagem_url || rifa.imagem_premio_url

  return (
    <Link href={`/rifa/${rifa.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 active:scale-[0.98]">
        {/* Image */}
        <div className="relative h-48 bg-gradient-to-br from-red-500 to-red-600 overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt={rifa.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy size={64} className="text-white/40" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            {temPromocao && rifa.status === 'ativa' && (
              <span className="flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                <Tag size={10} />
                -{desconto}% promo
              </span>
            )}
          </div>
          {rifa.status === 'sorteada' && rifa.numero_sorteado && (
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <p className="text-xs text-gray-500">Número sorteado</p>
              <p className="text-xl font-black text-red-600">
                {String(rifa.numero_sorteado).padStart(String(rifa.total_numeros).length, '0')}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{rifa.titulo}</h3>
          {rifa.descricao && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{rifa.descricao}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(rifa.data_sorteio)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {numerosVendidos}/{rifa.total_numeros}
            </span>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-700 rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{progresso}% vendido</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Número por</p>
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-black text-red-600">{formatCurrency(rifa.preco_numero)}</p>
                {temPromocao && (
                  <p className="text-xs text-emerald-600 font-semibold">
                    ou {formatCurrency(rifa.preco_promocional!)} c/ {rifa.min_numeros_promocao}+
                  </p>
                )}
              </div>
            </div>
            <div className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
              Participar
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
