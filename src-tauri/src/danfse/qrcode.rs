use printpdf::*;
use printpdf::path::{PaintMode, WindingOrder};
use qrcode::{QrCode, Color as QrColor};

/// Desenha o QR Code diretamente no PDF como vetor nativo (sem PNG/XObject).
pub fn draw_qrcode_vector(
    current_layer: &PdfLayerReference,
    chave_acesso: &str,
    origin_x: Mm,
    origin_y: Mm,
    total_size: Mm,
) -> Result<(), String> {
    let url = format!("https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave={}", chave_acesso.trim());
    let code = QrCode::new(url.as_bytes()).map_err(|e| format!("Erro ao gerar QR Code: {}", e))?;

    let width = code.width();
    let module_size = total_size.0 / width as f32;

    current_layer.set_fill_color(Color::Greyscale(Greyscale::new(0.0, None)));

    for y in 0..width {
        for x in 0..width {
            if code[(x, y)] == QrColor::Dark {
                let px = origin_x.0 + (x as f32 * module_size);
                let py = origin_y.0 + ((width - 1 - y) as f32 * module_size);

                let points = vec![
                    (Point::new(Mm(px), Mm(py)), false),
                    (Point::new(Mm(px + module_size), Mm(py)), false),
                    (Point::new(Mm(px + module_size), Mm(py + module_size)), false),
                    (Point::new(Mm(px), Mm(py + module_size)), false),
                ];
                let polygon = Polygon {
                    rings: vec![points],
                    mode: PaintMode::Fill,
                    winding_order: WindingOrder::NonZero,
                };
                current_layer.add_polygon(polygon);
            }
        }
    }

    Ok(())
}

/// Gera a imagem PNG do QR Code em bytes para compatibilidade.
pub fn generate_danfse_qrcode_png(chave_acesso: &str) -> Result<Vec<u8>, String> {
    use ::image::Luma;
    use std::io::Cursor;

    let url = format!("https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave={}", chave_acesso.trim());
    
    let code = QrCode::new(url.as_bytes()).map_err(|e| format!("Erro ao gerar QR Code: {}", e))?;
    let image = code.render::<Luma<u8>>().min_dimensions(300, 300).build();
    
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    
    image.write_to(&mut cursor, ::image::ImageFormat::Png)
        .map_err(|e| format!("Erro ao codificar QR Code PNG: {}", e))?;
        
    Ok(buffer)
}
