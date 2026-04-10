import { createClient } from '@/lib/supabase/server'
import RifaCard from '@/components/rifa/RifaCard'
import { Ticket } from 'lucide-react'

async function getRifasComProgresso() {
  const supabase = await createClient()

  const { data: rifas } = await supabase
    .from('rifas')
    .select('*')
    .order('created_at', { ascending: false })

  if (!rifas) return []

  const rifasComProgresso = await Promise.all(
    rifas.map(async (rifa) => {
      const { count } = await supabase
        .from('numeros_rifa')
        .select('*', { count: 'exact', head: true })
        .eq('rifa_id', rifa.id)
        .in('status', ['pago', 'reservado'])

      return { rifa, numerosVendidos: count || 0 }
    })
  )

  return rifasComProgresso
}

export default async function HomePage() {
  const rifasComProgresso = await getRifasComProgresso()
  const ativas = rifasComProgresso.filter((r) => r.rifa.status === 'ativa')
  const encerradas = rifasComProgresso.filter((r) => r.rifa.status !== 'ativa')

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Ticket size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">RifaApp</h1>
              <p className="text-red-200 text-sm">Rifas online seguras e transparentes</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-sm text-red-100">
              🎯 Resultados baseados na <strong>Loteria Federal</strong> — 100% transparente e verificável
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Rifas Ativas', value: ativas.length },
            { label: 'Sorteadas', value: rifasComProgresso.filter((r) => r.rifa.status === 'sorteada').length },
            { label: 'Transparente', value: '100%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-xl font-black text-red-600">{stat.value}</p>
              <p className="text-xs text-gray-500 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active raffles */}
        {ativas.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-black text-gray-900 mb-3">Rifas em Andamento</h2>
            <div className="space-y-4">
              {ativas.map(({ rifa, numerosVendidos }) => (
                <RifaCard key={rifa.id} rifa={rifa} numerosVendidos={numerosVendidos} />
              ))}
            </div>
          </section>
        )}

        {/* Closed raffles */}
        {encerradas.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-gray-900 mb-3">Rifas Encerradas</h2>
            <div className="space-y-4">
              {encerradas.map(({ rifa, numerosVendidos }) => (
                <RifaCard key={rifa.id} rifa={rifa} numerosVendidos={numerosVendidos} />
              ))}
            </div>
          </section>
        )}

        {rifasComProgresso.length === 0 && (
          <div className="text-center py-16">
            <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhuma rifa disponível</p>
            <p className="text-gray-400 text-sm mt-1">Volte em breve para conferir as novidades</p>
          </div>
        )}
      </div>
    </main>
  )
}
