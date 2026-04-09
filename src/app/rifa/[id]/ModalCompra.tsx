'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Rifa } from '@/lib/supabase/types'
import { formatCurrency, padNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { CheckCircle, Copy, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  rifa: Rifa
  numerosSelecionados: number[]
  onClose: () => void
  onSuccess: () => void
}

type Step = 'dados' | 'pix' | 'comprovante' | 'sucesso'

export default function ModalCompra({ rifa, numerosSelecionados, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('dados')
  const [loading, setLoading] = useState(false)
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [comprovante, setComprovante] = useState<File | null>(null)
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const total = numerosSelecionados.length * rifa.preco_numero
  const digits = String(rifa.total_numeros).length

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório'
    if (!form.telefone.trim()) errs.telefone = 'Telefone é obrigatório'
    if (form.telefone.replace(/\D/g, '').length < 10) errs.telefone = 'Telefone inválido'
    return errs
  }

  async function handleReservar() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    try {
      const supabase = createClient()

      // Check if numbers are still available
      const { data: nums } = await supabase
        .from('numeros_rifa')
        .select('numero, status')
        .eq('rifa_id', rifa.id)
        .in('numero', numerosSelecionados)

      const occupied = nums?.filter((n) => n.status !== 'disponivel') || []
      if (occupied.length > 0) {
        toast.error(`Números ${occupied.map((n) => padNumber(n.numero, rifa.total_numeros)).join(', ')} já foram reservados!`)
        setLoading(false)
        return
      }

      // Create order
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          rifa_id: rifa.id,
          comprador_nome: form.nome.trim(),
          comprador_telefone: form.telefone.replace(/\D/g, ''),
          comprador_email: form.email.trim() || null,
          numeros: numerosSelecionados,
          valor_total: total,
          status: 'pendente',
        })
        .select()
        .single()

      if (pedidoError) throw pedidoError
      setPedidoId(pedido.id)

      // Reserve numbers
      await supabase
        .from('numeros_rifa')
        .update({
          status: 'reservado',
          comprador_nome: form.nome.trim(),
          comprador_telefone: form.telefone.replace(/\D/g, ''),
          comprador_email: form.email.trim() || null,
          reserved_at: new Date().toISOString(),
        })
        .eq('rifa_id', rifa.id)
        .in('numero', numerosSelecionados)

      setStep('pix')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao reservar números. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.')
      return
    }
    setComprovante(file)
    const reader = new FileReader()
    reader.onload = (ev) => setComprovantePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleEnviarComprovante() {
    if (!comprovante || !pedidoId) return
    setLoading(true)

    try {
      const supabase = createClient()
      const ext = comprovante.name.split('.').pop()
      const path = `${rifa.id}/${pedidoId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(path, comprovante, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(path)

      await supabase
        .from('pedidos')
        .update({ status: 'comprovante_enviado', comprovante_url: urlData.publicUrl })
        .eq('id', pedidoId)

      await supabase
        .from('numeros_rifa')
        .update({ comprovante_url: urlData.publicUrl })
        .eq('rifa_id', rifa.id)
        .in('numero', numerosSelecionados)

      setStep('sucesso')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao enviar comprovante. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function copyPix() {
    navigator.clipboard.writeText(rifa.chave_pix)
    toast.success('Chave PIX copiada!')
  }

  function handleClose() {
    if (step === 'sucesso') {
      onSuccess()
      router.refresh()
    } else {
      onClose()
    }
  }

  const stepTitles: Record<Step, string> = {
    dados: 'Seus dados',
    pix: 'Pagar via PIX',
    comprovante: 'Enviar comprovante',
    sucesso: 'Pedido realizado!',
  }

  return (
    <Modal isOpen title={stepTitles[step]} onClose={handleClose} size="md">
      {/* Step indicator */}
      {step !== 'sucesso' && (
        <div className="px-5 py-2 flex items-center gap-2">
          {(['dados', 'pix', 'comprovante'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-violet-600 text-white' :
                  ['pix', 'comprovante'].indexOf(step) > ['pix', 'comprovante'].indexOf(s) ||
                  (step === 'comprovante' && s === 'dados') ||
                  (step === 'pix' && s === 'dados')
                    ? 'bg-violet-100 text-violet-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 ${
                (['pix', 'comprovante'].indexOf(step) > i) ? 'bg-violet-300' : 'bg-gray-100'
              }`} />}
            </div>
          ))}
        </div>
      )}

      {/* Selected numbers summary */}
      {step !== 'sucesso' && (
        <div className="mx-5 mb-3 bg-violet-50 rounded-xl p-3">
          <p className="text-xs text-violet-600 font-semibold mb-1">
            {numerosSelecionados.length} número{numerosSelecionados.length > 1 ? 's' : ''} selecionado{numerosSelecionados.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {numerosSelecionados.slice(0, 20).map((n) => (
              <span key={n} className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                {String(n).padStart(digits, '0')}
              </span>
            ))}
            {numerosSelecionados.length > 20 && (
              <span className="text-violet-600 text-xs font-semibold">+{numerosSelecionados.length - 20}</span>
            )}
          </div>
          <p className="font-black text-violet-700 text-lg">{formatCurrency(total)}</p>
        </div>
      )}

      {/* Step: Dados */}
      {step === 'dados' && (
        <div className="px-5 pb-5 space-y-3">
          <Input
            label="Nome completo *"
            placeholder="Seu nome"
            value={form.nome}
            onChange={(e) => { setForm({ ...form, nome: e.target.value }); setErrors({}) }}
            error={errors.nome}
          />
          <Input
            label="WhatsApp / Telefone *"
            placeholder="(99) 99999-9999"
            value={form.telefone}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              let formatted = v
              if (v.length > 2) formatted = `(${v.slice(0, 2)}) ${v.slice(2)}`
              if (v.length > 7) formatted = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`
              setForm({ ...form, telefone: formatted })
              setErrors({})
            }}
            error={errors.telefone}
            maxLength={15}
          />
          <Input
            label="E-mail (opcional)"
            placeholder="seu@email.com"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Button className="w-full" size="lg" loading={loading} onClick={handleReservar}>
            Reservar e pagar via PIX
          </Button>
        </div>
      )}

      {/* Step: PIX */}
      {step === 'pix' && (
        <div className="px-5 pb-5 space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-2">Faça o PIX para</p>
            <p className="font-bold text-gray-900 text-lg">{rifa.nome_pix}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Chave PIX</p>
            <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-200 rounded-xl p-3">
              <p className="flex-1 font-mono text-sm text-gray-900 break-all">{rifa.chave_pix}</p>
              <button
                onClick={copyPix}
                className="flex-shrink-0 p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-amber-700 text-xs">
              ⚠️ Após realizar o pagamento, clique em "Já paguei" para enviar o comprovante.
              Seus números ficam reservados por 2 horas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('dados')}>
              Voltar
            </Button>
            <Button onClick={() => setStep('comprovante')}>
              Já paguei ✓
            </Button>
          </div>
        </div>
      )}

      {/* Step: Comprovante */}
      {step === 'comprovante' && (
        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-gray-600">
            Envie o comprovante do PIX para confirmar sua participação.
          </p>

          <label className="block cursor-pointer">
            <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
              comprovantePreview ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50'
            }`}>
              {comprovantePreview ? (
                <div className="relative">
                  <img
                    src={comprovantePreview}
                    alt="Comprovante"
                    className="max-h-40 mx-auto rounded-xl object-contain"
                  />
                  <div className="mt-2 flex items-center justify-center gap-1 text-violet-600 text-sm font-medium">
                    <CheckCircle size={16} />
                    Comprovante selecionado
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600">Toque para selecionar</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG ou PDF • Máx 5MB</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('pix')}>
              Voltar
            </Button>
            <Button
              disabled={!comprovante}
              loading={loading}
              onClick={handleEnviarComprovante}
            >
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* Step: Sucesso */}
      {step === 'sucesso' && (
        <div className="px-5 py-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Pedido realizado!</h3>
          <p className="text-gray-500 text-sm mb-2">
            Seus números estão reservados. Assim que confirmarmos o pagamento, você receberá a confirmação.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 mb-6">
            <p className="text-xs text-gray-500">Seus números</p>
            <div className="flex flex-wrap justify-center gap-1 mt-1">
              {numerosSelecionados.map((n) => (
                <span key={n} className="bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  {String(n).padStart(digits, '0')}
                </span>
              ))}
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      )}
    </Modal>
  )
}
