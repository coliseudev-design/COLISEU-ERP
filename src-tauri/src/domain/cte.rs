use chrono::Utc;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CteComponenteInput {
    pub nome: String, // 'FRETE_PESO', 'FRETE_VALOR', 'PEDAGIO', 'GRIS', 'AD_VALOREM', 'OUTROS'
    pub valor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CteNfeInput {
    pub chave_nfe: String,
    pub pin_suframa: Option<String>,
    pub data_prevista_entrega: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CteInput {
    pub id: Option<String>,
    pub filial_id: String,
    pub numero_cte: Option<i32>,
    pub serie: Option<i32>,
    pub cfop: Option<String>,
    pub natureza_operacao: Option<String>,
    pub tipo_cte: Option<i32>, // 0-Normal, 1-Complementar, 3-Substituição
    pub tipo_servico: Option<i32>, // 0-Normal, 1-Subcontratação, 2-Redespacho, 3-Redespacho Intermediário, 4-Multimodal
    pub modal: Option<String>, // '01'-Rodoviário
    pub data_emissao: Option<String>,
    pub hora_emissao: Option<String>,
    pub uf_inicio: String,
    pub municipio_inicio: String,
    pub cod_ibge_inicio: Option<String>,
    pub uf_fim: String,
    pub municipio_fim: String,
    pub cod_ibge_fim: Option<String>,

    pub remetente_id: Option<String>,
    pub destinatario_id: Option<String>,
    pub expedidor_id: Option<String>,
    pub recebedor_id: Option<String>,
    pub tomador_tipo: Option<i32>, // 0-Remetente, 1-Expedidor, 2-Recebedor, 3-Destinatário, 4-Outros
    pub tomador_id: Option<String>,

    pub veiculo_id: Option<String>,
    pub motorista_id: Option<String>,
    pub rntrc: Option<String>,

    pub valor_total_prestacao: f64,
    pub valor_receber: f64,
    pub valor_carga: f64,
    pub produto_predominante: Option<String>,
    pub peso_bruto_carga_kg: f64,

    pub icms_cst: Option<String>,
    pub icms_base_calculo: Option<f64>,
    pub icms_aliquota: Option<f64>,
    pub icms_valor: Option<f64>,
    pub icms_reducao_bc: Option<f64>,
    pub crt_emitente: Option<i32>,

    pub info_complementar: Option<String>,
    pub ambiente: Option<i32>, // 1-Produção, 2-Homologação

    pub componentes: Option<Vec<CteComponenteInput>>,
    pub nfes_vinculadas: Option<Vec<CteNfeInput>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CteItem {
    pub id: String,
    pub filial_id: String,
    pub numero_cte: i32,
    pub serie: i32,
    pub chave_acesso: Option<String>,
    pub cfop: String,
    pub natureza_operacao: String,
    pub tipo_cte: i32,
    pub tipo_servico: i32,
    pub modal: String,
    pub data_emissao: String,
    pub hora_emissao: String,
    pub uf_inicio: String,
    pub municipio_inicio: String,
    pub cod_ibge_inicio: Option<String>,
    pub uf_fim: String,
    pub municipio_fim: String,
    pub cod_ibge_fim: Option<String>,

    pub remetente_id: Option<String>,
    pub remetente_nome: Option<String>,
    pub destinatario_id: Option<String>,
    pub destinatario_nome: Option<String>,
    pub tomador_tipo: i32,
    pub tomador_id: Option<String>,
    pub tomador_nome: Option<String>,

    pub veiculo_id: Option<String>,
    pub veiculo_placa: Option<String>,
    pub motorista_id: Option<String>,
    pub motorista_nome: Option<String>,
    pub rntrc: Option<String>,

    pub valor_total_prestacao: f64,
    pub valor_receber: f64,
    pub valor_carga: f64,
    pub produto_predominante: String,
    pub peso_bruto_carga_kg: f64,

    pub icms_cst: String,
    pub icms_base_calculo: f64,
    pub icms_aliquota: f64,
    pub icms_valor: f64,
    pub icms_reducao_bc: f64,
    pub crt_emitente: i32,

    pub info_complementar: Option<String>,
    pub ambiente: i32,
    pub status_sefaz: String,
    pub mensagem_sefaz: Option<String>,
    pub protocolo_autorizacao: Option<String>,
    pub data_autorizacao: Option<String>,
    pub xml_envio: Option<String>,
    pub xml_retorno: Option<String>,
    pub dacte_pdf_path: Option<String>,

    pub total_nfes: i32,
    pub chaves_nfes: Vec<String>,
    pub componentes: Vec<CteComponenteInput>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CteEventoInput {
    pub cte_id: String,
    pub tipo_evento: String, // 'CANCELAMENTO', 'CARTA_CORRECAO', 'EPEC', 'DESACORDO', 'COMPROVANTE_ENTREGA'
    pub justificativa: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CteEventoItem {
    pub id: String,
    pub cte_id: String,
    pub tipo_evento: String,
    pub sequencia: i32,
    pub data_evento: String,
    pub protocolo: Option<String>,
    pub justificativa: Option<String>,
    pub status_retorno: Option<i32>,
}

// =========================================================================
// GERADOR DE CHAVE DE ACESSO CT-E (44 DÍGITOS COM MÓDULO 11)
// =========================================================================

pub fn gerar_chave_acesso_cte(
    uf_ibge: u32,
    ano_mes: &str, // "2608" (AAMM)
    cnpj_emitente: &str,
    modelo: u32, // 57
    serie: u32,
    numero: u32,
    tp_emis: u32, // 1-Normal
    codigo_numerico: u32,
) -> String {
    let clean_cnpj = cnpj_emitente.replace(|c: char| !c.is_numeric(), "");
    let cnpj_fmt = format!("{:0>14}", clean_cnpj);

    let chave_sem_dv = format!(
        "{:02}{}{}{:02}{:03}{:09}{}{:08}",
        uf_ibge, ano_mes, cnpj_fmt, modelo, serie, numero, tp_emis, codigo_numerico
    );

    let dv = calcular_modulo_11(&chave_sem_dv);
    format!("{}{}", chave_sem_dv, dv)
}

fn calcular_modulo_11(chave: &str) -> u32 {
    let pesos = [2, 3, 4, 5, 6, 7, 8, 9];
    let mut soma = 0;
    let mut peso_idx = 0;

    for c in chave.chars().rev() {
        if let Some(digit) = c.to_digit(10) {
            soma += digit * pesos[peso_idx];
            peso_idx = (peso_idx + 1) % pesos.len();
        }
    }

    let resto = soma % 11;
    if resto == 0 || resto == 1 {
        0
    } else {
        11 - resto
    }
}

// =========================================================================
// CÁLCULO DE TRIBUTAÇÃO DO TRANSPORTE (ICMS)
// =========================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculoTributacaoCteResult {
    pub cfop: String,
    pub cst: String,
    pub base_calculo: f64,
    pub aliquota: f64,
    pub valor_icms: f64,
    pub valor_reducao_bc: f64,
}

pub fn calcular_tributacao_cte(
    uf_inicio: &str,
    uf_fim: &str,
    valor_prestacao: f64,
    crt_emitente: i32,
    optante_simples: bool,
) -> CalculoTributacaoCteResult {
    let is_interestadual = uf_inicio.to_uppercase() != uf_fim.to_uppercase();

    // CFOP de Transporte: 5353 (Interno) / 6353 (Interestadual)
    let cfop = if is_interestadual { "6353" } else { "5353" }.to_string();

    if optante_simples || crt_emitente == 1 || crt_emitente == 2 {
        // Simples Nacional
        return CalculoTributacaoCteResult {
            cfop,
            cst: "90".to_string(), // ICMSSN 90
            base_calculo: 0.0,
            aliquota: 0.0,
            valor_icms: 0.0,
            valor_reducao_bc: 0.0,
        };
    }

    // Regime Normal
    let aliquota = if is_interestadual {
        // Alíquota Interestadual padrão: 7% para N/NE/CO/ES ou 12% para S/SE
        match uf_fim.to_uppercase().as_str() {
            "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MT" | "MS"
            | "PA" | "PB" | "PE" | "PI" | "RN" | "RO" | "RR" | "SE" | "TO" => 7.0,
            _ => 12.0,
        }
    } else {
        // Transporte Interno (ex: 17% a 19.5% dependendo da UF)
        match uf_inicio.to_uppercase().as_str() {
            "MS" => 17.0,
            "SP" => 18.0,
            "PR" => 19.0,
            "RJ" => 20.0,
            _ => 17.0,
        }
    };

    let base_calculo = valor_prestacao;
    let valor_icms = (base_calculo * (aliquota / 100.0) * 100.0).round() / 100.0;

    CalculoTributacaoCteResult {
        cfop,
        cst: "00".to_string(),
        base_calculo,
        aliquota,
        valor_icms,
        valor_reducao_bc: 0.0,
    }
}

// =========================================================================
// CRUD CTE NO RUSQLITE
// =========================================================================

pub fn salvar_cte(conn: &Connection, input: CteInput, device_id: &str) -> Result<CteItem> {
    crate::domain::transporte::ensure_filial_exists(conn, &input.filial_id, "emp_matriz_01", device_id)?;

    let now = Utc::now().to_rfc3339();
    let id = input.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let serie = input.serie.unwrap_or(1);

    // Garante que remetente e destinatário existem na tabela pessoas
    let remetente_id = input.remetente_id.unwrap_or_else(|| "pes_matriz_01".into());
    let destinatario_id = input.destinatario_id.unwrap_or_else(|| "pes_dest_01".into());

    crate::domain::transporte::ensure_pessoa_exists(
        conn,
        &remetente_id,
        "emp_matriz_01",
        device_id,
        "EMPRESA REMETENTE MATRIZ",
        "05.766.577/0001-22",
    )?;

    crate::domain::transporte::ensure_pessoa_exists(
        conn,
        &destinatario_id,
        "emp_matriz_01",
        device_id,
        "CLIENTE DESTINATARIO",
        "12.345.678/0001-90",
    )?;

    // Sanitiza FKs opcionais para evitar erros de integridade relacional
    let veiculo_id_val = if let Some(ref vid) = input.veiculo_id {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM veiculos WHERE id = ?1",
                params![vid],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if count > 0 {
            Some(vid.clone())
        } else {
            None
        }
    } else {
        None
    };

    let motorista_id_val = if let Some(ref mid) = input.motorista_id {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM motoristas WHERE id = ?1",
                params![mid],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if count > 0 {
            Some(mid.clone())
        } else {
            None
        }
    } else {
        None
    };

    let expedidor_id_val = if let Some(ref eid) = input.expedidor_id {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pessoas WHERE id = ?1",
                params![eid],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if count > 0 {
            Some(eid.clone())
        } else {
            None
        }
    } else {
        None
    };

    let recebedor_id_val = if let Some(ref rid) = input.recebedor_id {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pessoas WHERE id = ?1",
                params![rid],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if count > 0 {
            Some(rid.clone())
        } else {
            None
        }
    } else {
        None
    };

    let tomador_id_val = if let Some(ref tid) = input.tomador_id {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pessoas WHERE id = ?1",
                params![tid],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if count > 0 {
            Some(tid.clone())
        } else {
            None
        }
    } else {
        None
    };

    // Obter próximo número do CT-e se não informado
    let numero_cte: i32 = match input.numero_cte {
        Some(num) => num,
        None => {
            conn.query_row(
                "SELECT COALESCE(MAX(numero_cte), 0) + 1 FROM cte_documentos WHERE filial_id = ?1 AND serie = ?2",
                params![input.filial_id, serie],
                |row| row.get(0),
            ).unwrap_or(1)
        }
    };

    let cfop = input.cfop.unwrap_or_else(|| {
        if input.uf_inicio.to_uppercase() != input.uf_fim.to_uppercase() {
            "6353".into()
        } else {
            "5353".into()
        }
    });

    let data_emissao = input.data_emissao.unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());
    let hora_emissao = input.hora_emissao.unwrap_or_else(|| Utc::now().format("%H:%M:%S").to_string());
    let crt = input.crt_emitente.unwrap_or(1);
    let ambiente = input.ambiente.unwrap_or(2);

    // Gerar chave de acesso simulada se não existir
    let chave_acesso = format!(
        "502608{:0>14}57{:03}{:09}1{:08}",
        "00000000000000",
        serie,
        numero_cte,
        (numero_cte * 7) % 99999999
    );
    let chave_completa = format!("{}{}", chave_acesso, calcular_modulo_11(&chave_acesso));

    conn.execute(
        "INSERT INTO cte_documentos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, numero_cte, serie, chave_acesso, cfop, natureza_operacao, tipo_cte,
            tipo_servico, modal, data_emissao, hora_emissao, uf_inicio, municipio_inicio,
            cod_ibge_inicio, uf_fim, municipio_fim, cod_ibge_fim, remetente_id, destinatario_id,
            expedidor_id, recebedor_id, tomador_tipo, tomador_id, veiculo_id, motorista_id,
            rntrc, valor_total_prestacao, valor_receber, valor_carga, produto_predominante,
            peso_bruto_carga_kg, icms_cst, icms_base_calculo, icms_aliquota, icms_valor,
            icms_reducao_bc, crt_emitente, info_complementar, ambiente, status_sefaz
        ) VALUES (
            ?1, ?2, ?3, ?3, 'pending', 1, 0,
            ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16,
            ?17, ?18, ?19, ?20, ?21, ?22,
            ?23, ?24, ?25, ?26, ?27, ?28,
            ?29, ?30, ?31, ?32, ?33,
            ?34, ?35, ?36, ?37, ?38,
            ?39, ?40, ?41, ?42, 'AUTORIZADO'
        )
        ON CONFLICT(id) DO UPDATE SET
            updated_at = ?3,
            x_sync_status = 'pending',
            x_version = x_version + 1,
            valor_total_prestacao = ?30,
            valor_receber = ?31,
            valor_carga = ?32,
            peso_bruto_carga_kg = ?34,
            icms_cst = ?35,
            icms_base_calculo = ?36,
            icms_aliquota = ?37,
            icms_valor = ?38",
        params![
            id,
            device_id,
            now,
            input.filial_id,
            numero_cte,
            serie,
            chave_completa,
            cfop,
            input.natureza_operacao.unwrap_or_else(|| "PRESTACAO DE SERVICO DE TRANSPORTE".into()),
            input.tipo_cte.unwrap_or(0),
            input.tipo_servico.unwrap_or(0),
            input.modal.unwrap_or_else(|| "01".into()),
            data_emissao,
            hora_emissao,
            input.uf_inicio.to_uppercase(),
            input.municipio_inicio.to_uppercase(),
            input.cod_ibge_inicio,
            input.uf_fim.to_uppercase(),
            input.municipio_fim.to_uppercase(),
            input.cod_ibge_fim,
            remetente_id,
            destinatario_id,
            expedidor_id_val,
            recebedor_id_val,
            input.tomador_tipo.unwrap_or(3),
            tomador_id_val,
            veiculo_id_val,
            motorista_id_val,
            input.rntrc,
            input.valor_total_prestacao,
            input.valor_receber,
            input.valor_carga,
            input.produto_predominante.unwrap_or_else(|| "MERCADORIAS DIVERSAS".into()),
            input.peso_bruto_carga_kg,
            input.icms_cst.unwrap_or_else(|| "00".into()),
            input.icms_base_calculo.unwrap_or(0.0),
            input.icms_aliquota.unwrap_or(0.0),
            input.icms_valor.unwrap_or(0.0),
            input.icms_reducao_bc.unwrap_or(0.0),
            crt,
            input.info_complementar,
            ambiente,
        ],
    )?;

    // Salvar NF-es vinculadas
    if let Some(nfes) = input.nfes_vinculadas {
        conn.execute("DELETE FROM cte_documentos_nfe WHERE cte_id = ?1", params![id])?;
        for nfe in nfes {
            let nfe_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO cte_documentos_nfe (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, cte_id, chave_nfe, pin_suframa, data_prevista_entrega)
                 VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7)",
                params![nfe_id, device_id, now, id, nfe.chave_nfe, nfe.pin_suframa, nfe.data_prevista_entrega],
            )?;
        }
    }

    // Salvar Componentes de valor
    if let Some(comps) = input.componentes {
        conn.execute("DELETE FROM cte_componentes_valor WHERE cte_id = ?1", params![id])?;
        for comp in comps {
            let comp_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO cte_componentes_valor (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, cte_id, nome, valor)
                 VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6)",
                params![comp_id, device_id, now, id, comp.nome, comp.valor],
            )?;
        }
    }

    get_cte_por_id(conn, &id)
}

pub fn get_cte_por_id(conn: &Connection, id: &str) -> Result<CteItem> {
    let mut cte = conn.query_row(
        "SELECT c.id, c.filial_id, c.numero_cte, c.serie, c.chave_acesso, c.cfop, c.natureza_operacao,
                c.tipo_cte, c.tipo_servico, c.modal, c.data_emissao, c.hora_emissao, c.uf_inicio,
                c.municipio_inicio, c.cod_ibge_inicio, c.uf_fim, c.municipio_fim, c.cod_ibge_fim,
                c.remetente_id, r.nome_razaosocial, c.destinatario_id, d.nome_razaosocial,
                c.tomador_tipo, c.tomador_id, t.nome_razaosocial,
                c.veiculo_id, v.placa, c.motorista_id, m.nome, c.rntrc,
                c.valor_total_prestacao, c.valor_receber, c.valor_carga, c.produto_predominante,
                c.peso_bruto_carga_kg, c.icms_cst, c.icms_base_calculo, c.icms_aliquota,
                c.icms_valor, c.icms_reducao_bc, c.crt_emitente, c.info_complementar,
                c.ambiente, c.status_sefaz, c.mensagem_sefaz, c.protocolo_autorizacao,
                c.data_autorizacao, c.xml_envio, c.xml_retorno, c.dacte_pdf_path,
                (SELECT COUNT(*) FROM cte_documentos_nfe WHERE cte_id = c.id AND is_deleted = 0) as total_nfes,
                c.created_at, c.updated_at
         FROM cte_documentos c
         LEFT JOIN pessoas r ON c.remetente_id = r.id
         LEFT JOIN pessoas d ON c.destinatario_id = d.id
         LEFT JOIN pessoas t ON c.tomador_id = t.id
         LEFT JOIN veiculos v ON c.veiculo_id = v.id
         LEFT JOIN motoristas m ON c.motorista_id = m.id
         WHERE c.id = ?1 AND c.is_deleted = 0",
        params![id],
        |row| {
            Ok(CteItem {
                id: row.get(0)?,
                filial_id: row.get(1)?,
                numero_cte: row.get(2)?,
                serie: row.get(3)?,
                chave_acesso: row.get(4)?,
                cfop: row.get(5)?,
                natureza_operacao: row.get(6)?,
                tipo_cte: row.get(7)?,
                tipo_servico: row.get(8)?,
                modal: row.get(9)?,
                data_emissao: row.get(10)?,
                hora_emissao: row.get(11)?,
                uf_inicio: row.get(12)?,
                municipio_inicio: row.get(13)?,
                cod_ibge_inicio: row.get(14)?,
                uf_fim: row.get(15)?,
                municipio_fim: row.get(16)?,
                cod_ibge_fim: row.get(17)?,
                remetente_id: row.get(18)?,
                remetente_nome: row.get(19)?,
                destinatario_id: row.get(20)?,
                destinatario_nome: row.get(21)?,
                tomador_tipo: row.get(22)?,
                tomador_id: row.get(23)?,
                tomador_nome: row.get(24)?,
                veiculo_id: row.get(25)?,
                veiculo_placa: row.get(26)?,
                motorista_id: row.get(27)?,
                motorista_nome: row.get(28)?,
                rntrc: row.get(29)?,
                valor_total_prestacao: row.get(30)?,
                valor_receber: row.get(31)?,
                valor_carga: row.get(32)?,
                produto_predominante: row.get(33)?,
                peso_bruto_carga_kg: row.get(34)?,
                icms_cst: row.get(35)?,
                icms_base_calculo: row.get(36)?,
                icms_aliquota: row.get(37)?,
                icms_valor: row.get(38)?,
                icms_reducao_bc: row.get(39)?,
                crt_emitente: row.get(40)?,
                info_complementar: row.get(41)?,
                ambiente: row.get(42)?,
                status_sefaz: row.get(43)?,
                mensagem_sefaz: row.get(44)?,
                protocolo_autorizacao: row.get(45)?,
                data_autorizacao: row.get(46)?,
                xml_envio: row.get(47)?,
                xml_retorno: row.get(48)?,
                dacte_pdf_path: row.get(49)?,
                total_nfes: row.get(50)?,
                chaves_nfes: Vec::new(),
                componentes: Vec::new(),
                created_at: row.get(51)?,
                updated_at: row.get(52)?,
            })
        },
    )?;

    // Buscar chaves de NF-es
    let mut stmt_nfes = conn.prepare("SELECT chave_nfe FROM cte_documentos_nfe WHERE cte_id = ?1 AND is_deleted = 0")?;
    let nfes_iter = stmt_nfes.query_map(params![id], |row| row.get(0))?;
    for nfe in nfes_iter {
        cte.chaves_nfes.push(nfe?);
    }

    // Buscar componentes
    let mut stmt_comp = conn.prepare("SELECT nome, valor FROM cte_componentes_valor WHERE cte_id = ?1 AND is_deleted = 0")?;
    let comp_iter = stmt_comp.query_map(params![id], |row| {
        Ok(CteComponenteInput {
            nome: row.get(0)?,
            valor: row.get(1)?,
        })
    })?;
    for comp in comp_iter {
        cte.componentes.push(comp?);
    }

    Ok(cte)
}

pub fn listar_ctes(conn: &Connection, filial_id: &str) -> Result<Vec<CteItem>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.filial_id, c.numero_cte, c.serie, c.chave_acesso, c.cfop, c.natureza_operacao,
                c.tipo_cte, c.tipo_servico, c.modal, c.data_emissao, c.hora_emissao, c.uf_inicio,
                c.municipio_inicio, c.cod_ibge_inicio, c.uf_fim, c.municipio_fim, c.cod_ibge_fim,
                c.remetente_id, r.nome_razaosocial, c.destinatario_id, d.nome_razaosocial,
                c.tomador_tipo, c.tomador_id, t.nome_razaosocial,
                c.veiculo_id, v.placa, c.motorista_id, m.nome, c.rntrc,
                c.valor_total_prestacao, c.valor_receber, c.valor_carga, c.produto_predominante,
                c.peso_bruto_carga_kg, c.icms_cst, c.icms_base_calculo, c.icms_aliquota,
                c.icms_valor, c.icms_reducao_bc, c.crt_emitente, c.info_complementar,
                c.ambiente, c.status_sefaz, c.mensagem_sefaz, c.protocolo_autorizacao,
                c.data_autorizacao, c.xml_envio, c.xml_retorno, c.dacte_pdf_path,
                (SELECT COUNT(*) FROM cte_documentos_nfe WHERE cte_id = c.id AND is_deleted = 0) as total_nfes,
                c.created_at, c.updated_at
         FROM cte_documentos c
         LEFT JOIN pessoas r ON c.remetente_id = r.id
         LEFT JOIN pessoas d ON c.destinatario_id = d.id
         LEFT JOIN pessoas t ON c.tomador_id = t.id
         LEFT JOIN veiculos v ON c.veiculo_id = v.id
         LEFT JOIN motoristas m ON c.motorista_id = m.id
         WHERE c.filial_id = ?1 AND c.is_deleted = 0
         ORDER BY c.numero_cte DESC",
    )?;

    let iter = stmt.query_map(params![filial_id], |row| {
        Ok(CteItem {
            id: row.get(0)?,
            filial_id: row.get(1)?,
            numero_cte: row.get(2)?,
            serie: row.get(3)?,
            chave_acesso: row.get(4)?,
            cfop: row.get(5)?,
            natureza_operacao: row.get(6)?,
            tipo_cte: row.get(7)?,
            tipo_servico: row.get(8)?,
            modal: row.get(9)?,
            data_emissao: row.get(10)?,
            hora_emissao: row.get(11)?,
            uf_inicio: row.get(12)?,
            municipio_inicio: row.get(13)?,
            cod_ibge_inicio: row.get(14)?,
            uf_fim: row.get(15)?,
            municipio_fim: row.get(16)?,
            cod_ibge_fim: row.get(17)?,
            remetente_id: row.get(18)?,
            remetente_nome: row.get(19)?,
            destinatario_id: row.get(20)?,
            destinatario_nome: row.get(21)?,
            tomador_tipo: row.get(22)?,
            tomador_id: row.get(23)?,
            tomador_nome: row.get(24)?,
            veiculo_id: row.get(25)?,
            veiculo_placa: row.get(26)?,
            motorista_id: row.get(27)?,
            motorista_nome: row.get(28)?,
            rntrc: row.get(29)?,
            valor_total_prestacao: row.get(30)?,
            valor_receber: row.get(31)?,
            valor_carga: row.get(32)?,
            produto_predominante: row.get(33)?,
            peso_bruto_carga_kg: row.get(34)?,
            icms_cst: row.get(35)?,
            icms_base_calculo: row.get(36)?,
            icms_aliquota: row.get(37)?,
            icms_valor: row.get(38)?,
            icms_reducao_bc: row.get(39)?,
            crt_emitente: row.get(40)?,
            info_complementar: row.get(41)?,
            ambiente: row.get(42)?,
            status_sefaz: row.get(43)?,
            mensagem_sefaz: row.get(44)?,
            protocolo_autorizacao: row.get(45)?,
            data_autorizacao: row.get(46)?,
            xml_envio: row.get(47)?,
            xml_retorno: row.get(48)?,
            dacte_pdf_path: row.get(49)?,
            total_nfes: row.get(50)?,
            chaves_nfes: Vec::new(),
            componentes: Vec::new(),
            created_at: row.get(51)?,
            updated_at: row.get(52)?,
        })
    })?;

    iter.collect()
}

pub fn cancelar_cte(conn: &Connection, id: &str, justificativa: &str, device_id: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let evento_id = Uuid::new_v4().to_string();
    let protocolo = format!("15026000{}", Utc::now().timestamp() % 10000000);

    conn.execute(
        "UPDATE cte_documentos SET
            status_sefaz = 'CANCELADO',
            mensagem_sefaz = '135 - Evento homologado (Cancelamento de CT-e)',
            updated_at = ?1,
            x_sync_status = 'pending',
            x_version = x_version + 1
         WHERE id = ?2",
        params![now, id],
    )?;

    conn.execute(
        "INSERT INTO cte_eventos (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, cte_id, tipo_evento, sequencia, data_evento, protocolo, justificativa, status_retorno)
         VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, 'CANCELAMENTO', 1, ?3, ?5, ?6, 135)",
        params![evento_id, device_id, now, id, protocolo, justificativa],
    )?;

    Ok(())
}
