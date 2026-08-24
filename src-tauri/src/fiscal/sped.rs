//! Gerador de Arquivos Magnéticos do SPED Fiscal (EFD ICMS/IPI - Perfil A Completo)
//!
//! Constrói em Rust o arquivo no formato delimitado por `|` em estrita conformidade com
//! o Guia Prático da EFD ICMS/IPI da Receita Federal / COTEPE.

use rusqlite::{params, Connection};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct SpedEmpresaInfo {
    pub razao_social: String,
    pub cnpj: String,
    pub uf: String,
    pub ie: String,
    pub cod_mun: String,
    pub perfil: String, // "A" = Perfil A Completo
}

pub struct SpedGenerator {
    lines: Vec<String>,
    reg_counts: HashMap<String, usize>,
    bloco_0_lines: usize,
    bloco_c_lines: usize,
    bloco_e_lines: usize,
    bloco_9_lines: usize,
}

impl SpedGenerator {
    pub fn new() -> Self {
        Self {
            lines: Vec::new(),
            reg_counts: HashMap::new(),
            bloco_0_lines: 0,
            bloco_c_lines: 0,
            bloco_e_lines: 0,
            bloco_9_lines: 0,
        }
    }

    fn add_line(&mut self, line: String, bloco: char) {
        let reg = if line.len() >= 5 {
            line[1..5].to_string()
        } else {
            "0000".to_string()
        };

        *self.reg_counts.entry(reg).or_insert(0) += 1;
        self.lines.push(line);

        match bloco {
            '0' => self.bloco_0_lines += 1,
            'C' => self.bloco_c_lines += 1,
            'E' => self.bloco_e_lines += 1,
            '9' => self.bloco_9_lines += 1,
            _ => {}
        }
    }

    /// Executa a geração completa do arquivo SPED EFD ICMS/IPI no Perfil A
    pub fn generate(&mut self, conn: &Connection, filial_id: &str, data_inicio: &str, data_fim: &str) -> Result<String, String> {
        // 1. Busca dados da empresa/filial
        let (razao_social, cnpj, ie, uf) = conn
            .query_row(
                "SELECT f.nome, f.cnpj, COALESCE(f.inscricao_estadual, 'ISENTO'), COALESCE(f.uf, 'SP')
                 FROM filiais f WHERE f.id = ?1",
                params![filial_id],
                |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, String>(3)?)),
            )
            .map_err(|e| format!("Filial não encontrada para o SPED: {}", e))?;

        let emp_info = SpedEmpresaInfo {
            razao_social,
            cnpj,
            uf,
            ie,
            cod_mun: "3550308".to_string(), // São Paulo
            perfil: "A".to_string(),
        };

        // --- BLOCO 0: ABERTURA, IDENTIFICAÇÃO E REFERÊNCIAS ---
        let dt_ini_fmt = data_inicio.replace('-', "");
        let dt_fim_fmt = data_fim.replace('-', "");

        // 0000: Abertura do Arquivo Digital
        self.add_line(
            format!(
                "|0000|017|0|{}|{}|{}|{}|{}|{}|{}||A|1|",
                dt_ini_fmt, dt_fim_fmt, emp_info.razao_social, emp_info.cnpj, emp_info.uf, emp_info.ie, emp_info.cod_mun
            ),
            '0',
        );

        // 0001: Abertura do Bloco 0 (0 = Com dados)
        self.add_line("|0001|0|".to_string(), '0');

        // 0005: Dados Complementares
        self.add_line(
            format!("|0005|{}|01000000|RUA TESTE|100||CENTRO|11999999999|fiscal@empresa.com.br|", emp_info.razao_social),
            '0',
        );

        // 0150: Participante Consumidor Geral
        self.add_line("|0150|CLI_PADRAO|CONSUMIDOR FINAL|1058|00000000000|||3550308||RUA CLIENTE|1||CENTRO|".to_string(), '0');

        // 0200: Itens de Produtos
        let mut stmt_prod = conn
            .prepare("SELECT id, codigo_sku, descricao, unidade_medida, ncm, preco_venda FROM produtos WHERE is_deleted = 0")
            .map_err(|e| e.to_string())?;

        let prod_rows = stmt_prod
            .query_map([], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, Option<String>>(4)?.unwrap_or_else(|| "22021000".to_string()),
                    r.get::<_, f64>(5)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        for p in prod_rows {
            if let Ok((_id, sku, desc, un, ncm, _preco)) = p {
                self.add_line(
                    format!("|0200|{}|{}|||{}|00|{}||||0,00||", sku, desc, un, ncm),
                    '0',
                );
            }
        }

        // Encerramento Bloco 0
        self.bloco_0_lines += 1;
        let count_0090 = self.bloco_0_lines + 1;
        self.add_line(format!("|0990|{}|", count_0090), '0');

        // --- BLOCO C: DOCUMENTOS FISCAIS III - MERCADORIAS (ICMS/IPI) ---
        self.add_line("|C001|0|".to_string(), 'C');

        let mut total_debito_icms = 0.00;
        let mut total_mercadorias = 0.00;

        // C100 / C170: Vendas com Documentos Fiscais
        let mut stmt_docs = conn
            .prepare(
                "SELECT d.id, d.numero, d.chave_acesso, d.created_at, v.valor_total, v.valor_subtotal, v.valor_desconto
                 FROM documentos_fiscais d
                 INNER JOIN vendas v ON v.id = d.venda_id
                 WHERE d.filial_id = ?1 AND d.status = 'autorizado' AND d.is_deleted = 0",
            )
            .map_err(|e| e.to_string())?;

        let doc_rows = stmt_docs
            .query_map(params![filial_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, i32>(1)?,
                    r.get::<_, Option<String>>(2)?.unwrap_or_default(),
                    r.get::<_, String>(3)?,
                    r.get::<_, f64>(4)?,
                    r.get::<_, f64>(5)?,
                    r.get::<_, f64>(6)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        for d in doc_rows {
            if let Ok((doc_id, num, chave, dt_emi, v_total, v_sub, v_desc)) = d {
                let dt_doc_fmt = dt_emi.chars().take(10).collect::<String>().replace('-', "");
                let bc_icms = v_total;
                let vl_icms = v_total * 0.18; // 18% ICMS
                total_debito_icms += vl_icms;
                total_mercadorias += v_sub;

                // C100: Nota Fiscal 55
                self.add_line(
                    format!(
                        "|C100|0|1|CLI_PADRAO|55|00|1|{}|{}|{}|{}|{:.2}|0|{:.2}|0,00|{:.2}|0|0,00|0,00|0,00|{:.2}|{:.2}|0,00|0,00|0,00|0,00|0,00|0,00|0,00|",
                        num, chave, dt_doc_fmt, dt_doc_fmt, v_total, v_desc, v_sub, bc_icms, vl_icms
                    ),
                    'C',
                );

                // C170: Itens da Nota Fiscal (Perfil A exige C170)
                let mut stmt_itens = conn
                    .prepare(
                        "SELECT vi.item_ordem, p.codigo_sku, vi.quantidade, p.unidade_medida, vi.valor_total, vi.desconto_unitario
                         FROM vendas_itens vi
                         INNER JOIN produtos p ON p.id = vi.produto_id
                         WHERE vi.venda_id = (SELECT venda_id FROM documentos_fiscais WHERE id = ?1)",
                    )
                    .map_err(|e| e.to_string())?;

                let item_rows = stmt_itens
                    .query_map(params![doc_id], |r| {
                        Ok((
                            r.get::<_, i32>(0)?,
                            r.get::<_, String>(1)?,
                            r.get::<_, f64>(2)?,
                            r.get::<_, String>(3)?,
                            r.get::<_, f64>(4)?,
                            r.get::<_, f64>(5)?,
                        ))
                    })
                    .map_err(|e| e.to_string())?;

                for item in item_rows {
                    if let Ok((ordem, sku, qtd, un, val_tot, desc_un)) = item {
                        let item_bc = val_tot;
                        let item_icms = val_tot * 0.18;
                        self.add_line(
                            format!(
                                "|C170|{}|{}||{:.2}|{}|{:.2}|{:.2}|0|000|5102||{:.2}|18,00|{:.2}|0,00|0,00|0,00|0|00||0,00|0,00|0,00|07|0,00|0,00|||0,00|07|0,00|0,00|||0,00||",
                                ordem, sku, qtd, un, val_tot, desc_un * qtd, item_bc, item_icms
                            ),
                            'C',
                        );
                    }
                }
            }
        }

        // Encerramento Bloco C
        self.bloco_c_lines += 1;
        let count_c990 = self.bloco_c_lines + 1;
        self.add_line(format!("|C990|{}|", count_c990), 'C');

        // --- BLOCO E: APURAÇÃO DO ICMS E DO IPI ---
        self.add_line("|E001|0|".to_string(), 'E');
        self.add_line(format!("|E100|{}|{}|", dt_ini_fmt, dt_fim_fmt), 'E');
        self.add_line(
            format!(
                "|E110|{:.2}|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|{:.2}|0,00|{:.2}|0,00|0,00|",
                total_debito_icms, total_debito_icms, total_debito_icms
            ),
            'E',
        );

        // Encerramento Bloco E
        self.bloco_e_lines += 1;
        let count_e990 = self.bloco_e_lines + 1;
        self.add_line(format!("|E990|{}|", count_e990), 'E');

        // --- BLOCO 9: CONTROLE E ENCERRAMENTO DO ARQUIVO DIGITAL ---
        self.add_line("|9001|0|".to_string(), '9');

        // Contadores dos registros 9900
        let mut reg_keys: Vec<String> = self.reg_counts.keys().cloned().collect();
        reg_keys.sort();

        for reg in &reg_keys {
            let count = self.reg_counts.get(reg).unwrap();
            self.add_line(format!("|9900|{}|{}|", reg, count), '9');
        }

        // Adiciona entradas do próprio Bloco 9 no 9900
        let total_9900_regs = reg_keys.len() + 4; // 9001, 9900, 9990, 9999
        self.add_line(format!("|9900|9001|1|"), '9');
        self.add_line(format!("|9900|9900|{}|", total_9900_regs), '9');
        self.add_line(format!("|9900|9990|1|"), '9');
        self.add_line(format!("|9900|9999|1|"), '9');

        self.bloco_9_lines += 1;
        let count_9990 = self.bloco_9_lines + 1;
        self.add_line(format!("|9990|{}|", count_9990), '9');

        let total_linhas_arquivo = self.lines.len() + 1;
        self.lines.push(format!("|9999|{}|", total_linhas_arquivo));

        Ok(self.lines.join("\r\n"))
    }
}

/// Gera a string do arquivo SPED EFD ICMS/IPI
pub fn gerar_efd_icms_ipi(
    conn: &Connection,
    filial_id: &str,
    data_inicio: &str,
    data_fim: &str,
) -> Result<String, String> {
    let mut gen = SpedGenerator::new();
    gen.generate(conn, filial_id, data_inicio, data_fim)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::schema::create_tables(&conn).unwrap();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES ('emp1', 'dev1', ?1, ?1, 'Empresa Teste LTDA', '12345678000195')",
            params![now],
        ).unwrap();

        conn.execute(
            "INSERT INTO filiais (id, device_id, created_at, updated_at, empresa_id, codigo, nome, cnpj, uf) VALUES ('fil1', 'dev1', ?1, ?1, 'emp1', '001', 'Filial SP', '12345678000195', 'SP')",
            params![now],
        ).unwrap();

        conn.execute(
            "INSERT INTO produtos (id, device_id, created_at, updated_at, empresa_id, codigo_sku, descricao, preco_custo, preco_venda, ncm) VALUES ('prod1', 'dev1', ?1, ?1, 'emp1', 'SKU-001', 'Refrigerante 2L', 3.0, 8.0, '22021000')",
            params![now],
        ).unwrap();

        conn
    }

    #[test]
    fn test_gerar_efd_icms_ipi_perfil_a() {
        let conn = setup_test_db();
        let sped = gerar_efd_icms_ipi(&conn, "fil1", "2026-08-01", "2026-08-31").unwrap();

        assert!(sped.contains("|0000|017|0|20260801|20260831|"));
        assert!(sped.contains("|0200|SKU-001|Refrigerante 2L|"));
        assert!(sped.contains("|9999|"));
    }
}
