//! Cliente de Comunicação TCP Socket com ACBrMonitorPLUS
//!
//! Protocolo ACBr:
//! Envia comando com terminação `\r\n.\r\n`
//! Recebe resposta iniciando com `OK: ` ou `ERRO: ` e terminando com `\r\n.\r\n`.

use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;
use tracing::info;

const DEFAULT_TIMEOUT_SECS: u64 = 25;

/// Envia um comando textual para o ACBrMonitorPLUS via TCP Socket e aguarda a resposta.
pub async fn enviar_comando_acbr(
    host: &str,
    port: u16,
    comando: &str,
) -> Result<String, String> {
    let addr = format!("{}:{}", host, port);
    info!("Conectando ao ACBrMonitorPLUS em {}...", addr);

    let mut stream = match timeout(Duration::from_secs(4), TcpStream::connect(&addr)).await {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => {
            return Err(format!(
                "Não foi possível conectar ao ACBrMonitorPLUS em {} (Porta {}). Verifique se o ACBrMonitorPLUS está aberto e configurado em Modo TCP na porta {}. Erro: {}",
                host, port, port, e
            ));
        }
        Err(_) => {
            return Err(format!(
                "Tempo limite de conexão esgotado ao tentar alcançar o ACBrMonitorPLUS em {}:{}.",
                host, port
            ));
        }
    };

    // Lê eventual mensagem de boas-vindas do ACBr (ex: "ACBrMonitorPLUS Ver. 1.4.0.xxx\r\n")
    let mut initial_buf = [0u8; 1024];
    if let Ok(Ok(n)) = timeout(Duration::from_millis(500), stream.read(&mut initial_buf)).await {
        if n > 0 {
            let welcome = String::from_utf8_lossy(&initial_buf[..n]);
            info!("Boas-vindas do ACBr: {}", welcome.trim());
        }
    }

    // Formata o comando com a terminação do protocolo ACBr
    let cmd_formatado = if comando.ends_with("\r\n.\r\n") {
        comando.to_string()
    } else if comando.ends_with("\r\n") {
        format!("{}.\r\n", comando)
    } else {
        format!("{}\r\n.\r\n", comando)
    };

    if let Err(e) = stream.write_all(cmd_formatado.as_bytes()).await {
        return Err(format!("Falha ao enviar comando para o ACBr: {}", e));
    }

    // Lê a resposta completa
    let mut response_bytes = Vec::new();
    let mut temp_buf = [0u8; 4096];
    let end_marker = "\r\n.\r\n";

    let read_result = timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS), async {
        loop {
            match stream.read(&mut temp_buf).await {
                Ok(0) => break, // Socket fechado
                Ok(n) => {
                    response_bytes.extend_from_slice(&temp_buf[..n]);
                    let current_str = String::from_utf8_lossy(&response_bytes);
                    if current_str.contains(end_marker) {
                        break;
                    }
                }
                Err(e) => {
                    return Err(format!("Erro ao ler resposta do ACBr: {}", e));
                }
            }
        }
        Ok(())
    })
    .await;

    match read_result {
        Ok(Ok(())) => {
            let resp_str = String::from_utf8_lossy(&response_bytes).to_string();
            let clean_resp = resp_str
                .replace(end_marker, "")
                .trim()
                .to_string();

            if clean_resp.starts_with("OK:") {
                let payload = clean_resp.trim_start_matches("OK:").trim().to_string();
                Ok(payload)
            } else if clean_resp.starts_with("ERRO:") {
                let err_msg = clean_resp.trim_start_matches("ERRO:").trim().to_string();
                Err(err_msg)
            } else {
                Ok(clean_resp)
            }
        }
        Ok(Err(e)) => Err(e),
        Err(_) => Err(format!(
            "Tempo limite de {} segundos esgotado aguardando resposta da SEFAZ pelo ACBr.",
            DEFAULT_TIMEOUT_SECS
        )),
    }
}

/// 1. Testa a conexão e versão do ACBrMonitorPLUS
pub async fn testar_conexao(host: &str, port: u16) -> Result<String, String> {
    enviar_comando_acbr(host, port, "NFE.StatusServico").await
}

/// 2. Consulta Status do Serviço na SEFAZ via ACBr
pub async fn consultar_status_servico(host: &str, port: u16) -> Result<String, String> {
    enviar_comando_acbr(host, port, "NFE.StatusServico").await
}

/// 3. Cria e Transmite NF-e/NFC-e via ACBr (recebe arquivo INI ou conteúdo)
pub async fn criar_enviar_nfe(
    host: &str,
    port: u16,
    ini_ou_xml: &str,
    num_lote: u32,
    imprime_danfe: bool,
    sincrono: bool,
) -> Result<String, String> {
    let sinc_flag = if sincrono { "1" } else { "0" };
    let imp_flag = if imprime_danfe { "1" } else { "0" };
    
    // Salva o INI temporário para passar o caminho ou envia direto
    let temp_file = std::env::temp_dir().join(format!("acbr_nfe_{}.ini", num_lote));
    if let Err(e) = std::fs::write(&temp_file, ini_ou_xml.as_bytes()) {
        return Err(format!("Erro ao criar arquivo temporário da NF-e: {}", e));
    }

    let cmd = format!(
        r#"NFE.CriarEnviarNFe("{}", {}, {}, {})"#,
        temp_file.display().to_string().replace('\\', "/"),
        num_lote,
        imp_flag,
        sinc_flag
    );

    enviar_comando_acbr(host, port, &cmd).await
}

/// 4. Consulta Chave de Acesso na SEFAZ
pub async fn consultar_chave(host: &str, port: u16, chave: &str) -> Result<String, String> {
    let cmd = format!(r#"NFE.Consultar("{}")"#, chave);
    enviar_comando_acbr(host, port, &cmd).await
}

/// 5. Cancelamento de NF-e na SEFAZ
pub async fn cancelar_nfe(
    host: &str,
    port: u16,
    chave: &str,
    justificativa: &str,
    cnpj: &str,
) -> Result<String, String> {
    let clean_cnpj = cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cmd = format!(
        r#"NFE.CancelarNFe("{}", "{}", "{}")"#,
        chave, justificativa, clean_cnpj
    );
    enviar_comando_acbr(host, port, &cmd).await
}

/// 6. Inutilização de Numeração na SEFAZ
pub async fn inutilizar_nfe(
    host: &str,
    port: u16,
    cnpj: &str,
    justificativa: &str,
    ano: u32,
    modelo: u32,
    serie: u32,
    num_ini: u32,
    num_fim: u32,
) -> Result<String, String> {
    let clean_cnpj = cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cmd = format!(
        r#"NFE.InutilizarNFe("{}", "{}", {}, {}, {}, {}, {})"#,
        clean_cnpj, justificativa, ano, modelo, serie, num_ini, num_fim
    );
    enviar_comando_acbr(host, port, &cmd).await
}

/// 7. Carta de Correção Eletrônica (CC-e)
pub async fn carta_correcao(
    host: &str,
    port: u16,
    chave: &str,
    texto_correcao: &str,
    cnpj: &str,
    seq_evento: u32,
) -> Result<String, String> {
    let clean_cnpj = cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cmd = format!(
        r#"NFE.CartaDeCorrecao("[CCE]\r\nchave={}\r\ntexto={}\r\nCNPJ={}\r\nnSeqEvento={}")"#,
        chave, texto_correcao, clean_cnpj, seq_evento
    );
    enviar_comando_acbr(host, port, &cmd).await
}

/// 8. Gera DANFE em PDF a partir do XML
pub async fn imprimir_danfe_pdf(host: &str, port: u16, caminho_xml: &str) -> Result<String, String> {
    let cmd = format!(r#"NFE.ImprimirDANFEPDF("{}")"#, caminho_xml.replace('\\', "/"));
    enviar_comando_acbr(host, port, &cmd).await
}

/// 9. Obtém lista de certificados instalados conhecidos pelo ACBr
pub async fn obter_certificados(host: &str, port: u16) -> Result<Vec<String>, String> {
    let resp = enviar_comando_acbr(host, port, "NFE.ObterCertificados").await?;
    let lista = resp
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    Ok(lista)
}
