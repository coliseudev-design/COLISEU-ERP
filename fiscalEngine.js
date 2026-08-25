import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utilitário de Cálculo do Dígito Verificador de 44 dígitos da SEFAZ (Módulo 11)
 */
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

/**
 * Gera a Chave de Acesso oficial da SEFAZ com 44 dígitos
 */
export function gerarChaveAcesso({
  uf = '50', // 50 = Mato Grosso do Sul
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

/**
 * Gera o XML de Distribuição da NF-e 4.00 (Modelo 55)
 */
export function gerarXmlNFe({
  chaveAcesso,
  serie = 1,
  numero = 1025,
  dataEmissao = new Date(),
  emitente = { cnpj: '05766577000122', razaoSocial: 'COLISEU SISTEMAS LTDA', uf: 'MS' },
  destinatario = { nome: 'CONSUMIDOR FINAL', cpfCnpj: '00000000000', uf: 'MS' },
  itens = [],
  valorTotal = 0,
  naturezaOperacao = 'VENDA DE MERCADORIAS',
  protocoloAutorizacao = '150260000001025',
}) {
  const dhEmi = dataEmissao.toISOString();
  const cnpjClean = (emitente.cnpj || '05766577000122').replace(/\D/g, '');
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
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
          <PIS><PISNT><CST>07</CST></PISNT></PIS>
          <COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>
        </imposto>
      </det>`;
    })
    .join('');

  const vNF = parseFloat(valorTotal || '0').toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chaveAcesso}" versao="4.00">
      <ide>
        <cUF>50</cUF>
        <cNF>${chaveAcesso.slice(35, 43)}</cNF>
        <natOp>${naturezaOperacao}</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${numero}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>5003702</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chaveAcesso.slice(43)}</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>ColiseuERP_6.5</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpjClean}</CNPJ>
        <xNome>${(emitente.razaoSocial || emitente.nome || 'COLISEU SISTEMAS LTDA').toUpperCase()}</xNome>
        <enderEmit>
          <xLgr>RUA DA MATRIZ</xLgr>
          <nro>100</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>5003702</cMun>
          <xMun>DOURADOS</xMun>
          <UF>${emitente.uf || 'MS'}</UF>
          <CEP>79800000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>283261864</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        ${destTag}
        <xNome>${(destinatario.nome || 'CONSUMIDOR FINAL').toUpperCase()}</xNome>
        <enderDest>
          <xLgr>AVENIDA PRINCIPAL</xLgr>
          <nro>500</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>5003702</cMun>
          <xMun>DOURADOS</xMun>
          <UF>${destinatario.uf || 'MS'}</UF>
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
          <tPag>01</tPag>
          <vPag>${vNF}</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>Coliseu_SEFAZ_4.00</verAplic>
      <chNFe>${chaveAcesso}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>${protocoloAutorizacao}</nProt>
      <digVal>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

/**
 * Gera o XML de Distribuição da NFC-e 4.00 (Modelo 65)
 */
export function gerarXmlNFCe({
  chaveAcesso,
  serie = 1,
  numero = 100,
  dataEmissao = new Date(),
  emitente = { cnpj: '05766577000122', razaoSocial: 'COLISEU SISTEMAS LTDA', uf: 'MS' },
  destinatario = { nome: 'CONSUMIDOR FINAL', cpfCnpj: '' },
  itens = [],
  valorTotal = 0,
  formaPagamento = '01',
  protocoloAutorizacao = '150260000009876',
}) {
  const dhEmi = dataEmissao.toISOString();
  const cnpjClean = (emitente.cnpj || '05766577000122').replace(/\D/g, '');
  const vNF = parseFloat(valorTotal || '0').toFixed(2);
  const qrCodeUrl = `http://www.dfe.ms.gov.br/nfce/qrcode?p=${chaveAcesso}|2|1|1|e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chaveAcesso}" versao="4.00">
      <ide>
        <cUF>50</cUF>
        <cNF>${chaveAcesso.slice(35, 43)}</cNF>
        <natOp>VENDA A CONSUMIDOR</natOp>
        <mod>65</mod>
        <serie>${serie}</serie>
        <nNF>${numero}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>5003702</cMunFG>
        <tpImp>4</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chaveAcesso.slice(43)}</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>ColiseuERP_NFCe_6.5</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpjClean}</CNPJ>
        <xNome>${(emitente.razaoSocial || emitente.nome || 'COLISEU SISTEMAS LTDA').toUpperCase()}</xNome>
        <enderEmit>
          <xLgr>AVENIDA COMERCIAL</xLgr>
          <nro>1200</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>5003702</cMun>
          <xMun>DOURADOS</xMun>
          <UF>MS</UF>
          <CEP>79800000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>283261864</IE>
        <CRT>1</CRT>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>1</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>VENDA EM BALCAO PDV</xProd>
          <NCM>84713012</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>${vNF}</vUnCom>
          <vProd>${vNF}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>1.0000</qTrib>
          <vUnTrib>${vNF}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vProd>${vNF}</vProd>
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
      <infNFeSupl>
        <qrCode><![CDATA[${qrCodeUrl}]]></qrCode>
        <urlChave>http://www.dfe.ms.gov.br/nfce/consulta</urlChave>
      </infNFeSupl>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>Coliseu_NFCe_4.00</verAplic>
      <chNFe>${chaveAcesso}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>${protocoloAutorizacao}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NFC-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

/**
 * Gera o XML de Distribuição do CT-e 4.00 (Modelo 57)
 */
export function gerarXmlCTe({
  chaveAcesso,
  serie = 1,
  numero = 50,
  dataEmissao = new Date(),
  emitente = { cnpj: '05766577000122', razaoSocial: 'COLISEU TRANSPORTES LTDA', uf: 'MS' },
  tomador = { nome: 'CLIENTE TOMADOR', cpfCnpj: '05766577000122' },
  valorTotal = 0,
  protocoloAutorizacao = '150260000005757',
}) {
  const dhEmi = dataEmissao.toISOString();
  const vPrest = parseFloat(valorTotal || '0').toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<cteProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/cte">
  <CTe xmlns="http://www.portalfiscal.inf.br/cte">
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
        <tpAmb>1</tpAmb>
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
  </CTe>
  <protCTe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>Coliseu_CTe_4.00</verAplic>
      <chCTe>${chaveAcesso}</chCTe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>${protocoloAutorizacao}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso do CT-e</xMotivo>
    </infProt>
  </protCTe>
</cteProc>`;
}

/**
 * Gera o XML de Distribuição do MDF-e 3.00 (Modelo 58)
 */
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
  protocoloAutorizacao = '150260000005858',
}) {
  const dhEmi = dataEmissao.toISOString();
  const vCarga = parseFloat(valorCarga || '0').toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<mdfeProc versao="3.00" xmlns="http://www.portalfiscal.inf.br/mdfe">
  <MDFe xmlns="http://www.portalfiscal.inf.br/mdfe">
    <infMDFe Id="MDFe${chaveAcesso}" versao="3.00">
      <ide>
        <cUF>50</cUF>
        <tpAmb>1</tpAmb>
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
  </MDFe>
  <protMDFe versao="3.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>Coliseu_MDFe_3.00</verAplic>
      <chMDFe>${chaveAcesso}</chMDFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>${protocoloAutorizacao}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso do MDF-e</xMotivo>
    </infProt>
  </protMDFe>
</mdfeProc>`;
}
