import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function padNumber(num: number, total: number): string {
  const digits = String(total).length
  return String(num).padStart(digits, '0')
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    disponivel: 'Disponível',
    reservado: 'Reservado',
    pago: 'Pago',
    cancelado: 'Cancelado',
    ativa: 'Ativa',
    encerrada: 'Encerrada',
    sorteada: 'Sorteada',
    pendente: 'Pendente',
    comprovante_enviado: 'Comprovante Enviado',
    confirmado: 'Confirmado',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    disponivel: 'bg-emerald-500',
    reservado: 'bg-amber-500',
    pago: 'bg-blue-500',
    cancelado: 'bg-red-500',
    ativa: 'bg-emerald-500',
    encerrada: 'bg-gray-500',
    sorteada: 'bg-red-500',
    pendente: 'bg-amber-500',
    comprovante_enviado: 'bg-blue-500',
    confirmado: 'bg-emerald-500',
  }
  return colors[status] || 'bg-gray-500'
}

export function calcularProgresso(numerosVendidos: number, total: number): number {
  return Math.round((numerosVendidos / total) * 100)
}
