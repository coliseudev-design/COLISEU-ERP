-- Migração 008: Vincular usuários a múltiplos grupos de acesso e versões

-- Criar tabela associativa para vínculo N:M entre usuários e grupos de acesso
CREATE TABLE IF NOT EXISTS dash_usuario_grupo (
    usuario_id INTEGER NOT NULL REFERENCES dash_usuarios(id) ON DELETE CASCADE,
    grupo_id INTEGER NOT NULL REFERENCES dash_grupos_acesso(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, grupo_id)
);

-- Migrar dados históricos da coluna grupo_id (da tabela dash_usuarios) para a nova tabela
INSERT INTO dash_usuario_grupo (usuario_id, grupo_id)
SELECT id, grupo_id FROM dash_usuarios 
WHERE grupo_id IS NOT NULL 
ON CONFLICT DO NOTHING;
