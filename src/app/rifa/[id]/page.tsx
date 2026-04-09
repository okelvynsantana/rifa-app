import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RifaDetalhe from './RifaDetalhe'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RifaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rifa } = await supabase
    .from('rifas')
    .select('*')
    .eq('id', id)
    .single()

  if (!rifa) notFound()

  const { data: numeros } = await supabase
    .from('numeros_rifa')
    .select('*')
    .eq('rifa_id', id)
    .order('numero')

  return <RifaDetalhe rifa={rifa} numeros={numeros || []} />
}
