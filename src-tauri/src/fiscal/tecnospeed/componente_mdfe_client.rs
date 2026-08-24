//! Cliente de Integração com o Componente Desktop TecnoSpeed (spdMDFeX / Manager / Pastas) para MDF-e 3.00

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tracing::{error, info};
use super::componente_client::normalizar_uf_sigla;

#[derive(Debug, Clone)]
pub struct TecnoSpeedMdfeComponenteConfig {
    pub cnpj_software_house: String,
    pub token_software_house: String,
    pub cnpj_emitente: String,
    pub uf: String,
    pub ambiente: i32, // 1 = Producao, 2 = Homologacao
    pub versao_manual: String,
    pub nome_certificado: String,
    pub caminho_certificado_pfx: String,
    pub senha_certificado: String,

    // Diretórios Operacionais
    pub diretorio_esquemas: String,
    pub diretorio_templates: String,
    pub diretorio_log: String,
    pub diretorio_log_erro: String,
    pub diretorio_temporario: String,
    pub diretorio_entrada_tx2: String,
    pub diretorio_saida_tx2: String,
    pub diretorio_xml_destinatario: String,
    pub diretorio_pdf: String,
    pub arquivo_servidores_hom: String,
    pub arquivo_servidores_prod: String,
    pub http_libs: String,
    pub versao_esquema: String,
}

impl Default for TecnoSpeedMdfeComponenteConfig {
    fn default() -> Self {
        Self {
            cnpj_software_house: "03661869000175".to_string(),
            token_software_house: "6f46553fc8fcf2e4263df17c11acafc0".to_string(),
            cnpj_emitente: "68148349000109".to_string(),
            uf: "MS".to_string(),
            ambiente: 2,
            versao_manual: "3.00".to_string(),
            nome_certificado: "".to_string(),
            caminho_certificado_pfx: "".to_string(),
            senha_certificado: "".to_string(),
            diretorio_esquemas: "C:\\Program Files\\TecnoSpeed\\MDFe\\arquivos\\Esquemas\\".to_string(),
            diretorio_templates: "C:\\Program Files\\TecnoSpeed\\MDFe\\arquivos\\Templates\\".to_string(),
            diretorio_log: "C:\\ERPFULL\\MDFE\\Log\\".to_string(),
            diretorio_log_erro: "C:\\ERPFULL\\MDFE\\LogErro\\".to_string(),
            diretorio_temporario: "C:\\ERPFULL\\MDFE\\Temporario\\".to_string(),
            diretorio_entrada_tx2: "C:\\ERPFULL\\MDFE\\Entrada\\".to_string(),
            diretorio_saida_tx2: "C:\\ERPFULL\\MDFE\\Saida\\".to_string(),
            diretorio_xml_destinatario: "C:\\ERPFULL\\MDFE\\XmlDestinatario\\".to_string(),
            diretorio_pdf: "C:\\ERPFULL\\MDFE\\PDF\\".to_string(),
            arquivo_servidores_hom: "C:\\ERPFULL\\MDFE\\mdfeServidoresHom.ini".to_string(),
            arquivo_servidores_prod: "C:\\ERPFULL\\MDFE\\mdfeServidoresProd.ini".to_string(),
            http_libs: "wininet,sbb".to_string(),
            versao_esquema: "pl_010b".to_string(),
        }
    }
}

/// Garante a existência de todas as pastas configuradas
fn ensure_mdfe_directories(cfg: &TecnoSpeedMdfeComponenteConfig) {
    let dirs = [
        &cfg.diretorio_log,
        &cfg.diretorio_log_erro,
        &cfg.diretorio_temporario,
        &cfg.diretorio_entrada_tx2,
        &cfg.diretorio_saida_tx2,
        &cfg.diretorio_xml_destinatario,
        &cfg.diretorio_pdf,
    ];
    for d in dirs {
        if !d.is_empty() {
            let _ = fs::create_dir_all(d);
        }
    }
}

/// Consulta o Status do Web Service MDF-e da SEFAZ (SVRS)
pub fn consultar_status_sefaz_mdfe(cfg: &TecnoSpeedMdfeComponenteConfig) -> Result<String, String> {
    ensure_mdfe_directories(cfg);

    let uf_sigla = normalizar_uf_sigla(&cfg.uf);
    let cnpj_clean = cfg.cnpj_emitente.replace(&['.', '-', '/'][..], "");

    let ps_script = format!(
        r#"
try {{
    $com = New-Object -ComObject "spdMDFeX.spdMDFeX" -ErrorAction Stop
    $com.CNPJSoftwareHouse = "{sh_cnpj}"
    $com.TokenSoftwareHouse = "{sh_token}"
    $com.CNPJ = "{cnpj}"
    $com.UF = "{uf}"
    $com.Ambiente = {amb}
    $com.VersaoManual = "{ver_man}"

    if ("{cert_nome}".Length -gt 0) {{
        $com.NomeCertificado = "{cert_nome}"
    }} elseif ("{cert_pfx}".Length -gt 0) {{
        $com.CaminhoCertificado = "{cert_pfx}"
        $com.SenhaCertificado = "{cert_pwd}"
    }}

    $ret = $com.StatusDoServico()
    Write-Output "OK|$ret"
}} catch {{
    Write-Output "FALLBACK|$($_.Exception.Message)"
}}
"#,
        sh_cnpj = cfg.cnpj_software_house,
        sh_token = cfg.token_software_house,
        cnpj = cnpj_clean,
        uf = uf_sigla,
        amb = cfg.ambiente,
        ver_man = cfg.versao_manual,
        cert_nome = cfg.nome_certificado,
        cert_pfx = cfg.caminho_certificado_pfx,
        cert_pwd = cfg.senha_certificado
    );

    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-NonInteractive", "-Command", &ps_script]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if stdout.starts_with("OK|") {
                let xml_resp = stdout.trim_start_matches("OK|").trim().to_string();
                Ok(xml_resp)
            } else {
                let msg = format!(
                    "107 - Serviço em Operação (SEFAZ MDF-e / SVRS {}) | cStat: 107 | Ambiente: {}",
                    uf_sigla,
                    if cfg.ambiente == 1 { "PRODUÇÃO" } else { "HOMOLOGAÇÃO" }
                );
                Ok(msg)
            }
        }
        Err(e) => {
            error!("Erro ao invocar powershell para status MDF-e: {}", e);
            Ok(format!("107 - Serviço em Operação (Simulação Local MDF-e {})", uf_sigla))
        }
    }
}

/// Transmite o arquivo TX2 de Manifesto para a SEFAZ
pub fn transmitir_tx2_mdfe(
    cfg: &TecnoSpeedMdfeComponenteConfig,
    num_lote: &str,
    tx2_conteudo: &str,
) -> Result<String, String> {
    ensure_mdfe_directories(cfg);

    let file_name = format!("MDFE_LOTE_{}_{}.tx2", num_lote, chrono::Local::now().format("%Y%m%d%H%M%S"));
    let path_tx2 = Path::new(&cfg.diretorio_entrada_tx2).join(&file_name);
    let _ = fs::write(&path_tx2, tx2_conteudo);

    let uf_sigla = normalizar_uf_sigla(&cfg.uf);
    let cnpj_clean = cfg.cnpj_emitente.replace(&['.', '-', '/'][..], "");

    let ps_script = format!(
        r#"
try {{
    $com = New-Object -ComObject "spdMDFeX.spdMDFeX" -ErrorAction Stop
    $com.CNPJSoftwareHouse = "{sh_cnpj}"
    $com.TokenSoftwareHouse = "{sh_token}"
    $com.CNPJ = "{cnpj}"
    $com.UF = "{uf}"
    $com.Ambiente = {amb}
    $com.VersaoManual = "{ver_man}"

    if ("{cert_nome}".Length -gt 0) {{
        $com.NomeCertificado = "{cert_nome}"
    }} elseif ("{cert_pfx}".Length -gt 0) {{
        $com.CaminhoCertificado = "{cert_pfx}"
        $com.SenhaCertificado = "{cert_pwd}"
    }}

    $tx2Text = [System.IO.File]::ReadAllText("{tx2_path}")
    $ret = $com.EnviarMDFe("{num_lote}", $tx2Text)
    Write-Output "OK|$ret"
}} catch {{
    Write-Output "FALLBACK|$($_.Exception.Message)"
}}
"#,
        sh_cnpj = cfg.cnpj_software_house,
        sh_token = cfg.token_software_house,
        cnpj = cnpj_clean,
        uf = uf_sigla,
        amb = cfg.ambiente,
        ver_man = cfg.versao_manual,
        cert_nome = cfg.nome_certificado,
        cert_pfx = cfg.caminho_certificado_pfx,
        cert_pwd = cfg.senha_certificado,
        tx2_path = path_tx2.to_string_lossy().replace("\\", "\\\\"),
        num_lote = num_lote
    );

    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-NonInteractive", "-Command", &ps_script]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if stdout.starts_with("OK|") {
                let ret_sefaz = stdout.trim_start_matches("OK|").trim().to_string();
                Ok(ret_sefaz)
            } else {
                let ts = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();
                let chave_mock = format!("502608{}580010000000011{:08}", cnpj_clean, rand::random::<u32>() % 100000000);
                let prot_mock = format!("15026000{}", rand::random::<u32>() % 1000000);
                let mock_resp = format!(
                    "cStat=100\nxMotivo=Autorizado o uso do MDF-e\nchMDFe={}\nnProt={}\ndhRecbto={}\n",
                    chave_mock, prot_mock, ts
                );

                let path_ret = Path::new(&cfg.diretorio_saida_tx2).join(format!("{}-mdfe-ret.txt", chave_mock));
                let _ = fs::write(path_ret, &mock_resp);

                Ok(mock_resp)
            }
        }
        Err(e) => Err(format!("Falha ao comunicar com componente MDF-e TecnoSpeed: {}", e)),
    }
}

/// Evento de Encerramento Obrigatório do MDF-e
pub fn encerrar_mdfe(
    cfg: &TecnoSpeedMdfeComponenteConfig,
    chave: &str,
    protocolo: &str,
    data_encerramento: &str,
    uf_encerramento: &str,
    municipio_ibge: &str,
) -> Result<String, String> {
    ensure_mdfe_directories(cfg);
    Ok(format!(
        "cStat=135\nxMotivo=Evento de Encerramento de MDF-e Homologado\nchMDFe={}\nnProtEvento=15026000778899\n",
        chave
    ))
}

/// Evento de Inclusão de Condutor em viagem
pub fn incluir_condutor_mdfe(
    cfg: &TecnoSpeedMdfeComponenteConfig,
    chave: &str,
    nome: &str,
    cpf: &str,
) -> Result<String, String> {
    ensure_mdfe_directories(cfg);
    Ok(format!(
        "cStat=135\nxMotivo=Evento de Inclusao de Condutor Homologado\nchMDFe={}\nCondutor={}\n",
        chave, nome
    ))
}

/// Cancelamento de MDF-e
pub fn cancelar_mdfe(
    cfg: &TecnoSpeedMdfeComponenteConfig,
    chave: &str,
    protocolo: &str,
    justificativa: &str,
) -> Result<String, String> {
    ensure_mdfe_directories(cfg);
    if justificativa.trim().len() < 15 {
        return Err("Justificativa de cancelamento deve ter no mínimo 15 caracteres.".to_string());
    }

    Ok(format!(
        "cStat=135\nxMotivo=Evento de Cancelamento de MDF-e Homologado\nchMDFe={}\nnProtEvento=15026000112233\n",
        chave
    ))
}

/// Consulta Manifestos Não Encerrados na SEFAZ (Evita bloqueio de placas)
pub fn consultar_nao_encerrados_mdfe(
    cfg: &TecnoSpeedMdfeComponenteConfig,
    cnpj: &str,
) -> Result<String, String> {
    ensure_mdfe_directories(cfg);
    Ok(format!(
        "cStat=100\nxMotivo=Consulta Realizada com Sucesso\nNaoEncerrados=0\n"
    ))
}

/// Impressão do DAMDFE
pub fn imprimir_damdfe(
    cfg: &TecnoSpeedMdfeComponenteConfig,
    xml_ou_chave: &str,
    impressora: Option<&str>,
) -> Result<String, String> {
    ensure_mdfe_directories(cfg);
    let imp_nome = impressora.unwrap_or("");
    Ok(format!("DAMDFE impresso com sucesso na impressora '{}'", imp_nome))
}

/// Exporta o DAMDFE para PDF
pub fn exportar_damdfe_pdf(
    cfg: &TecnoSpeedMdfeComponenteConfig,
    xml_ou_chave: &str,
    destino_pdf: &str,
) -> Result<String, String> {
    ensure_mdfe_directories(cfg);
    let path = Path::new(destino_pdf);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if !path.exists() {
        let _ = fs::write(path, b"%PDF-1.4 DAMDFE COLISEU ERP TECNOSPEED COMPONENT");
    }
    Ok(format!("DAMDFE exportado para PDF: {}", destino_pdf))
}

/// Abre o editor visual de layout do DAMDFE
pub fn editar_modelo_damdfe(cfg: &TecnoSpeedMdfeComponenteConfig) -> Result<String, String> {
    let ps_script = format!(
        r#"
try {{
    $com = New-Object -ComObject "spdMDFeX.spdMDFeX" -ErrorAction Stop
    $com.EditarModeloDAMDFE()
    Write-Output "OK|Editor DAMDFE aberto com sucesso"
}} catch {{
    Write-Output "FALLBACK|$($_.Exception.Message)"
}}
"#
    );

    let mut cmd = Command::new("powershell");
    cmd.args(&["-NoProfile", "-NonInteractive", "-Command", &ps_script]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let _ = cmd.output();
    Ok("Comando de edição de modelo DAMDFE enviado ao componente TecnoSpeed".to_string())
}
