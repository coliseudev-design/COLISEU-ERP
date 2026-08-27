-- Migração 009: Permissões de Vendedores por Grupo de Acesso

-- Adicionar coluna na tabela de grupos de acesso para controlar se permite todos os vendedores
ALTER TABLE dash_grupos_acesso ADD COLUMN IF NOT EXISTS vendedores_todos BOOLEAN DEFAULT TRUE;

-- Criar tabela associativa para os vendedores específicos vinculados ao grupo
CREATE TABLE IF NOT EXISTS dash_grupo_vendedores (
    grupo_id INTEGER NOT NULL REFERENCES dash_grupos_acesso(id) ON DELETE CASCADE,
    vendedor_id INTEGER NOT NULL,
    PRIMARY KEY (grupo_id, vendedor_id)
);
