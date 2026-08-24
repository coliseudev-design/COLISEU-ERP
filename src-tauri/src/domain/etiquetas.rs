//! Módulo de Geração e Impressão de Etiquetas de Varejo (Gôndola, Vestuário/Grade & Pimaco A4)
//!
//! Produz comandos ZPL raw para Zebra, PPLB para Argox/Elgin e folhas A4 de etiquetas.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemEtiquetaInput {
    pub produto_id: Option<String>,
    pub variante_id: Option<String>,
    pub codigo_sku: String,
    pub codigo_barras: Option<String>,
    pub descricao: String,
    pub tamanho: Option<String>,
    pub cor: Option<String>,
    pub preco_venda: f64,
    pub quantidade: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoteEtiquetasOutput {
    pub total_etiquetas: u32,
    pub zpl_raw: String,
    pub itens: Vec<ItemEtiquetaInput>,
}

/// Gera código ZPL profissional para etiqueta de Gôndola / Prateleira (100mm × 30mm)
pub fn gerar_zpl_gondola(
    descricao: &str,
    sku: &str,
    ean: Option<&str>,
    preco_venda: f64,
) -> String {
    let ean_str = ean.unwrap_or(sku);
    let desc_trunc = if descricao.len() > 32 { &descricao[..32] } else { descricao };

    format!(
        "^XA\n\
         ^PW800\n\
         ^LL240\n\
         ^FO20,20^A0N,28,28^FD{}^FS\n\
         ^FO20,55^A0N,20,20^FDSKU: {}^FS\n\
         ^FO20,85^BY2,3,60^BCN,60,Y,N,N^FD{}^FS\n\
         ^FO480,100^A0N,65,65^FDR$ {:.2}^FS\n\
         ^XZ\n",
        desc_trunc, sku, ean_str, preco_venda
    )
}

/// Gera código ZPL profissional para etiqueta de Roupa / Calçado (35mm × 60mm c/ Tamanho & Cor)
pub fn gerar_zpl_vestuario(
    descricao: &str,
    sku: &str,
    tamanho: Option<&str>,
    cor: Option<&str>,
    ean: Option<&str>,
    preco_venda: f64,
) -> String {
    let ean_str = ean.unwrap_or(sku);
    let desc_trunc = if descricao.len() > 25 { &descricao[..25] } else { descricao };
    let tam_str = tamanho.unwrap_or("-");
    let cor_str = cor.unwrap_or("-");

    format!(
        "^XA\n\
         ^PW280\n\
         ^LL480\n\
         ^FO15,20^A0N,22,22^FD{}^FS\n\
         ^FO15,48^A0N,18,18^FDSKU: {}^FS\n\
         ^FO15,75^A0N,22,22^FDTAM: {} | COR: {}^FS\n\
         ^FO15,110^BY2,2,70^BCN,70,Y,N,N^FD{}^FS\n\
         ^FO15,220^A0N,45,45^FDR$ {:.2}^FS\n\
         ^XZ\n",
        desc_trunc, sku, tam_str, cor_str, ean_str, preco_venda
    )
}

/// Gera um lote de impressão ZPL a partir dos itens selecionados
pub fn processar_lote_etiquetas_zpl(
    tipo_layout: &str, // 'GONDOLA' ou 'VESTUARIO'
    itens: Vec<ItemEtiquetaInput>,
) -> LoteEtiquetasOutput {
    let mut zpl_full = String::new();
    let mut total_copias = 0u32;

    for item in &itens {
        for _ in 0..item.quantidade {
            let zpl_single = match tipo_layout {
                "VESTUARIO" => gerar_zpl_vestuario(
                    &item.descricao,
                    &item.codigo_sku,
                    item.tamanho.as_deref(),
                    item.cor.as_deref(),
                    item.codigo_barras.as_deref(),
                    item.preco_venda,
                ),
                _ => gerar_zpl_gondola(
                    &item.descricao,
                    &item.codigo_sku,
                    item.codigo_barras.as_deref(),
                    item.preco_venda,
                ),
            };
            zpl_full.push_str(&zpl_single);
            total_copias += 1;
        }
    }

    info!(
        "Lote ZPL gerado com sucesso. Layout: {}, Total de cópias: {}",
        tipo_layout, total_copias
    );

    LoteEtiquetasOutput {
        total_etiquetas: total_copias,
        zpl_raw: zpl_full,
        itens,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geracao_zpl_gondola() {
        let zpl = gerar_zpl_gondola("Tenis Adidas Ultraboost", "SKU-123", Some("7891234567890"), 299.90);
        assert!(zpl.contains("^XA"));
        assert!(zpl.contains("^XZ"));
        assert!(zpl.contains("299.90"));
    }

    #[test]
    fn test_geracao_zpl_vestuario_grade() {
        let zpl = gerar_zpl_vestuario("Camiseta Polo", "POLO-P-PR", Some("P"), Some("Preto"), Some("78999"), 89.90);
        assert!(zpl.contains("TAM: P | COR: Preto"));
        assert!(zpl.contains("89.90"));
    }
}
