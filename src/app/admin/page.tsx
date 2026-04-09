import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { Plus, ChevronRight, TrendingUp, Ticket, DollarSign, Users } from 'lucide-react'

async function getDashboardData() {
  const supabase = await createClient()

  const [rifasRes, pedidosRes] = await Promise.all([
    supabase.from('rifas').select('*').order('created_at', { ascending: false }),
    supabase.from('pedidos').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  const rifas = rifasRes.data || []
  const pedidos = pedidosRes.data || []

  const totalArrecadado = pedidos
    .filter((p) => p.status === 'confirmado')
    .reduce((acc, p) => acc + p.valor_total, 0)

  const totalPendente = pedidos
    .filter((p) => p.status === 'comprovante_enviado')
    .reduce((acc, p) => acc + p.valor_total, 0)

  return { rifas, pedidos, totalArrecadado, totalPendente }
}

export default async function AdminDashboard() {
  const { rifas, pedidos, totalArrecadado, totalPendente } = await getDashboardData()

  const statusBadge = {
    ativa: { label: 'Ativa', variant: 'success' as const },
    encerrada: { label: 'Encerrada', variant: 'default' as const },
    sorteada: { label: 'Sorteada', variant: 'purple' as const },
  }

  const pedidoStatusBadge = {
    pendente: { label: 'Pendente', variant: 'warning' as const },
    comprovante_enviado: { label: 'Comprovante', variant: 'info' as const },
    confirmado: { label: 'Confirmado', variant: 'success' as const },
    cancelado: { label: 'Cancelado', variant: 'danger' as const },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <Link
          href="/admin/nova-rifa"
          className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} />
          Nova Rifa
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Ticket, label: 'Rifas Ativas', value: rifas.filter((r) => r.status === 'ativa').length, color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: Users, label: 'Pedidos Hoje', value: pedidos.filter((p) => p.created_at.startsWith(new Date().toISOString().split('T')[0])).length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: DollarSign, label: 'Arrecadado', value: formatCurrency(totalArrecadado), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: TrendingUp, label: 'Pendente', value: formatCurrency(totalPendente), color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-2`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`font-black text-lg ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Rifas */}
      <section>
        <h2 className="text-base font-bold text-gray-900 mb-3">Minhas Rifas</h2>
        {rifas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Ticket size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma rifa criada</p>
            <Link href="/admin/nova-rifa" className="text-violet-600 text-sm font-semibold mt-2 inline-block">
              Criar primeira rifa →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {rifas.map((rifa) => {
              const sb = statusBadge[rifa.status]
              return (
                <Link key={rifa.id} href={`/admin/rifa/${rifa.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow active:scale-98">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{rifa.titulo}</h3>
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatDate(rifa.data_sorteio)}</span>
                        <span>{formatCurrency(rifa.preco_numero)}/número</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent orders */}
      {pedidos.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">Pedidos Recentes</h2>
          <div className="space-y-2">
            {pedidos.slice(0, 5).map((pedido) => {
              const pb = pedidoStatusBadge[pedido.status as keyof typeof pedidoStatusBadge]
              return (
                <div key={pedido.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-900 text-sm">{pedido.comprador_nome}</p>
                    {pb && <Badge variant={pb.variant}>{pb.label}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{pedido.numeros.length} número{pedido.numeros.length > 1 ? 's' : ''}</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(pedido.valor_total)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
