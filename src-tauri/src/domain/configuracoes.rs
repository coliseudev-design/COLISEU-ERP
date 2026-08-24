//! Módulo de Domínio para Gestão de Configurações do Sistema ERP
//!
//! Suporta o cadastro completo dos ~35 campos da empresa, regimes tributários,
//! certificados digitais A1, séries NF-e/NFC-e por filial e preferências do sistema.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmpresaConfigInput {
    pub id: String,
    pub razao_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: String,
    pub inscricao_estadual: Option<String>,
    pub inscricao_municipal: Option<String>,
    pub cnae_principal: Option<String>,
    pub cnae_secundarios: Option<String>,
    pub crt: u32,
    pub regime_pis_cofins: Option<String>,
    pub regime_apuracao: Option<String>,
    pub aliquota_simples_anexo: f64,
    pub p_cred_sn: f64,
    pub suframa: Option<String>,
    pub nire: Option<String>,
    pub natureza_juridica: Option<String>,
    pub logradouro: Option<String>,
    pub numero: Option<String>,
    pub complemento: Option<String>,
    pub bairro: Option<String>,
    pub cidade: Option<String>,
    pub uf: Option<String>,
    pub cep: Option<String>,
    pub cod_municipio_ibge: Option<String>,
    pub pais: Option<String>,
    pub cod_pais_bacen: Option<String>,
    pub telefone_1: Option<String>,
    pub telefone_2: Option<String>,
    pub email: Option<String>,
    pub email_fiscal: Option<String>,
    pub site: Option<String>,
    pub responsavel: Option<String>,
    pub logo_base64: Option<String>,
    pub certificado_a1_alias: Option<String>,
    pub certificado_a1_validade: Option<String>,
    pub nicho_empresa: Option<String>,
    pub praca: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigItem {
    pub id: String,
    pub empresa_id: String,
    pub chave: String,
    pub valor: String,
    pub grupo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilialNfeConfigInput {
    pub filial_id: String,
    pub serie_nfe: u32,
    pub proximo_numero_nfe: u32,
    pub ambiente_nfe: u32,
    pub tp_imp_danfe: u32,
    pub tp_emis_nfe: u32,
    pub ind_sinc: u32,
    pub versao_xml: String,
    pub logo_danfe_path: Option<String>,
    pub xml_storage_path: Option<String>,
    pub resp_tec_cnpj: Option<String>,
    pub resp_tec_contato: Option<String>,
    pub resp_tec_email: Option<String>,
    pub resp_tec_fone: Option<String>,
    pub resp_tec_id_csrt: Option<String>,
    pub resp_tec_csrt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilialNfceConfigInput {
    pub filial_id: String,
    pub serie_nfce: u32,
    pub proximo_numero_nfce: u32,
    pub ambiente_nfce: u32,
    pub csc_id: Option<String>,
    pub csc_token: Option<String>,
    pub tp_emis_nfce: u32,
    pub modelo_danfe_nfce: String,
    pub tp_imp_danfe_nfce: u32,
    pub versao_qrcode: String,
    pub qrcode_contingencia: String,
    pub usar_tef: u32,
    pub fuso_horario: String,
    pub mostrar_troco: u32,
    pub enviar_codigo_barras: u32,
    pub contingencia_timeout_ms: u32,
    pub xml_storage_path: Option<String>,
    pub logo_danfce_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilialNfseConfigInput {
    pub filial_id: String,
    pub ambiente_nfse: u32,
    pub provedor_nfse: String,
    pub url_ws_producao: Option<String>,
    pub url_ws_homologacao: Option<String>,
    pub usuario_ws: Option<String>,
    pub senha_ws: Option<String>,
    pub token_ws: Option<String>,
    pub serie_rps: String,
    pub proximo_numero_rps: u32,
    pub tipo_rps: u32,
    pub regime_especial_tributacao: u32,
    pub natureza_operacao: u32,
    pub item_lista_servico: String,
    pub cod_tributacao_municipio: Option<String>,
    pub cnae_servico: String,
    pub aliquota_iss: f64,
    pub iss_retido: u32,
    pub responsavel_retencao: u32,
    pub incentivador_cultural: u32,
    pub optante_simples_nfse: u32,
    pub xml_storage_path: Option<String>,
    pub logo_danfse_path: Option<String>,
    pub versao_abrasf: String,
    pub usar_nfse_nacional: u32,
}

/// Salva ou atualiza os dados cadastrais e tributários completos da Empresa
pub fn salvar_dados_empresa(
    conn: &Connection,
    device_id: &str,
    input: &EmpresaConfigInput,
) -> Result<String, String> {
    let _ = crate::db::schema::create_tables(conn);
    let now = Utc::now().to_rfc3339();

    let mut stmt = conn
        .prepare("SELECT id FROM empresas WHERE id = ?1 OR cnpj = ?2")
        .map_err(|e| e.to_string())?;

    let exists = stmt.exists(params![input.id, input.cnpj]).unwrap_or(false);

    if exists {
        conn.execute(
            "UPDATE empresas SET
                razao_social = ?1,
                nome_fantasia = ?2,
                cnpj = ?3,
                inscricao_estadual = ?4,
                inscricao_municipal = ?5,
                cnae_principal = ?6,
                cnae_secundarios = ?7,
                crt = ?8,
                regime_pis_cofins = ?9,
                regime_apuracao = ?10,
                aliquota_simples_anexo = ?11,
                p_cred_sn = ?12,
                suframa = ?13,
                nire = ?14,
                natureza_juridica = ?15,
                logradouro = ?16,
                numero = ?17,
                complemento = ?18,
                bairro = ?19,
                cidade = ?20,
                uf = ?21,
                cep = ?22,
                cod_municipio_ibge = ?23,
                pais = ?24,
                cod_pais_bacen = ?25,
                telefone_1 = ?26,
                telefone_2 = ?27,
                email = ?28,
                email_fiscal = ?29,
                site = ?30,
                responsavel = ?31,
                logo_base64 = ?32,
                certificado_a1_alias = ?33,
                certificado_a1_validade = ?34,
                nicho_empresa = ?35,
                praca = ?36,
                updated_at = ?37,
                x_sync_status = 'pending'
            WHERE id = ?38",
            params![
                input.razao_social,
                input.nome_fantasia,
                input.cnpj,
                input.inscricao_estadual,
                input.inscricao_municipal,
                input.cnae_principal,
                input.cnae_secundarios,
                input.crt,
                input.regime_pis_cofins.as_deref().unwrap_or("CUMULATIVO"),
                input.regime_apuracao.as_deref().unwrap_or("LUCRO_PRESUMIDO"),
                input.aliquota_simples_anexo,
                input.p_cred_sn,
                input.suframa,
                input.nire,
                input.natureza_juridica,
                input.logradouro,
                input.numero,
                input.complemento,
                input.bairro,
                input.cidade,
                input.uf,
                input.cep,
                input.cod_municipio_ibge,
                input.pais.as_deref().unwrap_or("BRASIL"),
                input.cod_pais_bacen.as_deref().unwrap_or("1058"),
                input.telefone_1,
                input.telefone_2,
                input.email,
                input.email_fiscal,
                input.site,
                input.responsavel,
                input.logo_base64,
                input.certificado_a1_alias,
                input.certificado_a1_validade,
                input.nicho_empresa.as_deref().unwrap_or("VAREJO"),
                input.praca,
                now,
                input.id,
            ],
        )
        .map_err(|e| format!("Erro ao atualizar empresa: {}", e))?;
    } else {
        let emp_id = if input.id.trim().is_empty() {
            Uuid::new_v4().to_string()
        } else {
            input.id.clone()
        };

        conn.execute(
            "INSERT INTO empresas (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                cnae_principal, cnae_secundarios, crt, regime_pis_cofins, regime_apuracao,
                aliquota_simples_anexo, p_cred_sn, suframa, nire, natureza_juridica,
                logradouro, numero, complemento, bairro, cidade, uf, cep, cod_municipio_ibge,
                pais, cod_pais_bacen, telefone_1, telefone_2, email, email_fiscal, site,
                responsavel, logo_base64, certificado_a1_alias, certificado_a1_validade,
                nicho_empresa, praca, ativo
            ) VALUES (
                ?1, ?2, ?3, ?4, 'pending', 1, 0,
                ?5, ?6, ?7, ?8, ?9,
                ?10, ?11, ?12, ?13, ?14,
                ?15, ?16, ?17, ?18, ?19,
                ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27,
                ?28, ?29, ?30, ?31, ?32, ?33, ?34,
                ?35, ?36, ?37, ?38,
                ?39, ?40, 1
            )",
            params![
                emp_id,
                device_id,
                now,
                now,
                input.razao_social,
                input.nome_fantasia,
                input.cnpj,
                input.inscricao_estadual,
                input.inscricao_municipal,
                input.cnae_principal,
                input.cnae_secundarios,
                input.crt,
                input.regime_pis_cofins.as_deref().unwrap_or("CUMULATIVO"),
                input.regime_apuracao.as_deref().unwrap_or("LUCRO_PRESUMIDO"),
                input.aliquota_simples_anexo,
                input.p_cred_sn,
                input.suframa,
                input.nire,
                input.natureza_juridica,
                input.logradouro,
                input.numero,
                input.complemento,
                input.bairro,
                input.cidade,
                input.uf,
                input.cep,
                input.cod_municipio_ibge,
                input.pais.as_deref().unwrap_or("BRASIL"),
                input.cod_pais_bacen.as_deref().unwrap_or("1058"),
                input.telefone_1,
                input.telefone_2,
                input.email,
                input.email_fiscal,
                input.site,
                input.responsavel,
                input.logo_base64,
                input.certificado_a1_alias,
                input.certificado_a1_validade,
                input.nicho_empresa.as_deref().unwrap_or("VAREJO"),
                input.praca,
            ],
        )
        .map_err(|e| format!("Erro ao inserir empresa: {}", e))?;
    }

    // Garante que exista a filial matriz default (fil1) para a empresa salva
    let filial_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM filiais WHERE id = 'fil1')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(false);

    if !filial_exists {
        let _ = conn.execute(
            "INSERT INTO filiais (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, empresa_id, codigo, nome, cnpj)
             VALUES ('fil1', ?1, ?2, ?2, 'pending', 1, 0, ?3, '001', 'FILIAL MATRIZ', ?4)",
            params![device_id, now, input.id, input.cnpj],
        );
    }

    info!("Dados da empresa {} salvos com sucesso.", input.razao_social);
    Ok(input.id.clone())
}

/// Carrega os dados cadastrais e tributários da Empresa pelo ID
pub fn carregar_dados_empresa(
    conn: &Connection,
    empresa_id: &str,
) -> Result<Option<EmpresaConfigInput>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                id, razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                cnae_principal, cnae_secundarios, crt, regime_pis_cofins, regime_apuracao,
                aliquota_simples_anexo, p_cred_sn, suframa, nire, natureza_juridica,
                logradouro, numero, complemento, bairro, cidade, uf, cep, cod_municipio_ibge,
                pais, cod_pais_bacen, telefone_1, telefone_2, email, email_fiscal, site,
                responsavel, logo_base64, certificado_a1_alias, certificado_a1_validade,
                nicho_empresa, praca
            FROM empresas WHERE id = ?1 AND is_deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(params![empresa_id], |row| {
            Ok(EmpresaConfigInput {
                id: row.get(0)?,
                razao_social: row.get(1)?,
                nome_fantasia: row.get(2)?,
                cnpj: row.get(3)?,
                inscricao_estadual: row.get(4)?,
                inscricao_municipal: row.get(5)?,
                cnae_principal: row.get(6)?,
                cnae_secundarios: row.get(7)?,
                crt: row.get(8)?,
                regime_pis_cofins: row.get(9)?,
                regime_apuracao: row.get(10)?,
                aliquota_simples_anexo: row.get(11)?,
                p_cred_sn: row.get(12)?,
                suframa: row.get(13)?,
                nire: row.get(14)?,
                natureza_juridica: row.get(15)?,
                logradouro: row.get(16)?,
                numero: row.get(17)?,
                complemento: row.get(18)?,
                bairro: row.get(19)?,
                cidade: row.get(20)?,
                uf: row.get(21)?,
                cep: row.get(22)?,
                cod_municipio_ibge: row.get(23)?,
                pais: row.get(24)?,
                cod_pais_bacen: row.get(25)?,
                telefone_1: row.get(26)?,
                telefone_2: row.get(27)?,
                email: row.get(28)?,
                email_fiscal: row.get(29)?,
                site: row.get(30)?,
                responsavel: row.get(31)?,
                logo_base64: row.get(32)?,
                certificado_a1_alias: row.get(33)?,
                certificado_a1_validade: row.get(34)?,
                nicho_empresa: row.get(35)?,
                praca: row.get(36)?,
            })
        })
        .optional()
        .map_err(|e| format!("Erro ao consultar empresa: {}", e))?;

    Ok(result)
}

/// Salva uma chave de configuração genérica (chave-valor por grupo)
pub fn salvar_configuracao(
    conn: &Connection,
    device_id: &str,
    empresa_id: &str,
    chave: &str,
    valor: &str,
    grupo: &str,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO configuracoes_sistema (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, chave, valor, grupo
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8)
        ON CONFLICT(empresa_id, chave) DO UPDATE SET
            valor = excluded.valor,
            grupo = excluded.grupo,
            updated_at = excluded.updated_at,
            x_sync_status = 'pending'",
        params![id, device_id, now, now, empresa_id, chave, valor, grupo],
    )
    .map_err(|e| format!("Erro ao salvar configuração {}: {}", chave, e))?;

    Ok(())
}

/// Carrega todas as configurações de uma empresa, opcionalmente filtradas por grupo
pub fn carregar_configuracoes(
    conn: &Connection,
    empresa_id: &str,
    grupo_opt: Option<&str>,
) -> Result<Vec<ConfigItem>, String> {
    let mut sql = "SELECT id, empresa_id, chave, valor, grupo FROM configuracoes_sistema WHERE empresa_id = ?1 AND is_deleted = 0".to_string();
    if grupo_opt.is_some() {
        sql.push_str(" AND grupo = ?2");
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let map_row = |row: &rusqlite::Row| {
        Ok(ConfigItem {
            id: row.get(0)?,
            empresa_id: row.get(1)?,
            chave: row.get(2)?,
            valor: row.get(3)?,
            grupo: row.get(4)?,
        })
    };

    let items = if let Some(g) = grupo_opt {
        stmt.query_map(params![empresa_id, g], map_row)
    } else {
        stmt.query_map(params![empresa_id], map_row)
    }
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(items)
}

/// Salva as configurações fiscais de NF-e (Modelo 55) da Filial
pub fn salvar_config_nfe_filial(
    conn: &Connection,
    device_id: &str,
    input: &FilialNfeConfigInput,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    garantir_empresa_e_filial(conn, device_id, &input.filial_id)?;

    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO filiais_nfe_config (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, serie_nfe, proximo_numero_nfe, ambiente_nfe, tp_imp_danfe,
            tp_emis_nfe, ind_sinc, versao_xml, logo_danfe_path, xml_storage_path,
            resp_tec_cnpj, resp_tec_contato, resp_tec_email, resp_tec_fone, resp_tec_id_csrt, resp_tec_csrt
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
        ON CONFLICT(filial_id) DO UPDATE SET
            serie_nfe = excluded.serie_nfe,
            proximo_numero_nfe = excluded.proximo_numero_nfe,
            ambiente_nfe = excluded.ambiente_nfe,
            tp_imp_danfe = excluded.tp_imp_danfe,
            tp_emis_nfe = excluded.tp_emis_nfe,
            ind_sinc = excluded.ind_sinc,
            versao_xml = excluded.versao_xml,
            logo_danfe_path = excluded.logo_danfe_path,
            xml_storage_path = excluded.xml_storage_path,
            resp_tec_cnpj = excluded.resp_tec_cnpj,
            resp_tec_contato = excluded.resp_tec_contato,
            resp_tec_email = excluded.resp_tec_email,
            resp_tec_fone = excluded.resp_tec_fone,
            resp_tec_id_csrt = excluded.resp_tec_id_csrt,
            resp_tec_csrt = excluded.resp_tec_csrt,
            updated_at = excluded.updated_at,
            x_sync_status = 'pending'",
        params![
            id,
            device_id,
            now,
            now,
            input.filial_id,
            input.serie_nfe,
            input.proximo_numero_nfe,
            input.ambiente_nfe,
            input.tp_imp_danfe,
            input.tp_emis_nfe,
            input.ind_sinc,
            input.versao_xml,
            input.logo_danfe_path,
            input.xml_storage_path,
            input.resp_tec_cnpj,
            input.resp_tec_contato,
            input.resp_tec_email,
            input.resp_tec_fone,
            input.resp_tec_id_csrt,
            input.resp_tec_csrt,
        ],
    )
    .map_err(|e| format!("Erro ao salvar config NF-e da filial: {}", e))?;

    Ok(())
}

/// Carrega as configurações de NF-e (Modelo 55) da Filial
pub fn carregar_config_nfe_filial(
    conn: &Connection,
    filial_id: &str,
) -> Result<Option<FilialNfeConfigInput>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                filial_id, serie_nfe, proximo_numero_nfe, ambiente_nfe, tp_imp_danfe,
                tp_emis_nfe, ind_sinc, versao_xml, logo_danfe_path, xml_storage_path,
                resp_tec_cnpj, resp_tec_contato, resp_tec_email, resp_tec_fone, resp_tec_id_csrt, resp_tec_csrt
            FROM filiais_nfe_config WHERE filial_id = ?1 AND is_deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(params![filial_id], |row| {
            Ok(FilialNfeConfigInput {
                filial_id: row.get(0)?,
                serie_nfe: row.get(1)?,
                proximo_numero_nfe: row.get(2)?,
                ambiente_nfe: row.get(3)?,
                tp_imp_danfe: row.get(4).unwrap_or(1),
                tp_emis_nfe: row.get(5).unwrap_or(1),
                ind_sinc: row.get(6).unwrap_or(1),
                versao_xml: row.get(7).unwrap_or_else(|_| "4.00".to_string()),
                logo_danfe_path: row.get(8)?,
                xml_storage_path: row.get(9)?,
                resp_tec_cnpj: row.get(10)?,
                resp_tec_contato: row.get(11)?,
                resp_tec_email: row.get(12)?,
                resp_tec_fone: row.get(13)?,
                resp_tec_id_csrt: row.get(14)?,
                resp_tec_csrt: row.get(15)?,
            })
        })
        .optional()
        .map_err(|e| format!("Erro ao consultar config NF-e da filial: {}", e))?;

    Ok(result)
}

/// Salva as configurações fiscais de NFC-e (Modelo 65) da Filial
pub fn salvar_config_nfce_filial(
    conn: &Connection,
    device_id: &str,
    input: &FilialNfceConfigInput,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    garantir_empresa_e_filial(conn, device_id, &input.filial_id)?;

    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO filiais_nfce_config (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, serie_nfce, proximo_numero_nfce, ambiente_nfce, csc_id, csc_token,
            tp_emis_nfce, modelo_danfe_nfce, tp_imp_danfe_nfce, versao_qrcode, qrcode_contingencia,
            usar_tef, fuso_horario, mostrar_troco, enviar_codigo_barras, contingencia_timeout_ms,
            xml_storage_path, logo_danfce_path
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)
        ON CONFLICT(filial_id) DO UPDATE SET
            serie_nfce = excluded.serie_nfce,
            proximo_numero_nfce = excluded.proximo_numero_nfce,
            ambiente_nfce = excluded.ambiente_nfce,
            csc_id = excluded.csc_id,
            csc_token = excluded.csc_token,
            tp_emis_nfce = excluded.tp_emis_nfce,
            modelo_danfe_nfce = excluded.modelo_danfe_nfce,
            tp_imp_danfe_nfce = excluded.tp_imp_danfe_nfce,
            versao_qrcode = excluded.versao_qrcode,
            qrcode_contingencia = excluded.qrcode_contingencia,
            usar_tef = excluded.usar_tef,
            fuso_horario = excluded.fuso_horario,
            mostrar_troco = excluded.mostrar_troco,
            enviar_codigo_barras = excluded.enviar_codigo_barras,
            contingencia_timeout_ms = excluded.contingencia_timeout_ms,
            xml_storage_path = excluded.xml_storage_path,
            logo_danfce_path = excluded.logo_danfce_path,
            updated_at = excluded.updated_at,
            x_sync_status = 'pending'",
        params![
            id,
            device_id,
            now,
            now,
            input.filial_id,
            input.serie_nfce,
            input.proximo_numero_nfce,
            input.ambiente_nfce,
            input.csc_id,
            input.csc_token,
            input.tp_emis_nfce,
            input.modelo_danfe_nfce,
            input.tp_imp_danfe_nfce,
            input.versao_qrcode,
            input.qrcode_contingencia,
            input.usar_tef,
            input.fuso_horario,
            input.mostrar_troco,
            input.enviar_codigo_barras,
            input.contingencia_timeout_ms,
            input.xml_storage_path,
            input.logo_danfce_path,
        ],
    )
    .map_err(|e| format!("Erro ao salvar config NFC-e da filial: {}", e))?;

    Ok(())
}

/// Carrega as configurações de NFC-e (Modelo 65) da Filial
pub fn carregar_config_nfce_filial(
    conn: &Connection,
    filial_id: &str,
) -> Result<Option<FilialNfceConfigInput>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                filial_id, serie_nfce, proximo_numero_nfce, ambiente_nfce, csc_id, csc_token,
                tp_emis_nfce, modelo_danfe_nfce, tp_imp_danfe_nfce, versao_qrcode, qrcode_contingencia,
                usar_tef, fuso_horario, mostrar_troco, enviar_codigo_barras, contingencia_timeout_ms,
                xml_storage_path, logo_danfce_path
            FROM filiais_nfce_config WHERE filial_id = ?1 AND is_deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(params![filial_id], |row| {
            Ok(FilialNfceConfigInput {
                filial_id: row.get(0)?,
                serie_nfce: row.get(1)?,
                proximo_numero_nfce: row.get(2)?,
                ambiente_nfce: row.get(3)?,
                csc_id: row.get(4)?,
                csc_token: row.get(5)?,
                tp_emis_nfce: row.get(6).unwrap_or(1),
                modelo_danfe_nfce: row.get(7).unwrap_or_else(|_| "PADRAO".to_string()),
                tp_imp_danfe_nfce: row.get(8).unwrap_or(1),
                versao_qrcode: row.get(9).unwrap_or_else(|_| "2.00".to_string()),
                qrcode_contingencia: row.get(10).unwrap_or_else(|_| "2.00".to_string()),
                usar_tef: row.get(11).unwrap_or(0),
                fuso_horario: row.get(12).unwrap_or_else(|_| "-03:00".to_string()),
                mostrar_troco: row.get(13).unwrap_or(1),
                enviar_codigo_barras: row.get(14).unwrap_or(1),
                contingencia_timeout_ms: row.get(15).unwrap_or(5000),
                xml_storage_path: row.get(16)?,
                logo_danfce_path: row.get(17)?,
            })
        })
        .optional()
        .map_err(|e| format!("Erro ao consultar config NFC-e da filial: {}", e))?;

    Ok(result)
}

/// Salva as configurações de NFS-e (Serviços) da Filial
pub fn salvar_config_nfse_filial(
    conn: &Connection,
    device_id: &str,
    input: &FilialNfseConfigInput,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    garantir_empresa_e_filial(conn, device_id, &input.filial_id)?;

    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO filiais_nfse_config (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, ambiente_nfse, provedor_nfse, url_ws_producao, url_ws_homologacao,
            usuario_ws, senha_ws, token_ws, serie_rps, proximo_numero_rps, tipo_rps,
            regime_especial_tributacao, natureza_operacao, item_lista_servico,
            cod_tributacao_municipio, cnae_servico, aliquota_iss, iss_retido,
            responsavel_retencao, incentivador_cultural, optante_simples_nfse,
            xml_storage_path, logo_danfse_path, versao_abrasf, usar_nfse_nacional
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29)
        ON CONFLICT(filial_id) DO UPDATE SET
            ambiente_nfse = excluded.ambiente_nfse,
            provedor_nfse = excluded.provedor_nfse,
            url_ws_producao = excluded.url_ws_producao,
            url_ws_homologacao = excluded.url_ws_homologacao,
            usuario_ws = excluded.usuario_ws,
            senha_ws = excluded.senha_ws,
            token_ws = excluded.token_ws,
            serie_rps = excluded.serie_rps,
            proximo_numero_rps = excluded.proximo_numero_rps,
            tipo_rps = excluded.tipo_rps,
            regime_especial_tributacao = excluded.regime_especial_tributacao,
            natureza_operacao = excluded.natureza_operacao,
            item_lista_servico = excluded.item_lista_servico,
            cod_tributacao_municipio = excluded.cod_tributacao_municipio,
            cnae_servico = excluded.cnae_servico,
            aliquota_iss = excluded.aliquota_iss,
            iss_retido = excluded.iss_retido,
            responsavel_retencao = excluded.responsavel_retencao,
            incentivador_cultural = excluded.incentivador_cultural,
            optante_simples_nfse = excluded.optante_simples_nfse,
            xml_storage_path = excluded.xml_storage_path,
            logo_danfse_path = excluded.logo_danfse_path,
            versao_abrasf = excluded.versao_abrasf,
            usar_nfse_nacional = excluded.usar_nfse_nacional,
            updated_at = excluded.updated_at,
            x_sync_status = 'pending'",
        params![
            id,
            device_id,
            now,
            now,
            input.filial_id,
            input.ambiente_nfse,
            input.provedor_nfse,
            input.url_ws_producao,
            input.url_ws_homologacao,
            input.usuario_ws,
            input.senha_ws,
            input.token_ws,
            input.serie_rps,
            input.proximo_numero_rps,
            input.tipo_rps,
            input.regime_especial_tributacao,
            input.natureza_operacao,
            input.item_lista_servico,
            input.cod_tributacao_municipio,
            input.cnae_servico,
            input.aliquota_iss,
            input.iss_retido,
            input.responsavel_retencao,
            input.incentivador_cultural,
            input.optante_simples_nfse,
            input.xml_storage_path,
            input.logo_danfse_path,
            input.versao_abrasf,
            input.usar_nfse_nacional,
        ],
    )
    .map_err(|e| format!("Erro ao salvar config NFS-e da filial: {}", e))?;

    Ok(())
}

/// Carrega as configurações de NFS-e (Serviços) da Filial
pub fn carregar_config_nfse_filial(
    conn: &Connection,
    filial_id: &str,
) -> Result<Option<FilialNfseConfigInput>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                filial_id, ambiente_nfse, provedor_nfse, url_ws_producao, url_ws_homologacao,
                usuario_ws, senha_ws, token_ws, serie_rps, proximo_numero_rps, tipo_rps,
                regime_especial_tributacao, natureza_operacao, item_lista_servico,
                cod_tributacao_municipio, cnae_servico, aliquota_iss, iss_retido,
                responsavel_retencao, incentivador_cultural, optante_simples_nfse,
                xml_storage_path, logo_danfse_path, versao_abrasf, usar_nfse_nacional
            FROM filiais_nfse_config WHERE filial_id = ?1 AND is_deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(params![filial_id], |row| {
            Ok(FilialNfseConfigInput {
                filial_id: row.get(0)?,
                ambiente_nfse: row.get(1)?,
                provedor_nfse: row.get(2).unwrap_or_else(|_| "NACIONAL".to_string()),
                url_ws_producao: row.get(3)?,
                url_ws_homologacao: row.get(4)?,
                usuario_ws: row.get(5)?,
                senha_ws: row.get(6)?,
                token_ws: row.get(7)?,
                serie_rps: row.get(8).unwrap_or_else(|_| "1".to_string()),
                proximo_numero_rps: row.get(9).unwrap_or(1),
                tipo_rps: row.get(10).unwrap_or(1),
                regime_especial_tributacao: row.get(11).unwrap_or(1),
                natureza_operacao: row.get(12).unwrap_or(1),
                item_lista_servico: row.get(13).unwrap_or_else(|_| "14.01".to_string()),
                cod_tributacao_municipio: row.get(14)?,
                cnae_servico: row.get(15).unwrap_or_else(|_| "6201501".to_string()),
                aliquota_iss: row.get(16).unwrap_or(2.00),
                iss_retido: row.get(17).unwrap_or(2),
                responsavel_retencao: row.get(18).unwrap_or(1),
                incentivador_cultural: row.get(19).unwrap_or(2),
                optante_simples_nfse: row.get(20).unwrap_or(1),
                xml_storage_path: row.get(21)?,
                logo_danfse_path: row.get(22)?,
                versao_abrasf: row.get(23).unwrap_or_else(|_| "2.04".to_string()),
                usar_nfse_nacional: row.get(24).unwrap_or(1),
            })
        })
        .optional()
        .map_err(|e| format!("Erro ao consultar config NFS-e da filial: {}", e))?;

    Ok(result)
}

fn garantir_empresa_e_filial(conn: &Connection, device_id: &str, filial_id: &str) -> Result<(), String> {
    let _ = crate::db::schema::create_tables(conn);
    let now = Utc::now().to_rfc3339();

    let emp_id: String = conn
        .query_row("SELECT id FROM empresas LIMIT 1", [], |r| r.get(0))
        .unwrap_or_else(|_| "emp1".to_string());

    let emp_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM empresas WHERE id = ?1)",
            params![emp_id],
            |r| r.get(0),
        )
        .unwrap_or(false);

    if !emp_exists {
        let _ = conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, razao_social, cnpj, ativo)
             VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, 'EMPRESA MATRIZ', '05766577000122', 1)",
            params![emp_id, device_id, now],
        );
    }

    let filial_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM filiais WHERE id = ?1)",
            params![filial_id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !filial_exists {
        let _ = conn.execute(
            "INSERT INTO filiais (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, empresa_id, codigo, nome, cnpj)
             VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, '001', 'FILIAL MATRIZ', '05766577000122')",
            params![filial_id, device_id, now, emp_id],
        );
    }

    Ok(())
}

/// Função de retrocompatibilidade para salvar configs legadas
pub fn salvar_config_fiscal_filial(
    conn: &Connection,
    device_id: &str,
    input: &FilialNfeConfigInput,
) -> Result<(), String> {
    salvar_config_nfe_filial(conn, device_id, input)
}

/// Função de retrocompatibilidade para carregar configs legadas
pub fn carregar_config_fiscal_filial(
    conn: &Connection,
    filial_id: &str,
) -> Result<Option<FilialNfeConfigInput>, String> {
    carregar_config_nfe_filial(conn, filial_id)
}
