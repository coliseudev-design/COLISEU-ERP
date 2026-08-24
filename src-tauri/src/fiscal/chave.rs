//! Módulo de Geração e Validação de Chave de Acesso de 44 Dígitos (SEFAZ Módulo 11)
//!
//! Suporta Modelos 55 (NF-e) e 65 (NFC-e) segundo especificações do Manual de Orientação do Contribuinte (MOC).

use rand::Rng;

/// Calcula o Dígito Verificador (DV) usando o algoritmo Módulo 11 com pesos de 2 a 9 (direita para a esquerda).
///
/// # Regras SEFAZ:
/// - Pesos: 2, 3, 4, 5, 6, 7, 8, 9 repetidos da direita para a esquerda sobre os 43 dígitos.
/// - Soma = Soma dos produtos de cada dígito pelo seu peso.
/// - Resto = Soma % 11.
/// - Se Resto == 0 ou Resto == 1, DV = 0.
/// - Caso contrário, DV = 11 - Resto.
pub fn calcular_modulo_11(chave_43: &str) -> Result<u32, String> {
    if chave_43.len() != 43 {
        return Err(format!(
            "Chave base deve ter exatamente 43 dígitos, possui {}",
            chave_43.len()
        ));
    }

    if !chave_43.chars().all(|c| c.is_ascii_digit()) {
        return Err("Chave base deve conter apenas dígitos numéricos".to_string());
    }

    let mut soma: u32 = 0;
    let mut peso: u32 = 2;

    // Percorre da direita para a esquerda (do 43º dígito ao 1º)
    for c in chave_43.chars().rev() {
        let digito = c.to_digit(10).unwrap();
        soma += digito * peso;
        peso += 1;
        if peso > 9 {
            peso = 2;
        }
    }

    let resto = soma % 11;
    let dv = if resto == 0 || resto == 1 {
        0
    } else {
        11 - resto
    };

    Ok(dv)
}

/// Gera uma Chave de Acesso de 44 dígitos para NF-e (55) ou NFC-e (65).
///
/// # Parâmetros:
/// - `uf`: Código IBGE da UF (ex: 35 para SP, 33 para RJ)
/// - `aamm`: Ano e mês de emissão (ex: "2608" para Agosto/2026)
/// - `cnpj`: CNPJ do emitente (apenas números, 14 dígitos)
/// - `modelo`: Modelo fiscal (55 para NF-e, 65 para NFC-e)
/// - `serie`: Série do documento (1 a 999)
/// - `numero`: Número do documento (1 a 999.999.999)
/// - `tp_emis`: Tipo de emissão (1 = Normal, 9 = Contingência Offline NFC-e)
/// - `c_nf`: Código numérico aleatório de 8 dígitos (se 0, é gerado aleatoriamente)
pub fn gerar_chave_acesso(
    uf: u32,
    aamm: &str,
    cnpj: &str,
    modelo: u32,
    serie: u32,
    numero: u32,
    tp_emis: u32,
    c_nf: u32,
) -> Result<String, String> {
    let clean_cnpj: String = cnpj.chars().filter(|c| c.is_ascii_digit()).collect();
    if clean_cnpj.len() != 14 {
        return Err(format!(
            "CNPJ inválido: deve conter 14 dígitos numéricos, possui {}",
            clean_cnpj.len()
        ));
    }

    let clean_aamm: String = aamm.chars().filter(|c| c.is_ascii_digit()).collect();
    if clean_aamm.len() != 4 {
        return Err(format!(
            "AAMM inválido: deve conter 4 dígitos (AAMM), possui '{}'",
            aamm
        ));
    }

    if modelo != 55 && modelo != 65 {
        return Err(format!("Modelo inválido: deve ser 55 ou 65, recebido {}", modelo));
    }

    let codigo_numerico = if c_nf == 0 {
        let mut rng = rand::thread_rng();
        rng.gen_range(10_000_000..99_999_999)
    } else {
        c_nf % 100_000_000
    };

    let chave_43 = format!(
        "{:02}{:04}{}{:02}{:03}{:09}{:1}{:08}",
        uf,
        clean_aamm,
        clean_cnpj,
        modelo,
        serie,
        numero,
        tp_emis,
        codigo_numerico
    );

    let dv = calcular_modulo_11(&chave_43)?;
    Ok(format!("{}{}", chave_43, dv))
}

/// Valida se uma Chave de Acesso de 44 dígitos possui formato e Módulo 11 corretos.
pub fn validar_chave_acesso(chave_44: &str) -> bool {
    let clean_chave: String = chave_44.chars().filter(|c| c.is_ascii_digit()).collect();
    if clean_chave.len() != 44 {
        return false;
    }

    let chave_43 = &clean_chave[..43];
    let dv_esperado = clean_chave[43..].parse::<u32>().ok();

    match (calcular_modulo_11(chave_43), dv_esperado) {
        (Ok(dv_calculado), Some(dv_exp)) => dv_calculado == dv_exp,
        _ => false,
    }
}

/// Formata a Chave de Acesso de 44 dígitos em blocos de 4 dígitos para exibição.
pub fn formatar_chave_acesso(chave_44: &str) -> String {
    let clean: String = chave_44.chars().filter(|c| c.is_ascii_digit()).collect();
    if clean.len() != 44 {
        return chave_44.to_string();
    }

    clean
        .as_bytes()
        .chunks(4)
        .map(|chunk| std::str::from_utf8(chunk).unwrap_or(""))
        .collect::<Vec<&str>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_modulo_11_valido() {
        // Chave de 43 dígitos de teste conhecida
        let chave_43 = "3526080000000000000155001000000001112345678";
        let dv = calcular_modulo_11(chave_43).unwrap();
        let chave_44 = format!("{}{}", chave_43, dv);
        assert!(validar_chave_acesso(&chave_44));
    }

    #[test]
    fn test_gerar_chave_acesso_nfce() {
        let chave = gerar_chave_acesso(
            35,
            "2608",
            "12.345.678/0001-95",
            65,
            1,
            100,
            1,
            87654321,
        )
        .unwrap();

        assert_eq!(chave.len(), 44);
        assert!(chave.starts_with("3526081234567800019565001000000100187654321"));
        assert!(validar_chave_acesso(&chave));
    }
}
