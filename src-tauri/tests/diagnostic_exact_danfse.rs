/// Standalone reproduction of the exact DANFSe rendering flow.
/// This test generates a PDF matching the exact structure of renderer.rs + blocks.rs
/// to isolate where the rendering breaks.
use printpdf::*;
use printpdf::path::{PaintMode, WindingOrder};
use std::fs::File;
use std::io::BufWriter;

#[test]
fn test_exact_danfse_reproduction() {
    let (doc, page1, layer1) = PdfDocument::new(
        "DANFSe - Documento Auxiliar da NFS-e Nacional",
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // === Border (from renderer.rs) ===
    current_layer.set_outline_thickness(1.0);
    current_layer.set_outline_color(Color::Greyscale(Greyscale::new(0.0, None)));
    let border_points = vec![
        (Point::new(Mm(1.5), Mm(1.5)), false),
        (Point::new(Mm(208.5), Mm(1.5)), false),
        (Point::new(Mm(208.5), Mm(295.5)), false),
        (Point::new(Mm(1.5), Mm(295.5)), false),
    ];
    let border_polygon = Polygon {
        rings: vec![border_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    };
    current_layer.add_polygon(border_polygon);

    // === Fonts ===
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    // === BLOCK 1: Header (draw_header) ===
    let fill_bg = Color::Greyscale(Greyscale::new(0.95, None));
    let stroke_color = Color::Greyscale(Greyscale::new(0.0, None));
    current_layer.set_fill_color(fill_bg);
    current_layer.set_outline_color(stroke_color);
    current_layer.set_outline_thickness(0.5);
    let h_points = vec![
        (Point::new(Mm(3.0), Mm(285.4)), false),
        (Point::new(Mm(207.0), Mm(285.4)), false),
        (Point::new(Mm(207.0), Mm(294.0)), false),
        (Point::new(Mm(3.0), Mm(294.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![h_points],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });

    // NO IMAGE - just text
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("DANFSe v2.0", 8.5, Mm(85.0), Mm(290.5), &font_bold);
    current_layer.use_text("Documento Auxiliar da NFS-e", 8.5, Mm(72.0), Mm(286.8), &font_bold);

    // Homologation warning
    current_layer.set_fill_color(Color::Cmyk(Cmyk::new(0.0, 1.0, 1.0, 0.0, None)));
    current_layer.use_text("NFS-e SEM VALIDADE JURIDICA", 8.5, Mm(73.0), Mm(282.5), &font_bold);

    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("Municipio: SAO PAULO / SP", 7.5, Mm(156.2), Mm(291.0), &font);
    current_layer.use_text("Ambiente Gerador: Sistema Nacional NFS-e", 6.0, Mm(156.2), Mm(288.3), &font);
    current_layer.use_text("Ambiente: Homologacao", 6.0, Mm(156.2), Mm(285.8), &font);

    // === BLOCK 2: Identification (draw_identification) ===
    current_layer.set_outline_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.set_outline_thickness(0.5);
    let id_points = vec![
        (Point::new(Mm(3.0), Mm(256.0)), false),
        (Point::new(Mm(207.0), Mm(256.0)), false),
        (Point::new(Mm(207.0), Mm(284.0)), false),
        (Point::new(Mm(3.0), Mm(284.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![id_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });

    // NO QR CODE - just text
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("CHAVE DE ACESSO DA NFS-E", 6.5, Mm(5.0), Mm(280.5), &font_bold);
    current_layer.use_text("35260805766577000122100100000000011000000000123456", 8.0, Mm(5.0), Mm(277.0), &font);
    current_layer.use_text("NUMERO DA NFS-E", 6.5, Mm(5.0), Mm(273.5), &font_bold);
    current_layer.use_text("1", 6.5, Mm(5.0), Mm(270.5), &font);
    current_layer.use_text("COMPETENCIA DA NFS-E", 6.5, Mm(54.1), Mm(273.5), &font_bold);
    current_layer.use_text("14/08/2026", 6.5, Mm(54.1), Mm(270.5), &font);
    current_layer.use_text("DATA E HORA DA EMISSAO DA NFS-E", 6.5, Mm(105.1), Mm(273.5), &font_bold);
    current_layer.use_text("14/08/2026 10:00:00", 6.5, Mm(105.1), Mm(270.5), &font);

    // === BLOCK 3: Prestador (draw_prestador) ===
    // Box header
    let prest_points = vec![
        (Point::new(Mm(3.0), Mm(227.0)), false),
        (Point::new(Mm(207.0), Mm(227.0)), false),
        (Point::new(Mm(207.0), Mm(254.0)), false),
        (Point::new(Mm(3.0), Mm(254.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![prest_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });
    // Title bar
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.95, None)));
    let title_points = vec![
        (Point::new(Mm(3.0), Mm(249.0)), false),
        (Point::new(Mm(207.0), Mm(249.0)), false),
        (Point::new(Mm(207.0), Mm(254.0)), false),
        (Point::new(Mm(3.0), Mm(254.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![title_points],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("PRESTADOR / FORNECEDOR", 7.0, Mm(5.0), Mm(250.2), &font_bold);
    current_layer.use_text("CNPJ / CPF / NIF", 6.0, Mm(5.0), Mm(245.5), &font_bold);
    current_layer.use_text("05.766.577/0001-22", 6.5, Mm(5.0), Mm(242.5), &font);
    current_layer.use_text("NOME / NOME EMPRESARIAL", 6.0, Mm(5.0), Mm(239.0), &font_bold);
    current_layer.use_text("Piveta Distribuidora de Tintas Automotivas LTDA", 6.5, Mm(5.0), Mm(236.0), &font);
    current_layer.use_text("MUNICIPIO / SIGLA UF", 6.0, Mm(105.1), Mm(239.0), &font_bold);
    current_layer.use_text("SAO PAULO / SP", 6.5, Mm(105.1), Mm(236.0), &font);

    // === BLOCK 4: Tomador ===
    let tom_points = vec![
        (Point::new(Mm(3.0), Mm(203.0)), false),
        (Point::new(Mm(207.0), Mm(203.0)), false),
        (Point::new(Mm(207.0), Mm(225.0)), false),
        (Point::new(Mm(3.0), Mm(225.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![tom_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });
    let ttitle_points = vec![
        (Point::new(Mm(3.0), Mm(220.0)), false),
        (Point::new(Mm(207.0), Mm(220.0)), false),
        (Point::new(Mm(207.0), Mm(225.0)), false),
        (Point::new(Mm(3.0), Mm(225.0)), false),
    ];
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.95, None)));
    current_layer.add_polygon(Polygon {
        rings: vec![ttitle_points],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("TOMADOR / ADQUIRENTE", 7.0, Mm(5.0), Mm(221.2), &font_bold);
    current_layer.use_text("CNPJ / CPF / NIF", 6.0, Mm(5.0), Mm(216.5), &font_bold);
    current_layer.use_text("123.456.789-01", 6.5, Mm(5.0), Mm(213.5), &font);
    current_layer.use_text("NOME / NOME EMPRESARIAL", 6.0, Mm(54.1), Mm(216.5), &font_bold);
    current_layer.use_text("CLIENTE TESTE NT008", 6.5, Mm(54.1), Mm(213.5), &font);

    // === BLOCK 5: Servico ===
    let serv_points = vec![
        (Point::new(Mm(3.0), Mm(160.0)), false),
        (Point::new(Mm(207.0), Mm(160.0)), false),
        (Point::new(Mm(207.0), Mm(201.0)), false),
        (Point::new(Mm(3.0), Mm(201.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![serv_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });
    let stitle = vec![
        (Point::new(Mm(3.0), Mm(196.0)), false),
        (Point::new(Mm(207.0), Mm(196.0)), false),
        (Point::new(Mm(207.0), Mm(201.0)), false),
        (Point::new(Mm(3.0), Mm(201.0)), false),
    ];
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.95, None)));
    current_layer.add_polygon(Polygon {
        rings: vec![stitle],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("SERVICO PRESTADO", 7.0, Mm(5.0), Mm(197.2), &font_bold);
    current_layer.use_text("DESCRICAO DO SERVICO", 6.0, Mm(5.0), Mm(186.0), &font_bold);
    current_layer.use_text("Manutencao de software ERP", 6.5, Mm(5.0), Mm(182.5), &font);

    // === BLOCK 6: Valores Totais ===
    let val_points = vec![
        (Point::new(Mm(3.0), Mm(135.0)), false),
        (Point::new(Mm(207.0), Mm(135.0)), false),
        (Point::new(Mm(207.0), Mm(158.0)), false),
        (Point::new(Mm(3.0), Mm(158.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![val_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });
    let vtitle = vec![
        (Point::new(Mm(3.0), Mm(153.0)), false),
        (Point::new(Mm(207.0), Mm(153.0)), false),
        (Point::new(Mm(207.0), Mm(158.0)), false),
        (Point::new(Mm(3.0), Mm(158.0)), false),
    ];
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.95, None)));
    current_layer.add_polygon(Polygon {
        rings: vec![vtitle],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("VALOR TOTAL DA NFS-E", 7.0, Mm(5.0), Mm(154.2), &font_bold);
    current_layer.use_text("VALOR DA OPERACAO / SERVICO", 6.0, Mm(5.0), Mm(148.5), &font_bold);
    current_layer.use_text("R$ 500.00", 7.5, Mm(5.0), Mm(144.5), &font);
    current_layer.use_text("VALOR LIQUIDO DA NFS-E", 6.0, Mm(156.2), Mm(148.5), &font_bold);
    current_layer.use_text("R$ 500.00", 8.0, Mm(156.2), Mm(144.5), &font_bold);

    // === BLOCK 7: Info Complementares ===
    let info_points = vec![
        (Point::new(Mm(3.0), Mm(45.0)), false),
        (Point::new(Mm(207.0), Mm(45.0)), false),
        (Point::new(Mm(207.0), Mm(133.0)), false),
        (Point::new(Mm(3.0), Mm(133.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![info_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });
    let ititle = vec![
        (Point::new(Mm(3.0), Mm(128.0)), false),
        (Point::new(Mm(207.0), Mm(128.0)), false),
        (Point::new(Mm(207.0), Mm(133.0)), false),
        (Point::new(Mm(3.0), Mm(133.0)), false),
    ];
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.95, None)));
    current_layer.add_polygon(Polygon {
        rings: vec![ititle],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("INFORMACOES COMPLEMENTARES", 7.0, Mm(5.0), Mm(129.2), &font_bold);
    current_layer.use_text("Inf. Compl.: Documento emitido por ME ou EPP optante pelo Simples Nacional.", 6.0, Mm(5.0), Mm(122.0), &font);

    // === BLOCK 8: Canhoto ===
    let canhoto_points = vec![
        (Point::new(Mm(3.0), Mm(5.0)), false),
        (Point::new(Mm(207.0), Mm(5.0)), false),
        (Point::new(Mm(207.0), Mm(38.0)), false),
        (Point::new(Mm(3.0), Mm(38.0)), false),
    ];
    current_layer.add_polygon(Polygon {
        rings: vec![canhoto_points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    });
    let ctitle = vec![
        (Point::new(Mm(3.0), Mm(33.0)), false),
        (Point::new(Mm(207.0), Mm(33.0)), false),
        (Point::new(Mm(207.0), Mm(38.0)), false),
        (Point::new(Mm(3.0), Mm(38.0)), false),
    ];
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.95, None)));
    current_layer.add_polygon(Polygon {
        rings: vec![ctitle],
        mode: PaintMode::FillStroke,
        winding_order: WindingOrder::NonZero,
    });
    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));
    current_layer.use_text("CANHOTO DE RECEBIMENTO (OPCIONAL)", 7.0, Mm(5.0), Mm(34.2), &font_bold);
    current_layer.use_text("DATA DE CIENTIFICACAO", 6.0, Mm(5.0), Mm(28.0), &font_bold);
    current_layer.use_text("_____ / _____ / _________", 7.0, Mm(5.0), Mm(22.0), &font);

    // Save the PDF
    let temp_dir = std::env::temp_dir();
    let pdf_path = temp_dir.join("diagnostic_exact_danfse.pdf");
    
    let file = File::create(&pdf_path).unwrap();
    doc.save(&mut BufWriter::new(file)).unwrap();

    let metadata = std::fs::metadata(&pdf_path).unwrap();
    println!("Exact DANFSe PDF generated: {:?}", pdf_path);
    println!("File size: {} bytes", metadata.len());
    assert!(metadata.len() > 1000, "PDF too small");

    // Open for visual inspection
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", &pdf_path.to_string_lossy()])
            .spawn();
    }
}
