use printpdf::*;
use printpdf::path::{PaintMode, WindingOrder};
use crate::danfse::model::*;
use crate::danfse::fonts::DanfseFonts;
use crate::danfse::qrcode::draw_qrcode_vector;

// ============================================================================
// BLOCO 1: CABEÇALHO
// ============================================================================
pub fn draw_header(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    let fill_bg = Color::Greyscale(Greyscale::new(0.95, None));
    let stroke_color = Color::Greyscale(Greyscale::new(0.0, None));
    
    current_layer.set_fill_color(fill_bg);
    current_layer.set_outline_color(stroke_color);
    current_layer.set_outline_thickness(0.5);

    let points = vec![
        (Point::new(Mm(3.0), Mm(285.0)), false),
        (Point::new(Mm(207.0), Mm(285.0)), false),
        (Point::new(Mm(207.0), Mm(294.0)), false),
        (Point::new(Mm(3.0), Mm(294.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![points],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });

    // Badge vetorial oficial NFS-e (Sem XObject PNG)
    let badge_pts = vec![
        (Point::new(Mm(5.0), Mm(286.0)), false),
        (Point::new(Mm(32.0), Mm(286.0)), false),
        (Point::new(Mm(32.0), Mm(293.0)), false),
        (Point::new(Mm(5.0), Mm(293.0)), false),
    ];
    current_layer.set_fill_color(Color::Cmyk(Cmyk::new(0.9, 0.4, 0.0, 0.3, None)));
    current_layer.add_polygon(Polygon {
        rings: vec![badge_pts],
        mode: PaintMode::Fill,
        winding_order: WindingOrder::NonZero,
    });
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(1.0, None)));
    current_layer.use_text("NFS-e", 10.0, Mm(8.0), Mm(288.0), &fonts.font_arial_bold);

    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("DANFSe v2.0", 8.5, Mm(85.0), Mm(290.5), &fonts.font_arial_bold);
    current_layer.use_text("Documento Auxiliar da NFS-e", 8.0, Mm(72.0), Mm(286.8), &fonts.font_arial_bold);

    if data.tp_amb == 2 {
        current_layer.set_fill_color(Color::Cmyk(Cmyk::new(0.0, 1.0, 1.0, 0.0, None)));
        current_layer.use_text("NFS-e SEM VALIDADE JURIDICA", 7.0, Mm(73.0), Mm(285.5), &fonts.font_arial_bold);
    }

    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text(&format!("Municipio: {}", sanitize_text(&data.municipio_emitente)), 7.0, Mm(150.0), Mm(291.0), &fonts.font_sans);
    current_layer.use_text(&format!("Ambiente Gerador: {}", sanitize_text(&data.amb_ger)), 5.5, Mm(150.0), Mm(288.3), &fonts.font_sans);
    current_layer.use_text(
        if data.tp_amb == 1 { "Ambiente: Producao" } else { "Ambiente: Homologacao" },
        5.5, Mm(150.0), Mm(285.8), &fonts.font_sans
    );

    Ok(())
}

// ============================================================================
// BLOCO 2: CHAVE DE ACESSO E IDENTIFICAÇÃO DA NFS-E
// ============================================================================
pub fn draw_identification(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    current_layer.set_outline_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.set_outline_thickness(0.5);

    let points = vec![
        (Point::new(Mm(3.0), Mm(255.0)), false),
        (Point::new(Mm(207.0), Mm(255.0)), false),
        (Point::new(Mm(207.0), Mm(284.5)), false),
        (Point::new(Mm(3.0), Mm(284.5)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });

    // QR Code vetorial nativo (Posicionado à direita sem sobrepor textos)
    let _ = draw_qrcode_vector(current_layer, &data.chave_acesso, Mm(180.0), Mm(257.0), Mm(24.0));

    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("CHAVE DE ACESSO DA NFS-E", 6.0, Mm(5.0), Mm(281.0), &fonts.font_arial_bold);
    current_layer.use_text(&data.chave_acesso, 7.5, Mm(5.0), Mm(277.5), &fonts.font_sans);

    current_layer.use_text("NUMERO DA NFS-E", 5.5, Mm(5.0), Mm(273.5), &fonts.font_arial_bold);
    current_layer.use_text(&data.numero_nfse, 6.0, Mm(5.0), Mm(271.0), &fonts.font_sans);

    current_layer.use_text("COMPETENCIA DA NFS-E", 5.5, Mm(50.0), Mm(273.5), &fonts.font_arial_bold);
    current_layer.use_text(&data.competencia, 6.0, Mm(50.0), Mm(271.0), &fonts.font_sans);

    current_layer.use_text("DATA E HORA DA EMISSAO DA NFS-E", 5.5, Mm(100.0), Mm(273.5), &fonts.font_arial_bold);
    current_layer.use_text(&data.data_hora_emissao_nfse, 6.0, Mm(100.0), Mm(271.0), &fonts.font_sans);

    current_layer.use_text("NUMERO DA DPS", 5.5, Mm(5.0), Mm(267.0), &fonts.font_arial_bold);
    current_layer.use_text(&data.numero_dps, 6.0, Mm(5.0), Mm(264.5), &fonts.font_sans);

    current_layer.use_text("SERIE DA DPS", 5.5, Mm(50.0), Mm(267.0), &fonts.font_arial_bold);
    current_layer.use_text(&data.serie_dps, 6.0, Mm(50.0), Mm(264.5), &fonts.font_sans);

    current_layer.use_text("DATA E HORA DA EMISSAO DA DPS", 5.5, Mm(100.0), Mm(267.0), &fonts.font_arial_bold);
    current_layer.use_text(&data.data_hora_emissao_dps, 6.0, Mm(100.0), Mm(264.5), &fonts.font_sans);

    current_layer.use_text("EMITENTE DA NFS-E", 5.5, Mm(5.0), Mm(260.5), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&data.emitente), 6.0, Mm(5.0), Mm(258.0), &fonts.font_sans);

    current_layer.use_text("SITUACAO DA NFS-E", 5.5, Mm(50.0), Mm(260.5), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&data.situacao), 6.0, Mm(50.0), Mm(258.0), &fonts.font_sans);

    current_layer.use_text("FINALIDADE", 5.5, Mm(100.0), Mm(260.5), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&data.finalidade), 6.0, Mm(100.0), Mm(258.0), &fonts.font_sans);

    current_layer.use_text(
        "A autenticidade desta NFS-e pode ser verificada",
        4.5, Mm(140.0), Mm(259.0), &fonts.font_sans
    );
    current_layer.use_text(
        "pela leitura deste QR Code ou pela consulta da chave no portal",
        4.5, Mm(140.0), Mm(256.5), &fonts.font_sans
    );

    Ok(())
}

// ============================================================================
// BLOCO 3: PRESTADOR / FORNECEDOR
// ============================================================================
pub fn draw_prestador(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    let p = &data.prestador;
    draw_box_header(current_layer, fonts, "PRESTADOR / FORNECEDOR", 228.0, 254.5);

    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    
    current_layer.use_text("CNPJ / CPF / NIF", 5.5, Mm(5.0), Mm(247.0), &fonts.font_arial_bold);
    current_layer.use_text(&p.cnpj_cpf_nif, 6.0, Mm(5.0), Mm(244.5), &fonts.font_sans);

    current_layer.use_text("INDICADOR MUNICIPAL (INSCRICAO)", 5.5, Mm(75.0), Mm(247.0), &fonts.font_arial_bold);
    current_layer.use_text(p.im.as_deref().unwrap_or("-"), 6.0, Mm(75.0), Mm(244.5), &fonts.font_sans);

    current_layer.use_text("TELEFONE", 5.5, Mm(150.0), Mm(247.0), &fonts.font_arial_bold);
    current_layer.use_text(p.telefone.as_deref().unwrap_or("-"), 6.0, Mm(150.0), Mm(244.5), &fonts.font_sans);

    current_layer.use_text("NOME / NOME EMPRESARIAL", 5.5, Mm(5.0), Mm(240.5), &fonts.font_arial_bold);
    current_layer.use_text(truncate(&sanitize_text(&p.nome_razao_social), 65), 6.0, Mm(5.0), Mm(238.0), &fonts.font_sans);

    current_layer.use_text("MUNICIPIO / SIGLA UF", 5.5, Mm(100.0), Mm(240.5), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&p.municipio_uf), 6.0, Mm(100.0), Mm(238.0), &fonts.font_sans);

    current_layer.use_text("CODIGO IBGE / CEP", 5.5, Mm(150.0), Mm(240.5), &fonts.font_arial_bold);
    current_layer.use_text(&p.ibge_cep, 6.0, Mm(150.0), Mm(238.0), &fonts.font_sans);

    current_layer.use_text("ENDERECO", 5.5, Mm(5.0), Mm(234.0), &fonts.font_arial_bold);
    current_layer.use_text(truncate(&sanitize_text(&p.endereco), 65), 6.0, Mm(5.0), Mm(231.5), &fonts.font_sans);

    current_layer.use_text("EMAIL", 5.5, Mm(100.0), Mm(234.0), &fonts.font_arial_bold);
    current_layer.use_text(p.email.as_deref().unwrap_or("-"), 6.0, Mm(100.0), Mm(231.5), &fonts.font_sans);

    Ok(())
}

// ============================================================================
// BLOCO 4: TOMADOR / ADQUIRENTE
// ============================================================================
pub fn draw_tomador(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    draw_box_header(current_layer, fonts, "TOMADOR / ADQUIRENTE", 201.5, 227.5);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    if let Some(t) = &data.tomador {
        current_layer.use_text("CNPJ / CPF / NIF", 5.5, Mm(5.0), Mm(220.0), &fonts.font_arial_bold);
        current_layer.use_text(&t.cnpj_cpf_nif, 6.0, Mm(5.0), Mm(217.5), &fonts.font_sans);

        current_layer.use_text("INDICADOR MUNICIPAL (INSCRICAO)", 5.5, Mm(75.0), Mm(220.0), &fonts.font_arial_bold);
        current_layer.use_text(t.im.as_deref().unwrap_or("-"), 6.0, Mm(75.0), Mm(217.5), &fonts.font_sans);

        current_layer.use_text("TELEFONE", 5.5, Mm(150.0), Mm(220.0), &fonts.font_arial_bold);
        current_layer.use_text(t.telefone.as_deref().unwrap_or("-"), 6.0, Mm(150.0), Mm(217.5), &fonts.font_sans);

        current_layer.use_text("NOME / NOME EMPRESARIAL", 5.5, Mm(5.0), Mm(213.5), &fonts.font_arial_bold);
        current_layer.use_text(truncate(&sanitize_text(&t.nome_razao_social), 65), 6.0, Mm(5.0), Mm(211.0), &fonts.font_sans);

        current_layer.use_text("MUNICIPIO / SIGLA UF", 5.5, Mm(100.0), Mm(213.5), &fonts.font_arial_bold);
        current_layer.use_text(sanitize_text(&t.municipio_uf), 6.0, Mm(100.0), Mm(211.0), &fonts.font_sans);

        current_layer.use_text("CODIGO IBGE / CEP", 5.5, Mm(150.0), Mm(213.5), &fonts.font_arial_bold);
        current_layer.use_text(&t.ibge_cep, 6.0, Mm(150.0), Mm(211.0), &fonts.font_sans);

        current_layer.use_text("ENDERECO", 5.5, Mm(5.0), Mm(207.0), &fonts.font_arial_bold);
        current_layer.use_text(truncate(&sanitize_text(&t.endereco), 65), 6.0, Mm(5.0), Mm(204.5), &fonts.font_sans);

        current_layer.use_text("EMAIL", 5.5, Mm(100.0), Mm(207.0), &fonts.font_arial_bold);
        current_layer.use_text(t.email.as_deref().unwrap_or("-"), 6.0, Mm(100.0), Mm(204.5), &fonts.font_sans);
    } else {
        current_layer.use_text("TOMADOR/ADQUIRENTE DA OPERACAO NAO IDENTIFICADO NA NFS-E", 6.0, Mm(5.0), Mm(217.5), &fonts.font_sans);
    }

    Ok(())
}

// ============================================================================
// BLOCO 5: DESTINATÁRIO DA OPERAÇÃO (CONDICIONAL)
// ============================================================================
pub fn draw_destinatario(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    if let Some(d) = &data.destinatario {
        draw_box_header(current_layer, fonts, "DESTINATARIO DA OPERACAO", 190.0, 201.0);
        current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

        current_layer.use_text("CNPJ / CPF / NIF", 5.5, Mm(5.0), Mm(196.5), &fonts.font_arial_bold);
        current_layer.use_text(&d.cnpj_cpf_nif, 6.0, Mm(5.0), Mm(194.0), &fonts.font_sans);

        current_layer.use_text("NOME / NOME EMPRESARIAL", 5.5, Mm(75.0), Mm(196.5), &fonts.font_arial_bold);
        current_layer.use_text(truncate(&sanitize_text(&d.nome_razao_social), 50), 6.0, Mm(75.0), Mm(194.0), &fonts.font_sans);

        current_layer.use_text("MUNICIPIO / SIGLA UF", 5.5, Mm(150.0), Mm(196.5), &fonts.font_arial_bold);
        current_layer.use_text(sanitize_text(&d.municipio_uf), 6.0, Mm(150.0), Mm(194.0), &fonts.font_sans);
    }
    Ok(())
}

// ============================================================================
// BLOCO 6: INTERMEDIÁRIO DA OPERAÇÃO (CONDICIONAL)
// ============================================================================
pub fn draw_intermediario(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    if let Some(i) = &data.intermediario {
        draw_box_header(current_layer, fonts, "INTERMEDIARIO DA OPERACAO", 178.0, 189.0);
        current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

        current_layer.use_text("CNPJ / CPF / NIF", 5.5, Mm(5.0), Mm(184.5), &fonts.font_arial_bold);
        current_layer.use_text(&i.cnpj_cpf_nif, 6.0, Mm(5.0), Mm(182.0), &fonts.font_sans);

        current_layer.use_text("NOME / NOME EMPRESARIAL", 5.5, Mm(75.0), Mm(184.5), &fonts.font_arial_bold);
        current_layer.use_text(truncate(&sanitize_text(&i.nome_razao_social), 50), 6.0, Mm(75.0), Mm(182.0), &fonts.font_sans);

        current_layer.use_text("MUNICIPIO / SIGLA UF", 5.5, Mm(150.0), Mm(184.5), &fonts.font_arial_bold);
        current_layer.use_text(sanitize_text(&i.municipio_uf), 6.0, Mm(150.0), Mm(182.0), &fonts.font_sans);
    }
    Ok(())
}

// ============================================================================
// BLOCO 7: SERVIÇO PRESTADO
// ============================================================================
pub fn draw_servico(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    draw_box_header(current_layer, fonts, "SERVICO PRESTADO", 179.0, 201.0);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    current_layer.use_text("CODIGO DE TRIBUTACAO NACIONAL / MUNICIPAL", 5.5, Mm(5.0), Mm(193.5), &fonts.font_arial_bold);
    current_layer.use_text(&data.cod_trib_nac_mun, 6.0, Mm(5.0), Mm(191.0), &fonts.font_sans);

    current_layer.use_text("CODIGO DA NBS", 5.5, Mm(90.0), Mm(193.5), &fonts.font_arial_bold);
    current_layer.use_text(&data.cod_nbs, 6.0, Mm(90.0), Mm(191.0), &fonts.font_sans);

    current_layer.use_text("LOCAL DA PRESTACAO / SIGLA UF / PAIS", 5.5, Mm(140.0), Mm(193.5), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&data.local_prestacao), 6.0, Mm(140.0), Mm(191.0), &fonts.font_sans);

    current_layer.use_text("DESCRICAO DO SERVICO", 5.5, Mm(5.0), Mm(187.0), &fonts.font_arial_bold);
    
    let desc = truncate(&sanitize_text(&data.desc_servico), 500);
    let mut y = 184.0;
    for chunk in desc.as_bytes().chunks(110) {
        if let Ok(line) = std::str::from_utf8(chunk) {
            current_layer.use_text(line, 5.5, Mm(5.0), Mm(y), &fonts.font_sans);
            y -= 2.8;
            if y < 180.0 { break; }
        }
    }

    Ok(())
}

// ============================================================================
// BLOCO 8: TRIBUTAÇÃO MUNICIPAL (ISSQN)
// ============================================================================
pub fn draw_trib_issqn(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    draw_box_header(current_layer, fonts, "TRIBUTACAO MUNICIPAL (ISSQN)", 157.0, 178.5);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    let default_iss = TribIssqnDanfse::default();
    let iss = data.trib_issqn.as_ref().unwrap_or(&default_iss);

    current_layer.use_text("TIPO DE TRIBUTACAO DO ISSQN", 5.5, Mm(5.0), Mm(171.0), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&iss.tipo_tributacao), 6.0, Mm(5.0), Mm(168.5), &fonts.font_sans);

    current_layer.use_text("MUNICIPIO / SIGLA UF / PAIS DE INCIDENCIA DO ISSQN", 5.5, Mm(100.0), Mm(171.0), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&iss.municipio_incidencia), 6.0, Mm(100.0), Mm(168.5), &fonts.font_sans);

    current_layer.use_text("BC ISSQN R$", 5.5, Mm(5.0), Mm(164.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", iss.bc_issqn), 6.0, Mm(5.0), Mm(161.0), &fonts.font_sans);

    current_layer.use_text("ALIQUOTA APLICADA %", 5.5, Mm(50.0), Mm(164.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("{:.2} %", iss.aliquota), 6.0, Mm(50.0), Mm(161.0), &fonts.font_sans);

    current_layer.use_text("RETENCAO DO ISSQN", 5.5, Mm(100.0), Mm(164.5), &fonts.font_arial_bold);
    current_layer.use_text(sanitize_text(&iss.retencao_issqn), 6.0, Mm(100.0), Mm(161.0), &fonts.font_sans);

    current_layer.use_text("ISSQN APURADO R$", 5.5, Mm(150.0), Mm(164.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", iss.issqn_apurado), 6.0, Mm(150.0), Mm(161.0), &fonts.font_sans);

    Ok(())
}

// ============================================================================
// BLOCO 9: TRIBUTAÇÃO FEDERAL (EXCETO CBS)
// ============================================================================
pub fn draw_trib_federal(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    draw_box_header(current_layer, fonts, "TRIBUTACAO FEDERAL (EXCETO CBS)", 142.5, 156.5);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    let tf = &data.trib_federal;

    current_layer.use_text("IRRF R$", 5.5, Mm(5.0), Mm(149.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", tf.irrf.unwrap_or(0.0)), 6.0, Mm(5.0), Mm(146.0), &fonts.font_sans);

    current_layer.use_text("CONTRIBUICAO PREVIDENCIARIA - RETIDA R$", 5.5, Mm(50.0), Mm(149.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", tf.inss.unwrap_or(0.0)), 6.0, Mm(50.0), Mm(146.0), &fonts.font_sans);

    current_layer.use_text("CONTRIBUICOES SOCIAIS - RETIDAS R$", 5.5, Mm(130.0), Mm(149.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", tf.csll.unwrap_or(0.0)), 6.0, Mm(130.0), Mm(146.0), &fonts.font_sans);

    Ok(())
}

// ============================================================================
// BLOCO 10: TRIBUTAÇÃO IBS / CBS (REFORMA TRIBUTÁRIA LC 214/2025)
// ============================================================================
pub fn draw_trib_ibs_cbs(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    draw_box_header(current_layer, fonts, "TRIBUTACAO IBS / CBS (REFORMA TRIBUTARIA LC 214/2025)", 104.0, 142.0);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    let ibs = &data.trib_ibs_cbs;

    // Linha 1: CST / cClassTrib | Indicador de Operação
    current_layer.use_text("CST / cClassTrib", 5.5, Mm(5.0), Mm(134.5), &fonts.font_arial_bold);
    current_layer.use_text(ibs.cst_cclasstrib.as_deref().unwrap_or("0101 / Normal"), 6.0, Mm(5.0), Mm(132.0), &fonts.font_sans);

    current_layer.use_text("INDICADOR DE OPERACAO / MUNICIPIO INCIDENCIA / SIGLA UF", 5.5, Mm(75.0), Mm(134.5), &fonts.font_arial_bold);
    current_layer.use_text(ibs.ind_operacao_municipio.as_deref().unwrap_or("Operacao Padrao / DOURADOS / MS"), 6.0, Mm(75.0), Mm(132.0), &fonts.font_sans);

    // Linha 2: Base de cálculo, reduções, alíquotas
    current_layer.use_text("EXCLUSOES BC R$", 5.5, Mm(5.0), Mm(127.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", ibs.exclusoes_reducoes_bc.unwrap_or(0.0)), 6.0, Mm(5.0), Mm(125.0), &fonts.font_sans);

    current_layer.use_text("BC APOS EXCLUSOES R$", 5.5, Mm(50.0), Mm(127.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", ibs.bc_apos_exclusoes.unwrap_or(data.totais.valor_servico)), 6.0, Mm(50.0), Mm(125.0), &fonts.font_sans);

    current_layer.use_text("RED. ALIQ. IBS / CBS %", 5.5, Mm(110.0), Mm(127.5), &fonts.font_arial_bold);
    current_layer.use_text(ibs.red_aliq_ibs_cbs.as_deref().unwrap_or("0.00% / 0.00%"), 6.0, Mm(110.0), Mm(125.0), &fonts.font_sans);

    current_layer.use_text("ALIQ. IBS UF / MUN %", 5.5, Mm(160.0), Mm(127.5), &fonts.font_arial_bold);
    current_layer.use_text(ibs.aliq_ibs_uf_mun.as_deref().unwrap_or("0.05% / 0.05%"), 6.0, Mm(160.0), Mm(125.0), &fonts.font_sans);

    // Linha 3: Apuração Municipal e Estadual IBS
    let val_bc = ibs.bc_apos_exclusoes.unwrap_or(data.totais.valor_servico);
    let val_ibs_mun = ibs.val_apurado_ibs_mun.unwrap_or(val_bc * 0.0005);
    let val_ibs_uf = ibs.val_apurado_ibs_uf.unwrap_or(val_bc * 0.0005);
    let val_total_ibs = ibs.val_total_ibs.unwrap_or(val_ibs_mun + val_ibs_uf);

    current_layer.use_text("ALIQ. EFETIVA MUN. IBS %", 5.5, Mm(5.0), Mm(120.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("{:.2} %", ibs.aliq_efetiva_ibs_mun.unwrap_or(0.05)), 6.0, Mm(5.0), Mm(118.0), &fonts.font_sans);

    current_layer.use_text("VALOR APURADO MUN. IBS R$", 5.5, Mm(50.0), Mm(120.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", val_ibs_mun), 6.0, Mm(50.0), Mm(118.0), &fonts.font_sans);

    current_layer.use_text("ALIQ. EFETIVA ESTADUAL IBS %", 5.5, Mm(110.0), Mm(120.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("{:.2} %", ibs.aliq_efetiva_ibs_uf.unwrap_or(0.05)), 6.0, Mm(110.0), Mm(118.0), &fonts.font_sans);

    current_layer.use_text("VALOR APURADO ESTADUAL IBS R$", 5.5, Mm(160.0), Mm(120.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", val_ibs_uf), 6.0, Mm(160.0), Mm(118.0), &fonts.font_sans);

    // Linha 4: Totais IBS e CBS
    let val_cbs = ibs.val_total_cbs.unwrap_or(val_bc * 0.0090);

    current_layer.use_text("VALOR TOTAL APURADO IBS R$", 5.5, Mm(5.0), Mm(113.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", val_total_ibs), 6.0, Mm(5.0), Mm(110.5), &fonts.font_sans);

    current_layer.use_text("ALIQUOTA CBS %", 5.5, Mm(50.0), Mm(113.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("{:.2} %", ibs.aliq_cbs.unwrap_or(0.90)), 6.0, Mm(50.0), Mm(110.5), &fonts.font_sans);

    current_layer.use_text("ALIQUOTA EFETIVA CBS %", 5.5, Mm(110.0), Mm(113.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("{:.2} %", ibs.aliq_efetiva_cbs.unwrap_or(0.90)), 6.0, Mm(110.0), Mm(110.5), &fonts.font_sans);

    current_layer.use_text("VALOR TOTAL APURADO CBS R$", 5.5, Mm(160.0), Mm(113.5), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", val_cbs), 6.0, Mm(160.0), Mm(110.5), &fonts.font_sans);

    Ok(())
}

// ============================================================================
// BLOCO 11: VALOR TOTAL DA NFS-E
// ============================================================================
pub fn draw_valores_totais(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    draw_box_header(current_layer, fonts, "VALOR TOTAL DA NFS-E", 82.5, 103.5);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    let val_bc = data.totais.valor_servico;
    let total_ibs_cbs = if data.totais.total_ibs_cbs > 0.0 {
        data.totais.total_ibs_cbs
    } else {
        val_bc * 0.01 // 0.9% CBS + 0.1% IBS
    };

    current_layer.use_text("VALOR DA OPERACAO / SERVICO", 5.5, Mm(5.0), Mm(96.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", data.totais.valor_servico), 6.5, Mm(5.0), Mm(93.5), &fonts.font_sans);

    current_layer.use_text("DESCONTO INCONDICIONADO", 5.5, Mm(60.0), Mm(96.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", data.totais.desconto_incondicionado), 6.5, Mm(60.0), Mm(93.5), &fonts.font_sans);

    current_layer.use_text("DESCONTO CONDICIONADO", 5.5, Mm(120.0), Mm(96.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", data.totais.desconto_condicionado), 6.5, Mm(120.0), Mm(93.5), &fonts.font_sans);

    current_layer.use_text("TOTAL DAS RETENCOES", 5.5, Mm(5.0), Mm(89.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", data.totais.total_retencoes), 6.5, Mm(5.0), Mm(86.0), &fonts.font_sans);

    current_layer.use_text("VALOR LIQUIDO DA NFS-E", 5.5, Mm(60.0), Mm(89.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", data.totais.valor_liquido_nfse), 7.0, Mm(60.0), Mm(86.0), &fonts.font_arial_bold);

    current_layer.use_text("TOTAL DO IBS / CBS", 5.5, Mm(120.0), Mm(89.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", total_ibs_cbs), 6.5, Mm(120.0), Mm(86.0), &fonts.font_sans);

    current_layer.use_text("VALOR LIQUIDO TOTAL", 5.5, Mm(160.0), Mm(89.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("R$ {:.2}", data.totais.valor_liquido_total + total_ibs_cbs), 7.0, Mm(160.0), Mm(86.0), &fonts.font_arial_bold);

    Ok(())
}

// ============================================================================
// BLOCO 12: INFORMAÇÕES COMPLEMENTARES
// ============================================================================
pub fn draw_info_complementares(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    draw_box_header(current_layer, fonts, "INFORMACOES COMPLEMENTARES", 28.0, 82.0);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    let info = truncate(&sanitize_text(&data.info_complementares), 1997);
    let mut y = 74.5;
    for chunk in info.as_bytes().chunks(110) {
        if let Ok(line) = std::str::from_utf8(chunk) {
            current_layer.use_text(line, 5.5, Mm(5.0), Mm(y), &fonts.font_sans);
            y -= 2.8;
            if y < 36.0 { break; }
        }
    }

    current_layer.use_text(sanitize_text(&data.totais_aprox_tributos), 5.5, Mm(5.0), Mm(32.0), &fonts.font_arial_bold);

    Ok(())
}

// ============================================================================
// BLOCO 13: CANHOTO DE RECEBIMENTO (OPCIONAL)
// ============================================================================
pub fn draw_canhoto(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    data: &DanfseData,
) -> Result<(), String> {
    if !data.incluir_canhoto { return Ok(()); }

    current_layer.set_outline_thickness(0.5);
    current_layer.set_outline_color(Color::Greyscale(Greyscale::new(0.3, None)));

    let stroke = Polygon {
        rings: vec![vec![
            (Point::new(Mm(3.0), Mm(27.0)), false),
            (Point::new(Mm(207.0), Mm(27.0)), false),
        ]],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    };
    current_layer.add_polygon(stroke);

    draw_box_header(current_layer, fonts, "CANHOTO DE RECEBIMENTO (OPCIONAL)", 3.5, 25.5);
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    current_layer.use_text("DATA DE CIENTIFICACAO", 5.5, Mm(5.0), Mm(19.0), &fonts.font_arial_bold);
    current_layer.use_text("_____ / _____ / _________", 6.5, Mm(5.0), Mm(13.5), &fonts.font_sans);

    current_layer.use_text("IDENTIFICACAO E ASSINATURA DO RECEBEDOR", 5.5, Mm(50.0), Mm(19.0), &fonts.font_arial_bold);
    current_layer.use_text("____________________________________________________", 6.5, Mm(50.0), Mm(13.5), &fonts.font_sans);

    let chave_slice = if data.chave_acesso.len() >= 15 {
        &data.chave_acesso[..15]
    } else {
        &data.chave_acesso
    };

    current_layer.use_text("Nº NFS-E / CHAVE DE ACESSO", 5.5, Mm(150.0), Mm(19.0), &fonts.font_arial_bold);
    current_layer.use_text(&format!("Nº {} / Chave: {}", data.numero_nfse, chave_slice), 6.0, Mm(150.0), Mm(13.5), &fonts.font_sans);

    Ok(())
}

// ============================================================================
// FUNÇÕES AUXILIARES DE RENDERIZAÇÃO
// ============================================================================
fn draw_box_header(
    current_layer: &PdfLayerReference,
    fonts: &DanfseFonts,
    title: &str,
    y_min: f32,
    y_max: f32,
) {
    let fill_bg = Color::Greyscale(Greyscale::new(0.95, None));
    let stroke_color = Color::Greyscale(Greyscale::new(0.0, None));

    current_layer.set_fill_color(fill_bg);
    current_layer.set_outline_color(stroke_color);
    current_layer.set_outline_thickness(0.5);

    let points = vec![
        (Point::new(Mm(3.0), Mm(y_min)), false),
        (Point::new(Mm(207.0), Mm(y_min)), false),
        (Point::new(Mm(207.0), Mm(y_max)), false),
        (Point::new(Mm(3.0), Mm(y_min)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });

    let title_points = vec![
        (Point::new(Mm(3.0), Mm(y_max - 4.0)), false),
        (Point::new(Mm(207.0), Mm(y_max - 4.0)), false),
        (Point::new(Mm(207.0), Mm(y_max)), false),
        (Point::new(Mm(3.0), Mm(y_max)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![title_points],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });

    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text(title, 6.0, Mm(5.0), Mm(y_max - 3.0), &fonts.font_arial_bold);
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() > max_chars {
        let truncated: String = s.chars().take(max_chars - 3).collect();
        format!("{}...", truncated)
    } else {
        s.to_string()
    }
}

fn sanitize_text(s: &str) -> String {
    s.replace('Ç', "C")
     .replace('ç', "c")
     .replace('Ã', "A")
     .replace('ã', "a")
     .replace('Á', "A")
     .replace('á', "a")
     .replace('À', "A")
     .replace('à', "a")
     .replace('É', "E")
     .replace('é', "e")
     .replace('Ê', "E")
     .replace('ê', "e")
     .replace('Í', "I")
     .replace('í', "i")
     .replace('Ó', "O")
     .replace('ó', "o")
     .replace('Õ', "O")
     .replace('õ', "o")
     .replace('Ô', "O")
     .replace('ô', "o")
     .replace('Ú', "U")
     .replace('ú', "u")
     .replace('Ü', "U")
     .replace('ü', "u")
     .replace('º', ".")
     .replace('ª', ".")
     .replace('–', "-")
     .replace('—', "-")
}
