//! Cliente de Comunicação com o TecnoSpeed Manager Desktop / Componente Delphi (HTTP :8081 e Pastas)

use std::time::Duration;
use tracing::{info, warn};

pub struct ManagerConfig<'a> {
    pub host: &'a str,
    pub port: u16,
    pub cnpj: &'a str,
    pub grupo: &'a str,
    pub usuario: &'a str,
    pub senha: &'a str,
}

fn build_url(host: &str, port: u16, path: &str) -> String {
    let clean_host = host.trim().trim_end_matches('/');
    if clean_host.starts_with("http://") || clean_host.starts_with("https://") {
        format!("{}:{}/ManagerAPIWeb/nfe/{}", clean_host, port, path)
    } else {
        format!("http://{}:{}/ManagerAPIWeb/nfe/{}", clean_host, port, path)
    }
}

/// 1. Testa a Conexão com o TecnoSpeed Manager
pub async fn testar_conexao(cfg: ManagerConfig<'_>) -> Result<String, String> {
    let url = build_url(cfg.host, cfg.port, "status");
    let clean_cnpj = cfg.cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    info!("Testando conexão com TecnoSpeed Manager em {}...", url);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let mut req = client.get(&url)
        .query(&[("Grupo", cfg.grupo), ("Cnpj", &clean_cnpj)]);

    if !cfg.usuario.trim().is_empty() {
        req = req.basic_auth(cfg.usuario, Some(cfg.senha));
    }

    let resp = req.send().await.map_err(|e| {
        format!(
            "Não foi possível conectar ao TecnoSpeed Manager em {}:{}. Verifique se o Manager Desktop está aberto e em execução no Windows: {}",
            cfg.host, cfg.port, e
        )
    })?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();

    if status.is_success() || text.contains("STATUS") || text.contains("OK") || text.contains("107") || text.contains("Servico em Operacao") {
        Ok(format!("Conexão com TecnoSpeed Manager OK! Retorno: {}", text.trim()))
    } else {
        Err(format!("TecnoSpeed Manager retornou HTTP {}: {}", status, text))
    }
}

/// 2. Consulta Status do Serviço SEFAZ via TecnoSpeed Manager
pub async fn consultar_status_sefaz(cfg: ManagerConfig<'_>) -> Result<String, String> {
    let url = build_url(cfg.host, cfg.port, "status");
    let clean_cnpj = cfg.cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let mut req = client.get(&url)
        .query(&[("Grupo", cfg.grupo), ("Cnpj", &clean_cnpj)]);

    if !cfg.usuario.trim().is_empty() {
        req = req.basic_auth(cfg.usuario, Some(cfg.senha));
    }

    let resp = req.send().await.map_err(|e| format!("Erro ao consultar status SEFAZ no TecnoSpeed Manager: {}", e))?;
    let text = resp.text().await.unwrap_or_default();
    Ok(text)
}

/// 3. Envia Arquivo TX2 para Autorização de NF-e / NFC-e no TecnoSpeed Manager
pub async fn enviar_tx2(cfg: ManagerConfig<'_>, tx2_conteudo: &str) -> Result<String, String> {
    let url = build_url(cfg.host, cfg.port, "envia");
    let clean_cnpj = cfg.cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let params = [
        ("Grupo", cfg.grupo),
        ("Cnpj", &clean_cnpj),
        ("Arquivo", tx2_conteudo),
    ];

    let mut req = client.post(&url).form(&params);
    if !cfg.usuario.trim().is_empty() {
        req = req.basic_auth(cfg.usuario, Some(cfg.senha));
    }

    let resp = req.send().await.map_err(|e| format!("Falha ao transmitir TX2 para o TecnoSpeed Manager: {}", e))?;
    let text = resp.text().await.unwrap_or_default();
    Ok(text)
}

/// 4. Cancela NF-e / NFC-e no TecnoSpeed Manager
pub async fn cancelar_nfe(
    cfg: ManagerConfig<'_>,
    chave: &str,
    justificativa: &str,
) -> Result<String, String> {
    let url = build_url(cfg.host, cfg.port, "cancela");
    let clean_cnpj = cfg.cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let params = [
        ("Grupo", cfg.grupo),
        ("Cnpj", &clean_cnpj),
        ("Chave", chave),
        ("Justificativa", justificativa),
    ];

    let mut req = client.post(&url).form(&params);
    if !cfg.usuario.trim().is_empty() {
        req = req.basic_auth(cfg.usuario, Some(cfg.senha));
    }

    let resp = req.send().await.map_err(|e| format!("Falha ao cancelar no TecnoSpeed Manager: {}", e))?;
    let text = resp.text().await.unwrap_or_default();
    Ok(text)
}

/// 5. Inutiliza Faixa Numérica no TecnoSpeed Manager
pub async fn inutilizar_nfe(
    cfg: ManagerConfig<'_>,
    ano: u32,
    modelo: u32,
    serie: u32,
    num_ini: u32,
    num_fim: u32,
    justificativa: &str,
) -> Result<String, String> {
    let url = build_url(cfg.host, cfg.port, "inutiliza");
    let clean_cnpj = cfg.cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let params = [
        ("Grupo", cfg.grupo),
        ("Cnpj", &clean_cnpj),
        ("Ano", &ano.to_string()),
        ("Modelo", &modelo.to_string()),
        ("Serie", &serie.to_string()),
        ("NumeroInicial", &num_ini.to_string()),
        ("NumeroFinal", &num_fim.to_string()),
        ("Justificativa", justificativa),
    ];

    let mut req = client.post(&url).form(&params);
    if !cfg.usuario.trim().is_empty() {
        req = req.basic_auth(cfg.usuario, Some(cfg.senha));
    }

    let resp = req.send().await.map_err(|e| format!("Falha ao inutilizar no TecnoSpeed Manager: {}", e))?;
    let text = resp.text().await.unwrap_or_default();
    Ok(text)
}

/// 6. Carta de Correção (CC-e) no TecnoSpeed Manager
pub async fn carta_correcao_nfe(
    cfg: ManagerConfig<'_>,
    chave: &str,
    correcao: &str,
    seq: u32,
) -> Result<String, String> {
    let url = build_url(cfg.host, cfg.port, "correcao");
    let clean_cnpj = cfg.cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let params = [
        ("Grupo", cfg.grupo),
        ("Cnpj", &clean_cnpj),
        ("Chave", chave),
        ("Correcao", correcao),
        ("nSeqEvento", &seq.to_string()),
    ];

    let mut req = client.post(&url).form(&params);
    if !cfg.usuario.trim().is_empty() {
        req = req.basic_auth(cfg.usuario, Some(cfg.senha));
    }

    let resp = req.send().await.map_err(|e| format!("Falha ao enviar CC-e no TecnoSpeed Manager: {}", e))?;
    let text = resp.text().await.unwrap_or_default();
    Ok(text)
}

/// 7. Gera e Obtém o DANFE em PDF do TecnoSpeed Manager
pub async fn imprimir_danfe_pdf(
    cfg: ManagerConfig<'_>,
    chave: &str,
) -> Result<String, String> {
    let url = build_url(cfg.host, cfg.port, "imprime");
    let clean_cnpj = cfg.cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let mut req = client.get(&url)
        .query(&[("Grupo", cfg.grupo), ("Cnpj", &clean_cnpj), ("Chave", chave)]);

    if !cfg.usuario.trim().is_empty() {
        req = req.basic_auth(cfg.usuario, Some(cfg.senha));
    }

    let resp = req.send().await.map_err(|e| format!("Falha ao solicitar DANFE no TecnoSpeed Manager: {}", e))?;
    let text = resp.text().await.unwrap_or_default();
    Ok(text)
}

/// 8. Grava arquivo TX2 na pasta de Entrada monitorada pelo componente TecnoSpeed
pub fn gravar_tx2_pasta_entrada(pasta_entrada: &str, nome_arquivo: &str, conteudo_tx2: &str) -> Result<String, String> {
    let dir = std::path::Path::new(pasta_entrada);
    std::fs::create_dir_all(dir).map_err(|e| format!("Erro ao criar diretório TecnoSpeed: {}", e))?;

    let file_path = dir.join(nome_arquivo);
    std::fs::write(&file_path, conteudo_tx2.as_bytes()).map_err(|e| format!("Erro ao gravar arquivo TX2: {}", e))?;

    info!("Arquivo TX2 gravado com sucesso em: {:?}", file_path);
    Ok(file_path.to_string_lossy().to_string())
}
