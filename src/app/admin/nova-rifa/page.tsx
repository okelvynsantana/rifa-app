'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ArrowLeft, Image as ImageIcon, X } from 'lucide-react'
import Link from 'next/link'

export default function NovaRifaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    total_numeros: '100',
    preco_numero: '',
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
    if (!form.preco_numero || Number(form.preco_numero) <= 0) errs.preco_numero = 'Preço inválido'
    if (!form.data_sorteio) errs.data_sorteio = 'Data é obrigatória'
    if (!form.premio.trim()) errs.premio = 'Prêmio é obrigatório'
    if (!form.chave_pix.trim()) errs.chave_pix = 'Chave PIX é obrigatória'
    if (!form.nome_pix.trim()) errs.nome_pix = 'Nome do recebedor é obrigatório'
    return errs
  }

  function handleImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máx 5MB'); return }
    setImagemFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagemPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    try {
      const supabase = createClient()
      let imagem_url: string | null = null

      if (imagemFile) {
        const ext = imagemFile.name.split('.').pop()
        const path = `rifa-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('rifas')
          .upload(path, imagemFile)

        if (!uploadError) {
          const { data } = supabase.storage.from('rifas').getPublicUrl(path)
          imagem_url = data.publicUrl
        }
      }

      // Create rifa
      const { data: rifa, error: rifaError } = await supabase
        .from('rifas')
        .insert({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          imagem_url,
          total_numeros: Number(form.total_numeros),
          preco_numero: Number(form.preco_numero),
          data_sorteio: form.data_sorteio,
          premio: form.premio.trim(),
          chave_pix: form.chave_pix.trim(),
          nome_pix: form.nome_pix.trim(),
          status: 'ativa',
        })
        .select()
        .single()

      if (rifaError) throw rifaError

      // Pre-populate numbers
      const numeros = Array.from({ length: Number(form.total_numeros) }, (_, i) => ({
        rifa_id: rifa.id,
        numero: i + 1,
        status: 'disponivel' as const,
      }))

      const { error: numError } = await supabase.from('numeros_rifa').insert(numeros)
      if (numError) throw numError

      toast.success('Rifa criada com sucesso!')
      router.push(`/admin/rifa/${rifa.id}`)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao criar rifa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

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
        {/* Imagem */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">Imagem da Rifa</h2>
          <label className="block cursor-pointer">
            <div className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
              imagemPreview ? 'border-violet-300' : 'border-gray-200 hover:border-violet-300'
            }`}>
              {imagemPreview ? (
                <>
                  <img src={imagemPreview} alt="Preview" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setImagemFile(null); setImagemPreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <ImageIcon size={28} />
                  <p className="text-sm">Toque para adicionar imagem</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleImagem} />
          </label>
        </div>

        {/* Informações */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">Informações</h2>
          <Input label="Título da rifa *" placeholder="Ex: iPhone 16 Pro 256GB" value={form.titulo} onChange={(e) => update('titulo', e.target.value)} error={errors.titulo} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
              rows={3}
              placeholder="Descreva o prêmio e as regras da rifa..."
              value={form.descricao}
              onChange={(e) => update('descricao', e.target.value)}
            />
          </div>
          <Input label="Prêmio *" placeholder="Ex: iPhone 16 Pro 256GB Titânio Natural" value={form.premio} onChange={(e) => update('premio', e.target.value)} error={errors.premio} />
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
              max="10000"
              value={form.total_numeros}
              onChange={(e) => update('total_numeros', e.target.value)}
              error={errors.total_numeros}
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
            hint="O sorteio será baseado no resultado da Loteria Federal"
          />
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
