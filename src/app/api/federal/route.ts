import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://servicebus2.caixa.gov.br/portaldeloterias/api/federal/',
      { next: { revalidate: 300 } }
    )

    if (!res.ok) throw new Error(`Status ${res.status}`)

    const data = await res.json()

    const primeiroPremio: string | undefined = data.listaDezenas?.[0]

    if (!primeiroPremio) throw new Error('Sem resultado disponível')

    return NextResponse.json({
      concurso: data.numero,
      data: data.dataApuracao,
      primeiro_premio: primeiroPremio,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: `Não foi possível buscar o resultado da Federal: ${msg}` },
      { status: 502 }
    )
  }
}
