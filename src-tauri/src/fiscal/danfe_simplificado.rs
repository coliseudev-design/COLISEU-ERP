use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DanfeItemSimplificado {
    pub codigo: String,
    pub descricao: String,
    pub quantidade: f64,
    pub unidade: String,
    pub valor_unitario: f64,
    pub valor_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FormaPagamentoDanfe {
    pub descricao: String,
    pub valor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DanfeSimplificadoTipo2Data {
    // Divisão I - Cabeçalho
    pub emitente_cnpj_cpf: String,
    pub emitente_razao_social: String,
    pub emitente_endereco: String,
    
    // Divisão II - Detalhes dos Produtos
    pub itens: Vec<DanfeItemSimplificado>,
    
    // Divisão III - Totais
    pub qtd_total_itens: usize,
    pub valor_total_produtos: f64,
    pub valor_frete: f64,
    pub valor_desconto: f64,
    pub valor_outros: f64,
    pub valor_a_pagar: f64,
    pub formas_pagamento: Vec<FormaPagamentoDanfe>,
    pub valor_troco: f64,
    
    // Divisão III-A - Novos Tributos (Reforma Tributária LC 214/2025)
    pub valor_cbs: f64,
    pub valor_ibs_uf: f64,
    pub valor_ibs_mun: f64,
    pub valor_is: f64,
    
    // Divisão IV - Consulta via Chave
    pub chave_acesso: String,
    pub url_consulta_chave: String,
    
    // Divisão V - QR Code
    pub url_qrcode: String,
    
    // Divisão VI - Consumidor
    pub consumidor_cnpj_cpf: Option<String>,
    pub consumidor_nome: Option<String>,
    pub consumidor_endereco: Option<String>,
    
    // Divisão VII - Identificação e Protocolo
    pub numero_nfe: u32,
    pub serie_nfe: String,
    pub dh_emissao_local: String,
    pub protocolo_autorizacao: Option<String>,
    pub dh_autorizacao_local: Option<String>,
    
    // Divisão VIII - Mensagem Fiscal & Contingência
    pub tp_emis: u8, // 1=Normal, 9=Contingência Offline
    pub tp_amb: u8,  // 1=Produção, 2=Homologação
    pub inf_ad_fisco: Option<String>,
    
    // Divisão IX - Mensagem do Contribuinte & Lei 12.741/2012
    pub inf_cpl: Option<String>,
    pub valor_tributos_lei_12741: f64,
    
    // Flag de via
    pub eh_segunda_via_estabelecimento: bool,
}

impl DanfeSimplificadoTipo2Data {
    pub fn chave_acesso_formatada(&self) -> String {
        let clean: String = self.chave_acesso.chars().filter(|c| c.is_ascii_digit()).collect();
        if clean.len() == 44 {
            let chunks: Vec<String> = clean
                .as_bytes()
                .chunks(4)
                .map(|chunk| std::str::from_utf8(chunk).unwrap_or("").to_string())
                .collect();
            chunks.join(" ")
        } else {
            self.chave_acesso.clone()
        }
    }
}
