'use client'

import { useState, useCallback } from 'react'
import { Rifa, NumeroRifa } from '@/lib/supabase/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import NumeroGrid from '@/components/rifa/NumeroGrid'
import LegendaNumeros from '@/components/rifa/LegendaNumeros'
import ModalCompra from './ModalCompra'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ArrowLeft, Calendar, Trophy, Shuffle, Users, Zap, Tag, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

interface Props {
  rifa: Rifa
  numeros: NumeroRifa[]
}

export default function RifaDetalhe({ rifa, numeros }: Props) {
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [showRegras, setShowRegras] = useState(false)

  const disponiveis = numeros.filter((n) => n.status === 'disponivel').map((n) => n.numero)
  const vendidos = numeros.filter((n) => n.status === 'pago' || n.status === 'reservado').length
  const progresso = Math.round((vendidos / rifa.total_numeros) * 100)

  const temPromocao = !!(rifa.preco_promocional && rifa.min_numeros_promocao)
  const precoAtual = temPromocao && selecionados.length >= (rifa.min_numeros_promocao ?? 2)
    ? rifa.preco_promocional!
    : rifa.preco_numero
  const total = selecionados.length * precoAtual
  const desconto = temPromocao ? Math.round((1 - rifa.preco_promocional! / rifa.preco_numero) * 100) : 0

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

  const digits = String(rifa.total_numeros).length
  const promoAtiva = temPromocao && selecionados.length >= (rifa.min_numeros_promocao ?? 2)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header image */}
      <div className="relative h-64 bg-gradient-to-br from-red-500 to-red-600">
        {rifa.imagem_url && (
          <img src={rifa.imagem_url} alt={rifa.titulo} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

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
          <h1 className="text-white font-black text-2xl mt-1 leading-tight drop-shadow">{rifa.titulo}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36">
        {/* Sorteio result banner */}
        {rifa.status === 'sorteada' && rifa.numero_sorteado && (
          <div className="bg-gradient-to-r from-red-600 to-red-600 rounded-2xl p-5 mt-4 text-white">
            <p className="text-red-200 text-sm font-medium">🏆 Número Sorteado</p>
            <p className="text-5xl font-black mt-1">
              {String(rifa.numero_sorteado).padStart(digits, '0')}
            </p>
            {rifa.resultado_federal && (
              <p className="text-red-200 text-xs mt-2">
                Resultado Federal: {rifa.resultado_federal}
              </p>
            )}
          </div>
        )}

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
              <Users size={14} />
              Participantes
            </div>
            <p className="font-bold text-gray-900">{vendidos}/{rifa.total_numeros}</p>
            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-500 rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <div className="bg-red-50 rounded-2xl p-3.5 border border-red-100 shadow-sm col-span-2">
            <div className="flex items-center gap-2 text-red-500 text-xs mb-1">
              <Zap size={14} />
              Preço por número
            </div>
            <div className="flex items-end gap-3">
              <p className="font-black text-red-700 text-2xl">{formatCurrency(rifa.preco_numero)}</p>
              {temPromocao && (
                <div className="mb-0.5">
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    -{desconto}% com {rifa.min_numeros_promocao}+
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Promotional banner */}
        {temPromocao && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 mb-4 text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Tag size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-base">
                Promoção: {rifa.min_numeros_promocao}+ números por {formatCurrency(rifa.preco_promocional!)} cada
              </p>
              <p className="text-emerald-100 text-xs mt-0.5">
                Economia de {desconto}% por número • Selecione {rifa.min_numeros_promocao}+ para ativar
              </p>
            </div>
          </div>
        )}

        {/* Prize image */}
        {rifa.imagem_premio_url && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <Trophy size={16} className="text-red-600" />
              <h3 className="font-bold text-gray-900 text-sm">{rifa.premio}</h3>
            </div>
            <img
              src={rifa.imagem_premio_url}
              alt={rifa.premio}
              className="w-full max-h-64 object-contain bg-gray-50 p-2"
            />
          </div>
        )}

        {/* Description */}
        {rifa.descricao && !rifa.imagem_premio_url && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={15} className="text-red-600" />
              <h3 className="font-bold text-gray-900 text-sm">{rifa.premio}</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{rifa.descricao}</p>
          </div>
        )}

        {/* Rules accordion */}
        {rifa.regras && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
            <button
              onClick={() => setShowRegras(!showRegras)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-red-600" />
                <span className="font-bold text-gray-900 text-sm">Regras de participação</span>
              </div>
              {showRegras ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showRegras && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{rifa.regras}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Number selection */}
        {rifa.status === 'ativa' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Escolha seus números</h3>
                <div className="flex gap-2">
                  <button
                    onClick={sortearAleatorio}
                    className="flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
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
        )}
      </div>

      {/* Fixed bottom bar */}
      {rifa.status === 'ativa' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-3">
            {selecionados.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      {selecionados.length} número{selecionados.length > 1 ? 's' : ''}
                    </p>
                    {promoAtiva && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">
                        Promo ativa!
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="font-black text-gray-900 text-lg">{formatCurrency(total)}</p>
                    {promoAtiva && (
                      <p className="text-xs text-gray-400 line-through">
                        {formatCurrency(selecionados.length * rifa.preco_numero)}
                      </p>
                    )}
                  </div>
                </div>
                <Button size="lg" onClick={() => setModalOpen(true)}>
                  Reservar
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
