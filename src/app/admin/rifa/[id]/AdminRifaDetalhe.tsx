'use client'

import { useState } from 'react'
import { Rifa, NumeroRifa, Pedido } from '@/lib/supabase/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, DollarSign, CheckCircle, XCircle,
  ExternalLink, Trophy, Calendar, Hash, Eye, EyeOff,
  RefreshCw, PlusCircle, X as XIcon,
} from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

interface Props {
  rifa: Rifa
  numeros: NumeroRifa[]
  pedidos: Pedido[]
}

type Tab = 'pedidos' | 'numeros' | 'config'

const pedidoStatusBadge = {
  pendente: { label: 'Pendente', variant: 'warning' as const },
  comprovante_enviado: { label: 'Aguardando conf.', variant: 'info' as const },
  confirmado: { label: 'Confirmado', variant: 'success' as const },
  cancelado: { label: 'Cancelado', variant: 'danger' as const },
}

export default function AdminRifaDetalhe({ rifa: initialRifa, numeros: initialNumeros, pedidos: initialPedidos }: Props) {
  const router = useRouter()
  const [rifa, setRifa] = useState(initialRifa)
  const [numerosState, setNumerosState] = useState(initialNumeros)
  const [pedidos, setPedidos] = useState(initialPedidos)
  const [tab, setTab] = useState<Tab>('pedidos')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [modalSorteio, setModalSorteio] = useState(false)
  const [modalNumero, setModalNumero] = useState<NumeroRifa | null>(null)
  const [resultadoFederal, setResultadoFederal] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [showNums, setShowNums] = useState(false)

  // Reservation mode
  const [modoReserva, setModoReserva] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [modalReserva, setModalReserva] = useState(false)
  const [formReserva, setFormReserva] = useState({ nome: '', telefone: '', email: '' })
  const [loadingReserva, setLoadingReserva] = useState(false)

  const vendidos = numerosState.filter((n) => n.status === 'pago').length
  const reservados = numerosState.filter((n) => n.status === 'reservado').length
  const disponiveis = numerosState.filter((n) => n.status === 'disponivel').length
  const arrecadado = pedidos.filter((p) => p.status === 'confirmado').reduce((a, p) => a + p.valor_total, 0)
  const progresso = Math.round(((vendidos + reservados) / rifa.total_numeros) * 100)

  const digits = String(rifa.total_numeros).length

  const precoReserva = (() => {
    const qty = selecionados.size
    if (rifa.preco_promocional && rifa.min_numeros_promocao && qty >= rifa.min_numeros_promocao) {
      return rifa.preco_promocional
    }
    return rifa.preco_numero
  })()

  function toggleModoReserva() {
    setModoReserva((v) => !v)
    setSelecionados(new Set())
  }

  function handleNumeroClick(n: NumeroRifa) {
    if (modoReserva && n.status === 'disponivel') {
      setSelecionados((prev) => {
        const next = new Set(prev)
        if (next.has(n.numero)) next.delete(n.numero)
        else next.add(n.numero)
        return next
      })
    } else {
      setModalNumero(n)
    }
  }

  async function confirmarPedido(pedidoId: string) {
    setLoadingId(pedidoId)
    try {
      const supabase = createClient()
      const pedido = pedidos.find((p) => p.id === pedidoId)!
      const now = new Date().toISOString()

      await supabase.from('pedidos').update({ status: 'confirmado' }).eq('id', pedidoId)
      await supabase.from('numeros_rifa')
        .update({ status: 'pago', paid_at: now })
        .eq('rifa_id', rifa.id)
        .in('numero', pedido.numeros)

      setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, status: 'confirmado' } : p))
      setNumerosState((prev) => prev.map((n) =>
        pedido.numeros.includes(n.numero) ? { ...n, status: 'pago', paid_at: now } : n
      ))
      toast.success('Pedido confirmado!')
    } catch {
      toast.error('Erro ao confirmar pedido')
    } finally {
      setLoadingId(null)
    }
  }

  async function cancelarPedido(pedidoId: string) {
    setLoadingId(pedidoId)
    try {
      const supabase = createClient()
      const pedido = pedidos.find((p) => p.id === pedidoId)!

      await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', pedidoId)
      await supabase.from('numeros_rifa')
        .update({ status: 'disponivel', comprador_nome: null, comprador_telefone: null, comprador_email: null })
        .eq('rifa_id', rifa.id)
        .in('numero', pedido.numeros)

      setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, status: 'cancelado' } : p))
      setNumerosState((prev) => prev.map((n) =>
        pedido.numeros.includes(n.numero)
          ? { ...n, status: 'disponivel', comprador_nome: null, comprador_telefone: null, comprador_email: null }
          : n
      ))
      toast.success('Pedido cancelado')
    } catch {
      toast.error('Erro ao cancelar pedido')
    } finally {
      setLoadingId(null)
    }
  }

  async function reservarNumeros(confirmar: boolean) {
    if (!formReserva.nome.trim() || !formReserva.telefone.trim()) {
      toast.error('Nome e telefone são obrigatórios')
      return
    }
    setLoadingReserva(true)
    try {
      const supabase = createClient()
      const nums = Array.from(selecionados)
      const statusNumero = confirmar ? 'pago' : 'reservado'
      const valor = nums.length * precoReserva
      const now = new Date().toISOString()

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          rifa_id: rifa.id,
          comprador_nome: formReserva.nome.trim(),
          comprador_telefone: formReserva.telefone.trim(),
          comprador_email: formReserva.email.trim() || null,
          numeros: nums,
          valor_total: valor,
          status: confirmar ? 'confirmado' : 'pendente',
        })
        .select()
        .single()

      if (pedidoError) throw pedidoError

      await supabase
        .from('numeros_rifa')
        .update({
          status: statusNumero,
          comprador_nome: formReserva.nome.trim(),
          comprador_telefone: formReserva.telefone.trim(),
          comprador_email: formReserva.email.trim() || null,
          reserved_at: now,
          paid_at: confirmar ? now : null,
        })
        .eq('rifa_id', rifa.id)
        .in('numero', nums)

      setNumerosState((prev) => prev.map((n) =>
        nums.includes(n.numero)
          ? {
              ...n,
              status: statusNumero,
              comprador_nome: formReserva.nome.trim(),
              comprador_telefone: formReserva.telefone.trim(),
              comprador_email: formReserva.email.trim() || null,
              reserved_at: now,
              paid_at: confirmar ? now : null,
            }
          : n
      ))
      setPedidos((prev) => [pedido, ...prev])

      setSelecionados(new Set())
      setModoReserva(false)
      setModalReserva(false)
      setFormReserva({ nome: '', telefone: '', email: '' })
      toast.success(confirmar ? `${nums.length} número(s) confirmado(s)!` : `${nums.length} número(s) reservado(s)!`)
    } catch {
      toast.error('Erro ao reservar números')
    } finally {
      setLoadingReserva(false)
    }
  }

  async function confirmarNumero(n: NumeroRifa) {
    setLoadingId(`num-${n.id}`)
    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      await supabase.from('numeros_rifa').update({ status: 'pago', paid_at: now }).eq('id', n.id)

      setNumerosState((prev) => prev.map((num) => num.id === n.id ? { ...num, status: 'pago', paid_at: now } : num))
      setModalNumero((prev) => prev ? { ...prev, status: 'pago', paid_at: now } : null)
      toast.success('Número confirmado como pago!')
    } catch {
      toast.error('Erro ao confirmar número')
    } finally {
      setLoadingId(null)
    }
  }

  async function cancelarNumeroReserva(n: NumeroRifa) {
    setLoadingId(`num-${n.id}`)
    try {
      const supabase = createClient()
      await supabase.from('numeros_rifa').update({
        status: 'disponivel',
        comprador_nome: null,
        comprador_telefone: null,
        comprador_email: null,
        reserved_at: null,
        paid_at: null,
      }).eq('id', n.id)

      setNumerosState((prev) => prev.map((num) =>
        num.id === n.id
          ? { ...num, status: 'disponivel', comprador_nome: null, comprador_telefone: null, comprador_email: null, reserved_at: null, paid_at: null }
          : num
      ))
      setModalNumero(null)
      toast.success('Reserva cancelada')
    } catch {
      toast.error('Erro ao cancelar reserva')
    } finally {
      setLoadingId(null)
    }
  }

  async function realizarSorteio() {
    if (!resultadoFederal.trim()) { toast.error('Informe o resultado da Federal'); return }

    try {
      const supabase = createClient()
      const ultimos = resultadoFederal.replace(/\D/g, '').slice(-2)
      let numeroSorteado = parseInt(ultimos, 10) % rifa.total_numeros
      if (numeroSorteado === 0) numeroSorteado = rifa.total_numeros

      await supabase.from('rifas').update({
        status: 'sorteada',
        resultado_federal: resultadoFederal.trim(),
        numero_sorteado: numeroSorteado,
      }).eq('id', rifa.id)

      setRifa((r) => ({ ...r, status: 'sorteada', resultado_federal: resultadoFederal.trim(), numero_sorteado: numeroSorteado }))
      setModalSorteio(false)
      toast.success(`Sorteado! Número: ${String(numeroSorteado).padStart(digits, '0')}`)
    } catch {
      toast.error('Erro ao registrar sorteio')
    }
  }

  async function encerrarRifa() {
    try {
      const supabase = createClient()
      await supabase.from('rifas').update({ status: 'encerrada' }).eq('id', rifa.id)
      setRifa((r) => ({ ...r, status: 'encerrada' }))
      toast.success('Rifa encerrada')
    } catch {
      toast.error('Erro ao encerrar rifa')
    }
  }

  const filteredPedidos = pedidos.filter((p) => filtroStatus === 'todos' || p.status === filtroStatus)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-gray-900 truncate">{rifa.titulo}</h1>
          <p className="text-xs text-gray-500">{formatDate(rifa.data_sorteio)}</p>
        </div>
        <Link href={`/rifa/${rifa.id}`} target="_blank">
          <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ExternalLink size={16} className="text-gray-600" />
          </button>
        </Link>
      </div>

      {/* Status + actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={rifa.status === 'ativa' ? 'success' : rifa.status === 'sorteada' ? 'purple' : 'default'}>
            {rifa.status === 'ativa' ? 'Ativa' : rifa.status === 'encerrada' ? 'Encerrada' : 'Sorteada'}
          </Badge>
          <span className="text-xs text-gray-500">{progresso}% vendido</span>
        </div>

        <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-500 to-red-500 rounded-full" style={{ width: `${progresso}%` }} />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          {[
            { label: 'Pagos', value: vendidos, color: 'text-blue-600' },
            { label: 'Reservados', value: reservados, color: 'text-amber-600' },
            { label: 'Livres', value: disponiveis, color: 'text-emerald-600' },
            { label: 'Arrecadado', value: formatCurrency(arrecadado), color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label}>
              <p className={`font-black text-sm ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {rifa.status === 'sorteada' && rifa.numero_sorteado && (
          <div className="bg-gradient-to-r from-red-600 to-red-600 rounded-xl p-3 text-white mb-3">
            <p className="text-red-200 text-xs">🏆 Número Sorteado</p>
            <p className="text-3xl font-black">{String(rifa.numero_sorteado).padStart(digits, '0')}</p>
            {rifa.resultado_federal && <p className="text-red-200 text-xs mt-1">Federal: {rifa.resultado_federal}</p>}
          </div>
        )}

        {rifa.status === 'ativa' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={encerrarRifa}>
              Encerrar
            </Button>
            <Button size="sm" className="flex-1" onClick={() => setModalSorteio(true)}>
              <Trophy size={14} className="mr-1" />
              Sortear
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'pedidos', label: `Pedidos (${pedidos.length})` },
          { key: 'numeros', label: `Números` },
          { key: 'config', label: 'Config' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Pedidos */}
      {tab === 'pedidos' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['todos', 'comprovante_enviado', 'pendente', 'confirmado', 'cancelado'].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filtroStatus === s ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'todos' ? 'Todos' :
                  s === 'comprovante_enviado' ? 'Com comprovante' :
                  s === 'pendente' ? 'Pendentes' :
                  s === 'confirmado' ? 'Confirmados' : 'Cancelados'}
              </button>
            ))}
          </div>

          {filteredPedidos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400 text-sm">Nenhum pedido encontrado</p>
            </div>
          ) : (
            filteredPedidos.map((pedido) => {
              const pb = pedidoStatusBadge[pedido.status as keyof typeof pedidoStatusBadge]
              const isLoading = loadingId === pedido.id

              return (
                <div key={pedido.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{pedido.comprador_nome}</p>
                      <p className="text-xs text-gray-500">{pedido.comprador_telefone}</p>
                    </div>
                    {pb && <Badge variant={pb.variant}>{pb.label}</Badge>}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {pedido.numeros.slice(0, 15).map((n) => (
                      <span key={n} className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded">
                        {String(n).padStart(digits, '0')}
                      </span>
                    ))}
                    {pedido.numeros.length > 15 && (
                      <span className="text-red-600 text-xs font-semibold">+{pedido.numeros.length - 15}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-black text-red-700">{formatCurrency(pedido.valor_total)}</p>
                    <div className="flex gap-2">
                      {pedido.comprovante_url && (
                        <a
                          href={pedido.comprovante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={14} />
                        </a>
                      )}
                      {(pedido.status === 'comprovante_enviado' || pedido.status === 'pendente') && (
                        <>
                          <button
                            disabled={isLoading}
                            onClick={() => cancelarPedido(pedido.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={16} />
                          </button>
                          <button
                            disabled={isLoading}
                            onClick={() => confirmarPedido(pedido.id)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Números */}
      {tab === 'numeros' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{numerosState.length} números no total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNums(!showNums)}
                className="flex items-center gap-1 text-xs text-red-600 font-semibold"
              >
                {showNums ? <EyeOff size={14} /> : <Eye size={14} />}
                {showNums ? 'Ocultar' : 'Mostrar grid'}
              </button>
              {rifa.status === 'ativa' && (
                <button
                  onClick={toggleModoReserva}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    modoReserva
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  {modoReserva ? <><XIcon size={13} /> Cancelar</> : <><PlusCircle size={13} /> Reservar</>}
                </button>
              )}
            </div>
          </div>

          {modoReserva && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              Toque nos números <strong>disponíveis</strong> para selecioná-los. Depois clique em &ldquo;Reservar selecionados&rdquo;.
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 bg-white rounded-xl p-3 border border-gray-100">
            {[
              { color: 'bg-gray-100', label: `Disponível (${disponiveis})` },
              { color: 'bg-amber-400', label: `Reservado (${reservados})` },
              { color: 'bg-blue-500', label: `Pago (${vendidos})` },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-4 h-4 rounded ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>

          {showNums && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
                {numerosState.map((n) => {
                  const isSel = selecionados.has(n.numero)
                  return (
                    <button
                      key={n.numero}
                      onClick={() => handleNumeroClick(n)}
                      className={`aspect-square rounded text-xs font-bold flex items-center justify-center transition-all ${
                        isSel
                          ? 'bg-red-600 text-white scale-105'
                          : n.status === 'pago'
                          ? 'bg-blue-500 text-white'
                          : n.status === 'reservado'
                          ? 'bg-amber-400 text-white'
                          : n.status === 'cancelado'
                          ? 'bg-red-200 text-red-700'
                          : modoReserva
                          ? 'bg-gray-100 text-gray-600 hover:bg-red-100 cursor-pointer'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                      }`}
                    >
                      {String(n.numero).padStart(digits, '0')}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action bar when numbers selected */}
          {modoReserva && selecionados.size > 0 && (
            <div className="bg-red-600 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{selecionados.size} número(s) selecionado(s)</p>
                <p className="text-red-200 text-xs">{formatCurrency(selecionados.size * precoReserva)}</p>
              </div>
              <Button
                size="sm"
                className="bg-white text-red-700 hover:bg-red-50"
                onClick={() => setModalReserva(true)}
              >
                Reservar selecionados
              </Button>
            </div>
          )}

          {/* Números com compradores */}
          <div className="space-y-2">
            {numerosState.filter((n) => n.comprador_nome).map((n) => (
              <div key={n.numero} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                  n.status === 'pago' ? 'bg-blue-500' : 'bg-amber-400'
                }`}>
                  {String(n.numero).padStart(digits, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{n.comprador_nome}</p>
                  <p className="text-xs text-gray-500">{n.comprador_telefone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={n.status === 'pago' ? 'info' : 'warning'}>
                    {n.status === 'pago' ? 'Pago' : 'Reservado'}
                  </Badge>
                  <button onClick={() => setModalNumero(n)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Config */}
      {tab === 'config' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {[
              { icon: Hash, label: 'Total de números', value: rifa.total_numeros },
              { icon: DollarSign, label: 'Preço por número', value: formatCurrency(rifa.preco_numero) },
              { icon: Calendar, label: 'Data do sorteio', value: formatDate(rifa.data_sorteio) },
              { icon: Trophy, label: 'Prêmio', value: rifa.premio },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon size={15} className="text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="font-semibold text-gray-900 text-sm">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
            <p className="font-mono font-semibold text-gray-900 text-sm break-all">{rifa.chave_pix}</p>
            <p className="text-xs text-gray-500 mt-1">Recebedor: {rifa.nome_pix}</p>
          </div>
        </div>
      )}

      {/* Modal Sorteio */}
      <Modal isOpen={modalSorteio} title="Registrar Sorteio" onClose={() => setModalSorteio(false)}>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Informe o resultado da Loteria Federal. O número sorteado será calculado automaticamente.
          </p>
          <Input
            label="Resultado da Federal (1º prêmio)"
            placeholder="Ex: 12345"
            value={resultadoFederal}
            onChange={(e) => setResultadoFederal(e.target.value)}
            hint="Os 2 últimos dígitos determinam o número sorteado"
          />
          {resultadoFederal && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-red-600">Número que será sorteado:</p>
              <p className="text-3xl font-black text-red-700">
                {(() => {
                  const ultimos = resultadoFederal.replace(/\D/g, '').slice(-2)
                  let n = parseInt(ultimos, 10) % rifa.total_numeros
                  if (n === 0) n = rifa.total_numeros
                  return String(n).padStart(digits, '0')
                })()}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setModalSorteio(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={realizarSorteio}>
              Confirmar sorteio
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Reserva Admin */}
      <Modal isOpen={modalReserva} title={`Reservar ${selecionados.size} número(s)`} onClose={() => setModalReserva(false)}>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 rounded-xl p-3">
            <div className="flex flex-wrap gap-1">
              {Array.from(selecionados).sort((a, b) => a - b).slice(0, 20).map((n) => (
                <span key={n} className="bg-red-200 text-red-800 text-xs font-bold px-1.5 py-0.5 rounded">
                  {String(n).padStart(digits, '0')}
                </span>
              ))}
              {selecionados.size > 20 && (
                <span className="text-red-600 text-xs font-semibold">+{selecionados.size - 20}</span>
              )}
            </div>
            <p className="text-red-700 font-black text-sm mt-2">
              Total: {formatCurrency(selecionados.size * precoReserva)}
              {rifa.preco_promocional && rifa.min_numeros_promocao && selecionados.size >= rifa.min_numeros_promocao && (
                <span className="ml-1 text-xs font-semibold text-emerald-600">(preço promocional)</span>
              )}
            </p>
          </div>

          <Input
            label="Nome do comprador"
            placeholder="Nome completo"
            value={formReserva.nome}
            onChange={(e) => setFormReserva({ ...formReserva, nome: e.target.value })}
            required
          />
          <Input
            label="Telefone / WhatsApp"
            placeholder="(11) 99999-9999"
            type="tel"
            value={formReserva.telefone}
            onChange={(e) => setFormReserva({ ...formReserva, telefone: e.target.value })}
            required
          />
          <Input
            label="E-mail (opcional)"
            placeholder="email@exemplo.com"
            type="email"
            value={formReserva.email}
            onChange={(e) => setFormReserva({ ...formReserva, email: e.target.value })}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={loadingReserva}
              onClick={() => reservarNumeros(false)}
            >
              {loadingReserva ? <RefreshCw size={16} className="animate-spin mx-auto" /> : 'Reservar'}
            </Button>
            <Button
              className="flex-1"
              disabled={loadingReserva}
              onClick={() => reservarNumeros(true)}
            >
              {loadingReserva ? <RefreshCw size={16} className="animate-spin mx-auto" /> : 'Reservar e Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Número detalhe */}
      {modalNumero && (
        <Modal isOpen title={`Número ${String(modalNumero.numero).padStart(digits, '0')}`} onClose={() => setModalNumero(null)} size="sm">
          <div className="p-5 space-y-3">
            <div className={`text-center py-4 rounded-xl ${
              modalNumero.status === 'pago' ? 'bg-blue-50' :
              modalNumero.status === 'reservado' ? 'bg-amber-50' :
              'bg-gray-50'
            }`}>
              <p className={`text-4xl font-black ${
                modalNumero.status === 'pago' ? 'text-blue-600' :
                modalNumero.status === 'reservado' ? 'text-amber-600' :
                'text-gray-600'
              }`}>
                {String(modalNumero.numero).padStart(digits, '0')}
              </p>
              <Badge
                variant={modalNumero.status === 'pago' ? 'info' : modalNumero.status === 'reservado' ? 'warning' : 'default'}
                className="mt-2"
              >
                {modalNumero.status === 'pago' ? 'Pago' : modalNumero.status === 'reservado' ? 'Reservado' : 'Disponível'}
              </Badge>
            </div>

            {modalNumero.comprador_nome && (
              <div className="space-y-2 text-sm">
                <div><p className="text-xs text-gray-500">Comprador</p><p className="font-semibold">{modalNumero.comprador_nome}</p></div>
                {modalNumero.comprador_telefone && <div><p className="text-xs text-gray-500">Telefone</p><p className="font-semibold">{modalNumero.comprador_telefone}</p></div>}
                {modalNumero.comprador_email && <div><p className="text-xs text-gray-500">E-mail</p><p className="font-semibold">{modalNumero.comprador_email}</p></div>}
              </div>
            )}

            {modalNumero.comprovante_url && (
              <a href={modalNumero.comprovante_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">
                  <Eye size={14} className="mr-1" /> Ver comprovante
                </Button>
              </a>
            )}

            {/* Actions for reserved numbers */}
            {modalNumero.status === 'reservado' && (
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={loadingId === `num-${modalNumero.id}`}
                  onClick={() => cancelarNumeroReserva(modalNumero)}
                >
                  {loadingId === `num-${modalNumero.id}` ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Cancelar reserva'}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={loadingId === `num-${modalNumero.id}`}
                  onClick={() => confirmarNumero(modalNumero)}
                >
                  {loadingId === `num-${modalNumero.id}` ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Confirmar pagamento'}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
