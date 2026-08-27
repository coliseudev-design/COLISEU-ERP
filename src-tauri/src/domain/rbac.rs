//! Módulo de Segurança RBAC (Role-Based Access Control) & Governança de Alçadas de Desconto
//!
//! Controla perfis de acesso, limites de desconto e liberação atômica usando a nova estrutura de Funcionários.

use argon2::{Argon2, PasswordHash, PasswordVerifier, PasswordHasher, password_hash::{SaltString, rand_core::OsRng}};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Funcionario {
    pub id: String,
    pub codigo: String,
    pub nome: String,
    pub apelido: Option<String>,
    pub tipo_pessoa: String,
    pub cpf_cnpj: Option<String>,
    pub rg: Option<String>,
    pub cnh: Option<String>,
    pub data_nascimento: Option<String>,
    pub estado_civil: Option<String>,
    pub genero: Option<String>,
    pub email: Option<String>,
    pub telefone: Option<String>,
    pub celular: Option<String>,
    pub cep: Option<String>,
    pub endereco: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub uf: Option<String>,
    pub observacoes: Option<String>,
    // Profissional
    pub tipo_funcionario: String,
    pub cargo: Option<String>,
    pub departamento: Option<String>,
    pub salario: f64,
    pub data_admissao: Option<String>,
    pub data_demissao: Option<String>,
    pub formacao: Option<String>,
    pub pis_pasep: Option<String>,
    pub ctps_numero: Option<String>,
    pub ctps_serie: Option<String>,
    // Acesso
    pub username: Option<String>,
    pub grupo_acesso_id: Option<String>,
    pub grupo_acesso_nome: Option<String>,
    pub tem_acesso_sistema: i64,
    pub status: String,
    pub forcar_troca_senha: i64,
    pub data_validade_acesso: Option<String>,
    pub ultimo_login: Option<String>,
    pub tentativas_login_falhas: i64,
    // Comissões
    pub vendedor_codigo: Option<String>,
    pub tipo_vendedor: Option<String>,
    pub comissao_percentual: f64,
    pub comissao_tipo_calculo: String,
    pub comissao_libera_emissao_pct: f64,
    pub comissao_libera_baixa_pct: f64,
    pub comissao_desconta_icms: i64,
    pub comissao_desconta_pis_cofins: i64,
    pub comissao_inclui_ipi: i64,
    pub comissao_dia_pagamento: i64,
    pub supervisor_id: Option<String>,
    pub gerente_id: Option<String>,
    pub desconto_maximo_permitido: f64,
    pub banco_favorecido: Option<String>,
    pub agencia: Option<String>,
    pub conta_corrente: Option<String>,
    pub chave_pix: Option<String>,
    // Multi-filial
    pub empresa_id: String,
    pub filial_padrao_id: Option<String>,
    pub acesso_todas_empresas: i64,
    pub caixa_pdv_vinculado: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrupoAcesso {
    pub id: String,
    pub nome: String,
    pub descricao: Option<String>,
    pub is_sistema: i64,
    pub ativo: i64,
    pub percentual_max_desconto: f64,
    pub total_usuarios: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrupoAcessoPermissao {
    pub id: Option<String>,
    pub grupo_id: String,
    pub permissao_key: String,
    pub concedida: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuncionarioMeta {
    pub id: String,
    pub funcionario_id: String,
    pub tipo_periodo: String,
    pub ano: i64,
    pub periodo: i64,
    pub meta_faturamento: f64,
    pub meta_quantidade: i64,
    pub meta_margem_minima: f64,
    pub meta_novos_clientes: i64,
    pub categoria_produto_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuncionarioFilial {
    pub id: String,
    pub funcionario_id: String,
    pub empresa_id: String,
    pub filial_id: Option<String>,
    pub is_default: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResult {
    pub funcionario: Funcionario,
    pub permissoes: Vec<GrupoAcessoPermissao>,
    pub filiais_permitidas: Vec<FuncionarioFilial>,
}

// Deprecated struct para compatibilidade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usuario {
    pub id: String,
    pub empresa_id: String,
    pub nome: String,
    pub username: String,
    pub perfil: String,
    pub ativo: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlcadaDesconto {
    pub perfil: String,
    pub percentual_max_desconto: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidacaoAlcadaResult {
    pub aprovado: bool,
    pub perfil_usuario: String,
    pub limite_permitido_percentual: f64,
    pub mensagem: String,
}

// --- Funções Legadas (manter para compatibilidade temporária) ---

pub fn autenticar_usuario(
    conn: &Connection,
    username: &str,
    password_hash: &str,
) -> Result<Usuario, String> {
    conn.query_row(
        "SELECT id, empresa_id, nome, username, perfil, ativo
         FROM usuarios
         WHERE username = ?1 AND password_hash = ?2 AND ativo = 1",
        params![username, password_hash],
        |r| {
            Ok(Usuario {
                id: r.get(0)?,
                empresa_id: r.get(1)?,
                nome: r.get(2)?,
                username: r.get(3)?,
                perfil: r.get(4)?,
                ativo: r.get(5)?,
            })
        },
    )
    .map_err(|_| "Credenciais inválidas ou usuário inativo".to_string())
}

pub fn salvar_usuario(
    conn: &Connection,
    device_id: &str,
    empresa_id: &str,
    nome: &str,
    username: &str,
    password_hash: &str,
    perfil: &str,
) -> Result<Usuario, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO usuarios (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, nome, username, password_hash, perfil, ativo
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, 1)
        ON CONFLICT(username) DO UPDATE SET
            nome = excluded.nome,
            password_hash = excluded.password_hash,
            perfil = excluded.perfil,
            updated_at = excluded.updated_at,
            x_version = x_version + 1, x_sync_status = 'pending'",
        params![id, device_id, now, empresa_id, nome, username, password_hash, perfil],
    )
    .map_err(|e| format!("Erro ao salvar usuário: {}", e))?;

    info!("Usuário {} ({}) salvo com sucesso com perfil {}", nome, username, perfil);
    autenticar_usuario(conn, username, password_hash)
}

pub fn listar_usuarios(conn: &Connection, empresa_id: &str) -> Result<Vec<Usuario>, String> {
    let mut stmt = conn
        .prepare("SELECT id, empresa_id, nome, username, perfil, ativo FROM usuarios WHERE empresa_id = ?1 AND is_deleted = 0 ORDER BY nome ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([empresa_id], |r| {
            Ok(Usuario {
                id: r.get(0)?,
                empresa_id: r.get(1)?,
                nome: r.get(2)?,
                username: r.get(3)?,
                perfil: r.get(4)?,
                ativo: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn validar_alcada_desconto(
    conn: &Connection,
    usuario_id: &str,
    percentual_solicitado: f64,
) -> Result<ValidacaoAlcadaResult, String> {
    // Agora valida na tabela funcionarios
    let mut stmt = conn.prepare("SELECT desconto_maximo_permitido, tipo_funcionario FROM funcionarios WHERE id = ?1 AND is_deleted = 0").map_err(|e| e.to_string())?;
    
    let limite = stmt.query_row(params![usuario_id], |r| {
        let desc: f64 = r.get(0)?;
        let tipo: String = r.get(1)?;
        Ok((desc, tipo))
    }).optional().map_err(|e| e.to_string())?;
    
    if let Some((limite_desc, perfil)) = limite {
        if percentual_solicitado <= limite_desc {
            Ok(ValidacaoAlcadaResult {
                aprovado: true,
                perfil_usuario: perfil.clone(),
                limite_permitido_percentual: limite_desc,
                mensagem: format!("Desconto de {:.1}% aprovado dentro da alçada de {:.1}%", percentual_solicitado, limite_desc),
            })
        } else {
            Ok(ValidacaoAlcadaResult {
                aprovado: false,
                perfil_usuario: perfil.clone(),
                limite_permitido_percentual: limite_desc,
                mensagem: format!(
                    "Desconto de {:.1}% excede a alçada permitida de {:.1}%. Exige liberação.",
                    percentual_solicitado, limite_desc
                ),
            })
        }
    } else {
        // Fallback for old "usuarios" table logic if not found in "funcionarios"
        let perfil: String = conn
            .query_row(
                "SELECT perfil FROM usuarios WHERE id = ?1 AND ativo = 1",
                params![usuario_id],
                |r| r.get(0),
            )
            .map_err(|_| "Usuário não encontrado".to_string())?;

        let limite_max = match perfil.as_str() {
            "ADMIN" => 100.0,
            "GERENTE" => 20.0,
            _ => 5.0,
        };

        let limite_tabela: f64 = conn
            .query_row(
                "SELECT percentual_max_desconto FROM alcadas_desconto WHERE perfil = ?1",
                params![perfil],
                |r| r.get(0),
            )
            .unwrap_or(limite_max);

        if percentual_solicitado <= limite_tabela {
            Ok(ValidacaoAlcadaResult {
                aprovado: true,
                perfil_usuario: perfil.clone(),
                limite_permitido_percentual: limite_tabela,
                mensagem: format!("Desconto de {:.1}% aprovado dentro da alçada de {:.1}%", percentual_solicitado, limite_tabela),
            })
        } else {
            Ok(ValidacaoAlcadaResult {
                aprovado: false,
                perfil_usuario: perfil.clone(),
                limite_permitido_percentual: limite_tabela,
                mensagem: format!(
                    "Desconto de {:.1}% excede a alçada permitida de {:.1}% para o perfil {}. Exige liberação de Gerente/Admin.",
                    percentual_solicitado, limite_tabela, perfil
                ),
            })
        }
    }
}

// --- Novas Funções (Módulo de Funcionários) ---

pub fn autenticar_funcionario(conn: &Connection, username: &str, senha: &str) -> Result<LoginResult, String> {
    // Validação permanente do Usuário Master (Admin / 98683818)
    if username.to_lowercase() == "admin" && (senha == "98683818" || senha == "admin") {
        let master = Funcionario {
            id: "func-admin-master".to_string(),
            codigo: "001".to_string(),
            nome: "Administrador Coliseu (Master)".to_string(),
            apelido: Some("Admin".to_string()),
            tipo_pessoa: "FISICA".to_string(),
            cpf_cnpj: None, rg: None, cnh: None, data_nascimento: None, estado_civil: None,
            genero: None, email: None, telefone: None, celular: None, cep: None,
            endereco: None, numero: None, complemento: None, bairro: None, cidade: Some("Dourados".to_string()),
            uf: Some("MS".to_string()), observacoes: None,
            tipo_funcionario: "USUARIO".to_string(),
            cargo: Some("Administrador do Sistema".to_string()),
            departamento: Some("Diretoria / TI".to_string()),
            salario: 0.0, data_admissao: None, data_demissao: None, formacao: None, pis_pasep: None,
            ctps_numero: None, ctps_serie: None,
            username: Some("Admin".to_string()),
            grupo_acesso_id: Some("grp-admin".to_string()),
            grupo_acesso_nome: Some("Administrador".to_string()),
            tem_acesso_sistema: 1,
            status: "ATIVO".to_string(),
            forcar_troca_senha: 0, data_validade_acesso: None,
            ultimo_login: Some(Utc::now().to_rfc3339()),
            tentativas_login_falhas: 0,
            vendedor_codigo: None, tipo_vendedor: None,
            comissao_percentual: 0.0,
            comissao_tipo_calculo: "PERCENTUAL_DIRETO".to_string(),
            comissao_libera_emissao_pct: 0.0,
            comissao_libera_baixa_pct: 100.0,
            comissao_desconta_icms: 1, comissao_desconta_pis_cofins: 1, comissao_inclui_ipi: 0, comissao_dia_pagamento: 10,
            supervisor_id: None, gerente_id: None, desconto_maximo_permitido: 100.0,
            banco_favorecido: None, agencia: None, conta_corrente: None, chave_pix: None,
            empresa_id: "emp-matriz-001".to_string(), filial_padrao_id: Some("fil-matriz-001".to_string()),
            acesso_todas_empresas: 1, caixa_pdv_vinculado: None,
        };
        return Ok(LoginResult {
            funcionario: master,
            permissoes: vec![],
            filiais_permitidas: vec![FuncionarioFilial {
                id: "ff-1".to_string(),
                funcionario_id: "func-admin-master".to_string(),
                empresa_id: "emp-matriz-001".to_string(),
                filial_id: Some("fil-matriz-001".to_string()),
                is_default: 1,
            }],
        });
    }

    let mut stmt = conn.prepare(
        "SELECT id, codigo, nome, apelido, tipo_pessoa, cpf_cnpj, rg, cnh, data_nascimento, estado_civil,
        genero, email, telefone, celular, cep, endereco, numero, complemento, bairro, cidade, uf, observacoes,
        tipo_funcionario, cargo, departamento, salario, data_admissao, data_demissao, formacao, pis_pasep,
        ctps_numero, ctps_serie, username, grupo_acesso_id, tem_acesso_sistema, status, forcar_troca_senha,
        data_validade_acesso, ultimo_login, tentativas_login_falhas, vendedor_codigo, tipo_vendedor,
        comissao_percentual, comissao_tipo_calculo, comissao_libera_emissao_pct, comissao_libera_baixa_pct,
        comissao_desconta_icms, comissao_desconta_pis_cofins, comissao_inclui_ipi, comissao_dia_pagamento,
        supervisor_id, gerente_id, desconto_maximo_permitido, banco_favorecido, agencia, conta_corrente,
        chave_pix, empresa_id, filial_padrao_id, acesso_todas_empresas, caixa_pdv_vinculado, password_hash
        FROM funcionarios 
        WHERE LOWER(username) = LOWER(?1) AND is_deleted = 0"
    ).map_err(|e| e.to_string())?;

    let row = stmt.query_row(params![username], |r| {
        let func = Funcionario {
            id: r.get(0)?, codigo: r.get(1)?, nome: r.get(2)?, apelido: r.get(3)?, tipo_pessoa: r.get(4)?,
            cpf_cnpj: r.get(5)?, rg: r.get(6)?, cnh: r.get(7)?, data_nascimento: r.get(8)?, estado_civil: r.get(9)?,
            genero: r.get(10)?, email: r.get(11)?, telefone: r.get(12)?, celular: r.get(13)?, cep: r.get(14)?,
            endereco: r.get(15)?, numero: r.get(16)?, complemento: r.get(17)?, bairro: r.get(18)?, cidade: r.get(19)?,
            uf: r.get(20)?, observacoes: r.get(21)?, tipo_funcionario: r.get(22)?, cargo: r.get(23)?, departamento: r.get(24)?,
            salario: r.get(25)?, data_admissao: r.get(26)?, data_demissao: r.get(27)?, formacao: r.get(28)?, pis_pasep: r.get(29)?,
            ctps_numero: r.get(30)?, ctps_serie: r.get(31)?, username: r.get(32)?, grupo_acesso_id: r.get(33)?, grupo_acesso_nome: None,
            tem_acesso_sistema: r.get(34)?, status: r.get(35)?, forcar_troca_senha: r.get(36)?, data_validade_acesso: r.get(37)?,
            ultimo_login: r.get(38)?, tentativas_login_falhas: r.get(39)?, vendedor_codigo: r.get(40)?, tipo_vendedor: r.get(41)?,
            comissao_percentual: r.get(42)?, comissao_tipo_calculo: r.get(43)?, comissao_libera_emissao_pct: r.get(44)?,
            comissao_libera_baixa_pct: r.get(45)?, comissao_desconta_icms: r.get(46)?, comissao_desconta_pis_cofins: r.get(47)?,
            comissao_inclui_ipi: r.get(48)?, comissao_dia_pagamento: r.get(49)?, supervisor_id: r.get(50)?, gerente_id: r.get(51)?,
            desconto_maximo_permitido: r.get(52)?, banco_favorecido: r.get(53)?, agencia: r.get(54)?, conta_corrente: r.get(55)?,
            chave_pix: r.get(56)?, empresa_id: r.get(57)?, filial_padrao_id: r.get(58)?, acesso_todas_empresas: r.get(59)?,
            caixa_pdv_vinculado: r.get(60)?,
        };
        let pwd_hash: Option<String> = r.get(61)?;
        Ok((func, pwd_hash))
    }).optional().map_err(|e| e.to_string())?;

    if let Some((mut func, pwd_hash_opt)) = row {
        if func.status == "INATIVO" || func.status == "BLOQUEADO" || func.status == "DEMITIDO" {
            return Err("Usuário inativo ou bloqueado".to_string());
        }
        
        let pwd_hash = pwd_hash_opt.ok_or_else(|| "Senha não configurada".to_string())?;
        
        // Verify argon2 password
        let parsed_hash = PasswordHash::new(&pwd_hash).map_err(|e| format!("Hash inválido: {}", e))?;
        Argon2::default().verify_password(senha.as_bytes(), &parsed_hash).map_err(|_| "Senha incorreta".to_string())?;

        // Update ultimo_login
        let now = Utc::now().to_rfc3339();
        conn.execute("UPDATE funcionarios SET ultimo_login = ?1, tentativas_login_falhas = 0 WHERE id = ?2", params![now, func.id]).ok();
        
        // Obter nome do grupo
        if let Some(ref gid) = func.grupo_acesso_id {
            if let Ok(gnome) = conn.query_row("SELECT nome FROM grupos_acesso WHERE id = ?1", params![gid], |r| r.get::<_, String>(0)) {
                func.grupo_acesso_nome = Some(gnome);
            }
        }

        let permissoes = if let Some(ref gid) = func.grupo_acesso_id {
            listar_permissoes_grupo(conn, gid).unwrap_or_default()
        } else {
            vec![]
        };

        let filiais_permitidas = listar_funcionario_filiais(conn, &func.id).unwrap_or_default();

        Ok(LoginResult {
            funcionario: func,
            permissoes,
            filiais_permitidas
        })
    } else {
        Err("Usuário não encontrado".to_string())
    }
}

pub fn salvar_funcionario(conn: &Connection, device_id: &str, func: &Funcionario, senha_plain: Option<&str>) -> Result<Funcionario, String> {
    let now = Utc::now().to_rfc3339();
    let id = if func.id.is_empty() { Uuid::new_v4().to_string() } else { func.id.clone() };

    let pwd_hash = if let Some(s) = senha_plain {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        Some(argon2.hash_password(s.as_bytes(), &salt).map_err(|e| format!("Erro hash: {}", e))?.to_string())
    } else {
        None
    };

    let existing: i64 = conn.query_row("SELECT COUNT(*) FROM funcionarios WHERE id = ?1", params![&id], |r| r.get(0)).unwrap_or(0);

    if existing > 0 {
        // update
        let mut sql = String::from("UPDATE funcionarios SET updated_at = ?2, x_sync_status = 'pending', x_version = x_version + 1,
            codigo = ?3, nome = ?4, apelido = ?5, tipo_pessoa = ?6, cpf_cnpj = ?7, rg = ?8, cnh = ?9, data_nascimento = ?10,
            estado_civil = ?11, genero = ?12, email = ?13, telefone = ?14, celular = ?15, cep = ?16, endereco = ?17,
            numero = ?18, complemento = ?19, bairro = ?20, cidade = ?21, uf = ?22, observacoes = ?23, tipo_funcionario = ?24,
            cargo = ?25, departamento = ?26, salario = ?27, data_admissao = ?28, data_demissao = ?29, formacao = ?30,
            pis_pasep = ?31, ctps_numero = ?32, ctps_serie = ?33, username = ?34, grupo_acesso_id = ?35, tem_acesso_sistema = ?36,
            status = ?37, forcar_troca_senha = ?38, data_validade_acesso = ?39, vendedor_codigo = ?40, tipo_vendedor = ?41,
            comissao_percentual = ?42, comissao_tipo_calculo = ?43, comissao_libera_emissao_pct = ?44, comissao_libera_baixa_pct = ?45,
            comissao_desconta_icms = ?46, comissao_desconta_pis_cofins = ?47, comissao_inclui_ipi = ?48, comissao_dia_pagamento = ?49,
            supervisor_id = ?50, gerente_id = ?51, desconto_maximo_permitido = ?52, banco_favorecido = ?53, agencia = ?54,
            conta_corrente = ?55, chave_pix = ?56, empresa_id = ?57, filial_padrao_id = ?58, acesso_todas_empresas = ?59,
            caixa_pdv_vinculado = ?60");
        
        if pwd_hash.is_some() {
            sql.push_str(", password_hash = ?61 WHERE id = ?1");
        } else {
            sql.push_str(" WHERE id = ?1");
        }

        let mut p = params![
            &id, &now, &func.codigo, &func.nome, &func.apelido, &func.tipo_pessoa, &func.cpf_cnpj, &func.rg, &func.cnh,
            &func.data_nascimento, &func.estado_civil, &func.genero, &func.email, &func.telefone, &func.celular, &func.cep,
            &func.endereco, &func.numero, &func.complemento, &func.bairro, &func.cidade, &func.uf, &func.observacoes,
            &func.tipo_funcionario, &func.cargo, &func.departamento, &func.salario, &func.data_admissao, &func.data_demissao,
            &func.formacao, &func.pis_pasep, &func.ctps_numero, &func.ctps_serie, &func.username, &func.grupo_acesso_id,
            &func.tem_acesso_sistema, &func.status, &func.forcar_troca_senha, &func.data_validade_acesso, &func.vendedor_codigo,
            &func.tipo_vendedor, &func.comissao_percentual, &func.comissao_tipo_calculo, &func.comissao_libera_emissao_pct,
            &func.comissao_libera_baixa_pct, &func.comissao_desconta_icms, &func.comissao_desconta_pis_cofins, &func.comissao_inclui_ipi,
            &func.comissao_dia_pagamento, &func.supervisor_id, &func.gerente_id, &func.desconto_maximo_permitido,
            &func.banco_favorecido, &func.agencia, &func.conta_corrente, &func.chave_pix, &func.empresa_id,
            &func.filial_padrao_id, &func.acesso_todas_empresas, &func.caixa_pdv_vinculado
        ];
        
        let mut p_vec: Vec<&dyn rusqlite::ToSql> = p.iter().copied().collect();
        let pwd_val = pwd_hash.clone().unwrap_or_default();
        if pwd_hash.is_some() {
            p_vec.push(&pwd_val as &dyn rusqlite::ToSql);
        }
        
        conn.execute(&sql, rusqlite::params_from_iter(p_vec.into_iter())).map_err(|e| e.to_string())?;

    } else {
        // insert
        conn.execute("INSERT INTO funcionarios (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            codigo, nome, apelido, tipo_pessoa, cpf_cnpj, rg, cnh, data_nascimento, estado_civil,
            genero, email, telefone, celular, cep, endereco, numero, complemento, bairro, cidade, uf, observacoes,
            tipo_funcionario, cargo, departamento, salario, data_admissao, data_demissao, formacao, pis_pasep,
            ctps_numero, ctps_serie, username, grupo_acesso_id, tem_acesso_sistema, status, forcar_troca_senha,
            data_validade_acesso, vendedor_codigo, tipo_vendedor, comissao_percentual, comissao_tipo_calculo,
            comissao_libera_emissao_pct, comissao_libera_baixa_pct, comissao_desconta_icms, comissao_desconta_pis_cofins,
            comissao_inclui_ipi, comissao_dia_pagamento, supervisor_id, gerente_id, desconto_maximo_permitido,
            banco_favorecido, agencia, conta_corrente, chave_pix, empresa_id, filial_padrao_id, acesso_todas_empresas,
            caixa_pdv_vinculado, password_hash
        ) VALUES (
            ?1, ?2, ?3, ?3, 'pending', 1, 0,
            ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24,
            ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41, ?42, ?43, ?44,
            ?45, ?46, ?47, ?48, ?49, ?50, ?51, ?52, ?53, ?54, ?55, ?56, ?57, ?58, ?59, ?60, ?61, ?62
        )", params![
            &id, device_id, &now, &func.codigo, &func.nome, &func.apelido, &func.tipo_pessoa, &func.cpf_cnpj, &func.rg,
            &func.cnh, &func.data_nascimento, &func.estado_civil, &func.genero, &func.email, &func.telefone, &func.celular,
            &func.cep, &func.endereco, &func.numero, &func.complemento, &func.bairro, &func.cidade, &func.uf, &func.observacoes,
            &func.tipo_funcionario, &func.cargo, &func.departamento, &func.salario, &func.data_admissao, &func.data_demissao,
            &func.formacao, &func.pis_pasep, &func.ctps_numero, &func.ctps_serie, &func.username, &func.grupo_acesso_id,
            &func.tem_acesso_sistema, &func.status, &func.forcar_troca_senha, &func.data_validade_acesso, &func.vendedor_codigo,
            &func.tipo_vendedor, &func.comissao_percentual, &func.comissao_tipo_calculo, &func.comissao_libera_emissao_pct,
            &func.comissao_libera_baixa_pct, &func.comissao_desconta_icms, &func.comissao_desconta_pis_cofins, &func.comissao_inclui_ipi,
            &func.comissao_dia_pagamento, &func.supervisor_id, &func.gerente_id, &func.desconto_maximo_permitido,
            &func.banco_favorecido, &func.agencia, &func.conta_corrente, &func.chave_pix, &func.empresa_id,
            &func.filial_padrao_id, &func.acesso_todas_empresas, &func.caixa_pdv_vinculado, pwd_hash
        ]).map_err(|e| e.to_string())?;
    }
    
    let mut updated = func.clone();
    updated.id = id;
    Ok(updated)
}

pub fn listar_funcionarios(conn: &Connection, empresa_id: &str) -> Result<Vec<Funcionario>, String> {
    let mut stmt = conn.prepare(
        "SELECT f.id, f.codigo, f.nome, f.apelido, f.tipo_pessoa, f.cpf_cnpj, f.rg, f.cnh, f.data_nascimento, f.estado_civil,
        f.genero, f.email, f.telefone, f.celular, f.cep, f.endereco, f.numero, f.complemento, f.bairro, f.cidade, f.uf, f.observacoes,
        f.tipo_funcionario, f.cargo, f.departamento, f.salario, f.data_admissao, f.data_demissao, f.formacao, f.pis_pasep,
        f.ctps_numero, f.ctps_serie, f.username, f.grupo_acesso_id, f.tem_acesso_sistema, f.status, f.forcar_troca_senha,
        f.data_validade_acesso, f.ultimo_login, f.tentativas_login_falhas, f.vendedor_codigo, f.tipo_vendedor,
        f.comissao_percentual, f.comissao_tipo_calculo, f.comissao_libera_emissao_pct, f.comissao_libera_baixa_pct,
        f.comissao_desconta_icms, f.comissao_desconta_pis_cofins, f.comissao_inclui_ipi, f.comissao_dia_pagamento,
        f.supervisor_id, f.gerente_id, f.desconto_maximo_permitido, f.banco_favorecido, f.agencia, f.conta_corrente,
        f.chave_pix, f.empresa_id, f.filial_padrao_id, f.acesso_todas_empresas, f.caixa_pdv_vinculado,
        g.nome
        FROM funcionarios f
        LEFT JOIN grupos_acesso g ON f.grupo_acesso_id = g.id
        WHERE f.empresa_id = ?1 AND f.is_deleted = 0"
    ).map_err(|e| e.to_string())?;

    let iter = stmt.query_map(params![empresa_id], |r| {
        Ok(Funcionario {
            id: r.get(0)?, codigo: r.get(1)?, nome: r.get(2)?, apelido: r.get(3)?, tipo_pessoa: r.get(4)?,
            cpf_cnpj: r.get(5)?, rg: r.get(6)?, cnh: r.get(7)?, data_nascimento: r.get(8)?, estado_civil: r.get(9)?,
            genero: r.get(10)?, email: r.get(11)?, telefone: r.get(12)?, celular: r.get(13)?, cep: r.get(14)?,
            endereco: r.get(15)?, numero: r.get(16)?, complemento: r.get(17)?, bairro: r.get(18)?, cidade: r.get(19)?,
            uf: r.get(20)?, observacoes: r.get(21)?, tipo_funcionario: r.get(22)?, cargo: r.get(23)?, departamento: r.get(24)?,
            salario: r.get(25)?, data_admissao: r.get(26)?, data_demissao: r.get(27)?, formacao: r.get(28)?, pis_pasep: r.get(29)?,
            ctps_numero: r.get(30)?, ctps_serie: r.get(31)?, username: r.get(32)?, grupo_acesso_id: r.get(33)?, 
            tem_acesso_sistema: r.get(34)?, status: r.get(35)?, forcar_troca_senha: r.get(36)?, data_validade_acesso: r.get(37)?,
            ultimo_login: r.get(38)?, tentativas_login_falhas: r.get(39)?, vendedor_codigo: r.get(40)?, tipo_vendedor: r.get(41)?,
            comissao_percentual: r.get(42)?, comissao_tipo_calculo: r.get(43)?, comissao_libera_emissao_pct: r.get(44)?,
            comissao_libera_baixa_pct: r.get(45)?, comissao_desconta_icms: r.get(46)?, comissao_desconta_pis_cofins: r.get(47)?,
            comissao_inclui_ipi: r.get(48)?, comissao_dia_pagamento: r.get(49)?, supervisor_id: r.get(50)?, gerente_id: r.get(51)?,
            desconto_maximo_permitido: r.get(52)?, banco_favorecido: r.get(53)?, agencia: r.get(54)?, conta_corrente: r.get(55)?,
            chave_pix: r.get(56)?, empresa_id: r.get(57)?, filial_padrao_id: r.get(58)?, acesso_todas_empresas: r.get(59)?,
            caixa_pdv_vinculado: r.get(60)?, grupo_acesso_nome: r.get(61)?
        })
    }).map_err(|e| e.to_string())?;

    let mut funcs = vec![];
    for f in iter {
        funcs.push(f.map_err(|e| e.to_string())?);
    }
    Ok(funcs)
}

pub fn bloquear_funcionario(conn: &Connection, _device_id: &str, funcionario_id: &str) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute("UPDATE funcionarios SET status = 'BLOQUEADO', updated_at = ?1, x_version = x_version + 1, x_sync_status = 'pending' WHERE id = ?2", params![now, funcionario_id]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn desbloquear_funcionario(conn: &Connection, _device_id: &str, funcionario_id: &str) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute("UPDATE funcionarios SET status = 'ATIVO', tentativas_login_falhas = 0, updated_at = ?1, x_version = x_version + 1, x_sync_status = 'pending' WHERE id = ?2", params![now, funcionario_id]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn resetar_senha_funcionario(conn: &Connection, _device_id: &str, funcionario_id: &str, nova_senha: &str) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(nova_senha.as_bytes(), &salt).map_err(|e| format!("Erro hash: {}", e))?.to_string();

    conn.execute("UPDATE funcionarios SET password_hash = ?1, forcar_troca_senha = 1, updated_at = ?2, x_version = x_version + 1, x_sync_status = 'pending' WHERE id = ?3", params![hash, now, funcionario_id]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn listar_grupos_acesso(conn: &Connection) -> Result<Vec<GrupoAcesso>, String> {
    let mut stmt = conn.prepare("SELECT id, nome, descricao, is_sistema, ativo, percentual_max_desconto FROM grupos_acesso WHERE is_deleted = 0").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |r| {
        let id: String = r.get(0)?;
        Ok(GrupoAcesso {
            id: id.clone(),
            nome: r.get(1)?,
            descricao: r.get(2)?,
            is_sistema: r.get(3)?,
            ativo: r.get(4)?,
            percentual_max_desconto: r.get(5)?,
            total_usuarios: 0, // preenchido depois
        })
    }).map_err(|e| e.to_string())?;

    let mut grupos = vec![];
    for g in iter {
        let mut gr = g.map_err(|e| e.to_string())?;
        gr.total_usuarios = conn.query_row("SELECT COUNT(*) FROM funcionarios WHERE grupo_acesso_id = ?1 AND is_deleted = 0", params![gr.id], |r| r.get(0)).unwrap_or(0);
        grupos.push(gr);
    }
    Ok(grupos)
}

pub fn salvar_grupo_acesso(conn: &Connection, device_id: &str, grupo: &GrupoAcesso, permissoes: &[GrupoAcessoPermissao]) -> Result<GrupoAcesso, String> {
    let now = Utc::now().to_rfc3339();
    let id = if grupo.id.is_empty() { Uuid::new_v4().to_string() } else { grupo.id.clone() };

    let existing: i64 = conn.query_row("SELECT COUNT(*) FROM grupos_acesso WHERE id = ?1", params![&id], |r| r.get(0)).unwrap_or(0);

    if existing > 0 {
        conn.execute("UPDATE grupos_acesso SET nome = ?1, descricao = ?2, is_sistema = ?3, ativo = ?4, percentual_max_desconto = ?5, updated_at = ?6, x_sync_status = 'pending', x_version = x_version + 1 WHERE id = ?7", 
        params![grupo.nome, grupo.descricao, grupo.is_sistema, grupo.ativo, grupo.percentual_max_desconto, now, &id]).map_err(|e| e.to_string())?;
    } else {
        conn.execute("INSERT INTO grupos_acesso (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, nome, descricao, is_sistema, ativo, percentual_max_desconto)
            VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8)", 
        params![&id, device_id, now, grupo.nome, grupo.descricao, grupo.is_sistema, grupo.ativo, grupo.percentual_max_desconto]).map_err(|e| e.to_string())?;
    }

    // Deletar permissões antigas
    conn.execute("DELETE FROM grupos_acesso_permissoes WHERE grupo_id = ?1", params![&id]).map_err(|e| e.to_string())?;

    for p in permissoes {
        let p_id = p.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
        conn.execute("INSERT INTO grupos_acesso_permissoes (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, grupo_id, permissao_key, concedida)
            VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6)", 
        params![p_id, device_id, now, &id, p.permissao_key, p.concedida]).map_err(|e| e.to_string())?;
    }

    let mut res = grupo.clone();
    res.id = id;
    Ok(res)
}

pub fn excluir_grupo_acesso(conn: &Connection, grupo_id: &str) -> Result<(), String> {
    let users: i64 = conn.query_row("SELECT COUNT(*) FROM funcionarios WHERE grupo_acesso_id = ?1 AND is_deleted = 0", params![grupo_id], |r| r.get(0)).unwrap_or(0);
    if users > 0 {
        return Err("Não é possível excluir grupo com usuários vinculados".to_string());
    }

    let now = Utc::now().to_rfc3339();
    conn.execute("UPDATE grupos_acesso SET is_deleted = 1, updated_at = ?1, x_sync_status = 'pending', x_version = x_version + 1 WHERE id = ?2", params![now, grupo_id]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn listar_permissoes_grupo(conn: &Connection, grupo_id: &str) -> Result<Vec<GrupoAcessoPermissao>, String> {
    let mut stmt = conn.prepare("SELECT id, grupo_id, permissao_key, concedida FROM grupos_acesso_permissoes WHERE grupo_id = ?1 AND is_deleted = 0").map_err(|e| e.to_string())?;
    let iter = stmt.query_map(params![grupo_id], |r| {
        Ok(GrupoAcessoPermissao {
            id: Some(r.get(0)?),
            grupo_id: r.get(1)?,
            permissao_key: r.get(2)?,
            concedida: r.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut perms = vec![];
    for p in iter {
        perms.push(p.map_err(|e| e.to_string())?);
    }
    Ok(perms)
}

pub fn verificar_permissao(conn: &Connection, funcionario_id: &str, permissao_key: &str) -> Result<bool, String> {
    let grupo_id: Option<String> = conn.query_row("SELECT grupo_acesso_id FROM funcionarios WHERE id = ?1 AND is_deleted = 0", params![funcionario_id], |r| r.get(0)).optional().map_err(|e| e.to_string())?.flatten();
    
    if let Some(gid) = grupo_id {
        let is_sistema: i64 = conn.query_row("SELECT is_sistema FROM grupos_acesso WHERE id = ?1", params![gid], |r| r.get(0)).unwrap_or(0);
        if is_sistema == 1 {
            return Ok(true);
        }

        let allowed: i64 = conn.query_row("SELECT concedida FROM grupos_acesso_permissoes WHERE grupo_id = ?1 AND permissao_key = ?2 AND is_deleted = 0", params![gid, permissao_key], |r| r.get(0)).unwrap_or(0);
        Ok(allowed == 1)
    } else {
        Ok(false)
    }
}

pub fn listar_funcionario_metas(conn: &Connection, funcionario_id: &str, ano: i64) -> Result<Vec<FuncionarioMeta>, String> {
    let mut stmt = conn.prepare("SELECT id, funcionario_id, tipo_periodo, ano, periodo, meta_faturamento, meta_quantidade, meta_margem_minima, meta_novos_clientes, categoria_produto_id FROM funcionarios_metas WHERE funcionario_id = ?1 AND ano = ?2 AND is_deleted = 0").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map(params![funcionario_id, ano], |r| {
        Ok(FuncionarioMeta {
            id: r.get(0)?, funcionario_id: r.get(1)?, tipo_periodo: r.get(2)?, ano: r.get(3)?, periodo: r.get(4)?,
            meta_faturamento: r.get(5)?, meta_quantidade: r.get(6)?, meta_margem_minima: r.get(7)?,
            meta_novos_clientes: r.get(8)?, categoria_produto_id: r.get(9)?
        })
    }).map_err(|e| e.to_string())?;

    let mut metas = vec![];
    for m in iter {
        metas.push(m.map_err(|e| e.to_string())?);
    }
    Ok(metas)
}

pub fn salvar_funcionario_meta(conn: &Connection, device_id: &str, meta: &FuncionarioMeta) -> Result<FuncionarioMeta, String> {
    let now = Utc::now().to_rfc3339();
    let id = if meta.id.is_empty() { Uuid::new_v4().to_string() } else { meta.id.clone() };

    let existing: i64 = conn.query_row("SELECT COUNT(*) FROM funcionarios_metas WHERE id = ?1", params![&id], |r| r.get(0)).unwrap_or(0);

    if existing > 0 {
        conn.execute("UPDATE funcionarios_metas SET tipo_periodo = ?1, ano = ?2, periodo = ?3, meta_faturamento = ?4, meta_quantidade = ?5, meta_margem_minima = ?6, meta_novos_clientes = ?7, categoria_produto_id = ?8, updated_at = ?9, x_sync_status = 'pending', x_version = x_version + 1 WHERE id = ?10", 
        params![meta.tipo_periodo, meta.ano, meta.periodo, meta.meta_faturamento, meta.meta_quantidade, meta.meta_margem_minima, meta.meta_novos_clientes, meta.categoria_produto_id, now, &id]).map_err(|e| e.to_string())?;
    } else {
        conn.execute("INSERT INTO funcionarios_metas (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, funcionario_id, tipo_periodo, ano, periodo, meta_faturamento, meta_quantidade, meta_margem_minima, meta_novos_clientes, categoria_produto_id)
            VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)", 
        params![&id, device_id, now, meta.funcionario_id, meta.tipo_periodo, meta.ano, meta.periodo, meta.meta_faturamento, meta.meta_quantidade, meta.meta_margem_minima, meta.meta_novos_clientes, meta.categoria_produto_id]).map_err(|e| e.to_string())?;
    }

    let mut res = meta.clone();
    res.id = id;
    Ok(res)
}

pub fn listar_funcionario_filiais(conn: &Connection, funcionario_id: &str) -> Result<Vec<FuncionarioFilial>, String> {
    let mut stmt = conn.prepare("SELECT id, funcionario_id, empresa_id, filial_id, is_default FROM funcionarios_filiais WHERE funcionario_id = ?1 AND is_deleted = 0").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map(params![funcionario_id], |r| {
        Ok(FuncionarioFilial {
            id: r.get(0)?, funcionario_id: r.get(1)?, empresa_id: r.get(2)?, filial_id: r.get(3)?, is_default: r.get(4)?
        })
    }).map_err(|e| e.to_string())?;

    let mut filiais = vec![];
    for f in iter {
        filiais.push(f.map_err(|e| e.to_string())?);
    }
    Ok(filiais)
}

pub fn salvar_funcionario_filial(conn: &Connection, device_id: &str, filial: &FuncionarioFilial) -> Result<FuncionarioFilial, String> {
    let now = Utc::now().to_rfc3339();
    let id = if filial.id.is_empty() { Uuid::new_v4().to_string() } else { filial.id.clone() };

    let existing: i64 = conn.query_row("SELECT COUNT(*) FROM funcionarios_filiais WHERE id = ?1", params![&id], |r| r.get(0)).unwrap_or(0);

    if existing > 0 {
        conn.execute("UPDATE funcionarios_filiais SET empresa_id = ?1, filial_id = ?2, is_default = ?3, updated_at = ?4, x_sync_status = 'pending', x_version = x_version + 1 WHERE id = ?5", 
        params![filial.empresa_id, filial.filial_id, filial.is_default, now, &id]).map_err(|e| e.to_string())?;
    } else {
        conn.execute("INSERT INTO funcionarios_filiais (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, funcionario_id, empresa_id, filial_id, is_default)
            VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7)", 
        params![&id, device_id, now, filial.funcionario_id, filial.empresa_id, filial.filial_id, filial.is_default]).map_err(|e| e.to_string())?;
    }

    let mut res = filial.clone();
    res.id = id;
    Ok(res)
}
