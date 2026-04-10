'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Ticket, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (error) {
        toast.error('Email ou senha incorretos')
        return
      }

      // Full page navigation ensures proxy reads fresh session cookies
      window.location.href = '/admin'
    } catch {
      toast.error('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Ticket size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">RifaApp</h1>
          <p className="text-red-200 text-sm mt-1">Painel Administrativo</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={18} className="text-red-600" />
            <h2 className="font-bold text-gray-900">Entrar</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Entrar no painel
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
