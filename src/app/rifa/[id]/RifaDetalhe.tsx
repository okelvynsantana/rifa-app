'use client'

import { useState, useCallback } from 'react'
import { Rifa, NumeroRifa } from '@/lib/supabase/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import NumeroGrid from '@/components/rifa/NumeroGrid'
import LegendaNumeros from '@/components/rifa/LegendaNumeros'
import ModalCompra from './ModalCompra'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ArrowLeft, Calendar, Trophy, Shuffle, Users, Zap } from 'lucide-react'
import Link from 'next/link'

interface Props {
  rifa: Rifa
  numeros: NumeroRifa[]
}

export default function RifaDetalhe({ rifa, numeros }: Props) {
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const disponiveis = numeros.filter((n) => n.status === 'disponivel').map((n) => n.numero)
  const vendidos = numeros.filter((n) => n.status === 'pago' || n.status === 'reservado').length
  const progresso = Math.round((vendidos / rifa.total_numeros) * 100)

  const toggleNumero = useCallback((numero: number) => {
    setSelecionados((prev) =>
      prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero]
    )
  }, [])

  const sortearAleatorio = useCallback(() => {
    if (disponiveis.length === 0) return
    const random = disponiveis[Math.floor(Math.random() * disponiveis.length)]
    setSelecionados((prev) =>
      prev.includes(random) ? prev.filter((n) => n !== random) : [...prev, random]
    )
  }, [disponiveis])

  const limpar = useCallback(() => setSelecionados([]), [])

  const statusVariant = {
    ativa: 'success',
    encerrada: 'default',
    sorteada: 'purple',
  }[rifa.status] as 'success' | 'default' | 'purple'

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header image */}
      <div className="relative h-56 bg-gradient-to-br from-violet-500 to-purple-600">
        {rifa.imagem_url && (
          <img src={rifa.imagem_url} alt={rifa.titulo} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute top-4 left-4">
          <Link href="/">
            <button className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <Badge variant={statusVariant}>
            {rifa.status === 'ativa' ? 'Ativa' : rifa.status === 'encerrada' ? 'Encerrada' : 'Sorteada'}
          </Badge>
          <h1 className="text-white font-black text-2xl mt-1 leading-tight">{rifa.titulo}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36">
        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Calendar size={14} />
              Sorteio
            </div>
            <p className="font-bold text-gray-900">{formatDate(rifa.data_sorteio)}</p>
            <p className="text-xs text-gray-400">Loteria Federal</p>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Trophy size={14} />
              Prêmio
            </div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{rifa.premio}</p>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Users size={14} />
              Participantes
            </div>
            <p className="font-bold text-gray-900">{vendidos}/{rifa.total_numeros}</p>
            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <div className="bg-violet-50 rounded-2xl p-3.5 border border-violet-100 shadow-sm">
            <div className="flex items-center gap-2 text-violet-500 text-xs mb-1">
              <Zap size={14} />
              Valor por número
            </div>
            <p className="font-black text-violet-700 text-xl">{formatCurrency(rifa.preco_numero)}</p>
          </div>
        </div>

        {rifa.descricao && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="font-bold text-gray-900 text-sm mb-1">Descrição</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{rifa.descricao}</p>
          </div>
        )}

        {/* Sorteio result */}
        {rifa.status === 'sorteada' && rifa.numero_sorteado && (
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-5 mb-4 text-white">
            <p className="text-violet-200 text-sm font-medium">🏆 Número Sorteado</p>
            <p className="text-5xl font-black mt-1">
              {String(rifa.numero_sorteado).padStart(String(rifa.total_numeros).length, '0')}
            </p>
            {rifa.resultado_federal && (
              <p className="text-violet-200 text-xs mt-2">
                Resultado Federal: {rifa.resultado_federal}
              </p>
            )}
          </div>
        )}

        {/* Number selection */}
        {rifa.status === 'ativa' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Escolha seus números</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={sortearAleatorio}
                      className="flex items-center gap-1 text-xs text-violet-600 font-semibold bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
                    >
                      <Shuffle size={12} />
                      Aleatório
                    </button>
                    {selecionados.length > 0 && (
                      <button
                        onClick={limpar}
                        className="text-xs text-gray-500 font-semibold bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <LegendaNumeros />
              </div>

              <div className="p-3">
                <NumeroGrid
                  total={rifa.total_numeros}
                  numeros={numeros}
                  selecionados={selecionados}
                  onToggle={toggleNumero}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom bar */}
      {rifa.status === 'ativa' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-3">
            {selecionados.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{selecionados.length} número{selecionados.length > 1 ? 's' : ''} selecionado{selecionados.length > 1 ? 's' : ''}</p>
                  <p className="font-black text-gray-900 text-lg">
                    {formatCurrency(selecionados.length * rifa.preco_numero)}
                  </p>
                </div>
                <Button size="lg" onClick={() => setModalOpen(true)}>
                  Reservar números
                </Button>
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm py-1">
                Selecione um ou mais números para participar
              </p>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <ModalCompra
          rifa={rifa}
          numerosSelecionados={selecionados}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            setSelecionados([])
          }}
        />
      )}
    </main>
  )
}
