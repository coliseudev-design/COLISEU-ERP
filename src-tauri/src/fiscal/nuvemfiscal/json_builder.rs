//! Construtor de Payload JSON para Emissão de NF-e na Nuvem Fiscal

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NuvemFiscalItem {
    pub codigo: String,
    pub descricao: String,
    pub ncm: String,
    pub cfop: String,
    pub unidade: String,
    pub quantidade: f64,
    pub valor_unitario: f64,
    pub valor_total: f64,
    pub valor_desconto: Option<f64>,
    pub cst_csosn: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NuvemFiscalPagamento {
    pub meio_pagamento: String, // 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito, 17=PIX, 99=Outros
    pub valor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NuvemFiscalNfePayload {
    pub ambiente: String, // "homologacao" ou "producao"
    pub modelo: u32,       // 55 ou 65
    pub serie: u32,
    pub numero: u32,
    pub natureza_operacao: String,

    pub emitente_cnpj: String,
    pub emitente_razao: String,
    pub emitente_uf: String,

    pub dest_cpf_cnpj: Option<String>,
    pub dest_nome: Option<String>,
    pub dest_uf: Option<String>,
    pub dest_cidade: Option<String>,
    pub dest_logradouro: Option<String>,
    pub dest_numero: Option<String>,
    pub dest_bairro: Option<String>,
    pub dest_cep: Option<String>,

    pub itens: Vec<NuvemFiscalItem>,
    pub pagamentos: Vec<NuvemFiscalPagamento>,

    pub valor_total_produtos: f64,
    pub valor_total_nota: f64,
    pub valor_desconto: Option<f64>,
    pub informacoes_adicionais: Option<String>,
}

pub fn gerar_payload_nuvemfiscal(dados: &NuvemFiscalNfePayload) -> serde_json::Value {
    let clean_cnpj = dados.emitente_cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_dest_doc = dados.dest_cpf_cnpj.as_ref().map(|d| d.chars().filter(|c| c.is_ascii_digit()).collect::<String>());

    let itens_json: Vec<serde_json::Value> = dados.itens.iter().enumerate().map(|(i, it)| {
        serde_json::json!({
            "numero_item": i + 1,
            "codigo_produto": it.codigo,
            "descricao": it.descricao,
            "codigo_ncm": it.ncm.chars().filter(|c| c.is_ascii_digit()).collect::<String>(),
            "cfop": it.cfop.chars().filter(|c| c.is_ascii_digit()).collect::<String>(),
            "unidade_comercial": it.unidade,
            "quantidade_comercial": it.quantidade,
            "valor_unitario_comercial": it.valor_unitario,
            "valor_bruto": it.valor_total,
            "unidade_tributavel": it.unidade,
            "quantidade_tributavel": it.quantidade,
            "valor_unitario_tributavel": it.valor_unitario,
            "impostos": {
                "icms": {
                    "SimplesNacional": {
                        "CSOSN": it.cst_csosn.as_deref().unwrap_or("102"),
                        "Origem": 0
                    }
                }
            }
        })
    }).collect();

    let pag_json: Vec<serde_json::Value> = dados.pagamentos.iter().map(|p| {
        serde_json::json!({
            "meio_pagamento": p.meio_pagamento,
            "valor": p.valor
        })
    }).collect();

    serde_json::json!({
        "ambiente": if dados.ambiente.to_lowercase().contains("prod") { "producao" } else { "homologacao" },
        "infNFe": {
            "ide": {
                "cUF": match dados.emitente_uf.to_uppercase().as_str() {
                    "MS" => 50,
                    "SP" => 35,
                    "PR" => 41,
                    _ => 50
                },
                "natOp": dados.natureza_operacao,
                "mod": dados.modelo,
                "serie": dados.serie,
                "nNF": dados.numero,
                "tpNF": 1,
                "idDest": 1,
                "tpImp": if dados.modelo == 65 { 4 } else { 1 },
                "tpEmis": 1,
                "tpAmb": if dados.ambiente.to_lowercase().contains("prod") { 1 } else { 2 },
                "finNFe": 1,
                "indFinal": 1,
                "indPres": 1,
                "procEmi": 0,
                "verProc": "ColiseuERP_4.0"
            },
            "emit": {
                "CNPJ": clean_cnpj,
                "xNome": dados.emitente_razao
            },
            "dest": if let Some(ref doc) = clean_dest_doc {
                if doc.len() > 11 {
                    serde_json::json!({
                        "CNPJ": doc,
                        "xNome": dados.dest_nome.as_deref().unwrap_or("CLIENTE DIVERSOS"),
                        "indIEDest": 9
                    })
                } else {
                    serde_json::json!({
                        "CPF": doc,
                        "xNome": dados.dest_nome.as_deref().unwrap_or("CONSUMIDOR FINAL"),
                        "indIEDest": 9
                    })
                }
            } else {
                serde_json::json!({
                    "xNome": "CONSUMIDOR NAO IDENTIFICADO",
                    "indIEDest": 9
                })
            },
            "det": itens_json,
            "total": {
                "ICMSTot": {
                    "vProd": dados.valor_total_produtos,
                    "vNF": dados.valor_total_nota,
                    "vDesc": dados.valor_desconto.unwrap_or(0.0)
                }
            },
            "pag": {
                "detPag": pag_json
            },
            "infAdic": {
                "infCpl": dados.informacoes_adicionais.as_deref().unwrap_or("Documento emitido por ME ou EPP optante pelo Simples Nacional.")
            }
        }
    })
}
