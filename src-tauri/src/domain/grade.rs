//! Módulo de Gestão de Grades de Produtos (Tamanho × Cor)
//!
//! Permite criar moldes de grade (ex: Calçados 33 a 44, Roupas PP a GG)
//! e explodir produtos-pai em SKU-filhos (variantes).

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProdutoGrade {
    pub id: String,
    pub empresa_id: String,
    pub nome: String,
    pub eixo1_nome: String, // Ex: "Tamanho"
    pub eixo2_nome: Option<String>, // Ex: "Cor"
    pub eixos: Vec<ProdutoGradeEixo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProdutoGradeEixo {
    pub id: String,
    pub grade_id: String,
    pub tipo_eixo: i32, // 1 = Tamanho/Eixo 1, 2 = Cor/Eixo 2
    pub valor: String, // Ex: "38", "Preto"
    pub ordem: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProdutoVariante {
    pub id: String,
    pub produto_pai_id: String,
    pub codigo_sku: String,
    pub codigo_barras: Option<String>,
    pub tamanho: Option<String>,
    pub cor: Option<String>,
    pub preco_venda: Option<f64>,
    pub ativo: i64,
}

/// Cria uma nova grade dimensional com eixos
pub fn criar_grade(
    conn: &Connection,
    device_id: &str,
    empresa_id: &str,
    nome: &str,
    eixo1_nome: &str,
    eixo2_nome: Option<&str>,
    eixos_tamanho: Vec<String>,
    eixos_cor: Vec<String>,
) -> Result<String, String> {
    let now = Utc::now().to_rfc3339();
    let grade_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO produtos_grades (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, nome, eixo1_nome, eixo2_nome
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7)",
        params![grade_id, device_id, now, empresa_id, nome, eixo1_nome, eixo2_nome],
    )
    .map_err(|e| format!("Erro ao criar grade: {}", e))?;

    // Insere Eixos do Tamanho (tipo 1)
    for (idx, tam) in eixos_tamanho.iter().enumerate() {
        conn.execute(
            "INSERT INTO produtos_grades_eixos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                grade_id, tipo_eixo, valor, ordem
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, 1, ?5, ?6)",
            params![Uuid::new_v4().to_string(), device_id, now, grade_id, tam, idx as i32],
        )
        .map_err(|e| e.to_string())?;
    }

    // Insere Eixos da Cor (tipo 2)
    for (idx, cor) in eixos_cor.iter().enumerate() {
        conn.execute(
            "INSERT INTO produtos_grades_eixos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                grade_id, tipo_eixo, valor, ordem
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, 2, ?5, ?6)",
            params![Uuid::new_v4().to_string(), device_id, now, grade_id, cor, idx as i32],
        )
        .map_err(|e| e.to_string())?;
    }

    info!("Grade '{}' criada com sucesso. ID: {}", nome, grade_id);
    Ok(grade_id)
}

/// Lista todas as grades cadastradas para a empresa
pub fn listar_grades(conn: &Connection, empresa_id: &str) -> Result<Vec<ProdutoGrade>, String> {
    let mut stmt = conn
        .prepare("SELECT id, empresa_id, nome, eixo1_nome, eixo2_nome FROM produtos_grades WHERE empresa_id = ?1 AND is_deleted = 0 ORDER BY nome ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([empresa_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, Option<String>>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        let (id, emp_id, nome, e1, e2) = r.map_err(|e| e.to_string())?;
        let eixos = carregar_eixos_grade(conn, &id)?;
        result.push(ProdutoGrade {
            id,
            empresa_id: emp_id,
            nome,
            eixo1_nome: e1,
            eixo2_nome: e2,
            eixos,
        });
    }
    Ok(result)
}

fn carregar_eixos_grade(conn: &Connection, grade_id: &str) -> Result<Vec<ProdutoGradeEixo>, String> {
    let mut stmt = conn
        .prepare("SELECT id, grade_id, tipo_eixo, valor, ordem FROM produtos_grades_eixos WHERE grade_id = ?1 ORDER BY tipo_eixo ASC, ordem ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([grade_id], |r| {
            Ok(ProdutoGradeEixo {
                id: r.get(0)?,
                grade_id: r.get(1)?,
                tipo_eixo: r.get(2)?,
                valor: r.get(3)?,
                ordem: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

/// Explode um produto-pai em SKUs variantes de acordo com a grade associada
pub fn gerar_variantes_produto_pai(
    conn: &Connection,
    device_id: &str,
    produto_pai_id: &str,
    grade_id: &str,
) -> Result<Vec<ProdutoVariante>, String> {
    let now = Utc::now().to_rfc3339();
    let sku_pai: String = conn
        .query_row("SELECT codigo_sku FROM produtos WHERE id = ?1", params![produto_pai_id], |r| r.get(0))
        .map_err(|_| "Produto pai não encontrado".to_string())?;

    let eixos = carregar_eixos_grade(conn, grade_id)?;
    let tamanhos: Vec<&str> = eixos.iter().filter(|e| e.tipo_eixo == 1).map(|e| e.valor.as_str()).collect();
    let cores: Vec<&str> = eixos.iter().filter(|e| e.tipo_eixo == 2).map(|e| e.valor.as_str()).collect();

    let mut gerados = Vec::new();

    let cores_list = if cores.is_empty() { vec![""] } else { cores };

    for tam in &tamanhos {
        for cor in &cores_list {
            let var_id = Uuid::new_v4().to_string();
            let sub_sku = if cor.is_empty() {
                format!("{}-{}", sku_pai, tam)
            } else {
                format!("{}-{}-{}", sku_pai, tam, cor.to_uppercase().replace(' ', ""))
            };

            let cor_opt = if cor.is_empty() { None } else { Some(cor.to_string()) };

            conn.execute(
                "INSERT INTO produtos_variantes (
                    id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                    produto_pai_id, codigo_sku, tamanho, cor, ativo
                ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, 1)
                ON CONFLICT(codigo_sku) DO NOTHING",
                params![var_id, device_id, now, produto_pai_id, sub_sku, tam, cor_opt],
            )
            .map_err(|e| e.to_string())?;

            gerados.push(ProdutoVariante {
                id: var_id,
                produto_pai_id: produto_pai_id.to_string(),
                codigo_sku: sub_sku,
                codigo_barras: None,
                tamanho: Some(tam.to_string()),
                cor: cor_opt,
                preco_venda: None,
                ativo: 1,
            });
        }
    }

    info!("Geradas {} variantes para o produto pai {}", gerados.len(), sku_pai);
    Ok(gerados)
}

/// Lista todas as variantes de um produto pai
pub fn listar_variantes_produto(
    conn: &Connection,
    produto_pai_id: &str,
) -> Result<Vec<ProdutoVariante>, String> {
    let mut stmt = conn
        .prepare("SELECT id, produto_pai_id, codigo_sku, codigo_barras, tamanho, cor, preco_venda, ativo FROM produtos_variantes WHERE produto_pai_id = ?1 AND is_deleted = 0 ORDER BY codigo_sku ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([produto_pai_id], |r| {
            Ok(ProdutoVariante {
                id: r.get(0)?,
                produto_pai_id: r.get(1)?,
                codigo_sku: r.get(2)?,
                codigo_barras: r.get(3)?,
                tamanho: r.get(4)?,
                cor: r.get(5)?,
                preco_venda: r.get(6)?,
                ativo: r.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}
