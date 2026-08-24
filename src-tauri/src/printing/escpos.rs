//! Driver de Impressão Térmica ESC/POS e Gerador de Layout DANFE NFC-e
//!
//! Suporta impressoras de 80mm (48 colunas) e 58mm (32 colunas) via portas USB/Serial/Rede.
//! Suporta emissão normal e emissão em Contingência Offline (2 vias: Via Consumidor / Via Estabelecimento).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DanfeItem {
    pub codigo: String,
    pub descricao: String,
    pub quantidade: f64,
    pub unidade: String,
    pub preco_unitario: f64,
    pub valor_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DanfePagamento {
    pub forma: String,
    pub valor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DanfeDados {
    pub razaca_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: String,
    pub ie: Option<String>,
    pub endereco: Option<String>,
    pub numero_venda: i32,
    pub itens: Vec<DanfeItem>,
    pub pagamentos: Vec<DanfePagamento>,
    pub subtotal: f64,
    pub desconto: f64,
    pub total: f64,
    pub chave_acesso: String,
    pub n_prot: Option<String>,
    pub dh_emi: String,
    pub tp_emis: u32, // 1 = Normal, 9 = Contingência
    pub qrcode_url: String,
    pub largura_mm: u32, // 80 ou 58
}

/// Construtor de comandos binários ESC/POS.
#[derive(Clone)]
pub struct EscPosBuilder {
    buffer: Vec<u8>,
    max_cols: usize,
}

impl EscPosBuilder {
    pub fn new(largura_mm: u32) -> Self {
        let max_cols = if largura_mm == 58 { 32 } else { 48 };
        let mut builder = Self {
            buffer: Vec::new(),
            max_cols,
        };
        builder.init();
        builder
    }

    /// Comandos de Inicialização ESC @ (0x1B 0x40)
    pub fn init(&mut self) -> &mut Self {
        self.buffer.extend_from_slice(&[0x1B, 0x40]);
        self
    }

    /// Alinhamento do texto: 0 = Esquerda, 1 = Centro, 2 = Direita
    pub fn align(&mut self, alignment: u8) -> &mut Self {
        self.buffer.extend_from_slice(&[0x1B, 0x61, alignment % 3]);
        self
    }

    /// Ativa (true) ou desativa (false) Negrito (ESC E n)
    pub fn bold(&mut self, enable: bool) -> &mut Self {
        self.buffer.extend_from_slice(&[0x1B, 0x45, if enable { 1 } else { 0 }]);
        self
    }

    /// Tamanho do texto (GS ! n)
    /// 0x00 = Normal, 0x11 = Duplo Largura e Altura, 0x10 = Duplo Altura, 0x01 = Duplo Largura
    pub fn font_size(&mut self, size: u8) -> &mut Self {
        self.buffer.extend_from_slice(&[0x1D, 0x21, size]);
        self
    }

    /// Adiciona linha de texto com quebra automática baseada no número de colunas da impressora.
    pub fn text_line(&mut self, text: &str) -> &mut Self {
        let clean_text = text.replace('\n', "");
        self.buffer.extend_from_slice(clean_text.as_bytes());
        self.buffer.push(0x0A); // LF
        self
    }

    /// Adiciona uma linha divisória pontilhada do tamanho exato da largura do papel.
    pub fn divider(&mut self) -> &mut Self {
        let sep = "-".repeat(self.max_cols);
        self.text_line(&sep)
    }

    /// Adiciona uma linha com texto alinhado à esquerda e valor alinhado à direita.
    pub fn left_right_line(&mut self, left: &str, right: &str) -> &mut Self {
        let right_len = right.len();
        if left.len() + right_len + 1 >= self.max_cols {
            let truncated_left = if left.len() > self.max_cols - right_len - 1 {
                &left[..self.max_cols - right_len - 1]
            } else {
                left
            };
            let spaces = self.max_cols.saturating_sub(truncated_left.len() + right_len);
            let line = format!("{}{}{}", truncated_left, " ".repeat(spaces), right);
            self.text_line(&line);
        } else {
            let spaces = self.max_cols - left.len() - right_len;
            let line = format!("{}{}{}", left, " ".repeat(spaces), right);
            self.text_line(&line);
        }
        self
    }

    /// Adiciona instrução de QR Code nativo ESC/POS (GS ( k ...)
    pub fn qrcode(&mut self, url: &str) -> &mut Self {
        self.align(1); // Centraliza QR Code

        let store_len = url.len() + 3;
        let p_l = (store_len % 256) as u8;
        let p_h = (store_len / 256) as u8;

        // Model 2 QR Code setup
        self.buffer.extend_from_slice(&[0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
        // Module size = 4
        self.buffer.extend_from_slice(&[0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04]);
        // Error correction level L
        self.buffer.extend_from_slice(&[0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x44, 0x30]);
        // Store data
        self.buffer.extend_from_slice(&[0x1D, 0x28, 0x6B, p_l, p_h, 0x31, 0x50, 0x30]);
        self.buffer.extend_from_slice(url.as_bytes());
        // Print QR Code
        self.buffer.extend_from_slice(&[0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);

        self.text_line("");
        self.align(0);
        self
    }

    /// Avança `n` linhas (ESC d n)
    pub fn feed(&mut self, lines: u8) -> &mut Self {
        self.buffer.extend_from_slice(&[0x1B, 0x64, lines]);
        self
    }

    /// Executa o corte parcial do papel (GS V 66 0)
    pub fn cut(&mut self) -> &mut Self {
        self.feed(4);
        self.buffer.extend_from_slice(&[0x1D, 0x56, 0x42, 0x00]);
        self
    }

    /// Consome o builder e retorna os bytes ESC/POS gerados.
    pub fn build(self) -> Vec<u8> {
        self.buffer
    }
}

/// Gera a sequência completa de comandos ESC/POS para o DANFE NFC-e.
/// Se `tp_emis == 9` (Contingência Offline), gera automaticamente 2 vias (Via Consumidor / Via Estabelecimento).
pub fn gerar_bytes_danfe_nfce(dados: &DanfeDados) -> Vec<u8> {
    let mut builder = EscPosBuilder::new(dados.largura_mm);

    let vias = if dados.tp_emis == 9 { 2 } else { 1 };

    for via in 1..=vias {
        // Cabeçalho da Empresa
        builder
            .align(1)
            .bold(true)
            .font_size(0x01)
            .text_line(&dados.razaca_social);

        if let Some(ref fantasia) = dados.nome_fantasia {
            builder.text_line(fantasia);
        }

        builder
            .bold(false)
            .font_size(0x00)
            .text_line(&format!("CNPJ: {}", dados.cnpj));

        if let Some(ref ie) = dados.ie {
            builder.text_line(&format!("IE: {}", ie));
        }

        if let Some(ref end) = dados.endereco {
            builder.text_line(end);
        }

        builder.divider();

        // Título do Documento
        builder
            .align(1)
            .bold(true)
            .text_line("DANFE NFC-e - Documento Auxiliar")
            .text_line("Nota Fiscal de Consumidor Eletronica");

        if dados.tp_emis == 9 {
            let via_str = if via == 1 {
                "Via Consumidor"
            } else {
                "Via Estabelecimento"
            };
            builder
                .font_size(0x10)
                .text_line("** EMITIDA EM CONTINGENCIA **")
                .text_line(&format!("** {} **", via_str))
                .font_size(0x00);
        }

        builder.bold(false).align(0).divider();

        // Cabeçalho dos Itens
        builder
            .bold(true)
            .left_right_line("ITEM COD DESCRICAO", "QTD x UNIT = TOTAL")
            .bold(false)
            .divider();

        // Lista de Itens
        for (idx, item) in dados.itens.iter().enumerate() {
            let item_num = idx + 1;
            let desc_line = format!("{:03} {} {}", item_num, item.codigo, item.descricao);
            let val_line = format!(
                "{:.2} {} x {:.2} = {:.2}",
                item.quantidade, item.unidade, item.preco_unitario, item.valor_total
            );

            builder.left_right_line(&desc_line, &val_line);
        }

        builder.divider();

        // Totais
        builder
            .left_right_line("QTD. TOTAL DE ITENS", &dados.itens.len().to_string())
            .left_right_line("VALOR SUBTOTAL", &format!("R$ {:.2}", dados.subtotal));

        if dados.desconto > 0.0 {
            builder.left_right_line("VALOR DESCONTO", &format!("- R$ {:.2}", dados.desconto));
        }

        builder
            .bold(true)
            .font_size(0x01)
            .left_right_line("VALOR TOTAL", &format!("R$ {:.2}", dados.total))
            .font_size(0x00)
            .bold(false)
            .divider();

        // Formas de Pagamento
        builder.bold(true).text_line("FORMA DE PAGAMENTO").bold(false);
        for pag in &dados.pagamentos {
            builder.left_right_line(&pag.forma, &format!("R$ {:.2}", pag.valor));
        }

        builder.divider();

        // Informações de Emissão e Chave de Acesso
        builder
            .align(1)
            .text_line("CHAVE DE ACESSO")
            .bold(true)
            .text_line(&crate::fiscal::chave::formatar_chave_acesso(&dados.chave_acesso))
            .bold(false);

        if let Some(ref prot) = dados.n_prot {
            builder.text_line(&format!("Protocolo de Autorizacao: {}", prot));
        } else if dados.tp_emis == 9 {
            builder.text_line("Emissao em Contingencia Offline - Pendente de envio");
        }

        builder.text_line(&format!("Data/Hora Emissao: {}", dados.dh_emi));
        builder.divider();

        // QR Code NFC-e
        builder
            .align(1)
            .text_line("Consulta via leitor de QR Code:")
            .qrcode(&dados.qrcode_url);

        builder.cut();
    }

    builder.build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escpos_builder_basico() {
        let mut builder = EscPosBuilder::new(80);
        builder.align(1).bold(true).text_line("TESTE IMPRESSORA").cut();
        let bytes = builder.build();

        assert!(!bytes.is_empty());
        assert_eq!(bytes[0], 0x1B);
        assert_eq!(bytes[1], 0x40); // ESC @
    }

    #[test]
    fn test_gerar_bytes_danfe_contingencia_duas_vias() {
        let dados = DanfeDados {
            razaca_social: "Mercado Silva LTDA".to_string(),
            nome_fantasia: Some("Supermercado Silva".to_string()),
            cnpj: "12.345.678/0001-95".to_string(),
            ie: Some("123456789".to_string()),
            endereco: Some("Rua das Flores, 123 - Centro".to_string()),
            numero_venda: 501,
            itens: vec![DanfeItem {
                codigo: "P001".to_string(),
                descricao: "Cafe Torrado 500g".to_string(),
                quantidade: 2.0,
                unidade: "UN".to_string(),
                preco_unitario: 15.0,
                valor_total: 30.0,
            }],
            pagamentos: vec![DanfePagamento {
                forma: "DINHEIRO".to_string(),
                valor: 30.0,
            }],
            subtotal: 30.0,
            desconto: 0.0,
            total: 30.0,
            chave_acesso: "352608123456780001650010000001009876543210".to_string(),
            n_prot: None,
            dh_emi: "2026-08-13T14:30:00-03:00".to_string(),
            tp_emis: 9, // Contingência
            qrcode_url: "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=123".to_string(),
            largura_mm: 80,
        };

        let bytes = gerar_bytes_danfe_nfce(&dados);
        let text_output = String::from_utf8_lossy(&bytes);

        assert!(text_output.contains("EMITIDA EM CONTINGENCIA"));
        assert!(text_output.contains("Via Consumidor"));
        assert!(text_output.contains("Via Estabelecimento"));
    }
}
