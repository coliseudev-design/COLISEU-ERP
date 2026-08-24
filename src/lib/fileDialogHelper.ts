import { safeInvoke as invoke } from "./ipc";

/**
 * Abre a janela nativa do Windows Explorer para o usuário selecionar uma pasta
 */
export async function escolherPasta(caminhoAtual?: string): Promise<string | null> {
  try {
    const res = await invoke<string | null>('selecionar_pasta');
    if (res) {
      return res;
    }
  } catch (err: any) {
    console.warn('Tauri dialog invocado via web ou não inicializado:', err);
  }

  // Fallback seguro caso esteja rodando fora do Tauri
  const fallback = window.prompt('Informe ou cole o caminho completo da pasta/diretório:', caminhoAtual || 'C:\\COLISEU\\NFE');
  return fallback && fallback.trim() ? fallback.trim() : null;
}

/**
 * Abre a janela nativa do Windows Explorer para o usuário selecionar uma imagem (JPG, PNG, BMP)
 */
export async function escolherArquivoImagem(caminhoAtual?: string): Promise<string | null> {
  try {
    const res = await invoke<string | null>('selecionar_arquivo_imagem');
    if (res) {
      return res;
    }
  } catch (err: any) {
    console.warn('Tauri dialog invocado via web ou não inicializado:', err);
  }

  // Fallback seguro caso esteja rodando fora do Tauri
  const fallback = window.prompt('Informe ou cole o caminho completo do arquivo de imagem do logotipo:', caminhoAtual || 'C:\\COLISEU\\NFE\\logo.jpg');
  return fallback && fallback.trim() ? fallback.trim() : null;
}

/**
 * Abre a janela nativa do Windows Explorer para o usuário selecionar um Certificado Digital A1 (*.pfx, *.p12)
 */
export async function escolherArquivoCertificado(caminhoAtual?: string): Promise<string | null> {
  try {
    const res = await invoke<string | null>('selecionar_arquivo_certificado');
    if (res) {
      return res;
    }
  } catch (err: any) {
    console.warn('Tauri dialog invocado via web ou não inicializado:', err);
  }

  const fallback = window.prompt('Informe ou cole o caminho completo do arquivo do Certificado Digital (.pfx / .p12):', caminhoAtual || 'C:\\Certificados\\certificado.pfx');
  return fallback && fallback.trim() ? fallback.trim() : null;
}


/**
 * Grava o arquivo XML (ou qualquer documento) diretamente no diretório do Windows configurado
 */
export async function salvarArquivoEmDisco(
  caminhoPasta: string,
  nomeArquivo: string,
  conteudo: string
): Promise<{ sucesso: boolean; caminhoCompleto?: string; erro?: string }> {
  try {
    const res = await invoke<string>('salvar_arquivo_em_disco', {
      caminhoPasta,
      nomeArquivo,
      conteudo,
    });
    return { sucesso: true, caminhoCompleto: res };
  } catch (err: any) {
    console.warn('Falha ao gravar arquivo em disco via Tauri:', err);
    return { sucesso: false, erro: String(err) };
  }
}

/**
 * Abre a janela nativa "Salvar Como..." do Windows para o usuário escolher a pasta e gravar o XML/PDF
 */
export async function salvarArquivoComDialogo(
  nomePadrao: string,
  conteudo: string,
  extensao: string = 'xml'
): Promise<string | null> {
  try {
    const res = await invoke<string | null>('salvar_arquivo_com_dialogo', {
      nomePadrao,
      conteudo,
      extensao,
    });
    if (res) return res;
  } catch (err: any) {
    console.warn('Falha no diálogo nativo de salvar:', err);
  }

  // Fallback para navegador
  try {
    const blob = new Blob([conteudo], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomePadrao;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return nomePadrao;
  } catch (e) {
    return null;
  }
}

/**
 * Lê o XML oficial e assinado gravado pelo backend/TecnoSpeed na pasta C:\ERPFULL\NFE\XmlDestinatario\
 */
export async function obterXmlRealDoDisco(chave: string): Promise<string | null> {
  try {
    const res = await invoke<string>('ler_xml_destinatario_cmd', { chave });
    if (res && (res.includes('<Signature') || res.includes('<NFe'))) {
      return res;
    }
  } catch (err: any) {
    console.warn('XML real ainda não encontrado no disco:', err);
  }
  return null;
}



