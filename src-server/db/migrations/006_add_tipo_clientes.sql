-- Migration 006: Adiciona campo tipo em dash_clientes
-- Permite diferenciar CLIENTE de FORNECEDOR (sincronizado do ERP)
ALTER TABLE dash_clientes ADD COLUMN IF NOT EXISTS tipo VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_dash_clientes_tipo ON dash_clientes(tenant_id, tipo);
