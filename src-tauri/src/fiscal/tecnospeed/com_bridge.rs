//! Módulo de Ponte Nativa para Componente TecnoSpeed COM (NFeX.spdNFeX)
//!
//! Executa chamadas síncronas/assíncronas no componente nativo instalado em C:\Windows\System32\NFeX.dll
//! sem necessidade de servidor HTTP intermediário (Manager Desktop).

use std::process::Command;
use tracing::{info, warn, error};

pub struct TecnoSpeedComConfig<'a> {
    pub ini_path: &'a str,
    pub cnpj_sh: &'a str,
    pub token_sh: &'a str,
    pub cnpj_emitente: &'a str,
    pub cert_name: &'a str,
    pub uf: &'a str,
    pub ambiente: u32,
}

fn ensure_license_files() {
    let app_dirs = [
        "C:\\ERPFULL\\NFE",
        "C:\\ERPFULL\\NFE\\NFCe",
    ];
    let license_files = [
        "spdLicenseNFe.dat",
        "spdLicenseNFCe.dat",
        "spdLicenseNFSeV2.dat",
        "spdLicenseMDFe.dat",
        "spdLicenseCte.dat",
    ];

    for dir in &app_dirs {
        let _ = std::fs::create_dir_all(dir);
        for file in &license_files {
            let target = std::path::Path::new(dir).join(file);
            if !target.exists() {
                let coliseu_source = std::path::Path::new("C:\\Coliseu\\Programa").join(file);
                if coliseu_source.exists() {
                    let _ = std::fs::copy(&coliseu_source, &target);
                }
            }
        }
    }
}

fn execute_ps_script(script: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        ensure_license_files();
        let base_dir = std::path::Path::new("C:\\ERPFULL\\NFE");
        let _ = std::fs::create_dir_all(base_dir);

        let mut cmd = Command::new("powershell");
        cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script]);
        cmd.current_dir(base_dir);

        let output = cmd.output()
            .map_err(|e| format!("Falha ao invocar PowerShell para o componente TecnoSpeed: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if !output.status.success() && stdout.is_empty() {
            return Err(format!("Erro de execução no componente TecnoSpeed: {}", stderr));
        }

        if stdout.contains("COM_ERR:") {
            let err_msg = stdout.split("COM_ERR:").nth(1).unwrap_or(&stdout).trim();
            return Err(err_msg.to_string());
        }

        if stdout.contains("COM_OK:") {
            let ok_msg = stdout.split("COM_OK:").nth(1).unwrap_or(&stdout).trim();
            return Ok(ok_msg.to_string());
        }

        Ok(stdout.trim().to_string())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("O Componente Nativo TecnoSpeed NFeX.dll é suportado apenas em ambiente Microsoft Windows.".to_string())
    }
}

/// 1. Consulta o Status do Serviço SEFAZ via Componente Nativo TecnoSpeed (NFeX.spdNFeX)
pub fn status_servico(cfg: TecnoSpeedComConfig<'_>) -> Result<String, String> {
    let clean_cnpj_sh = cfg.cnpj_sh.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_cnpj_emit = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"
$ErrorActionPreference = "Stop"
try {{
    $nfe = New-Object -ComObject NFeX.spdNFeX
    $nfe.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    if (Test-Path "{ini_path}") {{
        $nfe.LoadConfig("{ini_path}")
    }}

    if (Test-Path "C:\ERPFULL\NFE\nfeServidoresHom.ini") {{ $nfe.ArquivoServidoresHom = "C:\ERPFULL\NFE\nfeServidoresHom.ini" }}
    elseif (Test-Path "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresHom.ini") {{ $nfe.ArquivoServidoresHom = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresHom.ini" }}
    elseif (Test-Path "C:\Coliseu\Programa\nfeServidoresHom.ini") {{ $nfe.ArquivoServidoresHom = "C:\Coliseu\Programa\nfeServidoresHom.ini" }}

    if (Test-Path "C:\ERPFULL\NFE\nfeServidoresProd.ini") {{ $nfe.ArquivoServidoresProd = "C:\ERPFULL\NFE\nfeServidoresProd.ini" }}
    elseif (Test-Path "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresProd.ini") {{ $nfe.ArquivoServidoresProd = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresProd.ini" }}
    elseif (Test-Path "C:\Coliseu\Programa\nfeServidoresProd.ini") {{ $nfe.ArquivoServidoresProd = "C:\Coliseu\Programa\nfeServidoresProd.ini" }}

    if (Test-Path "C:\Program Files\TecnoSpeed\NFe\arquivos\Esquemas\") {{ $nfe.DiretorioEsquemas = "C:\Program Files\TecnoSpeed\NFe\arquivos\Esquemas\" }}
    elseif (Test-Path "C:\Coliseu\Programa\NFe\Esquemas\vm60\") {{ $nfe.DiretorioEsquemas = "C:\Coliseu\Programa\NFe\Esquemas\vm60\" }}

    if (Test-Path "C:\Program Files\TecnoSpeed\NFe\arquivos\Templates\") {{ $nfe.DiretorioTemplates = "C:\Program Files\TecnoSpeed\NFe\arquivos\Templates\" }}
    elseif (Test-Path "C:\Coliseu\Programa\NFe\templates\vm60\") {{ $nfe.DiretorioTemplates = "C:\Coliseu\Programa\NFe\templates\vm60\" }}

    $nfe.VersaoManual = "6.0"
    $nfe.CNPJ = "{cnpj_emit}"
    $nfe.UF = "{uf}"
    $nfe.Ambiente = {ambiente}

    $certName = "{cert_name}".Trim()
    if ($certName) {{
        $certs = $nfe.ListarCertificados("|") -split '\|'
        $found = $certs | Where-Object {{ $_ -like "*$certName*" }} | Select-Object -First 1
        if ($found) {{
            $nfe.NomeCertificado = $found
        }} else {{
            $nfe.NomeCertificado = $certName
        }}
    }}

    $res = $nfe.StatusDoServico()
    Write-Output "COM_OK:$res"
}} catch {{
    Write-Output "COM_ERR:$($_.Exception.Message)"
}}
"#,
        cnpj_sh = clean_cnpj_sh,
        token_sh = cfg.token_sh.trim(),
        ini_path = cfg.ini_path.trim(),
        cnpj_emit = clean_cnpj_emit,
        uf = cfg.uf.trim(),
        ambiente = cfg.ambiente,
        cert_name = cfg.cert_name.replace('"', "")
    );

    execute_ps_script(&script)
}

/// 2. Envia Arquivo TX2 para Autorização de NF-e
pub fn enviar_tx2(cfg: TecnoSpeedComConfig<'_>, tx2_conteudo: &str, sincrono: bool) -> Result<String, String> {
    let clean_cnpj_sh = cfg.cnpj_sh.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_cnpj_emit = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let temp_tx2_path = format!("{}\\tecnospeed_envio.tx2", std::env::temp_dir().to_string_lossy());
    std::fs::write(&temp_tx2_path, tx2_conteudo).map_err(|e| format!("Falha ao gravar arquivo TX2 temporário: {}", e))?;

    let is_sincrono_str = if sincrono { "$true" } else { "$false" };

    let script = format!(
        r#"
$ErrorActionPreference = "Stop"
try {{
    $nfe = New-Object -ComObject NFeX.spdNFeX
    $nfe.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $ini = "{ini_path}"
    if (Test-Path $ini) {{
        $nfe.LoadConfig($ini)
    }}

    $nfe.DiretorioEsquemas = "C:\Program Files\TecnoSpeed\NFe\arquivos\Esquemas\"
    $nfe.DiretorioTemplates = "C:\Program Files\TecnoSpeed\NFe\arquivos\Templates\"
    $nfe.ArquivoServidoresHom = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresHom.ini"
    $nfe.ArquivoServidoresProd = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresProd.ini"
    $nfe.VersaoManual = "6.0"
    $nfe.CNPJ = "{cnpj_emit}"
    $nfe.UF = "{uf}"
    $nfe.Ambiente = {ambiente}

    $certName = "{cert_name}".Trim()
    if ($certName) {{
        $certs = $nfe.ListarCertificados("|") -split '\|'
        $found = $certs | Where-Object {{ $_ -like "*$certName*" }} | Select-Object -First 1
        if ($found) {{
            $nfe.NomeCertificado = $found
        }} else {{
            $nfe.NomeCertificado = $certName
        }}
    }}

    $tx2Conteudo = [System.IO.File]::ReadAllText("{tx2_path}", [System.Text.Encoding]::UTF8)
    $loteNum = [string](Get-Random -Minimum 1000 -Maximum 999999)
    $res = $nfe.EnviarNF($loteNum, $tx2Conteudo, {sincrono})
    Write-Output "COM_OK:$res"
}} catch {{
    Write-Output "COM_ERR:$($_.Exception.Message)"
}}
"#,
        cnpj_sh = clean_cnpj_sh,
        token_sh = cfg.token_sh.trim(),
        ini_path = cfg.ini_path.trim(),
        cnpj_emit = clean_cnpj_emit,
        uf = cfg.uf.trim(),
        ambiente = cfg.ambiente,
        cert_name = cfg.cert_name.replace('"', ""),
        tx2_path = temp_tx2_path.replace('\\', "\\\\"),
        sincrono = is_sincrono_str
    );

    execute_ps_script(&script)
}

/// 3. Consulta NF-e por Chave de Acesso
pub fn consultar_nf(cfg: TecnoSpeedComConfig<'_>, chave: &str) -> Result<String, String> {
    let clean_cnpj_sh = cfg.cnpj_sh.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_cnpj_emit = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"
$ErrorActionPreference = "Stop"
try {{
    $nfe = New-Object -ComObject NFeX.spdNFeX
    $nfe.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $ini = "{ini_path}"
    if (Test-Path $ini) {{
        $nfe.LoadConfig($ini)
    }}

    $nfe.DiretorioEsquemas = "C:\Program Files\TecnoSpeed\NFe\arquivos\Esquemas\"
    $nfe.DiretorioTemplates = "C:\Program Files\TecnoSpeed\NFe\arquivos\Templates\"
    $nfe.ArquivoServidoresHom = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresHom.ini"
    $nfe.ArquivoServidoresProd = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresProd.ini"
    $nfe.VersaoManual = "6.0"
    $nfe.CNPJ = "{cnpj_emit}"
    $nfe.UF = "{uf}"
    $nfe.Ambiente = {ambiente}

    $certName = "{cert_name}".Trim()
    if ($certName) {{
        $certs = $nfe.ListarCertificados("|") -split '\|'
        $found = $certs | Where-Object {{ $_ -like "*$certName*" }} | Select-Object -First 1
        if ($found) {{
            $nfe.NomeCertificado = $found
        }} else {{
            $nfe.NomeCertificado = $certName
        }}
    }}

    $res = $nfe.ConsultarNF("{chave}")
    Write-Output "COM_OK:$res"
}} catch {{
    Write-Output "COM_ERR:$($_.Exception.Message)"
}}
"#,
        cnpj_sh = clean_cnpj_sh,
        token_sh = cfg.token_sh.trim(),
        ini_path = cfg.ini_path.trim(),
        cnpj_emit = clean_cnpj_emit,
        uf = cfg.uf.trim(),
        ambiente = cfg.ambiente,
        cert_name = cfg.cert_name.replace('"', ""),
        chave = chave.trim()
    );

    execute_ps_script(&script)
}

/// 4. Cancelamento de NF-e
pub fn cancelar_nf(cfg: TecnoSpeedComConfig<'_>, chave: &str, protocolo: &str, justificativa: &str) -> Result<String, String> {
    let clean_cnpj_sh = cfg.cnpj_sh.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_cnpj_emit = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"
$ErrorActionPreference = "Stop"
try {{
    $nfe = New-Object -ComObject NFeX.spdNFeX
    $nfe.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $ini = "{ini_path}"
    if (Test-Path $ini) {{
        $nfe.LoadConfig($ini)
    }}

    $nfe.DiretorioEsquemas = "C:\Program Files\TecnoSpeed\NFe\arquivos\Esquemas\"
    $nfe.DiretorioTemplates = "C:\Program Files\TecnoSpeed\NFe\arquivos\Templates\"
    $nfe.ArquivoServidoresHom = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresHom.ini"
    $nfe.ArquivoServidoresProd = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresProd.ini"
    $nfe.VersaoManual = "6.0"
    $nfe.CNPJ = "{cnpj_emit}"
    $nfe.UF = "{uf}"
    $nfe.Ambiente = {ambiente}

    $certName = "{cert_name}".Trim()
    if ($certName) {{
        $certs = $nfe.ListarCertificados("|") -split '\|'
        $found = $certs | Where-Object {{ $_ -like "*$certName*" }} | Select-Object -First 1
        if ($found) {{
            $nfe.NomeCertificado = $found
        }} else {{
            $nfe.NomeCertificado = $certName
        }}
    }}

    $dh = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    $res = $nfe.CancelarNF("{chave}", "{protocolo}", "{justificativa}", $dh, 1, "")
    Write-Output "COM_OK:$res"
}} catch {{
    Write-Output "COM_ERR:$($_.Exception.Message)"
}}
"#,
        cnpj_sh = clean_cnpj_sh,
        token_sh = cfg.token_sh.trim(),
        ini_path = cfg.ini_path.trim(),
        cnpj_emit = clean_cnpj_emit,
        uf = cfg.uf.trim(),
        ambiente = cfg.ambiente,
        cert_name = cfg.cert_name.replace('"', ""),
        chave = chave.trim(),
        protocolo = protocolo.trim(),
        justificativa = justificativa.replace('"', "'")
    );

    execute_ps_script(&script)
}

/// 5. Carta de Correção Eletrônica (CC-e)
pub fn carta_correcao(cfg: TecnoSpeedComConfig<'_>, chave: &str, texto: &str, seq: u32) -> Result<String, String> {
    let clean_cnpj_sh = cfg.cnpj_sh.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_cnpj_emit = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"
$ErrorActionPreference = "Stop"
try {{
    $nfe = New-Object -ComObject NFeX.spdNFeX
    $nfe.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $ini = "{ini_path}"
    if (Test-Path $ini) {{
        $nfe.LoadConfig($ini)
    }}

    $nfe.DiretorioEsquemas = "C:\Program Files\TecnoSpeed\NFe\arquivos\Esquemas\"
    $nfe.DiretorioTemplates = "C:\Program Files\TecnoSpeed\NFe\arquivos\Templates\"
    $nfe.ArquivoServidoresHom = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresHom.ini"
    $nfe.ArquivoServidoresProd = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresProd.ini"
    $nfe.VersaoManual = "6.0"
    $nfe.CNPJ = "{cnpj_emit}"
    $nfe.UF = "{uf}"
    $nfe.Ambiente = {ambiente}

    $certName = "{cert_name}".Trim()
    if ($certName) {{
        $certs = $nfe.ListarCertificados("|") -split '\|'
        $found = $certs | Where-Object {{ $_ -like "*$certName*" }} | Select-Object -First 1
        if ($found) {{
            $nfe.NomeCertificado = $found
        }} else {{
            $nfe.NomeCertificado = $certName
        }}
    }}

    $dh = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    $res = $nfe.CartaDeCorrecao("{chave}", "{texto}", $dh, {seq}, 1, "")
    Write-Output "COM_OK:$res"
}} catch {{
    Write-Output "COM_ERR:$($_.Exception.Message)"
}}
"#,
        cnpj_sh = clean_cnpj_sh,
        token_sh = cfg.token_sh.trim(),
        ini_path = cfg.ini_path.trim(),
        cnpj_emit = clean_cnpj_emit,
        uf = cfg.uf.trim(),
        ambiente = cfg.ambiente,
        cert_name = cfg.cert_name.replace('"', ""),
        chave = chave.trim(),
        texto = texto.replace('"', "'"),
        seq = seq
    );

    execute_ps_script(&script)
}

/// 6. Inutilização de Numeração
pub fn inutilizar_nfe(
    cfg: TecnoSpeedComConfig<'_>,
    ano: u32,
    modelo: u32,
    serie: u32,
    n_ini: u32,
    n_fim: u32,
    just: &str,
) -> Result<String, String> {
    let clean_cnpj_sh = cfg.cnpj_sh.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_cnpj_emit = cfg.cnpj_emitente.chars().filter(|c| c.is_ascii_digit()).collect::<String>();

    let script = format!(
        r#"
$ErrorActionPreference = "Stop"
try {{
    $nfe = New-Object -ComObject NFeX.spdNFeX
    $nfe.ConfigurarSoftwareHouse("{cnpj_sh}", "{token_sh}")

    $ini = "{ini_path}"
    if (Test-Path $ini) {{
        $nfe.LoadConfig($ini)
    }}

    $nfe.DiretorioEsquemas = "C:\Program Files\TecnoSpeed\NFe\arquivos\Esquemas\"
    $nfe.DiretorioTemplates = "C:\Program Files\TecnoSpeed\NFe\arquivos\Templates\"
    $nfe.ArquivoServidoresHom = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresHom.ini"
    $nfe.ArquivoServidoresProd = "C:\Program Files\TecnoSpeed\NFe\arquivos\nfeServidoresProd.ini"
    $nfe.VersaoManual = "6.0"
    $nfe.CNPJ = "{cnpj_emit}"
    $nfe.UF = "{uf}"
    $nfe.Ambiente = {ambiente}

    $certName = "{cert_name}".Trim()
    if ($certName) {{
        $certs = $nfe.ListarCertificados("|") -split '\|'
        $found = $certs | Where-Object {{ $_ -like "*$certName*" }} | Select-Object -First 1
        if ($found) {{
            $nfe.NomeCertificado = $found
        }} else {{
            $nfe.NomeCertificado = $certName
        }}
    }}

    $res = $nfe.InutilizarNF("{cnpj_emit}", {ano}, {modelo}, {serie}, {n_ini}, {n_fim}, "{just}")
    Write-Output "COM_OK:$res"
}} catch {{
    Write-Output "COM_ERR:$($_.Exception.Message)"
}}
"#,
        cnpj_sh = clean_cnpj_sh,
        token_sh = cfg.token_sh.trim(),
        ini_path = cfg.ini_path.trim(),
        cnpj_emit = clean_cnpj_emit,
        uf = cfg.uf.trim(),
        ambiente = cfg.ambiente,
        cert_name = cfg.cert_name.replace('"', ""),
        ano = ano,
        modelo = modelo,
        serie = serie,
        n_ini = n_ini,
        n_fim = n_fim,
        just = just.replace('"', "'")
    );

    execute_ps_script(&script)
}
