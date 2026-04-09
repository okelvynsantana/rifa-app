-- =============================================
-- RIFA APP - Supabase Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Rifas (Raffle campaigns)
CREATE TABLE IF NOT EXISTS rifas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  regras TEXT,
  imagem_url TEXT,
  imagem_premio_url TEXT,
  total_numeros INTEGER NOT NULL DEFAULT 100,
  preco_numero DECIMAL(10,2) NOT NULL,
  preco_promocional DECIMAL(10,2),
  min_numeros_promocao INTEGER DEFAULT 2,
  data_sorteio DATE NOT NULL,
  premio TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'sorteada')),
  resultado_federal TEXT,
  numero_sorteado INTEGER,
  chave_pix TEXT NOT NULL,
  nome_pix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Numeros de rifa
CREATE TABLE IF NOT EXISTS numeros_rifa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rifa_id UUID NOT NULL REFERENCES rifas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'pago', 'cancelado')),
  comprador_nome TEXT,
  comprador_telefone TEXT,
  comprador_email TEXT,
  comprovante_url TEXT,
  observacao TEXT,
  reserved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rifa_id, numero)
);

-- Pedidos (Orders grouping multiple numbers)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rifa_id UUID NOT NULL REFERENCES rifas(id) ON DELETE CASCADE,
  comprador_nome TEXT NOT NULL,
  comprador_telefone TEXT NOT NULL,
  comprador_email TEXT,
  numeros INTEGER[] NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'comprovante_enviado', 'confirmado', 'cancelado')),
  comprovante_url TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION (run if table already exists)
-- =============================================
-- ALTER TABLE rifas ADD COLUMN IF NOT EXISTS regras TEXT;
-- ALTER TABLE rifas ADD COLUMN IF NOT EXISTS imagem_premio_url TEXT;
-- ALTER TABLE rifas ADD COLUMN IF NOT EXISTS preco_promocional DECIMAL(10,2);
-- ALTER TABLE rifas ADD COLUMN IF NOT EXISTS min_numeros_promocao INTEGER DEFAULT 2;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_numeros_rifa_rifa_id ON numeros_rifa(rifa_id);
CREATE INDEX IF NOT EXISTS idx_numeros_rifa_status ON numeros_rifa(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_rifa_id ON pedidos(rifa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rifas_updated_at BEFORE UPDATE ON rifas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_numeros_updated_at BEFORE UPDATE ON numeros_rifa FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pedidos_updated_at BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE rifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE numeros_rifa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Rifas: public read, admin write
CREATE POLICY "rifas_public_read" ON rifas FOR SELECT USING (true);
CREATE POLICY "rifas_admin_write" ON rifas FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE id = auth.uid())
);

-- Numeros: public read, anyone can reserve
CREATE POLICY "numeros_public_read" ON numeros_rifa FOR SELECT USING (true);
CREATE POLICY "numeros_public_insert" ON numeros_rifa FOR INSERT WITH CHECK (true);
CREATE POLICY "numeros_public_update_reserve" ON numeros_rifa FOR UPDATE USING (
  status = 'disponivel' OR auth.uid() IN (SELECT id FROM admin_users WHERE id = auth.uid())
);

-- Pedidos: public insert, admin read/update
CREATE POLICY "pedidos_public_insert" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "pedidos_public_read" ON pedidos FOR SELECT USING (true);
CREATE POLICY "pedidos_admin_update" ON pedidos FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE id = auth.uid())
);

-- Admin: only admins can read
CREATE POLICY "admin_read" ON admin_users FOR SELECT USING (
  auth.uid() = id
);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
-- Run these in Supabase dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('comprovantes', 'comprovantes', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('rifas', 'rifas', true);
