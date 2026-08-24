use std::collections::HashMap;

/// Retorna "Município / UF" dado o código IBGE de 7 dígitos.
pub fn lookup_municipio_ibge(code: &str) -> String {
    let mut map = HashMap::new();
    map.insert("5002704", "DOURADOS / MS");
    map.insert("3550308", "SÃO PAULO / SP");
    map.insert("3304557", "RIO DE JANEIRO / RJ");
    map.insert("3106200", "BELO HORIZONTE / MG");
    map.insert("4113700", "LONDRINA / PR");
    map.insert("4106902", "CURITIBA / PR");
    map.insert("4314902", "PORTO ALEGRE / RS");
    map.insert("5300108", "BRASÍLIA / DF");
    map.insert("2927408", "SALVADOR / BA");
    map.insert("2304400", "FORTALEZA / CE");
    map.insert("2611606", "RECIFE / PE");
    map.insert("5208707", "GOIÂNIA / GO");
    map.insert("1501402", "BELÉM / PA");
    map.insert("1302603", "MANAUS / AM");
    map.insert("3509502", "CAMPINAS / SP");
    map.insert("3543402", "RIBEIRÃO PRETO / SP");
    map.insert("3549805", "SÃO JOSÉ DO RIO PRETO / SP");
    
    if let Some(&name) = map.get(code) {
        name.to_string()
    } else {
        format!("MUNICÍPIO IBGE {}", code)
    }
}
