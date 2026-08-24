use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tracing::{error, info};

use crate::fiscal::tecnospeed::componente_client::normalizar_uf_sigla;

/// Configurações necessárias para o Componente Desktop TecnoSpeed NFC-e (spdNFCeX)
#[derive(Debug, Clone)]
pub struct TecnoSpeedNfceComponenteConfig {
    pub cnpj_software_house: String,
    pub token_software_house: String,
    pub cnpj_emitente: String,
    pub uf: String,
    pub ambiente: i32, // 1 = Producao, 2 = Homologacao (padrao TecnoSpeed)
    pub versao_manual: String, // "5.0" ou "6.0"
    pub id_token_nfce: String, // Identificador do CSC (ex: "000001" ou "1")
    pub token_nfce: String,    // Código de Segurança do Contribuinte (CSC Token)
    pub nome_certificado: String,
    pub caminho_certificado_pfx: String,
    pub senha_certificado: String,
    pub diretorio_esquemas: String,
    pub diretorio_templates: String,
    pub diretorio_log: String,
    pub diretorio_log_erro: String,
    pub diretorio_temporario: String,
    pub diretorio_xml_destinatario: String,
    pub diretorio_xml_contingencia: String,
    pub arquivo_servidores_hom: String,
    pub arquivo_servidores_prod: String,
    pub modelo_danfce: String,
    pub formato_danfce: String,
    pub impressora_danfce: String,
    pub http_libs: String,
    pub versao_esquema: String,
}

impl Default for TecnoSpeedNfceComponenteConfig {
    fn default() -> Self {
        Self {
            cnpj_software_house: "03661869000175".to_string(),
            token_software_house: "6f46553fc8fcf2e4263df17c11acafc0".to_string(),
            cnpj_emitente: "68148349000109".to_string(),
            uf: "MS".to_string(),
            ambiente: 2,
            versao_manual: "6.0".to_string(),
            id_token_nfce: "000001".to_string(),
            token_nfce: "".to_string(),
            nome_certificado: "".to_string(),
            caminho_certificado_pfx: "".to_string(),
            senha_certificado: "".to_string(),
            diretorio_esquemas: "C:\\ERPFULL\\NFE\\NFCe\\Esquemas\\".to_string(),
            diretorio_templates: "C:\\ERPFULL\\NFE\\NFCe\\Templates\\".to_string(),
            diretorio_log: "C:\\ERPFULL\\NFE\\NFCe\\Log\\".to_string(),
            diretorio_log_erro: "C:\\ERPFULL\\NFE\\NFCe\\Erros\\".to_string(),
            diretorio_temporario: "C:\\ERPFULL\\NFE\\NFCe\\Temp\\".to_string(),
            diretorio_xml_destinatario: "C:\\ERPFULL\\NFE\\NFCe\\XmlDestinatario\\".to_string(),
            diretorio_xml_contingencia: "C:\\ERPFULL\\NFE\\NFCe\\XmlContingencia\\".to_string(),
            arquivo_servidores_hom: "C:\\ERPFULL\\NFE\\nfceServidoresHom.ini".to_string(),
            arquivo_servidores_prod: "C:\\ERPFULL\\NFE\\nfceServidoresProd.ini".to_string(),
            modelo_danfce: "".to_string(),
            formato_danfce: "0".to_string(), // 0 = Padrão / Bobina
            impressora_danfce: "Microsoft Print to PDF".to_string(),
            http_libs: "wininet,sbb".to_string(),
            versao_esquema: "pl_009o".to_string(),
        }
    }
}

/// Garante que os arquivos de licença .dat da TecnoSpeed existam no diretório operacional do ERP
fn ensure_license_files() {
    let app_dirs = [
        "C:\\ERPFULL\\NFE\\NFCe",
        "C:\\ERPFULL\\NFE",
    ];
    let license_files = [
        "spdLicenseNFe.dat",
        "spdLicenseNFCe.dat",
        "spdLicenseNFSeV2.dat",
        "spdLicenseMDFe.dat",
        "spdLicenseCte.dat",
    ];

    for dir in &app_dirs {
        let _ = fs::create_dir_all(dir);
        for file in &license_files {
            let target = Path::new(dir).join(file);
            if !target.exists() {
                let coliseu_source = Path::new("C:\\Coliseu\\Programa").join(file);
                if coliseu_source.exists() {
                    let _ = fs::copy(&coliseu_source, &target);
                }
            }
        }
    }
}

/// Obtém o diretório base operacional do ERP para NFC-e e garante que as subpastas existam
fn get_base_dir() -> PathBuf {
    let base = PathBuf::from("C:\\ERPFULL\\NFE\\NFCe");
    let _ = fs::create_dir_all(&base);
    let _ = fs::create_dir_all(base.join("Log"));
    let _ = fs::create_dir_all(base.join("Erros"));
    let _ = fs::create_dir_all(base.join("Temp"));
    let _ = fs::create_dir_all(base.join("XmlDestinatario"));
    let _ = fs::create_dir_all(base.join("XmlContingencia"));
    base
}

/// Encontra o executável do PowerShell adequado (32-bit SysWOW64 ou padrão)
fn get_powershell_path() -> String {
    let syswow64_ps = "C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe";
    if Path::new(syswow64_ps).exists() {
        syswow64_ps.to_string()
    } else {
        "powershell.exe".to_string()
    }
}

/// Executa um script PowerShell passando o conteúdo temporário com CWD garantido em C:\ERPFULL\NFE\NFCe
fn run_ps_script(script_body: &str) -> Result<String, String> {
    ensure_license_files();
    let ps_exe = get_powershell_path();
    let base_dir = get_base_dir();
    let temp_dir = base_dir.join("Temp");
    let _ = fs::create_dir_all(&temp_dir);

    let temp_script = temp_dir.join(format!(
        "tecnospeed_nfce_call_{}.ps1",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    ));

    if let Err(e) = fs::write(&temp_script, script_body) {
        return Err(format!("Falha ao criar script temporário de NFC-e: {}", e));
    }

    let mut cmd = Command::new(&ps_exe);
    cmd.args(&[
        "-WindowStyle",
        "Hidden",
        "-NonInteractive",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        temp_script.to_str().unwrap_or_default(),
    ]);

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.current_dir(&base_dir);

    let output = cmd.output();
    let _ = fs::remove_file(&temp_script);

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();

            if !out.status.success() && stdout.trim().is_empty() {
                error!("Erro ao executar script do componente TecnoSpeed NFC-e: {}", stderr);
                return Err(format!("Erro no Componente TecnoSpeed NFC-e: {}", stderr));
            }

            if stdout.contains("---TECNOSPEED_ERROR---") {
                let err_msg = stdout.split("---TECNOSPEED_ERROR---").nth(1).unwrap_or(&stdout).trim();
                return Err(err_msg.to_string());
            }

            if stdout.contains("---TECNOSPEED_SUCCESS---") {
                let res = stdout.split("---TECNOSPEED_SUCCESS---").nth(1).unwrap_or(&stdout).trim();
                return Ok(res.to_string());
            }

            Ok(stdout.trim().to_string())
        }
        Err(e) => Err(format!("Falha ao invocar processo do Componente TecnoSpeed NFC-e: {}", e)),
    }
}

/// 1. Consulta Status do Serviço na SEFAZ via Componente spdNFCeX (Mod. 65)
pub fn consultar_status_sefaz_nfce(cfg: &TecnoSpeedNfceComponenteConfig) -> Result<String, String> {
    info!("Consultando Status SEFAZ NFC-e via Componente TecnoSpeed ({})", cfg.uf);

    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cnpj_emit_clean = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    try {{
        $w = New-Object -ComObject WScript.Network
        $w.SetDefaultPrinter("Microsoft Print to PDF")
    }} catch {{}}

    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $env:PATH = "C:\ERPFULL\NFE\NFCe;C:\Coliseu\Programa\NFCe;C:\Coliseu\Programa;" + $env:PATH

    $baseLog = "C:\ERPFULL\NFE\NFCe\Log\"
    $baseLogErr = "C:\ERPFULL\NFE\NFCe\Erros\"
    $baseTemp = "C:\ERPFULL\NFE\NFCe\Temp\"
    $baseXmlDest = "C:\ERPFULL\NFE\NFCe\XmlDestinatario\"
    $baseContingencia = "C:\ERPFULL\NFE\NFCe\XmlContingencia\"

    if (-not (Test-Path $baseLog)) {{ New-Item -ItemType Directory -Path $baseLog -Force | Out-Null }}
    if (-not (Test-Path $baseLogErr)) {{ New-Item -ItemType Directory -Path $baseLogErr -Force | Out-Null }}
    if (-not (Test-Path $baseTemp)) {{ New-Item -ItemType Directory -Path $baseTemp -Force | Out-Null }}
    if (-not (Test-Path $baseXmlDest)) {{ New-Item -ItemType Directory -Path $baseXmlDest -Force | Out-Null }}
    if (-not (Test-Path $baseContingencia)) {{ New-Item -ItemType Directory -Path $baseContingencia -Force | Out-Null }}

    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $n.DiretorioLog = $baseLog
    $n.DiretorioLogErro = $baseLogErr
    $n.DiretorioTemporario = $baseTemp
    $n.DiretorioXmlDestinatario = $baseXmlDest
    try {{ $n.DiretorioXmlContingencia = $baseContingencia }} catch {{}}

    $n.UF = "{uf}"
    $n.Ambiente = {ambiente}
    $n.VersaoManual = "{versao_manual}"
    $n.CNPJ = "{cnpj_emit}"

    if ("{id_token_nfce}" -ne "") {{ $n.IdTokenNFCe = "{id_token_nfce}" }}
    if ("{token_nfce}" -ne "") {{ $n.TokenNFCe = "{token_nfce}" }}

    # Resolução de Certificado
    if ("{caminho_pfx}" -ne "" -and (Test-Path "{caminho_pfx}")) {{
        $n.TipoCertificado = 2
        $n.CaminhoCertificado = "{caminho_pfx}"
        $n.SenhaCertificado = "{senha_cert}"
        $n.NomeCertificado = ""
    }} else {{
        $certsOfficial = $n.ListarCertificados("|")
        $certMatch = $null

        if ("{cnpj_emit}" -ne "" -and "{cnpj_emit}" -ne "00000000000000") {{
            $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*{cnpj_emit}*" }} | Select-Object -First 1)
        }}
        if (-not $certMatch -and "{nome_cert}" -ne "") {{
            if ("{nome_cert}" -match '(\d{{14}})') {{
                $cnpjMatch = $Matches[1]
                $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*$cnpjMatch*" }} | Select-Object -First 1)
            }}
            if (-not $certMatch) {{
                $busca = "{nome_cert}".Split(':')[0].Split('(')[0].Trim()
                if ($busca.Length -ge 4) {{
                    $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*$busca*" }} | Select-Object -First 1)
                }}
            }}
        }}
        if (-not $certMatch) {{
            $certWin = (Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My -ErrorAction SilentlyContinue | Where-Object {{ $_.Subject -match '\d{{14}}' -and $_.NotAfter -gt (Get-Date) }} | Select-Object -First 1)
            if ($certWin) {{
                if ($certWin.Subject -match '(\d{{14}})') {{
                    $cnpjWin = $Matches[1]
                    $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*$cnpjWin*" }} | Select-Object -First 1)
                }}
            }}
        }}

        if ($certMatch) {{
            $n.TipoCertificado = 0
            $n.NomeCertificado = $certMatch
            if ($certMatch -match '(\d{{14}})') {{
                $n.CNPJ = $Matches[1]
            }}
        }} else {{
            throw "Certificado Digital não encontrado no repositório do Windows para NFC-e."
        }}
    }}

    # Auto-resolução de Esquemas NFC-e
    $candEsquemasNfce = @(
        "{esquemas}",
        "{esquemas}\NFCe\Esquemas\",
        "{esquemas}\Esquemas\",
        "C:\ERPFULL\NFE\NFCe\Esquemas\",
        "C:\ERPFULL\NFE\Esquemas\",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\Esquemas\",
        "C:\Coliseu\Programa\NFCe\Esquemas\"
    )
    foreach ($c in $candEsquemasNfce) {{
        if ($c -ne "" -and ((Test-Path "$c\vm60\Mapping.txt") -or (Test-Path "$c\vm50b\Mapping.txt") -or (Test-Path "$c\Mapping.txt"))) {{
            $n.DiretorioEsquemas = $c
            break
        }}
    }}
    if (-not $n.DiretorioEsquemas -and (Test-Path "{esquemas}")) {{ $n.DiretorioEsquemas = "{esquemas}" }}

    # Auto-resolução de Templates NFC-e
    $candTemplatesNfce = @(
        "{templates}",
        "{templates}\NFCe\Templates\",
        "{templates}\Templates\",
        "C:\ERPFULL\NFE\NFCe\Templates\",
        "C:\ERPFULL\NFE\Templates\",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\Templates\",
        "C:\Coliseu\Programa\NFCe\Templates\"
    )
    foreach ($t in $candTemplatesNfce) {{
        if ($t -ne "" -and ((Test-Path "$t\vm60\Conversor\NFCeDataSets.xml") -or (Test-Path "$t\vm50b\Conversor\NFCeDataSets.xml") -or (Test-Path "$t\Conversor\NFCeDataSets.xml"))) {{
            $n.DiretorioTemplates = $t
            break
        }}
    }}
    if (-not $n.DiretorioTemplates -and (Test-Path "{templates}")) {{ $n.DiretorioTemplates = "{templates}" }}

    # Auto-resolução de Servidores INI NFC-e
    $candHomNfce = @(
        "{servidores_hom}",
        "C:\ERPFULL\NFE\nfceServidoresHom.ini",
        "C:\Coliseu\Programa\nfceServidoresHom.ini",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\nfceServidoresHom.ini"
    )
    foreach ($sh in $candHomNfce) {{
        if ($sh -ne "" -and (Test-Path $sh)) {{ $n.ArquivoServidoresHom = $sh; break }}
    }}

    $candProdNfce = @(
        "{servidores_prod}",
        "C:\ERPFULL\NFE\nfceServidoresProd.ini",
        "C:\Coliseu\Programa\nfceServidoresProd.ini",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\nfceServidoresProd.ini"
    )
    foreach ($sp in $candProdNfce) {{
        if ($sp -ne "" -and (Test-Path $sp)) {{ $n.ArquivoServidoresProd = $sp; break }}
    }}

    $n.IgnoreInvalidCertificates = $true
    try {{ $n.HttpLibs = "WinINet" }} catch {{}}

    $retorno = $n.StatusDoServico()
    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host $retorno
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        uf = normalizar_uf_sigla(&cfg.uf),
        cnpj_emit = cnpj_emit_clean,
        ambiente = cfg.ambiente,
        versao_manual = cfg.versao_manual,
        id_token_nfce = cfg.id_token_nfce.trim(),
        token_nfce = cfg.token_nfce.trim(),
        nome_cert = cfg.nome_certificado.replace('"', "`\""),
        caminho_pfx = cfg.caminho_certificado_pfx.replace('\\', "\\\\"),
        senha_cert = cfg.senha_certificado.replace('"', "`\""),
        esquemas = cfg.diretorio_esquemas.replace('\\', "\\\\"),
        templates = cfg.diretorio_templates.replace('\\', "\\\\"),
        servidores_hom = cfg.arquivo_servidores_hom.replace('\\', "\\\\"),
        servidores_prod = cfg.arquivo_servidores_prod.replace('\\', "\\\\")
    );

    run_ps_script(&script)
}

/// 2. Transmite NFC-e (Layout TX2) via Componente spdNFCeX (Mod. 65)
pub fn transmitir_tx2_nfce(
    cfg: &TecnoSpeedNfceComponenteConfig,
    num_lote: &str,
    tx2_conteudo: &str,
    sincrono: bool,
) -> Result<String, String> {
    info!("Transmitindo NFC-e via Componente TecnoSpeed (Lote: {}, Síncrono: {})", num_lote, sincrono);

    let base_dir = get_base_dir();
    let temp_dir = base_dir.join("Temp");
    let tx2_file = temp_dir.join(format!("nfce_{}.tx2", num_lote));

    if let Err(e) = fs::write(&tx2_file, tx2_conteudo.as_bytes()) {
        return Err(format!("Falha ao salvar TX2 temporário de NFC-e: {}", e));
    }

    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cnpj_emit_clean = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    try {{
        $w = New-Object -ComObject WScript.Network
        $w.SetDefaultPrinter("Microsoft Print to PDF")
    }} catch {{}}

    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $env:PATH = "C:\ERPFULL\NFE\NFCe;C:\Coliseu\Programa\NFCe;C:\Coliseu\Programa;" + $env:PATH

    $baseLog = "C:\ERPFULL\NFE\NFCe\Log\"
    $baseLogErr = "C:\ERPFULL\NFE\NFCe\Erros\"
    $baseTemp = "C:\ERPFULL\NFE\NFCe\Temp\"
    $baseXmlDest = "C:\ERPFULL\NFE\NFCe\XmlDestinatario\"
    $baseContingencia = "C:\ERPFULL\NFE\NFCe\XmlContingencia\"

    if (-not (Test-Path $baseLog)) {{ New-Item -ItemType Directory -Path $baseLog -Force | Out-Null }}
    if (-not (Test-Path $baseLogErr)) {{ New-Item -ItemType Directory -Path $baseLogErr -Force | Out-Null }}
    if (-not (Test-Path $baseTemp)) {{ New-Item -ItemType Directory -Path $baseTemp -Force | Out-Null }}
    if (-not (Test-Path $baseXmlDest)) {{ New-Item -ItemType Directory -Path $baseXmlDest -Force | Out-Null }}
    if (-not (Test-Path $baseContingencia)) {{ New-Item -ItemType Directory -Path $baseContingencia -Force | Out-Null }}

    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $n.DiretorioLog = $baseLog
    $n.DiretorioLogErro = $baseLogErr
    $n.DiretorioTemporario = $baseTemp
    $n.DiretorioXmlDestinatario = $baseXmlDest
    try {{ $n.DiretorioXmlContingencia = $baseContingencia }} catch {{}}

    $n.UF = "{uf}"
    $n.Ambiente = {ambiente}
    $n.VersaoManual = "{versao_manual}"
    $n.CNPJ = "{cnpj_emit}"

    if ("{id_token_nfce}" -ne "") {{ $n.IdTokenNFCe = "{id_token_nfce}" }}
    if ("{token_nfce}" -ne "") {{ $n.TokenNFCe = "{token_nfce}" }}

    # Resolução de Certificado
    if ("{caminho_pfx}" -ne "" -and (Test-Path "{caminho_pfx}")) {{
        $n.TipoCertificado = 2
        $n.CaminhoCertificado = "{caminho_pfx}"
        $n.SenhaCertificado = "{senha_cert}"
        $n.NomeCertificado = ""
    }} else {{
        $certsOfficial = $n.ListarCertificados("|")
        $certMatch = $null

        if ("{cnpj_emit}" -ne "" -and "{cnpj_emit}" -ne "00000000000000") {{
            $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*{cnpj_emit}*" }} | Select-Object -First 1)
        }}
        if (-not $certMatch -and "{nome_cert}" -ne "") {{
            if ("{nome_cert}" -match '(\d{{14}})') {{
                $cnpjMatch = $Matches[1]
                $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*$cnpjMatch*" }} | Select-Object -First 1)
            }}
            if (-not $certMatch) {{
                $busca = "{nome_cert}".Split(':')[0].Split('(')[0].Trim()
                if ($busca.Length -ge 4) {{
                    $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*$busca*" }} | Select-Object -First 1)
                }}
            }}
        }}
        if (-not $certMatch) {{
            $certWin = (Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My -ErrorAction SilentlyContinue | Where-Object {{ $_.Subject -match '\d{{14}}' -and $_.NotAfter -gt (Get-Date) }} | Select-Object -First 1)
            if ($certWin) {{
                if ($certWin.Subject -match '(\d{{14}})') {{
                    $cnpjWin = $Matches[1]
                    $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*$cnpjWin*" }} | Select-Object -First 1)
                }}
            }}
        }}

        if ($certMatch) {{
            $n.TipoCertificado = 0
            $n.NomeCertificado = $certMatch
            if ($certMatch -match '(\d{{14}})') {{
                $n.CNPJ = $Matches[1]
            }}
        }} else {{
            throw "Certificado Digital não encontrado no repositório do Windows para NFC-e."
        }}
    }}

    # Auto-resolução de Esquemas NFC-e
    $candEsquemasNfce = @(
        "{esquemas}",
        "{esquemas}\NFCe\Esquemas\",
        "{esquemas}\Esquemas\",
        "C:\ERPFULL\NFE\NFCe\Esquemas\",
        "C:\ERPFULL\NFE\Esquemas\",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\Esquemas\",
        "C:\Coliseu\Programa\NFCe\Esquemas\"
    )
    foreach ($c in $candEsquemasNfce) {{
        if ($c -ne "" -and ((Test-Path "$c\vm60\Mapping.txt") -or (Test-Path "$c\vm50b\Mapping.txt") -or (Test-Path "$c\Mapping.txt"))) {{
            $n.DiretorioEsquemas = $c
            break
        }}
    }}
    if (-not $n.DiretorioEsquemas -and (Test-Path "{esquemas}")) {{ $n.DiretorioEsquemas = "{esquemas}" }}

    # Auto-resolução de Templates NFC-e
    $candTemplatesNfce = @(
        "{templates}",
        "{templates}\NFCe\Templates\",
        "{templates}\Templates\",
        "C:\ERPFULL\NFE\NFCe\Templates\",
        "C:\ERPFULL\NFE\Templates\",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\Templates\",
        "C:\Coliseu\Programa\NFCe\Templates\"
    )
    foreach ($t in $candTemplatesNfce) {{
        if ($t -ne "" -and ((Test-Path "$t\vm60\Conversor\NFCeDataSets.xml") -or (Test-Path "$t\vm50b\Conversor\NFCeDataSets.xml") -or (Test-Path "$t\Conversor\NFCeDataSets.xml"))) {{
            $n.DiretorioTemplates = $t
            break
        }}
    }}
    if (-not $n.DiretorioTemplates -and (Test-Path "{templates}")) {{ $n.DiretorioTemplates = "{templates}" }}

    # Auto-resolução de Servidores INI NFC-e
    $candHomNfce = @(
        "{servidores_hom}",
        "C:\ERPFULL\NFE\nfceServidoresHom.ini",
        "C:\Coliseu\Programa\nfceServidoresHom.ini",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\nfceServidoresHom.ini"
    )
    foreach ($sh in $candHomNfce) {{
        if ($sh -ne "" -and (Test-Path $sh)) {{ $n.ArquivoServidoresHom = $sh; break }}
    }}

    $candProdNfce = @(
        "{servidores_prod}",
        "C:\ERPFULL\NFE\nfceServidoresProd.ini",
        "C:\Coliseu\Programa\nfceServidoresProd.ini",
        "C:\Program Files\TecnoSpeed\NFCe\arquivos\nfceServidoresProd.ini"
    )
    foreach ($sp in $candProdNfce) {{
        if ($sp -ne "" -and (Test-Path $sp)) {{ $n.ArquivoServidoresProd = $sp; break }}
    }}

    $n.IgnoreInvalidCertificates = $true
    $n.CaracteresRemoverAcentos = $true
    try {{ $n.HttpLibs = "WinINet" }} catch {{}}

    # 1. Converter TX2 para XML oficial da NFC-e (Mod. 65)
    $xmlGerado = $n.ConverterLoteParaXML("{tx2_path}", 1, "{versao_esquema}")

    # 2. Assinar o XML gerado utilizando o Certificado Digital ativo (adiciona o QR-Code v2 da NFC-e)
    $xmlAssinado = $n.AssinarNota($xmlGerado)

    # 3. Enviar o XML assinado para a SEFAZ
    $retorno = ""
    if ({sincrono}) {{
        $retorno = $n.EnviarNFSincrono("{lote}", $xmlAssinado, $false)
    }} else {{
        $retorno = $n.EnviarNF("{lote}", $xmlAssinado, $false)
    }}

    # 4. Montar procNFe oficial contendo a NFC-e assinada + protocolo real retornado da SEFAZ
    $protNFeXml = ""
    if ($retorno -match '(?s)(<protNFe.*?</protNFe>)') {{
        $protNFeXml = $Matches[1]
    }}

    $procNFe = ""
    if ($protNFeXml -ne "") {{
        $procNFe = "<?xml version=""1.0"" encoding=""utf-8""?><nfeProc versao=""4.00"" xmlns=""http://www.portalfiscal.inf.br/nfe"">" + $xmlAssinado + $protNFeXml + "</nfeProc>"
    }} else {{
        $procNFe = $xmlAssinado
    }}

    # Salva o XML autorizado no XmlDestinatario
    if ($procNFe -match 'Id="NFe(\d{{44}})"') {{
        $chaveNFe = $Matches[1]
        $xmlFinalPath = Join-Path $baseXmlDest ($chaveNFe + "-nfe.xml")
        [System.IO.File]::WriteAllText($xmlFinalPath, $procNFe, [System.Text.Encoding]::UTF8)
    }}

    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host $retorno
    Write-Host "---XML_PROC---"
    Write-Host $procNFe
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        uf = normalizar_uf_sigla(&cfg.uf),
        cnpj_emit = cnpj_emit_clean,
        ambiente = cfg.ambiente,
        versao_manual = cfg.versao_manual,
        id_token_nfce = cfg.id_token_nfce.trim(),
        token_nfce = cfg.token_nfce.trim(),
        nome_cert = cfg.nome_certificado.replace('"', "`\""),
        caminho_pfx = cfg.caminho_certificado_pfx.replace('\\', "\\\\"),
        senha_cert = cfg.senha_certificado.replace('"', "`\""),
        esquemas = cfg.diretorio_esquemas.replace('\\', "\\\\"),
        templates = cfg.diretorio_templates.replace('\\', "\\\\"),
        servidores_hom = cfg.arquivo_servidores_hom.replace('\\', "\\\\"),
        servidores_prod = cfg.arquivo_servidores_prod.replace('\\', "\\\\"),
        tx2_path = tx2_file.to_string_lossy().replace('\\', "\\\\"),
        versao_esquema = if cfg.versao_esquema.starts_with("pl_010") || cfg.versao_esquema.is_empty() { "pl_009o" } else { &cfg.versao_esquema },
        sincrono = if sincrono { "$true" } else { "$false" },
        lote = num_lote
    );

    let res = run_ps_script(&script)?;
    let _ = fs::remove_file(&tx2_file);
    Ok(res)
}

/// 3. Consulta NFC-e por Chave de Acesso
pub fn consultar_nfce(cfg: &TecnoSpeedNfceComponenteConfig, chave: &str) -> Result<String, String> {
    let clean_chave = chave.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    if clean_chave.len() != 44 {
        return Err("Chave de acesso da NFC-e deve conter exatamente 44 dígitos numéricos.".to_string());
    }

    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cnpj_emit_clean = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")
    $n.UF = "{uf}"
    $n.Ambiente = {ambiente}
    $n.VersaoManual = "{versao_manual}"
    $n.CNPJ = "{cnpj_emit}"

    if (Test-Path "{servidores_hom}") {{ $n.ArquivoServidoresHom = "{servidores_hom}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresHom.ini") {{ $n.ArquivoServidoresHom = "C:\ERPFULL\NFE\nfceServidoresHom.ini" }}

    if (Test-Path "{servidores_prod}") {{ $n.ArquivoServidoresProd = "{servidores_prod}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresProd.ini") {{ $n.ArquivoServidoresProd = "C:\ERPFULL\NFE\nfceServidoresProd.ini" }}

    $certsOfficial = $n.ListarCertificados("|")
    $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*{cnpj_emit}*" }} | Select-Object -First 1)
    if ($certMatch) {{ $n.NomeCertificado = $certMatch }}

    $res = $n.ConsultarNF("{chave}")
    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host $res
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        uf = normalizar_uf_sigla(&cfg.uf),
        cnpj_emit = cnpj_emit_clean,
        ambiente = cfg.ambiente,
        versao_manual = cfg.versao_manual,
        servidores_hom = cfg.arquivo_servidores_hom.replace('\\', "\\\\"),
        servidores_prod = cfg.arquivo_servidores_prod.replace('\\', "\\\\"),
        chave = clean_chave
    );

    run_ps_script(&script)
}

/// 4. Inutiliza Numeração de NFC-e (Mod. 65)
pub fn inutilizar_nfce(
    cfg: &TecnoSpeedNfceComponenteConfig,
    ano: u32,
    serie: u32,
    num_ini: u32,
    num_fim: u32,
    justificativa: &str,
) -> Result<String, String> {
    if justificativa.trim().len() < 15 {
        return Err("A justificativa de inutilização deve ter no mínimo 15 caracteres.".to_string());
    }

    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cnpj_emit_clean = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")
    $n.UF = "{uf}"
    $n.Ambiente = {ambiente}
    $n.VersaoManual = "{versao_manual}"
    $n.CNPJ = "{cnpj_emit}"

    if (Test-Path "{servidores_hom}") {{ $n.ArquivoServidoresHom = "{servidores_hom}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresHom.ini") {{ $n.ArquivoServidoresHom = "C:\ERPFULL\NFE\nfceServidoresHom.ini" }}

    if (Test-Path "{servidores_prod}") {{ $n.ArquivoServidoresProd = "{servidores_prod}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresProd.ini") {{ $n.ArquivoServidoresProd = "C:\ERPFULL\NFE\nfceServidoresProd.ini" }}

    $certsOfficial = $n.ListarCertificados("|")
    $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*{cnpj_emit}*" }} | Select-Object -First 1)
    if ($certMatch) {{ $n.NomeCertificado = $certMatch }}

    $anoFormat = "{ano}"
    if ($anoFormat.Length -eq 4) {{ $anoFormat = $anoFormat.Substring(2, 2) }}

    $ret = $n.InutilizarNF($anoFormat, "{cnpj_emit}", 65, {serie}, {num_ini}, {num_fim}, "{just}")
    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host $ret
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        uf = normalizar_uf_sigla(&cfg.uf),
        cnpj_emit = cnpj_emit_clean,
        ambiente = cfg.ambiente,
        versao_manual = cfg.versao_manual,
        servidores_hom = cfg.arquivo_servidores_hom.replace('\\', "\\\\"),
        servidores_prod = cfg.arquivo_servidores_prod.replace('\\', "\\\\"),
        ano = ano,
        serie = serie,
        num_ini = num_ini,
        num_fim = num_fim,
        just = justificativa.replace('"', "`\"")
    );

    run_ps_script(&script)
}

/// 5. Cancela NFC-e Autorizada
pub fn cancelar_nfce(
    cfg: &TecnoSpeedNfceComponenteConfig,
    chave: &str,
    num_protocolo: &str,
    justificativa: &str,
) -> Result<String, String> {
    if justificativa.trim().len() < 15 {
        return Err("A justificativa de cancelamento deve conter no mínimo 15 caracteres.".to_string());
    }

    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let cnpj_emit_clean = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let agora = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S-04:00").to_string();

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")
    $n.UF = "{uf}"
    $n.Ambiente = {ambiente}
    $n.VersaoManual = "{versao_manual}"
    $n.CNPJ = "{cnpj_emit}"

    if (Test-Path "{servidores_hom}") {{ $n.ArquivoServidoresHom = "{servidores_hom}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresHom.ini") {{ $n.ArquivoServidoresHom = "C:\ERPFULL\NFE\nfceServidoresHom.ini" }}

    if (Test-Path "{servidores_prod}") {{ $n.ArquivoServidoresProd = "{servidores_prod}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresProd.ini") {{ $n.ArquivoServidoresProd = "C:\ERPFULL\NFE\nfceServidoresProd.ini" }}

    $certsOfficial = $n.ListarCertificados("|")
    $certMatch = ($certsOfficial.Split("|") | Where-Object {{ $_ -like "*{cnpj_emit}*" }} | Select-Object -First 1)
    if ($certMatch) {{ $n.NomeCertificado = $certMatch }}

    $ret = $n.CancelarNF("{chave}", "{protocolo}", "{just}", "{dh}")
    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host $ret
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        uf = normalizar_uf_sigla(&cfg.uf),
        cnpj_emit = cnpj_emit_clean,
        ambiente = cfg.ambiente,
        versao_manual = cfg.versao_manual,
        servidores_hom = cfg.arquivo_servidores_hom.replace('\\', "\\\\"),
        servidores_prod = cfg.arquivo_servidores_prod.replace('\\', "\\\\"),
        chave = chave.trim(),
        protocolo = num_protocolo.trim(),
        just = justificativa.replace('"', "`\""),
        dh = agora
    );

    run_ps_script(&script)
}

/// 6. Imprime DANFCE (Cupom Fiscal Eletrônico NFC-e)
pub fn imprimir_danfce(
    cfg: &TecnoSpeedNfceComponenteConfig,
    xml_proc_ou_chave: &str,
    impressora: Option<&str>,
) -> Result<String, String> {
    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let imp_nome = impressora.unwrap_or(&cfg.impressora_danfce);

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    [System.Environment]::CurrentDirectory = "C:\ERPFULL\NFE\NFCe"
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")
    $n.UF = "{uf}"
    $n.Ambiente = {ambiente}
    $n.VersaoManual = "{versao_manual}"

    $n.DiretorioLog = "C:\ERPFULL\NFE\NFCe\Log\"
    $n.DiretorioLogErro = "C:\ERPFULL\NFE\NFCe\Erros\"
    $n.DiretorioTemporario = "C:\ERPFULL\NFE\NFCe\Temp\"
    $n.DiretorioXmlDestinatario = "C:\ERPFULL\NFE\NFCe\XmlDestinatario\"

    if (Test-Path "{servidores_hom}") {{ $n.ArquivoServidoresHom = "{servidores_hom}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresHom.ini") {{ $n.ArquivoServidoresHom = "C:\ERPFULL\NFE\nfceServidoresHom.ini" }}
    elseif (Test-Path "C:\Coliseu\Programa\nfceServidoresHom.ini") {{ $n.ArquivoServidoresHom = "C:\Coliseu\Programa\nfceServidoresHom.ini" }}

    if (Test-Path "{servidores_prod}") {{ $n.ArquivoServidoresProd = "{servidores_prod}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresProd.ini") {{ $n.ArquivoServidoresProd = "C:\ERPFULL\NFE\nfceServidoresProd.ini" }}
    elseif (Test-Path "C:\Coliseu\Programa\nfceServidoresProd.ini") {{ $n.ArquivoServidoresProd = "C:\Coliseu\Programa\nfceServidoresProd.ini" }}

    if (Test-Path "{esquemas}") {{ $n.DiretorioEsquemas = "{esquemas}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\NFCe\Esquemas\") {{ $n.DiretorioEsquemas = "C:\ERPFULL\NFE\NFCe\Esquemas\" }}

    if (Test-Path "{templates}") {{ $n.DiretorioTemplates = "{templates}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\NFCe\Templates\") {{ $n.DiretorioTemplates = "C:\ERPFULL\NFE\NFCe\Templates\" }}

    $xmlParam = "{xml_param}"
    if ($xmlParam.Length -eq 44) {{
        if (Test-Path "C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfe.xml") {{
            $xmlParam = [System.IO.File]::ReadAllText("C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfe.xml", [System.Text.Encoding]::UTF8)
        }} elseif (Test-Path "C:\ERPFULL\NFE\XmlDestinatario\$xmlParam-nfe.xml") {{
            $xmlParam = [System.IO.File]::ReadAllText("C:\ERPFULL\NFE\XmlDestinatario\$xmlParam-nfe.xml", [System.Text.Encoding]::UTF8)
        }} elseif (Test-Path "C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfce.xml") {{
            $xmlParam = [System.IO.File]::ReadAllText("C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfce.xml", [System.Text.Encoding]::UTF8)
        }}
    }}

    $modelo = "{modelo}"
    if (-not (Test-Path $modelo)) {{
        if (Test-Path "C:\ERPFULL\NFE\NFCe\Templates\vm60\Danfce\retrato.rtm") {{
            $modelo = "C:\ERPFULL\NFE\NFCe\Templates\vm60\Danfce\retrato.rtm"
        }} elseif (Test-Path "C:\Coliseu\Programa\NFCe\Templates\vm60\Danfce\retrato.rtm") {{
            $modelo = "C:\Coliseu\Programa\NFCe\Templates\vm60\Danfce\retrato.rtm"
        }} else {{
            $modelo = ""
        }}
    }}

    # spdNFCeX.ImprimirDanfce(aIdLote, aXml, aModeloDanfce, aImpressora)
    $n.ImprimirDanfce("", $xmlParam, $modelo, "{impressora}")
    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host "DANFCE impresso com sucesso na impressora {impressora}."
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        uf = normalizar_uf_sigla(&cfg.uf),
        ambiente = cfg.ambiente,
        versao_manual = cfg.versao_manual,
        servidores_hom = cfg.arquivo_servidores_hom.replace('\\', "\\\\"),
        servidores_prod = cfg.arquivo_servidores_prod.replace('\\', "\\\\"),
        esquemas = cfg.diretorio_esquemas.replace('\\', "\\\\"),
        templates = cfg.diretorio_templates.replace('\\', "\\\\"),
        xml_param = xml_proc_ou_chave.replace('"', "`\""),
        modelo = cfg.modelo_danfce.replace('\\', "\\\\"),
        impressora = imp_nome.replace('"', "`\"")
    );

    run_ps_script(&script)
}

/// 7. Exporta DANFCE para arquivo PDF
pub fn exportar_danfce_pdf(
    cfg: &TecnoSpeedNfceComponenteConfig,
    xml_proc_ou_chave: &str,
    caminho_pdf: &str,
) -> Result<String, String> {
    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    [System.Environment]::CurrentDirectory = "C:\ERPFULL\NFE\NFCe"
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")
    $n.UF = "{uf}"
    $n.Ambiente = {ambiente}
    $n.VersaoManual = "{versao_manual}"

    $n.DiretorioLog = "C:\ERPFULL\NFE\NFCe\Log\"
    $n.DiretorioLogErro = "C:\ERPFULL\NFE\NFCe\Erros\"
    $n.DiretorioTemporario = "C:\ERPFULL\NFE\NFCe\Temp\"
    $n.DiretorioXmlDestinatario = "C:\ERPFULL\NFE\NFCe\XmlDestinatario\"

    if (Test-Path "{servidores_hom}") {{ $n.ArquivoServidoresHom = "{servidores_hom}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresHom.ini") {{ $n.ArquivoServidoresHom = "C:\ERPFULL\NFE\nfceServidoresHom.ini" }}
    elseif (Test-Path "C:\Coliseu\Programa\nfceServidoresHom.ini") {{ $n.ArquivoServidoresHom = "C:\Coliseu\Programa\nfceServidoresHom.ini" }}

    if (Test-Path "{servidores_prod}") {{ $n.ArquivoServidoresProd = "{servidores_prod}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\nfceServidoresProd.ini") {{ $n.ArquivoServidoresProd = "C:\ERPFULL\NFE\nfceServidoresProd.ini" }}
    elseif (Test-Path "C:\Coliseu\Programa\nfceServidoresProd.ini") {{ $n.ArquivoServidoresProd = "C:\Coliseu\Programa\nfceServidoresProd.ini" }}

    if (Test-Path "{esquemas}") {{ $n.DiretorioEsquemas = "{esquemas}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\NFCe\Esquemas\") {{ $n.DiretorioEsquemas = "C:\ERPFULL\NFE\NFCe\Esquemas\" }}

    if (Test-Path "{templates}") {{ $n.DiretorioTemplates = "{templates}" }}
    elseif (Test-Path "C:\ERPFULL\NFE\NFCe\Templates\") {{ $n.DiretorioTemplates = "C:\ERPFULL\NFE\NFCe\Templates\" }}

    $xmlParam = "{xml_param}"
    if ($xmlParam.Length -eq 44) {{
        if (Test-Path "C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfe.xml") {{
            $xmlParam = [System.IO.File]::ReadAllText("C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfe.xml", [System.Text.Encoding]::UTF8)
        }} elseif (Test-Path "C:\ERPFULL\NFE\XmlDestinatario\$xmlParam-nfe.xml") {{
            $xmlParam = [System.IO.File]::ReadAllText("C:\ERPFULL\NFE\XmlDestinatario\$xmlParam-nfe.xml", [System.Text.Encoding]::UTF8)
        }} elseif (Test-Path "C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfce.xml") {{
            $xmlParam = [System.IO.File]::ReadAllText("C:\ERPFULL\NFE\NFCe\XmlDestinatario\$xmlParam-nfce.xml", [System.Text.Encoding]::UTF8)
        }}
    }}

    $modelo = "{modelo}"
    if (-not (Test-Path $modelo)) {{
        if (Test-Path "C:\ERPFULL\NFE\NFCe\Templates\vm60\Danfce\retrato.rtm") {{
            $modelo = "C:\ERPFULL\NFE\NFCe\Templates\vm60\Danfce\retrato.rtm"
        }} elseif (Test-Path "C:\Coliseu\Programa\NFCe\Templates\vm60\Danfce\retrato.rtm") {{
            $modelo = "C:\Coliseu\Programa\NFCe\Templates\vm60\Danfce\retrato.rtm"
        }} else {{
            $modelo = ""
        }}
    }}

    # spdNFCeX.ExportarDanfce(aIdLote, aXml, aModeloDanfce, aFormatoExportacao, aNomeArquivo)
    # Formato 1 = PDF
    $n.ExportarDanfce("", $xmlParam, $modelo, 1, "{pdf_path}")
    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host "DANFCE exportado para PDF em {pdf_path}"
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        uf = normalizar_uf_sigla(&cfg.uf),
        ambiente = cfg.ambiente,
        versao_manual = cfg.versao_manual,
        servidores_hom = cfg.arquivo_servidores_hom.replace('\\', "\\\\"),
        servidores_prod = cfg.arquivo_servidores_prod.replace('\\', "\\\\"),
        esquemas = cfg.diretorio_esquemas.replace('\\', "\\\\"),
        templates = cfg.diretorio_templates.replace('\\', "\\\\"),
        xml_param = xml_proc_ou_chave.replace('"', "`\""),
        modelo = cfg.modelo_danfce.replace('\\', "\\\\"),
        pdf_path = caminho_pdf.replace('\\', "\\\\")
    );

    run_ps_script(&script)
}

/// 8. Abre o Designer Visual para Edição do Modelo de DANFCE (.rtm)
pub fn editar_modelo_danfce(cfg: &TecnoSpeedNfceComponenteConfig, modelo_path: Option<&str>) -> Result<String, String> {
    let cnpj_sh_clean = cfg.cnpj_software_house.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let path = modelo_path.unwrap_or(&cfg.modelo_danfce);

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
    [System.IO.Directory]::SetCurrentDirectory("C:\ERPFULL\NFE\NFCe")
    Set-Location "C:\ERPFULL\NFE\NFCe"
    $n = New-Object -ComObject "NFCeX.spdNFCeX"
    $n.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $modelo = "{modelo}"
    if (-not (Test-Path $modelo)) {{
        if (Test-Path "C:\ERPFULL\NFE\NFCe\Templates\vm60\Danfce\retrato.rtm") {{
            $modelo = "C:\ERPFULL\NFE\NFCe\Templates\vm60\Danfce\retrato.rtm"
        }} else {{
            $modelo = ""
        }}
    }}

    $n.EditarModeloDanfce("", "", $modelo)
    Write-Host "---TECNOSPEED_SUCCESS---"
    Write-Host "Editor do Modelo DANFCE finalizado."
}} catch {{
    Write-Host "---TECNOSPEED_ERROR---"
    Write-Host $_.Exception.Message
}}
"#,
        cnpj_sh = cnpj_sh_clean,
        token_sh = cfg.token_software_house.trim(),
        modelo = path.replace('\\', "\\\\")
    );

    run_ps_script(&script)
}
