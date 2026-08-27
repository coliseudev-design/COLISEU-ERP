-- Migração 007: Renomear layout_version para versao e atualizar valores
-- Renomeando coluna em dash_usuarios
ALTER TABLE dash_usuarios RENAME COLUMN layout_version TO versao;
ALTER TABLE dash_usuarios ALTER COLUMN versao TYPE VARCHAR(50);
ALTER TABLE dash_usuarios ALTER COLUMN versao SET DEFAULT 'Dash 1.0';

-- Renomeando coluna em dash_grupos_acesso
ALTER TABLE dash_grupos_acesso RENAME COLUMN layout_version TO versao;
ALTER TABLE dash_grupos_acesso ALTER COLUMN versao TYPE VARCHAR(50);
ALTER TABLE dash_grupos_acesso ALTER COLUMN versao SET DEFAULT 'Dash 1.0';

-- Atualizar registros de usuários
UPDATE dash_usuarios SET versao = 'Dash 1.0' WHERE versao = 'v1.0';
UPDATE dash_usuarios SET versao = 'B.I 1.0' WHERE versao = 'v2.0';
UPDATE dash_usuarios SET versao = 'B.I IA.' WHERE versao = 'v3.0';

-- Atualizar registros de grupos de acesso
UPDATE dash_grupos_acesso SET versao = 'Dash 1.0' WHERE versao = 'v1.0';
UPDATE dash_grupos_acesso SET versao = 'B.I 1.0' WHERE versao = 'v2.0';
UPDATE dash_grupos_acesso SET versao = 'B.I IA.' WHERE versao = 'v3.0';
