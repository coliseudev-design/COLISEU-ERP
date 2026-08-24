//! Construtor de Arquivo INI Padrão ACBr para NF-e (Mod. 55) e NFC-e (Mod. 65)

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcbrItemNFe {
    pub codigo: String,
    pub ean: Option<String>,
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
pub struct AcbrPagamentoNFe {
    pub tipo_pagamento: String, // 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito, 17=PIX, 99=Outros
    pub valor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcbrDadosNFe {
    // Identificação
    pub modelo: u32,       // 55=NF-e, 65=NFC-e
    pub serie: u32,
    pub numero: u32,
    pub natureza_operacao: String,
    pub ambiente: u32,     // 1=Produção, 2=Homologação
    pub tipo_emissao: u32, // 1=Normal, 9=Contingência Offline

    // Emitente
    pub emitente_cnpj: String,
    pub emitente_razao: String,
    pub emitente_fantasia: Option<String>,
    pub emitente_ie: String,
    pub emitente_crt: u32, // 1=Simples Nacional, 3=Regime Normal
    pub emitente_logradouro: String,
    pub emitente_numero: String,
    pub emitente_bairro: String,
    pub emitente_cidade: String,
    pub emitente_codigo_municipio: String,
    pub emitente_uf: String,
    pub emitente_cep: String,

    // Destinatário / Consumidor
    pub dest_cnpj_cpf: Option<String>,
    pub dest_nome: Option<String>,
    pub dest_ie: Option<String>,
    pub dest_logradouro: Option<String>,
    pub dest_numero: Option<String>,
    pub dest_bairro: Option<String>,
    pub dest_cidade: Option<String>,
    pub dest_codigo_municipio: Option<String>,
    pub dest_uf: Option<String>,
    pub dest_cep: Option<String>,

    // Itens e Pagamentos
    pub itens: Vec<AcbrItemNFe>,
    pub pagamentos: Vec<AcbrPagamentoNFe>,

    // Totais e Informações Adicionais
    pub valor_total_produtos: f64,
    pub valor_total_nota: f64,
    pub valor_desconto: Option<f64>,
    pub valor_troco: Option<f64>,
    pub informacoes_adicionais: Option<String>,
}

/// Gera o conteúdo no formato INI do ACBr para envio
pub fn gerar_ini_acbr(dados: &AcbrDadosNFe) -> String {
    let now = chrono::Local::now();
    let data_str = now.format("%d/%m/%Y").to_string();
    let hora_str = now.format("%H:%M:%S").to_string();

    let mut ini = String::new();

    // [NOTA_FISCAL]
    ini.push_str("[NOTA_FISCAL]\r\n");
    ini.push_str("Ambiente=");
    ini.push_str(&dados.ambiente.to_string());
    ini.push_str("\r\n\r\n");

    // [Identificacao]
    ini.push_str("[Identificacao]\r\n");
    ini.push_str(&format!("NatOp={}\r\n", dados.natureza_operacao));
    ini.push_str("IndPag=0\r\n");
    ini.push_str(&format!("Mod={}\r\n", dados.modelo));
    ini.push_str(&format!("Serie={}\r\n", dados.serie));
    ini.push_str(&format!("nNF={}\r\n", dados.numero));
    ini.push_str(&format!("dEmi={}\r\n", data_str));
    ini.push_str(&format!("dSaiEnt={}\r\n", data_str));
    ini.push_str(&format!("hSaiEnt={}\r\n", hora_str));
    ini.push_str("tpNF=1\r\n"); // 1=Saída
    ini.push_str("idDest=1\r\n"); // 1=Operação interna
    ini.push_str(&format!("tpImp={}\r\n", if dados.modelo == 65 { "4" } else { "1" }));
    ini.push_str(&format!("tpEmis={}\r\n", dados.tipo_emissao));
    ini.push_str(&format!("tpAmb={}\r\n", dados.ambiente));
    ini.push_str("FinNFe=1\r\n"); // 1=Normal
    ini.push_str("indFinal=1\r\n"); // 1=Consumidor final
    ini.push_str("indPres=1\r\n"); // 1=Operação presencial
    ini.push_str("procEmi=0\r\n"); // 0=Aplicação do contribuinte
    ini.push_str("verProc=ColiseuERP_4.0\r\n\r\n");

    // [Emitente]
    let clean_cnpj_emit = dados.emitente_cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    ini.push_str("[Emitente]\r\n");
    ini.push_str(&format!("CNPJ={}\r\n", clean_cnpj_emit));
    ini.push_str(&format!("xNome={}\r\n", dados.emitente_razao));
    if let Some(ref fant) = dados.emitente_fantasia {
        ini.push_str(&format!("xFant={}\r\n", fant));
    }
    ini.push_str(&format!("IE={}\r\n", dados.emitente_ie.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
    ini.push_str(&format!("CRT={}\r\n", dados.emitente_crt));
    ini.push_str(&format!("xLgr={}\r\n", dados.emitente_logradouro));
    ini.push_str(&format!("nro={}\r\n", dados.emitente_numero));
    ini.push_str(&format!("xBairro={}\r\n", dados.emitente_bairro));
    ini.push_str(&format!("cMun={}\r\n", dados.emitente_codigo_municipio));
    ini.push_str(&format!("xMun={}\r\n", dados.emitente_cidade));
    ini.push_str(&format!("UF={}\r\n", dados.emitente_uf));
    ini.push_str(&format!("CEP={}\r\n", dados.emitente_cep.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
    ini.push_str("cPais=1058\r\n");
    ini.push_str("xPais=BRASIL\r\n\r\n");

    // [Destinatario]
    if let Some(ref doc) = dados.dest_cnpj_cpf {
        let clean_doc = doc.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
        if !clean_doc.is_empty() {
            ini.push_str("[Destinatario]\r\n");
            if clean_doc.len() > 11 {
                ini.push_str(&format!("CNPJ={}\r\n", clean_doc));
            } else {
                ini.push_str(&format!("CPF={}\r\n", clean_doc));
            }
            if let Some(ref nome) = dados.dest_nome {
                ini.push_str(&format!("xNome={}\r\n", nome));
            }
            ini.push_str("indIEDest=9\r\n"); // 9=Não contribuinte
            if let Some(ref lgr) = dados.dest_logradouro {
                ini.push_str(&format!("xLgr={}\r\n", lgr));
            }
            if let Some(ref nro) = dados.dest_numero {
                ini.push_str(&format!("nro={}\r\n", nro));
            }
            if let Some(ref b) = dados.dest_bairro {
                ini.push_str(&format!("xBairro={}\r\n", b));
            }
            if let Some(ref mun) = dados.dest_cidade {
                ini.push_str(&format!("xMun={}\r\n", mun));
            }
            if let Some(ref uf) = dados.dest_uf {
                ini.push_str(&format!("UF={}\r\n", uf));
            }
            if let Some(ref cep) = dados.dest_cep {
                ini.push_str(&format!("CEP={}\r\n", cep.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
            }
            ini.push_str("cPais=1058\r\n");
            ini.push_str("xPais=BRASIL\r\n\r\n");
        }
    }

    // Itens: [Produto001], [ICMS001], [PIS001], [COFINS001]
    for (i, item) in dados.itens.iter().enumerate() {
        let seq = format!("{:03}", i + 1);

        // [ProdutoXXX]
        ini.push_str(&format!("[Produto{}]\r\n", seq));
        ini.push_str(&format!("cProd={}\r\n", item.codigo));
        ini.push_str(&format!("cEAN={}\r\n", item.ean.as_deref().unwrap_or("SEM GTIN")));
        ini.push_str(&format!("xProd={}\r\n", item.descricao));
        ini.push_str(&format!("NCM={}\r\n", item.ncm.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
        ini.push_str(&format!("CFOP={}\r\n", item.cfop.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
        ini.push_str(&format!("uCom={}\r\n", item.unidade));
        ini.push_str(&format!("qCom={:.4}\r\n", item.quantidade));
        ini.push_str(&format!("vUnCom={:.4}\r\n", item.valor_unitario));
        ini.push_str(&format!("vProd={:.2}\r\n", item.valor_total));
        if let Some(desc) = item.valor_desconto {
            if desc > 0.0 {
                ini.push_str(&format!("vDesc={:.2}\r\n", desc));
            }
        }
        ini.push_str(&format!("uTrib={}\r\n", item.unidade));
        ini.push_str(&format!("qTrib={:.4}\r\n", item.quantidade));
        ini.push_str(&format!("vUnTrib={:.4}\r\n", item.valor_unitario));
        ini.push_str("indTot=1\r\n\r\n");

        // [ICMSXXX]
        ini.push_str(&format!("[ICMS{}]\r\n", seq));
        ini.push_str("Orig=0\r\n");
        if dados.emitente_crt == 1 {
            // Simples Nacional
            let csosn = item.cst_csosn.as_deref().unwrap_or("102");
            ini.push_str(&format!("CSOSN={}\r\n\r\n", csosn));
        } else {
            // Regime Normal
            let cst = item.cst_csosn.as_deref().unwrap_or("00");
            ini.push_str(&format!("CST={}\r\n", cst));
            ini.push_str("modBC=3\r\n");
            ini.push_str(&format!("vBC={:.2}\r\n", item.valor_total));
            ini.push_str("pICMS=0.00\r\n");
            ini.push_str("vICMS=0.00\r\n\r\n");
        }

        // [PISXXX]
        ini.push_str(&format!("[PIS{}]\r\n", seq));
        ini.push_str("CST=49\r\n");
        ini.push_str("vBC=0.00\r\n");
        ini.push_str("pPIS=0.00\r\n");
        ini.push_str("vPIS=0.00\r\n\r\n");

        // [COFINSXXX]
        ini.push_str(&format!("[COFINS{}]\r\n", seq));
        ini.push_str("CST=49\r\n");
        ini.push_str("vBC=0.00\r\n");
        ini.push_str("pCOFINS=0.00\r\n");
        ini.push_str("vCOFINS=0.00\r\n\r\n");
    }

    // [Total]
    ini.push_str("[Total]\r\n");
    ini.push_str("vBC=0.00\r\n");
    ini.push_str("vICMS=0.00\r\n");
    ini.push_str("vICMSDeson=0.00\r\n");
    ini.push_str("vFCP=0.00\r\n");
    ini.push_str("vBCST=0.00\r\n");
    ini.push_str("vST=0.00\r\n");
    ini.push_str("vFCPST=0.00\r\n");
    ini.push_str("vFCPSTRet=0.00\r\n");
    ini.push_str(&format!("vProd={:.2}\r\n", dados.valor_total_produtos));
    ini.push_str("vFrete=0.00\r\n");
    ini.push_str("vSeg=0.00\r\n");
    ini.push_str(&format!("vDesc={:.2}\r\n", dados.valor_desconto.unwrap_or(0.0)));
    ini.push_str("vII=0.00\r\n");
    ini.push_str("vIPI=0.00\r\n");
    ini.push_str("vIPIDevol=0.00\r\n");
    ini.push_str("vPIS=0.00\r\n");
    ini.push_str("vCOFINS=0.00\r\n");
    ini.push_str("vOutro=0.00\r\n");
    ini.push_str(&format!("vNF={:.2}\r\n\r\n", dados.valor_total_nota));

    // [Transportador]
    ini.push_str("[Transportador]\r\n");
    ini.push_str("modFrete=9\r\n\r\n"); // 9=Sem frete

    // [Pagamento]
    for (i, pag) in dados.pagamentos.iter().enumerate() {
        let seq = format!("{:03}", i + 1);
        ini.push_str(&format!("[Pag{}]\r\n", seq));
        ini.push_str(&format!("tPag={}\r\n", pag.tipo_pagamento));
        ini.push_str(&format!("vPag={:.2}\r\n", pag.valor));
        if pag.tipo_pagamento == "03" || pag.tipo_pagamento == "04" {
            ini.push_str("tpIntegra=2\r\n"); // 2=POS não integrado
        }
        ini.push_str("\r\n");
    }

    if let Some(troco) = dados.valor_troco {
        if troco > 0.0 {
            ini.push_str(&format!("vTroco={:.2}\r\n\r\n", troco));
        }
    }

    // [DadosAdicionais]
    ini.push_str("[DadosAdicionais]\r\n");
    let inf_cpl = dados.informacoes_adicionais.as_deref().unwrap_or(
        "Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI."
    );
    ini.push_str(&format!("infCpl={}\r\n", inf_cpl));

    ini
}
