// Gerador e Validador Oficial de Chave de Acesso NF-e/NFC-e de 44 Dígitos (Manual SEFAZ - Módulo 11)

export interface DadosChaveAcesso {
  uf: string;          // Ex: '50' (MS) ou '35' (SP)
  dataEmissao?: Date;  // Data de emissão (para extrair AAMM)
  cnpjEmitente: string;// 14 dígitos
  modelo: '55' | '65' | '58'; // 55 = NF-e, 65 = NFC-e, 58 = MDF-e
  serie: number | string;      // 1 a 3 dígitos (ex: 1 -> '001')
  numeroDocumento: number | string; // 1 a 9 dígitos (ex: 1025 -> '000001025')
  tipoEmissao?: number;        // 1 = Normal, 2 = Contingência FS-IA, 9 = Contingência Offline
  codigoNumerico?: string;     // 8 dígitos aleatórios (cNF)
}

// Tabela de Códigos de UF do IBGE
export const CODIGOS_UF_IBGE: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41',
  SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
  'MATO GROSSO DO SUL': '50', 'SÃO PAULO': '35', 'PARANÁ': '41',
};

/**
 * Calcula o Dígito Verificador (Módulo 11) segundo o padrão da Receita Federal / SEFAZ
 */
export function calcularDigitoVerificadorModulo11(chave43: string): number {
  if (chave43.length !== 43) {
    throw new Error(`A chave base deve conter exatamente 43 dígitos. Recebido: ${chave43.length}`);
  }

  let soma = 0;
  let peso = 2;

  // Itera da direita para a esquerda
  for (let i = chave43.length - 1; i >= 0; i--) {
    const digito = parseInt(chave43.charAt(i), 10);
    soma += digito * peso;
    peso = peso >= 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  const dv = 11 - resto;

  if (dv === 0 || dv === 1 || dv >= 10) {
    return 0;
  }

  return dv;
}

/**
 * Gera a Chave de Acesso Oficial de 44 Dígitos
 */
export function gerarChaveAcessoNFe(dados: DadosChaveAcesso): { chave: string; cNF: string; cDV: number } {
  // 1. cUF (2 dígitos)
  let cUF = dados.uf;
  if (isNaN(Number(cUF))) {
    cUF = CODIGOS_UF_IBGE[dados.uf.toUpperCase()] || '50';
  }
  cUF = cUF.padStart(2, '0').slice(0, 2);

  // 2. AAMM (4 dígitos)
  const data = dados.dataEmissao || new Date();
  const aa = String(data.getFullYear()).slice(-2);
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const aamm = `${aa}${mm}`;

  // 3. CNPJ Emitente (14 dígitos limpos)
  let cnpjLimpo = dados.cnpjEmitente.replace(/\D/g, '');
  if (!cnpjLimpo || cnpjLimpo.length !== 14) {
    cnpjLimpo = '05766577000122'; // CNPJ PIVETA DISTRIBUIDORA padrão
  }

  // 4. Modelo (2 dígitos)
  const mod = dados.modelo.padStart(2, '0');

  // 5. Série (3 dígitos)
  const serie = String(dados.serie).replace(/\D/g, '').padStart(3, '0').slice(-3);

  // 6. Número do Documento (9 dígitos)
  const nNF = String(dados.numeroDocumento).replace(/\D/g, '').padStart(9, '0').slice(-9);

  // 7. Tipo de Emissão (1 dígito)
  const tpEmis = String(dados.tipoEmissao || 1);

  // 8. Código Numérico cNF (8 dígitos aleatórios)
  let cNF = dados.codigoNumerico ? String(dados.codigoNumerico).replace(/\D/g, '') : '';
  if (cNF.length !== 8) {
    cNF = String(Math.floor(10000000 + Math.random() * 90000000));
  }

  // Montagem dos 43 dígitos base
  const chave43 = `${cUF}${aamm}${cnpjLimpo}${mod}${serie}${nNF}${tpEmis}${cNF}`;

  // 9. Cálculo do cDV (1 dígito)
  const cDV = calcularDigitoVerificadorModulo11(chave43);

  const chaveCompleta = `${chave43}${cDV}`;

  return {
    chave: chaveCompleta,
    cNF,
    cDV,
  };
}

/**
 * Valida se uma chave de 44 dígitos é matematicamente válida na SEFAZ
 */
export function validarChaveAcesso(chave: string): { valida: boolean; motivo?: string } {
  const limpa = chave.replace(/\D/g, '');
  if (limpa.length !== 44) {
    return { valida: false, motivo: 'A chave deve conter exatamente 44 dígitos numéricos.' };
  }

  const chave43 = limpa.substring(0, 43);
  const dvInformado = parseInt(limpa.substring(43), 10);
  const dvCalculado = calcularDigitoVerificadorModulo11(chave43);

  if (dvInformado !== dvCalculado) {
    return {
      valida: false,
      motivo: `Dígito verificador inválido. Informado: ${dvInformado}, Esperado pelo algoritmo da SEFAZ: ${dvCalculado}`,
    };
  }

  return { valida: true };
}
