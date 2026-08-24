use printpdf::*;
use crate::danfse::fonts::DanfseFonts;

pub fn render_watermark(current_layer: &PdfLayerReference, fonts: &DanfseFonts, text: &str) {
    let color = Color::Greyscale(Greyscale::new(0.65, None)); // Cinza K35
    current_layer.set_fill_color(color);


    // Renderizar texto grande diagonal no centro da página A4
    current_layer.use_text(text, 55.0, Mm(40.0), Mm(130.0), &fonts.font_arial);
}

