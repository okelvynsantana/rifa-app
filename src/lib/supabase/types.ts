export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      rifas: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          imagem_url: string | null
          total_numeros: number
          preco_numero: number
          data_sorteio: string
          premio: string
          status: 'ativa' | 'encerrada' | 'sorteada'
          resultado_federal: string | null
          numero_sorteado: number | null
          chave_pix: string
          nome_pix: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          imagem_url?: string | null
          total_numeros?: number
          preco_numero: number
          data_sorteio: string
          premio: string
          status?: 'ativa' | 'encerrada' | 'sorteada'
          resultado_federal?: string | null
          numero_sorteado?: number | null
          chave_pix: string
          nome_pix: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descricao?: string | null
          imagem_url?: string | null
          total_numeros?: number
          preco_numero?: number
          data_sorteio?: string
          premio?: string
          status?: 'ativa' | 'encerrada' | 'sorteada'
          resultado_federal?: string | null
          numero_sorteado?: number | null
          chave_pix?: string
          nome_pix?: string
          updated_at?: string
        }
        Relationships: []
      }
      numeros_rifa: {
        Row: {
          id: string
          rifa_id: string
          numero: number
          status: 'disponivel' | 'reservado' | 'pago' | 'cancelado'
          comprador_nome: string | null
          comprador_telefone: string | null
          comprador_email: string | null
          comprovante_url: string | null
          observacao: string | null
          reserved_at: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rifa_id: string
          numero: number
          status?: 'disponivel' | 'reservado' | 'pago' | 'cancelado'
          comprador_nome?: string | null
          comprador_telefone?: string | null
          comprador_email?: string | null
          comprovante_url?: string | null
          observacao?: string | null
          reserved_at?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rifa_id?: string
          numero?: number
          status?: 'disponivel' | 'reservado' | 'pago' | 'cancelado'
          comprador_nome?: string | null
          comprador_telefone?: string | null
          comprador_email?: string | null
          comprovante_url?: string | null
          observacao?: string | null
          reserved_at?: string | null
          paid_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'numeros_rifa_rifa_id_fkey'
            columns: ['rifa_id']
            isOneToOne: false
            referencedRelation: 'rifas'
            referencedColumns: ['id']
          }
        ]
      }
      pedidos: {
        Row: {
          id: string
          rifa_id: string
          comprador_nome: string
          comprador_telefone: string
          comprador_email: string | null
          numeros: number[]
          valor_total: number
          status: 'pendente' | 'comprovante_enviado' | 'confirmado' | 'cancelado'
          comprovante_url: string | null
          observacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rifa_id: string
          comprador_nome: string
          comprador_telefone: string
          comprador_email?: string | null
          numeros: number[]
          valor_total: number
          status?: 'pendente' | 'comprovante_enviado' | 'confirmado' | 'cancelado'
          comprovante_url?: string | null
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rifa_id?: string
          comprador_nome?: string
          comprador_telefone?: string
          comprador_email?: string | null
          numeros?: number[]
          valor_total?: number
          status?: 'pendente' | 'comprovante_enviado' | 'confirmado' | 'cancelado'
          comprovante_url?: string | null
          observacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pedidos_rifa_id_fkey'
            columns: ['rifa_id']
            isOneToOne: false
            referencedRelation: 'rifas'
            referencedColumns: ['id']
          }
        ]
      }
      admin_users: {
        Row: {
          id: string
          email: string
          nome: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          nome: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Rifa = Database['public']['Tables']['rifas']['Row']
export type RifaInsert = Database['public']['Tables']['rifas']['Insert']
export type RifaUpdate = Database['public']['Tables']['rifas']['Update']

export type NumeroRifa = Database['public']['Tables']['numeros_rifa']['Row']
export type NumeroRifaInsert = Database['public']['Tables']['numeros_rifa']['Insert']
export type NumeroRifaUpdate = Database['public']['Tables']['numeros_rifa']['Update']

export type Pedido = Database['public']['Tables']['pedidos']['Row']
export type PedidoInsert = Database['public']['Tables']['pedidos']['Insert']
export type PedidoUpdate = Database['public']['Tables']['pedidos']['Update']
