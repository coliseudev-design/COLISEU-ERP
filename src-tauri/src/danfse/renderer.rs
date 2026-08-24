use printpdf::*;
use printpdf::path::{PaintMode, WindingOrder};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;
use crate::danfse::model::DanfseData;
use crate::danfse::fonts::DanfseFonts;
use crate::danfse::blocks::*;
use crate::danfse::watermark::render_watermark;

pub fn render_danfse_pdf(data: &DanfseData, output_path: &Path) -> Result<String, String> {
    let (doc, page1, layer1) = PdfDocument::new(
        "DANFSe - Documento Auxiliar da NFS-e Nacional",
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Borda externa de 1pt em volta de toda a página A4 (conforme item 2.2.3)
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

    // Carregar fontes do sistema Windows
    let fonts = DanfseFonts::load(&doc)?;

    // Renderizar os 13 blocos oficiais do DANFSe NT-008 em ordem
    draw_header(&current_layer, &fonts, data)?;
    draw_identification(&current_layer, &fonts, data)?;
    draw_prestador(&current_layer, &fonts, data)?;
    draw_tomador(&current_layer, &fonts, data)?;
    draw_destinatario(&current_layer, &fonts, data)?;
    draw_intermediario(&current_layer, &fonts, data)?;
    draw_servico(&current_layer, &fonts, data)?;
    draw_trib_issqn(&current_layer, &fonts, data)?;
    draw_trib_federal(&current_layer, &fonts, data)?;
    draw_trib_ibs_cbs(&current_layer, &fonts, data)?;
    draw_valores_totais(&current_layer, &fonts, data)?;
    draw_info_complementares(&current_layer, &fonts, data)?;
    draw_canhoto(&current_layer, &fonts, data)?;

    // Marcas d'água
    if data.cancelada {
        render_watermark(&current_layer, &fonts, "CANCELADA");
    } else if data.substituida {
        render_watermark(&current_layer, &fonts, "SUBSTITUÍDA");
    }

    // Se o diretório pai não existir, criar
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Erro ao criar pasta para DANFSe: {}", e))?;
    }

    let file = File::create(output_path)
        .map_err(|e| format!("Erro ao criar arquivo PDF {:?}: {}", output_path, e))?;

    doc.save(&mut BufWriter::new(file))
        .map_err(|e| format!("Erro ao salvar arquivo PDF DANFSe: {:?}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}
