'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ArrowLeft, Image as ImageIcon, X, Tag, Trophy } from 'lucide-react'
import Link from 'next/link'

export default function NovaRifaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [imagemPremioFile, setImagemPremioFile] = useState<File | null>(null)
  const [imagemPremioPreview, setImagemPremioPreview] = useState<string | null>(null)
  const [promocaoAtiva, setPromocaoAtiva] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    regras: '',
    total_numeros: '100',
    preco_numero: '',
    preco_promocional: '',
    min_numeros_promocao: '2',
    data_sorteio: '',
    premio: '',
    chave_pix: '',
    nome_pix: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.titulo.trim()) errs.titulo = 'Título é obrigatório'
    if (!form.total_numeros || Number(form.total_numeros) < 10) errs.total_numeros = 'Mínimo 10 números'
    if (Number(form.total_numeros) > 100000) errs.total_numeros = 'Máximo 100.000 números'
    if (!form.preco_numero || Number(form.preco_numero) <= 0) errs.preco_numero = 'Preço inválido'
    if (promocaoAtiva) {
      if (!form.preco_promocional || Number(form.preco_promocional) <= 0) errs.preco_promocional = 'Preço promocional inválido'
      if (Number(form.preco_promocional) >= Number(form.preco_numero)) errs.preco_promocional = 'Deve ser menor que o preço normal'
      if (!form.min_numeros_promocao || Number(form.min_numeros_promocao) < 2) errs.min_numeros_promocao = 'Mínimo 2 números'
    }
    if (!form.data_sorteio) errs.data_sorteio = 'Data é obrigatória'
    if (!form.premio.trim()) errs.premio = 'Prêmio é obrigatório'
    if (!form.chave_pix.trim()) errs.chave_pix = 'Chave PIX é obrigatória'
    if (!form.nome_pix.trim()) errs.nome_pix = 'Nome do recebedor é obrigatório'
    return errs
  }

  function handleImagem(e: React.ChangeEvent<HTMLInputElement>, type: 'capa' | 'premio') {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máx 5MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (type === 'capa') { setImagemFile(file); setImagemPreview(ev.target?.result as string) }
      else { setImagemPremioFile(file); setImagemPremioPreview(ev.target?.result as string) }
    }
    reader.readAsDataURL(file)
  }

  async function uploadImagem(file: File, prefix: string): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${prefix}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('rifas').upload(path, file)
    if (error) return null
    const { data } = supabase.storage.from('rifas').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    try {
      const supabase = createClient()

      const [imagem_url, imagem_premio_url] = await Promise.all([
        imagemFile ? uploadImagem(imagemFile, 'rifa') : Promise.resolve(null),
        imagemPremioFile ? uploadImagem(imagemPremioFile, 'premio') : Promise.resolve(null),
      ])

      const { data: rifa, error: rifaError } = await supabase
        .from('rifas')
        .insert({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          regras: form.regras.trim() || null,
          imagem_url,
          imagem_premio_url,
          total_numeros: Number(form.total_numeros),
          preco_numero: Number(form.preco_numero),
          preco_promocional: promocaoAtiva ? Number(form.preco_promocional) : null,
          min_numeros_promocao: promocaoAtiva ? Number(form.min_numeros_promocao) : null,
          data_sorteio: form.data_sorteio,
          premio: form.premio.trim(),
          chave_pix: form.chave_pix.trim(),
          nome_pix: form.nome_pix.trim(),
          status: 'ativa',
        })
        .select()
        .single()

      if (rifaError) throw rifaError

      // Pre-populate numbers in batches (Supabase has a row limit per insert)
      const totalNums = Number(form.total_numeros)
      const batchSize = 1000
      for (let i = 0; i < totalNums; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, totalNums - i) }, (_, j) => ({
          rifa_id: rifa.id,
          numero: i + j + 1,
          status: 'disponivel' as const,
        }))
        const { error: numError } = await supabase.from('numeros_rifa').insert(batch)
        if (numError) throw numError
      }

      toast.success('Rifa criada com sucesso!')
      router.push(`/admin/rifa/${rifa.id}`)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao criar rifa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const precoNormal = Number(form.preco_numero) || 0
  const precoPromo = Number(form.preco_promocional) || 0
  const minPromo = Number(form.min_numeros_promocao) || 2
  const desconto = precoNormal > 0 && precoPromo > 0
    ? Math.round((1 - precoPromo / precoNormal) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
        </Link>
        <h1 className="text-2xl font-black text-gray-900">Nova Rifa</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Imagem de capa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <ImageIcon size={16} className="text-red-600" />
            Imagem de Capa
          </h2>
          <ImageUploader
            preview={imagemPreview}
            onChange={(e) => handleImagem(e, 'capa')}
            onClear={() => { setImagemFile(null); setImagemPreview(null) }}
            placeholder="Imagem de capa da rifa"
          />
        </div>

        {/* Informações */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">Informações da Rifa</h2>
          <Input label="Título *" placeholder="Ex: iPhone 16 Pro 256GB" value={form.titulo} onChange={(e) => update('titulo', e.target.value)} error={errors.titulo} />
          <Textarea label="Descrição" placeholder="Apresente a rifa brevemente..." value={form.descricao} onChange={(v) => update('descricao', v)} rows={2} />
        </div>

        {/* Prêmio */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Trophy size={16} className="text-red-600" />
            Prêmio
          </h2>
          <Input label="Nome do prêmio *" placeholder="Ex: iPhone 16 Pro 256GB Titânio Natural" value={form.premio} onChange={(e) => update('premio', e.target.value)} error={errors.premio} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Foto do prêmio</label>
            <ImageUploader
              preview={imagemPremioPreview}
              onChange={(e) => handleImagem(e, 'premio')}
              onClear={() => { setImagemPremioFile(null); setImagemPremioPreview(null) }}
              placeholder="Foto do prêmio"
              height="h-36"
            />
          </div>
          <Textarea label="Regras de participação" placeholder="Descreva as regras, como o sorteio funciona, quem pode participar..." value={form.regras} onChange={(v) => update('regras', v)} rows={4} />
        </div>

        {/* Números e preço */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">Números e Preço</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total de números *"
              type="number"
              placeholder="100"
              min="10"
              max="100000"
              value={form.total_numeros}
              onChange={(e) => update('total_numeros', e.target.value)}
              error={errors.total_numeros}
              hint="De 10 a 100.000"
            />
            <Input
              label="Preço por número *"
              type="number"
              placeholder="10.00"
              min="0.01"
              step="0.01"
              value={form.preco_numero}
              onChange={(e) => update('preco_numero', e.target.value)}
              error={errors.preco_numero}
            />
          </div>
          <Input
            label="Data do sorteio *"
            type="date"
            value={form.data_sorteio}
            onChange={(e) => update('data_sorteio', e.target.value)}
            error={errors.data_sorteio}
            hint="Resultado baseado na Loteria Federal"
          />
        </div>

        {/* Promoção */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Tag size={16} className="text-red-600" />
              Promoção por quantidade
            </h2>
            <button
              type="button"
              onClick={() => setPromocaoAtiva(!promocaoAtiva)}
              className={`relative w-11 h-6 rounded-full transition-colors ${promocaoAtiva ? 'bg-red-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${promocaoAtiva ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {promocaoAtiva && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Preço promocional *"
                  type="number"
                  placeholder="8.00"
                  min="0.01"
                  step="0.01"
                  value={form.preco_promocional}
                  onChange={(e) => update('preco_promocional', e.target.value)}
                  error={errors.preco_promocional}
                />
                <Input
                  label="A partir de * números"
                  type="number"
                  placeholder="2"
                  min="2"
                  value={form.min_numeros_promocao}
                  onChange={(e) => update('min_numeros_promocao', e.target.value)}
                  error={errors.min_numeros_promocao}
                />
              </div>

              {desconto > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Tag size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-700">
                      {desconto}% de desconto
                    </p>
                    <p className="text-xs text-emerald-600">
                      Comprando {minPromo}+ números: R$ {precoPromo.toFixed(2)} cada (normal R$ {precoNormal.toFixed(2)})
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!promocaoAtiva && (
            <p className="text-xs text-gray-400">
              Ative para oferecer desconto ao comprar 2 ou mais números.
            </p>
          )}
        </div>

        {/* PIX */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">Dados do PIX</h2>
          <Input
            label="Chave PIX *"
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            value={form.chave_pix}
            onChange={(e) => update('chave_pix', e.target.value)}
            error={errors.chave_pix}
          />
          <Input
            label="Nome do recebedor *"
            placeholder="Nome como aparece no PIX"
            value={form.nome_pix}
            onChange={(e) => update('nome_pix', e.target.value)}
            error={errors.nome_pix}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Criar Rifa
        </Button>
      </form>
    </div>
  )
}

// ---- Internal helpers ----

function ImageUploader({
  preview,
  onChange,
  onClear,
  placeholder,
  height = 'h-40',
}: {
  preview: string | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  placeholder: string
  height?: string
}) {
  return (
    <label className="block cursor-pointer">
      <div className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${preview ? 'border-red-300' : 'border-gray-200 hover:border-red-300'}`}>
        {preview ? (
          <>
            <img src={preview} alt="Preview" className={`w-full ${height} object-cover`} />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onClear() }}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className={`${height} flex flex-col items-center justify-center gap-2 text-gray-400`}>
            <ImageIcon size={28} />
            <p className="text-sm">{placeholder}</p>
          </div>
        )}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  )
}

function Textarea({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <textarea
        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
