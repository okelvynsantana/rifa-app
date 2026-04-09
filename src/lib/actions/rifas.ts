'use server'

import { createClient } from '@/lib/supabase/server'
import { RifaInsert, RifaUpdate } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'

export async function getRifas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rifas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getRifaById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rifas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getNumerosByRifa(rifaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('numeros_rifa')
    .select('*')
    .eq('rifa_id', rifaId)
    .order('numero')

  if (error) throw error
  return data
}

export async function criarRifa(rifa: RifaInsert) {
  const supabase = await createClient()

  // Create the rifa
  const { data: rifaData, error: rifaError } = await supabase
    .from('rifas')
    .insert(rifa)
    .select()
    .single()

  if (rifaError) throw rifaError

  // Pre-populate all numbers
  const numeros = Array.from({ length: rifa.total_numeros || 100 }, (_, i) => ({
    rifa_id: rifaData.id,
    numero: i + 1,
    status: 'disponivel' as const,
  }))

  const { error: numerosError } = await supabase
    .from('numeros_rifa')
    .insert(numeros)

  if (numerosError) throw numerosError

  revalidatePath('/admin')
  revalidatePath('/')
  return rifaData
}

export async function atualizarRifa(id: string, update: RifaUpdate) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rifas')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/admin')
  revalidatePath(`/rifa/${id}`)
  return data
}

export async function getPedidosByRifa(rifaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('rifa_id', rifaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function atualizarStatusPedido(
  pedidoId: string,
  status: 'confirmado' | 'cancelado'
) {
  const supabase = await createClient()

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single()

  if (pedidoError) throw pedidoError

  const newStatus = status === 'confirmado' ? 'pago' : 'cancelado'

  const { error } = await supabase
    .from('pedidos')
    .update({ status })
    .eq('id', pedidoId)

  if (error) throw error

  // Update individual numbers
  await supabase
    .from('numeros_rifa')
    .update({
      status: newStatus,
      paid_at: status === 'confirmado' ? new Date().toISOString() : null,
    })
    .eq('rifa_id', pedido.rifa_id)
    .in('numero', pedido.numeros)

  if (status === 'cancelado') {
    await supabase
      .from('numeros_rifa')
      .update({ status: 'disponivel', comprador_nome: null, comprador_telefone: null })
      .eq('rifa_id', pedido.rifa_id)
      .in('numero', pedido.numeros)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/rifa/${pedido.rifa_id}`)
}
