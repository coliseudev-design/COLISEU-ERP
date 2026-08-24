use crate::fiscal::danfe_simplificado::DanfeSimplificadoTipo2Data;

pub fn generate_danfe_simplificado_escpos_bytes(data: &DanfeSimplificadoTipo2Data) -> Vec<u8> {
    let mut buffer = Vec::new();

    // Reset Impressora
    buffer.extend_from_slice(&[0x1B, 0x40]);
    // Centralizado
    buffer.extend_from_slice(&[0x1B, 0x61, 0x01]);

    // Divisão I - Cabeçalho
    buffer.extend_from_slice(b"================================================\n");
    buffer.extend_from_slice(format!("CNPJ/CPF: {}\n", data.emitente_cnpj_cpf).as_bytes());
    buffer.extend_from_slice(format!("{}\n", data.emitente_razao_social).as_bytes());
    buffer.extend_from_slice(format!("{}\n", data.emitente_endereco).as_bytes());
    buffer.extend_from_slice(b"DANFE Simplificado - Tipo 2\n");
    buffer.extend_from_slice(b"================================================\n");

    // Divisão VIII - Mensagem Fiscal (Abaixo do Cabeçalho - Contingência / Homologação)
    if data.tp_emis == 9 {
        buffer.extend_from_slice(&[0x1B, 0x45, 0x01]); // Bold ON
        buffer.extend_from_slice(b"EMITIDA EM CONTINGENCIA\n");
        buffer.extend_from_slice(b"Pendente de autorizacao\n");
        buffer.extend_from_slice(&[0x1B, 0x45, 0x00]); // Bold OFF
        buffer.extend_from_slice(b"------------------------------------------------\n");
    } else if data.tp_amb == 2 {
        buffer.extend_from_slice(&[0x1B, 0x45, 0x01]);
        buffer.extend_from_slice(b"EMITIDA EM AMBIENTE DE HOMOLOGACAO\n");
        buffer.extend_from_slice(b"SEM VALOR FISCAL\n");
        buffer.extend_from_slice(&[0x1B, 0x45, 0x00]);
        buffer.extend_from_slice(b"------------------------------------------------\n");
    }

    // Divisão II - Detalhes dos Produtos (Alinhado à Esquerda)
    buffer.extend_from_slice(&[0x1B, 0x61, 0x00]);
    buffer.extend_from_slice(b"Codigo Descricao              Qtde UN  Vl Unit   Vl Total\n");
    buffer.extend_from_slice(b"------------------------------------------------\n");

    for item in &data.itens {
        let cod = if item.codigo.len() > 6 { &item.codigo[..6] } else { &item.codigo };
        let desc = if item.descricao.len() > 20 { &item.descricao[..20] } else { &item.descricao };
        
        let line = format!(
            "{:<6} {:<20} {:>4.0} {:<2} {:>8.2} {:>9.2}\n",
            cod, desc, item.quantidade, item.unidade, item.valor_unitario, item.valor_total
        );
        buffer.extend_from_slice(line.as_bytes());
    }
    buffer.extend_from_slice(b"------------------------------------------------\n");

    // Divisão III - Totais
    buffer.extend_from_slice(format!("Qtde. total de itens                           {:>5}\n", data.qtd_total_itens).as_bytes());
    buffer.extend_from_slice(format!("Valor total R$                                {:>9.2}\n", data.valor_total_produtos).as_bytes());
    
    if data.valor_desconto > 0.0 {
        buffer.extend_from_slice(format!("Desconto R$                                   {:>9.2}\n", data.valor_desconto).as_bytes());
    }
    if data.valor_frete > 0.0 {
        buffer.extend_from_slice(format!("Frete/Outros R$                               {:>9.2}\n", data.valor_frete).as_bytes());
    }

    buffer.extend_from_slice(&[0x1B, 0x45, 0x01]);
    buffer.extend_from_slice(format!("Valor a Pagar R$                              {:>9.2}\n", data.valor_a_pagar).as_bytes());
    buffer.extend_from_slice(&[0x1B, 0x45, 0x00]);

    for fpag in &data.formas_pagamento {
        buffer.extend_from_slice(format!("{:<30} {:>17.2}\n", fpag.descricao, fpag.valor).as_bytes());
    }
    buffer.extend_from_slice(format!("Troco R$                                      {:>9.2}\n", data.valor_troco).as_bytes());

    // Divisão III-A - Novos tributos IBS/CBS se houver
    if data.valor_cbs > 0.0 || data.valor_ibs_uf > 0.0 {
        buffer.extend_from_slice(b"------------------------------------------------\n");
        buffer.extend_from_slice(format!("(+) CBS R$: {:>9.2} | (+) IBS R$: {:>9.2}\n", data.valor_cbs, data.valor_ibs_uf + data.valor_ibs_mun).as_bytes());
    }

    // Divisão IV - Consulta por Chave
    buffer.extend_from_slice(&[0x1B, 0x61, 0x01]); // Centralizar
    buffer.extend_from_slice(b"------------------------------------------------\n");
    buffer.extend_from_slice(b"Consulte pela Chave de Acesso em\n");
    buffer.extend_from_slice(format!("{}\n", data.url_consulta_chave).as_bytes());
    buffer.extend_from_slice(format!("{}\n", data.chave_acesso_formatada()).as_bytes());
    buffer.extend_from_slice(b"------------------------------------------------\n");

    // Divisão VI - Consumidor
    if let Some(cons_cnpj_cpf) = &data.consumidor_cnpj_cpf {
        buffer.extend_from_slice(format!("CONSUMIDOR - CNPJ/CPF: {}\n", cons_cnpj_cpf).as_bytes());
    } else {
        buffer.extend_from_slice(b"CONSUMIDOR NAO IDENTIFICADO\n");
    }
    if let Some(cons_nome) = &data.consumidor_nome {
        buffer.extend_from_slice(format!("{}\n", cons_nome).as_bytes());
    }

    // Divisão VII - Identificação & Protocolo
    let via_str = if data.eh_segunda_via_estabelecimento {
        "Via Estabelecimento"
    } else {
        "Via Consumidor"
    };

    buffer.extend_from_slice(format!(
        "NF-e n° {:09} Serie {:03} {} - {}\n",
        data.numero_nfe, data.serie_nfe, data.dh_emissao_local, via_str
    ).as_bytes());

    if let Some(prot) = &data.protocolo_autorizacao {
        buffer.extend_from_slice(format!("Protocolo de autorizacao: {}\n", prot).as_bytes());
    }

    // Divisão VIII - Segunda Área de Contingência (Abaixo da Identificação)
    if data.tp_emis == 9 {
        buffer.extend_from_slice(&[0x1B, 0x45, 0x01]);
        buffer.extend_from_slice(b"EMITIDA EM CONTINGENCIA\n");
        buffer.extend_from_slice(b"Pendente de autorizacao\n");
        buffer.extend_from_slice(&[0x1B, 0x45, 0x00]);
    }

    // Divisão IX - Lei 12.741/2012 & Mensagem Contribuinte
    buffer.extend_from_slice(b"------------------------------------------------\n");
    buffer.extend_from_slice(format!("Tributos Totais Incidentes (Lei 12.741/2012): R${:.2}\n", data.valor_tributos_lei_12741).as_bytes());
    if let Some(cpl) = &data.inf_cpl {
        buffer.extend_from_slice(format!("{}\n", cpl).as_bytes());
    }

    // Avanço de papel e Corte
    buffer.extend_from_slice(&[0x1D, 0x56, 0x41, 0x03]);

    buffer
}
