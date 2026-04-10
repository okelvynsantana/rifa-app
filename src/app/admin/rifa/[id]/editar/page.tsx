import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditarRifaForm from './EditarRifaForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarRifaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rifa } = await supabase.from('rifas').select('*').eq('id', id).single()

  if (!rifa) notFound()

  return <EditarRifaForm rifa={rifa} />
}
