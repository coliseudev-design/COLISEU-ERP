//! Comandos IPC do Módulo Tributário, MD-e e SPED Fiscal
//!
//! Conecta o frontend React ao engine tributário em Rust para regras fiscais,
//! importação de XML de compras, eventos MD-e e emissão do SPED EFD ICMS/IPI.

use crate::db::DbState;
use crate::fiscal::mde::{self, NfeEntradaParsed};
use crate::fiscal::sped;
use crate::fiscal::tributacao::{
    self, CalculoImpostoInput, RegraTributaria, ResultadoTributarioItem,
};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use tracing::info;

#[tauri::command]
pub async fn salvar_regra_tributaria(
    state: State<'_, DbState>,
    input: RegraTributaria,
) -> Result<bool, String> {
    let conn = state.conn.lock().unwrap();
    let now = Utc::now().to_rfc3339();
    let id = if input.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        input.id
    };

    conn.execute(
        "INSERT INTO tributacao_regras (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, ncm, uf_origem, uf_destino, crt, cfop_estado, cfop_interestado, csosn, cst_icms,
            aliquota_icms, aliquota_red_bc_icms, cst_pis, aliquota_pis, cst_cofins, aliquota_cofins,
            aliquota_ibpt_nacional, aliquota_ibpt_estadual
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
        ON CONFLICT(id) DO UPDATE SET
            ncm=excluded.ncm, uf_origem=excluded.uf_origem, uf_destino=excluded.uf_destino, crt=excluded.crt,
            cfop_estado=excluded.cfop_estado, cfop_interestado=excluded.cfop_interestado, csosn=excluded.csosn,
            cst_icms=excluded.cst_icms, aliquota_icms=excluded.aliquota_icms, aliquota_red_bc_icms=excluded.aliquota_red_bc_icms,
            cst_pis=excluded.cst_pis, aliquota_pis=excluded.aliquota_pis, cst_cofins=excluded.cst_cofins,
            aliquota_cofins=excluded.aliquota_cofins, aliquota_ibpt_nacional=excluded.aliquota_ibpt_nacional,
            aliquota_ibpt_estadual=excluded.aliquota_ibpt_estadual, updated_at=excluded.updated_at, x_version=x_version+1, x_sync_status='pending'",
        params![
            id,
            state.device_id,
            now,
            input.empresa_id,
            input.ncm,
            input.uf_origem,
            input.uf_destino,
            input.crt,
            input.cfop_estado,
            input.cfop_interestado,
            input.csosn,
            input.cst_icms,
            input.aliquota_icms,
            input.aliquota_red_bc_icms,
            input.cst_pis,
            input.aliquota_pis,
            input.cst_cofins,
            input.aliquota_cofins,
            input.aliquota_ibpt_nacional,
            input.aliquota_ibpt_estadual
        ],
    )
    .map_err(|e| format!("Erro ao salvar regra tributária: {}", e))?;

    info!("Regra tributária para NCM {} salva com sucesso.", input.ncm);
    Ok(true)
}

#[tauri::command]
pub async fn listar_regras_tributarias(
    state: State<'_, DbState>,
    empresa_id: String,
) -> Result<Vec<RegraTributaria>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, empresa_id, ncm, uf_origem, uf_destino, crt, cfop_estado, cfop_interestado,
                    csosn, cst_icms, aliquota_icms, aliquota_red_bc_icms, cst_pis, aliquota_pis,
                    cst_cofins, aliquota_cofins, aliquota_ibpt_nacional, aliquota_ibpt_estadual
             FROM tributacao_regras
             WHERE empresa_id = ?1 AND is_deleted = 0",
        )
        .map_err(|e| format!("Erro ao buscar regras: {}", e))?;

    let rows = stmt
        .query_map(params![empresa_id], |r| {
            Ok(RegraTributaria {
                id: r.get(0)?,
                empresa_id: r.get(1)?,
                ncm: r.get(2)?,
                uf_origem: r.get(3)?,
                uf_destino: r.get(4)?,
                crt: r.get::<_, i32>(5)? as u32,
                cfop_estado: r.get(6)?,
                cfop_interestado: r.get(7)?,
                csosn: r.get(8)?,
                cst_icms: r.get(9)?,
                aliquota_icms: r.get(10)?,
                aliquota_red_bc_icms: r.get(11)?,
                cst_pis: r.get(12)?,
                aliquota_pis: r.get(13)?,
                cst_cofins: r.get(14)?,
                aliquota_cofins: r.get(15)?,
                aliquota_ibpt_nacional: r.get(16)?,
                aliquota_ibpt_estadual: r.get(17)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        if let Ok(regra) = row {
            list.push(regra);
        }
    }

    Ok(list)
}

#[tauri::command]
pub async fn calcular_tributacao_item(
    input: CalculoImpostoInput,
) -> Result<ResultadoTributarioItem, String> {
    Ok(tributacao::calcular_tributos_item(&input))
}

#[tauri::command]
pub async fn importar_xml_nfe_fornecedor(
    state: State<'_, DbState>,
    filial_id: String,
    xml_str: String,
) -> Result<NfeEntradaParsed, String> {
    let parsed = mde::parse_nfe_xml_fornecedor(&xml_str)?;

    let conn = state.conn.lock().unwrap();
    let now = Utc::now().to_rfc3339();
    let entrada_id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO nfe_entradas (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, chave_acesso, numero, serie, cnpj_emitente, nome_emitente, data_emissao, valor_total, status_manifestacao, xml_conteudo
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'SEM_MANIFESTO', ?12)
        ON CONFLICT(chave_acesso) DO UPDATE SET updated_at = ?3",
        params![
            entrada_id,
            state.device_id,
            now,
            filial_id,
            parsed.chave_acesso,
            parsed.numero,
            parsed.serie,
            parsed.cnpj_emitente,
            parsed.nome_emitente,
            parsed.data_emissao,
            parsed.valor_total,
            xml_str
        ],
    )
    .map_err(|e| format!("Erro ao registrar NF-e de entrada: {}", e))?;

    info!("NF-e nº {} (Chave {}) importada com sucesso.", parsed.numero, parsed.chave_acesso);
    Ok(parsed)
}

#[tauri::command]
pub async fn manifestar_destinatario(
    state: State<'_, DbState>,
    chave_acesso: String,
    tipo_evento: String,
    cnpj_destinatario: String,
) -> Result<String, String> {
    let xml_evento = mde::gerar_xml_manifesto_destinatario(&chave_acesso, &tipo_evento, &cnpj_destinatario);

    let conn = state.conn.lock().unwrap();
    let status_str = match tipo_evento.as_str() {
        "210210" => "CIENCIA",
        "210200" => "CONFIRMADA",
        "210220" => "DESCONHECIDA",
        _ => "CIENCIA",
    };

    let _ = conn.execute(
        "UPDATE nfe_entradas SET status_manifestacao = ?1, updated_at = ?2 WHERE chave_acesso = ?3",
        params![status_str, Utc::now().to_rfc3339(), chave_acesso],
    );

    info!("Manifestação MD-e ({}) enviada para a chave {}.", status_str, chave_acesso);
    Ok(xml_evento)
}

#[tauri::command]
pub async fn gerar_arquivo_sped_fiscal(
    state: State<'_, DbState>,
    filial_id: String,
    data_inicio: String,
    data_fim: String,
) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    sped::gerar_efd_icms_ipi(&conn, &filial_id, &data_inicio, &data_fim)
}
