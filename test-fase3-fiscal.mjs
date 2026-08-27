import fs from 'fs';
import path from 'path';
import {
  gerarChaveAcesso,
  calcularDigitoVerificador,
  gerarXmlNFe,
  gerarXmlNFCe,
  gerarXmlCTe,
  gerarXmlMDFe,
} from './fiscalEngine.js';

console.log('================================================================');
console.log('TESTE AUTOMATIZADO - FASE 3: MOTOR FISCAL CENTRALIZADO (55/65/57/58)');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
  }
}

// 1. Teste de Chave de Acesso Oficial de 44 dígitos e Módulo 11
const chave44Nfe = gerarChaveAcesso({
  uf: '50',
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  cnpjEmitente: '05766577000122',
  modelo: '55',
  serie: 1,
  numero: 1025,
  tipoEmissao: 1,
  codigoNumerico: '12345678',
});

assert(chave44Nfe.length === 44, 'Chave de acesso NF-e possui exatamente 44 dígitos numéricos');
assert(chave44Nfe.startsWith('5026080576657700012255001000001025112345678'), 'Composição da Chave 43 dígitos');
const dvCalculado = calcularDigitoVerificador(chave44Nfe.slice(0, 43));
assert(chave44Nfe.slice(-1) === String(dvCalculado), 'Dígito Verificador Módulo 11 SEFAZ válido');

// 2. Teste de Geração de XML NF-e 4.00 (Mod. 55)
const xmlNfe = gerarXmlNFe({
  chaveAcesso: chave44Nfe,
  serie: 1,
  numero: 1025,
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  emitente: { cnpj: '05.766.577/0001-22', razaoSocial: 'COLISEU SISTEMAS LTDA', uf: 'MS' },
  destinatario: { nome: 'LIVRARIA DAMASCO LTDA', cpfCnpj: '68148349000109', uf: 'MS' },
  itens: [
    { descricao: 'TINTA ACRILICA PREMIUM 18L', quantidade: 5, valorUnitario: 350.0, valorTotal: 1750.0 },
    { descricao: 'ROLO DE PINTURA ANTI GOTA', quantidade: 10, valorUnitario: 25.0, valorTotal: 250.0 },
  ],
  valorTotal: 2000.0,
  naturezaOperacao: 'VENDA DE MERCADORIAS',
  protocoloAutorizacao: '150260000001025',
});

assert(xmlNfe.includes('<nfeProc versao="4.00"'), 'Envelope nfeProc versão 4.00 presente');
assert(xmlNfe.includes(`<infNFe Id="NFe${chave44Nfe}"`), 'Identificador Id NFe{chave} correto');
assert(xmlNfe.includes('<cStat>100</cStat>'), 'Protocolo de Autorização SEFAZ cStat=100');
assert(xmlNfe.includes('<vNF>2000.00</vNF>'), 'Totalizador vNF calculado corretamente');

// 3. Teste de Geração de XML NFC-e 4.00 (Mod. 65) com QR Code
const chave44Nfce = gerarChaveAcesso({
  uf: '50',
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  cnpjEmitente: '05766577000122',
  modelo: '65',
  serie: 1,
  numero: 500,
  tipoEmissao: 1,
  codigoNumerico: '87654321',
});

const xmlNfce = gerarXmlNFCe({
  chaveAcesso: chave44Nfce,
  serie: 1,
  numero: 500,
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  emitente: { cnpj: '05.766.577/0001-22', razaoSocial: 'COLISEU SISTEMAS LTDA', uf: 'MS' },
  destinatario: { nome: 'CONSUMIDOR BALCAO', cpfCnpj: '' },
  valorTotal: 129.9,
  formaPagamento: '01',
  protocoloAutorizacao: '150260000009876',
});

assert(xmlNfce.includes('<mod>65</mod>'), 'NFC-e modelo 65 declarado');
assert(xmlNfce.includes('<infNFeSupl>'), 'NFC-e com tag suplementar infNFeSupl');
assert(xmlNfce.includes('<qrCode>'), 'QR-Code SEFAZ-MS gerado');

// 4. Teste de Geração de XML CT-e 4.00 (Mod. 57)
const chave44Cte = gerarChaveAcesso({
  uf: '50',
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  cnpjEmitente: '05766577000122',
  modelo: '57',
  serie: 1,
  numero: 80,
  tipoEmissao: 1,
  codigoNumerico: '11223344',
});

const xmlCte = gerarXmlCTe({
  chaveAcesso: chave44Cte,
  serie: 1,
  numero: 80,
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  emitente: { cnpj: '05.766.577/0001-22', razaoSocial: 'COLISEU TRANSPORTES LTDA', uf: 'MS' },
  valorTotal: 850.0,
  protocoloAutorizacao: '150260000005757',
});

assert(xmlCte.includes('<cteProc versao="4.00"'), 'Envelope cteProc versão 4.00 presente');
assert(xmlCte.includes('<mod>57</mod>'), 'CT-e modelo 57 declarado');
assert(xmlCte.includes('<vTPrest>850.00</vTPrest>'), 'Valor da prestação de transporte correto');

// 5. Teste de Geração de XML MDF-e 3.00 (Mod. 58)
const chave44Mdfe = gerarChaveAcesso({
  uf: '50',
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  cnpjEmitente: '05766577000122',
  modelo: '58',
  serie: 1,
  numero: 35,
  tipoEmissao: 1,
  codigoNumerico: '55667788',
});

const xmlMdfe = gerarXmlMDFe({
  chaveAcesso: chave44Mdfe,
  serie: 1,
  numero: 35,
  dataEmissao: new Date('2026-08-25T10:00:00Z'),
  emitente: { cnpj: '05.766.577/0001-22', razaoSocial: 'COLISEU TRANSPORTES LTDA', uf: 'MS' },
  placaVeiculo: 'BRA2E19',
  condutorNome: 'CARLOS SILVA',
  condutorCpf: '98765432100',
  valorCarga: 25000.0,
  protocoloAutorizacao: '150260000005858',
});

assert(xmlMdfe.includes('<mdfeProc versao="3.00"'), 'Envelope mdfeProc versão 3.00 presente');
assert(xmlMdfe.includes('<mod>58</mod>'), 'MDF-e modelo 58 declarado');
assert(xmlMdfe.includes('<placa>BRA2E19</placa>'), 'Placa do veículo de tração vinculada');

// 6. Teste de Gravação Física no Concentrador Único da VPS
const FISCAL_STORAGE_DIR = path.join(process.cwd(), 'storage', 'fiscal');
const docModels = [
  { mod: '55', chave: chave44Nfe, xml: xmlNfe },
  { mod: '65', chave: chave44Nfce, xml: xmlNfce },
  { mod: '57', chave: chave44Cte, xml: xmlCte },
  { mod: '58', chave: chave44Mdfe, xml: xmlMdfe },
];

for (const item of docModels) {
  const p = path.join(FISCAL_STORAGE_DIR, 'xmls', 'emp-matriz-001', item.mod, '2026', '08');
  fs.mkdirSync(p, { recursive: true });
  const f = path.join(p, `${item.chave}-proc${item.mod}.xml`);
  fs.writeFileSync(f, item.xml, 'utf8');
  assert(fs.existsSync(f) && fs.readFileSync(f, 'utf8').length > 50, `Gravação física do XML Modelo ${item.mod} no Concentrador`);
}

console.log('\n================================================================');
console.log(`RESULTADO FINAL DA AUDITORIA DA FASE 3: ${passedTests}/${totalTests} testes aprovados.`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
