use tracing::info;

#[tauri::command]
pub async fn selecionar_pasta() -> Result<Option<String>, String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Selecionar Diretório de Armazenamento")
        .pick_folder()
        .await;

    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn selecionar_arquivo_imagem() -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_title("Selecionar Logotipo / Imagem")
        .add_filter("Imagens (*.jpg, *.jpeg, *.png, *.bmp)", &["jpg", "jpeg", "png", "bmp"])
        .pick_file()
        .await;

    Ok(file.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn selecionar_arquivo_certificado() -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .set_title("Selecionar Certificado Digital A1 (*.pfx, *.p12)")
        .add_filter("Certificados Digitais A1 (*.pfx, *.p12)", &["pfx", "p12"])
        .pick_file()
        .await;

    Ok(file.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn salvar_arquivo_em_disco(
    caminho_pasta: String,
    nome_arquivo: String,
    conteudo: String,
) -> Result<String, String> {
    if caminho_pasta.trim().is_empty() {
        return Err("Caminho de pasta não configurado.".to_string());
    }

    let dir_path = std::path::Path::new(&caminho_pasta);
    if let Err(e) = std::fs::create_dir_all(dir_path) {
        return Err(format!("Falha ao criar diretório '{}': {}", caminho_pasta, e));
    }

    let full_path = dir_path.join(&nome_arquivo);
    if let Err(e) = std::fs::write(&full_path, conteudo.as_bytes()) {
        return Err(format!("Falha ao salvar arquivo em '{}': {}", full_path.display(), e));
    }

    info!("Arquivo gravado com sucesso: {}", full_path.display());
    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn salvar_arquivo_com_dialogo(
    nome_padrao: String,
    conteudo: String,
    extensao: String,
) -> Result<Option<String>, String> {
    let mut dialog = rfd::AsyncFileDialog::new()
        .set_title("Salvar Arquivo")
        .set_file_name(&nome_padrao);

    if extensao == "xml" {
        dialog = dialog.add_filter("Arquivo XML (*.xml)", &["xml"]);
    } else if extensao == "pdf" {
        dialog = dialog.add_filter("Documento PDF (*.pdf)", &["pdf"]);
    }

    let file = dialog.save_file().await;
    if let Some(handle) = file {
        let path = handle.path().to_path_buf();
        if let Err(e) = std::fs::write(&path, conteudo.as_bytes()) {
            return Err(format!("Falha ao gravar arquivo: {}", e));
        }
        info!("Arquivo gravado via diálogo pelo usuário: {}", path.display());
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn ler_xml_destinatario_cmd(chave: String) -> Result<String, String> {
    let clean_chave = chave.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let pastas = [
        format!("C:\\ERPFULL\\NFE\\XmlDestinatario\\{}-procNFe.xml", clean_chave),
        format!("C:\\ERPFULL\\NFE\\XmlDestinatario\\{}-nfe.xml", clean_chave),
        format!("C:\\ERPFULL\\NFE\\XmlDestinatario\\{}", clean_chave),
        format!("C:\\ERPFULL\\NFE\\XmlDestinatario\\{}.xml", clean_chave),
    ];
    for p in &pastas {
        if let Ok(conteudo) = std::fs::read_to_string(p) {
            if conteudo.contains("<Signature") || conteudo.contains("<NFe") {
                return Ok(conteudo);
            }
        }
    }

    let dir = std::path::Path::new("C:\\ERPFULL\\NFE\\XmlDestinatario");
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.contains(&clean_chave) {
                    if let Ok(conteudo) = std::fs::read_to_string(entry.path()) {
                        if !conteudo.trim().is_empty() {
                            return Ok(conteudo);
                        }
                    }
                }
            }
        }
    }
    Err("Arquivo XML não localizado na pasta C:\\ERPFULL\\NFE\\XmlDestinatario\\".to_string())
}

