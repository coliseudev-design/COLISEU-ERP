use printpdf::{BuiltinFont, IndirectFontRef, PdfDocumentReference};

pub struct DanfseFonts {
    pub font_arial: IndirectFontRef,
    pub font_arial_bold: IndirectFontRef,
    pub font_sans: IndirectFontRef,
}

impl DanfseFonts {
    pub fn load(doc: &PdfDocumentReference) -> Result<Self, String> {
        let font_arial = doc.add_builtin_font(BuiltinFont::Helvetica)
            .map_err(|e| format!("Erro ao adicionar fonte Helvetica ao PDF: {:?}", e))?;

        let font_arial_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)
            .map_err(|e| format!("Erro ao adicionar fonte HelveticaBold ao PDF: {:?}", e))?;

        let font_sans = doc.add_builtin_font(BuiltinFont::Helvetica)
            .map_err(|e| format!("Erro ao adicionar fonte Helvetica ao PDF: {:?}", e))?;

        Ok(DanfseFonts {
            font_arial,
            font_arial_bold,
            font_sans,
        })
    }
}
