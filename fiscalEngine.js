import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';
import forge from 'node-forge';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =========================================================================
// 1. UTILITÁRIOS DA CHAVE DE ACESSO DE 44 DÍGITOS (SEFAZ MÓDULO 11)
// =========================================================================

export function calcularDigitoVerificador(chave43) {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let pesoIndex = 0;

  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43[i], 10) * pesos[pesoIndex];
    pesoIndex = (pesoIndex + 1) % pesos.length;
  }

  const resto = soma % 11;
  const dv = 11 - resto;
  if (dv === 0 || dv === 10 || dv === 11) return 0;
  return dv;
}

export function gerarChaveAcesso({
  uf = '50', // 50 = MS
  dataEmissao = new Date(),
  cnpjEmitente = '05766577000122',
  modelo = '55',
  serie = 1,
  numero = 1025,
  tipoEmissao = 1, // 1 = Normal
  codigoNumerico = null,
}) {
  const ufCode = uf.replace(/\D/g, '').padStart(2, '0') || '50';
  const ano = dataEmissao.getFullYear().toString().slice(-2);
  const mes = (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
  const aaMm = `${ano}${mes}`;
  const cnpjClean = cnpjEmitente.replace(/\D/g, '').padStart(14, '0');
  const modStr = modelo.toString().padStart(2, '0');
  const serieStr = serie.toString().padStart(3, '0');
  const numStr = numero.toString().padStart(9, '0');
  const tpEmisStr = tipoEmissao.toString();
  const cNfStr = (codigoNumerico || Math.floor(10000000 + Math.random() * 90000000)).toString().slice(0, 8);

  const chave43 = `${ufCode}${aaMm}${cnpjClean}${modStr}${serieStr}${numStr}${tpEmisStr}${cNfStr}`;
  const dv = calcularDigitoVerificador(chave43);
  return `${chave43}${dv}`;
}

// =========================================================================
// 2. EXTRAÇÃO E PARSER REAL DE CERTIFICADOS DIGITAIS A1 (PKCS#12 / .PFX)
// =========================================================================

export function extrairDadosCertificadoPfx(pfxBuffer, password) {
  try {
    const p12Der = pfxBuffer.toString('binary');
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // Obter cert bags
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (certBags.length === 0) {
      throw new Error('Nenhum certificado X.509 encontrado no arquivo .PFX');
    }

    // Identifica o certificado folha (end-entity)
    let leafCert = certBags[0].cert;
    for (const b of certBags) {
      if (b.cert) {
        const isCA = b.cert.extensions?.some((ext) => ext.name === 'basicConstraints' && ext.cA);
        if (!isCA) {
          leafCert = b.cert;
          break;
        }
      }
    }

    // Obter chave privada (pode ser pkcs8ShroudedKeyBag ou keyBag)
    const keyBags = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [])
      .concat(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []);

    const key = keyBags[0]?.key;
    const privateKeyPem = key ? forge.pki.privateKeyToPem(key) : '';
    const certPem = forge.pki.certificateToPem(leafCert);
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(leafCert)).getBytes();
    const certBase64 = forge.util.encode64(certDer);

    const cnField = leafCert.subject.getField('CN');
    const titular = cnField?.value || '';

    // Extrair CNPJ ou CPF do titular (formato ICP-Brasil: "EMPRESA:00000000000000")
    let cnpj = '';
    let cpf = '';
    if (titular) {
      const matchCnpj = titular.match(/:(\d{14})/);
      if (matchCnpj) {
        cnpj = matchCnpj[1];
      } else {
        const matchCpf = titular.match(/:(\d{11})/);
        if (matchCpf) cpf = matchCpf[1];
      }
    }

    const validadeInicio = leafCert.validity.notBefore;
    const validadeFim = leafCert.validity.notAfter;
    const diasRestantes = Math.ceil((validadeFim.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const expirado = diasRestantes <= 0;

    const emissorField = leafCert.issuer.getField('CN');
    const emissor = emissorField?.value || 'Autoridade Certificadora ICP-Brasil';

    return {
      success: true,
      titular: titular.split(':')[0] || titular,
      nomeCompleto: titular,
      cnpj,
      cpf,
      emissor,
      serialNumber: leafCert.serialNumber,
      validadeInicio: validadeInicio.toISOString(),
      validadeFim: validadeFim.toISOString(),
      diasRestantes,
      expirado,
      certPem,
      certBase64,
      privateKeyPem,
    };
  } catch (err) {
    let msg = err.message || 'Falha ao abrir certificado A1.';
    if (msg.includes('MAC could not be verified') || msg.includes('Invalid password')) {
      msg = 'Senha do certificado incorreta. Verifique a senha digitada.';
    }
    return {
      success: false,
      error: `Falha ao abrir certificado A1 (.pfx): ${msg}`,
    };
  }
}

// =========================================================================
// 3. ASSINATURA DIGITAL XMLDSIG (RSA-SHA1) PADRÃO OFICIAL SEFAZ
// =========================================================================

function canonicalizarC14N(xmlChunk) {
  return xmlChunk
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/>\s+</g, '><')
    .trim();
}

export function assinarXmlNFe(xmlString, pfxBuffer, password, tagName = 'infNFe') {
  // 1. Extrai chave privada e certificado DER
  const dadosCert = extrairDadosCertificadoPfx(pfxBuffer, password);
  if (!dadosCert.success) {
    throw new Error(dadosCert.error);
  }

  // 2. Isola a tag do documento (ex: <infNFe Id="NFe...">...</infNFe>)
  const startTag = `<${tagName}`;
  const endTag = `</${tagName}>`;
  const startIdx = xmlString.indexOf(startTag);
  const endIdx = xmlString.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Elemento <${tagName}> não localizado no XML para assinatura.`);
  }

  const infDocXml = xmlString.substring(startIdx, endIdx + endTag.length);

  // Extrai o ID de referência (ex: NFe50260805766577000122550010000010251100010254)
  const idMatch = infDocXml.match(/Id="([^"]+)"/);
  const uriRef = idMatch ? `#${idMatch[1]}` : '';

  // 3. Calcula o DigestValue (SHA-1 do infNFe canonicalizado C14N)
  const c14nInfDoc = canonicalizarC14N(infDocXml);
  const sha1Digest = crypto.createHash('sha1').update(c14nInfDoc, 'utf8').digest('base64');

  // 4. Constrói o SignedInfo
  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="${uriRef}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>${sha1Digest}</DigestValue></Reference></SignedInfo>`;

  // 5. Assina o SignedInfo com a chave privada RSA (RSA-SHA1)
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(signedInfo, 'utf8');
  const signatureValue = signer.sign(dadosCert.privateKeyPem, 'base64');

  // 6. Constrói o elemento completo <Signature>
  const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${dadosCert.certBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;

  // 7. Insere a Assinatura no XML logo antes do fechamento do documento principal
  // Ex: logo antes de </NFe>, </CTe>, </MDFe>
  const rootClosingTags = ['</NFe>', '</CTe>', '</MDFe>'];
  let xmlAssinado = '';

  for (const rTag of rootClosingTags) {
    if (xmlString.includes(rTag)) {
      xmlAssinado = xmlString.replace(rTag, `${signatureXml}${rTag}`);
      break;
    }
  }

  if (!xmlAssinado) {
    xmlAssinado = `${xmlString}${signatureXml}`;
  }

  return {
    xmlAssinado,
    digestValue: sha1Digest,
    signatureValue,
    certInfo: dadosCert,
  };
}

// =========================================================================
// 4. WEBSERVICES OFICIAIS SEFAZ (MS / SVRS)
// =========================================================================

export const SEFAZ_SERVIDORES = {
  MS: {
    HOMOLOGACAO: {
      statusServico: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consultaChave: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      inutilizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      recepcaoEvento: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
      statusServicoNFCe: 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      autorizacaoNFCe: 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    },
    PRODUCAO: {
      statusServico: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consultaChave: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      inutilizacao: 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      recepcaoEvento: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
      statusServicoNFCe: 'https://nfce.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      autorizacaoNFCe: 'https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    },
  },
  SVRS: {
    HOMOLOGACAO: {
      statusServico: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      autorizacaoNFCe: 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    },
    PRODUCAO: {
      statusServico: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      autorizacaoNFCe: 'https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    },
  },
};

// =========================================================================
// 5. CONSULTA DE STATUS DO SERVIÇO SEFAZ EM TEMPO REAL (mTLS SOAP 1.2)
// =========================================================================

export async function consultarStatusServicoSefaz({
  uf = '50', // 50 = MS
  ambiente = '2', // 1 = Produção, 2 = Homologação
  pfxBuffer,
  password,
}) {
  const cUF = uf.replace(/\D/g, '') || '50';
  const tpAmb = ambiente.toString();
  const ambKey = tpAmb === '1' ? 'PRODUCAO' : 'HOMOLOGACAO';

  const urlWS = SEFAZ_SERVIDORES.MS[ambKey]?.statusServico || SEFAZ_SERVIDORES.SVRS[ambKey]?.statusServico;

  // Monta o Envelope SOAP 1.2 sem quebras de linha ou caracteres de edição (exigência estrita do schema SEFAZ)
  const consStatServXml = `<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${tpAmb}</tpAmb><cUF>${cUF}</cUF><xServ>STATUS</xServ></consStatServ>`;
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">${consStatServXml}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;

  try {
    const httpsAgent = new https.Agent({
      pfx: pfxBuffer,
      passphrase: password,
      rejectUnauthorized: false, // Aceita certificados intermediários da SEFAZ
    });

    const parsedUrl = new URL(urlWS);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF"',
        'Content-Length': Buffer.byteLength(soapEnvelope, 'utf8'),
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          // Extrai cStat e xMotivo da resposta XML
          const cStatMatch = responseData.match(/<cStat>(\d+)<\/cStat>/);
          const xMotivoMatch = responseData.match(/<xMotivo>([^<]+)<\/xMotivo>/);
          const dhRecbtoMatch = responseData.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);
          const tMedMatch = responseData.match(/<tMed>([^<]+)<\/tMed>/);

          const cStat = cStatMatch ? cStatMatch[1] : null;
          const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Resposta recebida da SEFAZ';

          if (cStat === '107') {
            resolve({
              success: true,
              online: true,
              cStat: '107',
              xMotivo: xMotivo || 'Serviço em Operação',
              dhRecbto: dhRecbtoMatch ? dhRecbtoMatch[1] : new Date().toISOString(),
              tempoMedio: tMedMatch ? `${tMedMatch[1]}s` : '1s',
              ambiente: tpAmb === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO (TESTES)',
              uf: 'MS',
              rawResponse: responseData,
            });
          } else {
            resolve({
              success: false,
              online: false,
              cStat: cStat || 'DESCONHECIDO',
              xMotivo: xMotivo || 'Retorno não esperado da SEFAZ',
              rawResponse: responseData,
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          online: false,
          error: `Erro de conexão TLS com WebService SEFAZ: ${err.message}`,
        });
      });

      req.setTimeout(12000, () => {
        req.destroy();
        resolve({
          success: false,
          online: false,
          error: 'Tempo limite (Timeout) atingido ao consultar SEFAZ MS.',
        });
      });

      req.write(soapEnvelope);
      req.end();
    });
  } catch (err) {
    return {
      success: false,
      online: false,
      error: `Falha ao iniciar requisição mTLS: ${err.message}`,
    };
  }
}

// =========================================================================
// 6. TRANSMISSÃO REAL DE LOTE NFE / NFCE PARA AUTORIZAÇÃO NA SEFAZ
// =========================================================================

export async function transmitirLoteNFeSefaz({
  xmlAssinado,
  uf = '50',
  ambiente = '2',
  pfxBuffer,
  password,
  idLote = `${Date.now()}`.slice(-15),
}) {
  const cUF = uf.replace(/\D/g, '') || '50';
  const tpAmb = ambiente.toString();
  const ambKey = tpAmb === '1' ? 'PRODUCAO' : 'HOMOLOGACAO';

  const urlWS = SEFAZ_SERVIDORES.MS[ambKey]?.autorizacao || SEFAZ_SERVIDORES.SVRS[ambKey]?.autorizacao;

  // Minificar XML da NFe assinado removendo espaços/quebras entre tags
  const xmlMinificado = xmlAssinado.replace(/>\s+</g, '><').trim();
  const loteXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${xmlMinificado}</enviNFe>`;
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">${loteXml}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;

  try {
    const httpsAgent = new https.Agent({
      pfx: pfxBuffer,
      passphrase: password,
      rejectUnauthorized: false,
    });

    const parsedUrl = new URL(urlWS);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"',
        'Content-Length': Buffer.byteLength(soapEnvelope, 'utf8'),
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          // Extrai protNFe e status
          const cStatMatch = responseData.match(/<cStat>(\d+)<\/cStat>/);
          const xMotivoMatch = responseData.match(/<xMotivo>([^<]+)<\/xMotivo>/);
          const nProtMatch = responseData.match(/<nProt>([^<]+)<\/nProt>/);
          const chNFeMatch = responseData.match(/<chNFe>([^<]+)<\/chNFe>/);
          const dhRecbtoMatch = responseData.match(/<dhRecbto>([^<]+)<\/dhRecbto>/);

          const cStat = cStatMatch ? cStatMatch[1] : '0';
          const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Retorno da SEFAZ';
          const protocolo = nProtMatch ? nProtMatch[1] : null;
          const chave = chNFeMatch ? chNFeMatch[1] : null;

          // Se autorizado (100 ou 104 com protNFe cStat 100)
          const isAutorizado = cStat === '100' || (cStat === '104' && responseData.includes('<cStat>100</cStat>'));

          // Monta o XML procNFe oficial de distribuição
          let xmlProc = '';
          const protMatch = responseData.match(/<protNFe[\s\S]*?<\/protNFe>/);
          if (isAutorizado && protMatch) {
            xmlProc = `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">${xmlAssinado}${protMatch[0]}</nfeProc>`;
          }

          resolve({
            success: isAutorizado,
            autorizado: isAutorizado,
            cStat,
            xMotivo,
            protocolo,
            chaveAcesso: chave,
            dhRecbto: dhRecbtoMatch ? dhRecbtoMatch[1] : new Date().toISOString(),
            xmlProc,
            rawResponse: responseData,
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          autorizado: false,
          error: `Erro ao transmitir para SEFAZ: ${err.message}`,
        });
      });

      req.setTimeout(25000, () => {
        req.destroy();
        resolve({
          success: false,
          autorizado: false,
          error: 'Tempo limite (Timeout 25s) na autorização da SEFAZ.',
        });
      });

      req.write(soapEnvelope);
      req.end();
    });
  } catch (err) {
    return {
      success: false,
      autorizado: false,
      error: `Falha na transmissão mTLS: ${err.message}`,
    };
  }
}

// =========================================================================
// 7. GERADORES DE XML DE NEGÓCIO (NFE 4.00, NFCE 4.00, CTE, MDFE)
// =========================================================================

export function gerarXmlNFe({
  chaveAcesso,
  serie = 1,
  numero = 1025,
  dataEmissao = new Date(),
  emitente = { cnpj: '05766577000122', razaoSocial: 'COLISEU SISTEMAS LTDA', uf: 'MS', ie: '283261864' },
  destinatario = { nome: 'CONSUMIDOR FINAL', cpfCnpj: '00000000000', uf: 'MS' },
  itens = [],
  valorTotal = 0,
  naturezaOperacao = 'VENDA DE MERCADORIAS',
  formaPagamento = '01', // 01 = Dinheiro, 03 = Cartao Credito, 17 = PIX
  ambiente = 2, // 1 = Producao, 2 = Homologacao
}) {
  const dhEmi = dataEmissao.toISOString();
  const cNF = chaveAcesso.slice(35, 43);
  const cDV = chaveAcesso.slice(43);
  const cnpjClean = (emitente.cnpj || '05766577000122').replace(/\D/g, '');
  const ieClean = (emitente.ie || '283261864').replace(/\D/g, '');
  const destClean = (destinatario.cpfCnpj || '').replace(/\D/g, '');
  const destTag = destClean.length === 14 ? `<CNPJ>${destClean}</CNPJ>` : `<CPF>${destClean.padStart(11, '0')}</CPF>`;

  const xmlItens = (itens.length > 0 ? itens : [{ descricao: 'PRODUTO DIVERSOS', quantidade: 1, valorUnitario: valorTotal, valorTotal: valorTotal }])
    .map((item, idx) => {
      const nItem = idx + 1;
      const vProd = parseFloat(item.valorTotal || item.valor || '0').toFixed(2);
      const vUn = parseFloat(item.valorUnitario || item.preco || vProd).toFixed(4);
      const qCom = parseFloat(item.quantidade || '1').toFixed(4);
      return `
      <det nItem="${nItem}">
        <prod>
          <cProd>${item.id || item.codigo || nItem}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${(item.descricao || item.nome || 'PRODUTO DIVERSOS').toUpperCase()}</xProd>
          <NCM>${item.ncm || '84713012'}</NCM>
          <CFOP>${item.cfop || '5102'}</CFOP>
          <uCom>${item.unidade || 'UN'}</uCom>
          <qCom>${qCom}</qCom>
          <vUnCom>${vUn}</vUnCom>
          <vProd>${vProd}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${item.unidade || 'UN'}</uTrib>
          <qTrib>${qCom}</qTrib>
          <vUnTrib>${vUn}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
          <PIS><PISNT><CST>07</CST></PISNT></PIS>
          <COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>
        </imposto>
      </det>`;
    })
    .join('');

  const vNF = parseFloat(valorTotal || '0').toFixed(2);

  return `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chaveAcesso}" versao="4.00">
    <ide>
      <cUF>50</cUF>
      <cNF>${cNF}</cNF>
      <natOp>${naturezaOperacao.toUpperCase()}</natOp>
      <mod>55</mod>
      <serie>${serie}</serie>
      <nNF>${numero}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>5003702</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>${ambiente}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>ColiseuERP_4.00</verProc>
    </ide>
    <emit>
      <CNPJ>${cnpjClean}</CNPJ>
      <xNome>${(emitente.razaoSocial || emitente.nome || 'COLISEU SISTEMAS LTDA').toUpperCase()}</xNome>
      <enderEmit>
        <xLgr>AVENIDA MARCELINO PIRES</xLgr>
        <nro>1000</nro>
        <xBairro>CENTRO</xBairro>
        <cMun>5003702</cMun>
        <xMun>DOURADOS</xMun>
        <UF>MS</UF>
        <CEP>79800000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>${ieClean}</IE>
      <CRT>1</CRT>
    </emit>
    <dest>
      ${destTag}
      <xNome>${(destinatario.nome || 'CONSUMIDOR FINAL').toUpperCase()}</xNome>
      <enderDest>
        <xLgr>RUA PRINCIPAL</xLgr>
        <nro>100</nro>
        <xBairro>CENTRO</xBairro>
        <cMun>5003702</cMun>
        <xMun>DOURADOS</xMun>
        <UF>MS</UF>
        <CEP>79800000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>
      <indIEDest>9</indIEDest>
    </dest>
    ${xmlItens}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${vNF}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${vNF}</vNF>
      </ICMSTot>
    </total>
    <transp><modFrete>9</modFrete></transp>
    <pag>
      <detPag>
        <tPag>${formaPagamento}</tPag>
        <vPag>${vNF}</vPag>
      </detPag>
    </pag>
  </infNFe>
</NFe>`;
}

export function gerarXmlNFCe(params) {
  return gerarXmlNFe({ ...params, modelo: '65' });
}

export function gerarXmlCTe({
  chaveAcesso,
  serie = 1,
  numero = 50,
  dataEmissao = new Date(),
  emitente = { cnpj: '05766577000122', razaoSocial: 'COLISEU TRANSPORTES LTDA', uf: 'MS' },
  tomador = { nome: 'CLIENTE TOMADOR', cpfCnpj: '05766577000122' },
  valorTotal = 0,
}) {
  const dhEmi = dataEmissao.toISOString();
  const vPrest = parseFloat(valorTotal || '0').toFixed(2);

  return `<CTe xmlns="http://www.portalfiscal.inf.br/cte">
  <infCte Id="CTe${chaveAcesso}" versao="4.00">
    <ide>
      <cUF>50</cUF>
      <cCT>${chaveAcesso.slice(35, 43)}</cCT>
      <CFOP>5353</CFOP>
      <natOp>PRESTACAO DE SERVICO DE TRANSPORTE</natOp>
      <mod>57</mod>
      <serie>${serie}</serie>
      <nCT>${numero}</nCT>
      <dhEmi>${dhEmi}</dhEmi>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${chaveAcesso.slice(43)}</cDV>
      <tpAmb>2</tpAmb>
      <tpCTe>0</tpCTe>
      <procEmi>0</procEmi>
      <verProc>ColiseuCTe_4.00</verProc>
    </ide>
    <emit>
      <CNPJ>${(emitente.cnpj || '05766577000122').replace(/\D/g, '')}</CNPJ>
      <IE>283261864</IE>
      <xNome>${(emitente.razaoSocial || emitente.nome || 'COLISEU TRANSPORTES LTDA').toUpperCase()}</xNome>
      <enderEmit>
        <xLgr>RODOVIA BR 163</xLgr>
        <nro>KM 10</nro>
        <xBairro>DISTRITO INDUSTRIAL</xBairro>
        <cMun>5003702</cMun>
        <xMun>DOURADOS</xMun>
        <UF>MS</UF>
      </enderEmit>
    </emit>
    <vPrest>
      <vTPrest>${vPrest}</vTPrest>
      <vRec>${vPrest}</vRec>
    </vPrest>
  </infCte>
</CTe>`;
}

export function gerarXmlMDFe({
  chaveAcesso,
  serie = 1,
  numero = 30,
  dataEmissao = new Date(),
  emitente = { cnpj: '05766577000122', razaoSocial: 'COLISEU TRANSPORTES LTDA', uf: 'MS' },
  placaVeiculo = 'BRA2E19',
  condutorNome = 'JOAO MOTORISTA',
  condutorCpf = '12345678909',
  valorCarga = 0,
}) {
  const dhEmi = dataEmissao.toISOString();
  const vCarga = parseFloat(valorCarga || '0').toFixed(2);

  return `<MDFe xmlns="http://www.portalfiscal.inf.br/mdfe">
  <infMDFe Id="MDFe${chaveAcesso}" versao="3.00">
    <ide>
      <cUF>50</cUF>
      <tpAmb>2</tpAmb>
      <tpEmit>1</tpEmit>
      <tpTransp>1</tpTransp>
      <mod>58</mod>
      <serie>${serie}</serie>
      <nMDF>${numero}</nMDF>
      <cMDF>${chaveAcesso.slice(35, 43)}</cMDF>
      <cDV>${chaveAcesso.slice(43)}</cDV>
      <modal>1</modal>
      <dhEmi>${dhEmi}</dhEmi>
      <tpEmis>1</tpEmis>
      <procEmi>0</procEmi>
      <verProc>ColiseuMDFe_3.00</verProc>
      <UFIni>MS</UFIni>
      <UFFim>SP</UFFim>
    </ide>
    <emit>
      <CNPJ>${(emitente.cnpj || '05766577000122').replace(/\D/g, '')}</CNPJ>
      <IE>283261864</IE>
      <xNome>${(emitente.razaoSocial || emitente.nome || 'COLISEU TRANSPORTES LTDA').toUpperCase()}</xNome>
    </emit>
    <infModal versaoModal="3.00">
      <rodo>
        <veicTracao>
          <placa>${placaVeiculo}</placa>
          <UF>MS</UF>
          <condutor>
            <xNome>${condutorNome.toUpperCase()}</xNome>
            <CPF>${condutorCpf.replace(/\D/g, '').padStart(11, '0')}</CPF>
          </condutor>
        </veicTracao>
      </rodo>
    </infModal>
    <tot>
      <qNFe>1</qNFe>
      <vCarga>${vCarga}</vCarga>
      <cUnid>01</cUnid>
      <qCarga>1500.0000</qCarga>
    </tot>
  </infMDFe>
</MDFe>`;
}
