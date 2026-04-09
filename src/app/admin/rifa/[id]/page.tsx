import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminRifaDetalhe from './AdminRifaDetalhe'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminRifaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [rifaRes, numerosRes, pedidosRes] = await Promise.all([
    supabase.from('rifas').select('*').eq('id', id).single(),
    supabase.from('numeros_rifa').select('*').eq('rifa_id', id).order('numero'),
    supabase.from('pedidos').select('*').eq('rifa_id', id).order('created_at', { ascending: false }),
  ])

  if (!rifaRes.data) notFound()

  return (
    <AdminRifaDetalhe
      rifa={rifaRes.data}
      numeros={numerosRes.data || []}
      pedidos={pedidosRes.data || []}
    />
  )
}
