// Gerador e Exportador de XML NF-e 4.00 Oficial (SEFAZ - procNFe)
import { PedidoVendaItem } from './pedidosVenda';
import { getNfeConfig } from './nfeConfig';

export function gerarXmlNFe(pedido: PedidoVendaItem, chave: string, protocolo: string, tPag: string = '15', modFrete: string = '0', infCpl: string = ''): string {
  const config = getNfeConfig();
  const dhEmi = new Date().toISOString();
  const cnpjEmit = (config.cnpjEmitente || '05766577000122').replace(/\D/g, '');
  const cpfCnpjDest = (pedido.clienteCnpjCpf || '00000000000').replace(/\D/g, '');
  const isCnpj = cpfCnpjDest.length > 11;
  const tagDestId = isCnpj ? `<CNPJ>${cpfCnpjDest}</CNPJ>` : `<CPF>${cpfCnpjDest}</CPF>`;
  const numeroNfe = (pedido.numeroNFe || '1025').replace(/\D/g, '') || '1025';

  const itensXml = (pedido.itens || []).map((item, idx) => {
    const nItem = idx + 1;
    const vProd = (item.subtotalLiquido || item.subtotalBruto || item.quantidade * item.precoFinalUnitario).toFixed(2);
    const vUnit = (item.precoFinalUnitario || item.precoTabelaUnitario).toFixed(4);
    const qCom = (item.quantidade).toFixed(4);
    const ncm = '32089011';
    const cfop = item.cfop || pedido.naturezaOperacao?.cfop || '5102';

    return `
      <det nItem="${nItem}">
        <prod>
          <cProd>${item.codigoInterno || item.codigoFabrica || item.produtoId}</cProd>
          <cEAN>${item.codigoBarras || 'SEM GTIN'}</cEAN>
          <xProd>${escapeXml(item.descricao)}</xProd>
          <NCM>${ncm}</NCM>
          <CFOP>${cfop}</CFOP>
          <uCom>${item.unidadeMedida || 'UN'}</uCom>
          <qCom>${qCom}</qCom>
          <vUnCom>${vUnit}</vUnCom>
          <vProd>${vProd}</vProd>
          <cEANTrib>${item.codigoBarras || 'SEM GTIN'}</cEANTrib>
          <uTrib>${item.unidadeMedida || 'UN'}</uTrib>
          <qTrib>${qCom}</qTrib>
          <vUnTrib>${vUnit}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <vTotTrib>${(item.subtotalLiquido * 0.18).toFixed(2)}</vTotTrib>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>${vProd}</vBC>
              <pICMS>17.00</pICMS>
              <vICMS>${(item.valorIcms || item.subtotalLiquido * 0.17).toFixed(2)}</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>${vProd}</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>${(item.subtotalLiquido * 0.0165).toFixed(2)}</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>${vProd}</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>${(item.subtotalLiquido * 0.076).toFixed(2)}</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>`;
  }).join('\n');

  const vNF = (pedido.valorTotalFinal || 0).toFixed(2);
  const vBC = ((pedido.totalProdutos || pedido.valorTotalFinal) - (pedido.totalDescontoGlobal || 0)).toFixed(2);
  const vICMS = (pedido.totalIcms || pedido.valorTotalFinal * 0.17).toFixed(2);
  const vFrete = (pedido.valorFrete || 0).toFixed(2);
  const vDesc = (pedido.totalDescontoGlobal || 0).toFixed(2);

  const ambNum = config.ambienteDestino === 'PRODUÇÃO' ? '1' : '2';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>50</cUF>
        <cNF>${chave.substring(35, 43)}</cNF>
        <natOp>${escapeXml(pedido.naturezaOperacao?.descricao || 'VENDA DE MERCADORIAS')}</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${numeroNfe}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>5003702</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave.substring(43)}</cDV>
        <tpAmb>${ambNum}</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>Coliseu_ERP_4.0</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpjEmit}</CNPJ>
        <xNome>${escapeXml(config.nomeEmitente || 'COLISEU MATERIAIS & DISTRIBUICAO LTDA')}</xNome>
        <xFant>${escapeXml(config.nomeEmitente || 'COLISEU DISTRIBUIDORA')}</xFant>
        <enderEmit>
          <xLgr>AV. MARCELINO PIRES</xLgr>
          <nro>1250</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>5003702</cMun>
          <xMun>DOURADOS</xMun>
          <UF>${config.ufWebService === 'SÃO PAULO' ? 'SP' : 'MS'}</UF>
          <CEP>79800000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>283261864</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        ${tagDestId}
        <xNome>${escapeXml(pedido.clienteNome || 'AO CONSUMIDOR')}</xNome>
        <enderDest>
          <xLgr>${escapeXml(pedido.clienteEndereco || 'RUA PRINCIPAL')}</xLgr>
          <nro>SN</nro>
          <xBairro>${escapeXml(pedido.clienteBairro || 'CENTRO')}</xBairro>
          <cMun>5003702</cMun>
          <xMun>${escapeXml(pedido.clienteCidade || 'DOURADOS')}</xMun>
          <UF>${pedido.clienteUf || 'MS'}</UF>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>
      ${itensXml}
      <total>
        <ICMSTot>
          <vBC>${vBC}</vBC>
          <vICMS>${vICMS}</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${(pedido.totalProdutos || pedido.valorTotalFinal).toFixed(2)}</vProd>
          <vFrete>${vFrete}</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>${vDesc}</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>${(pedido.valorTotalFinal * 0.0165).toFixed(2)}</vPIS>
          <vCOFINS>${(pedido.valorTotalFinal * 0.076).toFixed(2)}</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${vNF}</vNF>
          <vTotTrib>${(pedido.valorTotalFinal * 0.25).toFixed(2)}</vTotTrib>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>${modFrete}</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>${tPag}</tPag>
          <vPag>${vNF}</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>${escapeXml(infCpl || `Pedido Nº ${pedido.numeroPedido}. Vendedor: ${pedido.vendedorNome}`)}</infCpl>
      </infAdic>
      <infRespTec>
        <CNPJ>12345678000190</CNPJ>
        <xContato>COLISEU SISTEMAS FISCAIS</xContato>
        <email>fiscal@coliseusistemas.com.br</email>
        <fone>6734219000</fone>
      </infRespTec>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${ambNum}</tpAmb>
      <verAplic>MS_4.00_v1.2</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>${protocolo}</nProt>
      <digVal>9/8vT34kLm8912837261524354=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

  return xml;
}

export function baixarArquivoXml(xmlContent: string, nomeArquivo: string) {
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo.endsWith('.xml') ? nomeArquivo : `${nomeArquivo}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
