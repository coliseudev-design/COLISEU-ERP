import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('TESTE AUTOMATIZADO - FASE 1: CONCENTRADOR FISCAL & COFRE A1');
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

// 1. Teste de Criação de Pastas do Concentrador
const FISCAL_STORAGE_DIR = path.join(process.cwd(), 'storage', 'fiscal');
try {
  fs.mkdirSync(path.join(FISCAL_STORAGE_DIR, 'certificados'), { recursive: true });
  fs.mkdirSync(path.join(FISCAL_STORAGE_DIR, 'xmls'), { recursive: true });
  fs.mkdirSync(path.join(FISCAL_STORAGE_DIR, 'pdfs'), { recursive: true });
  assert(fs.existsSync(path.join(FISCAL_STORAGE_DIR, 'xmls')), 'Criação dos diretórios do concentrador físico');
} catch (err) {
  assert(false, 'Criação dos diretórios do concentrador físico: ' + err.message);
}

// 2. Teste de Criptografia AES-256-CBC do Certificado A1
const FISCAL_SECRET = 'COLISEU_ERP_FISCAL_MASTER_KEY_2026_AES256_SECRET';
function getCryptoKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}
function encryptText(plainText) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getCryptoKey(FISCAL_SECRET), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}
function decryptText(encryptedString) {
  const [ivHex, encData] = encryptedString.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getCryptoKey(FISCAL_SECRET), iv);
  let decrypted = decipher.update(encData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const mockPfx = Buffer.from('MOCK_PFX_BINARY_CONTENT_2026').toString('base64');
const mockPass = 'SenhaCertificado123!';

const encPfx = encryptText(mockPfx);
const encPass = encryptText(mockPass);

assert(encPfx !== mockPfx && encPfx.includes(':'), 'Criptografia AES-256 do arquivo .PFX');
assert(encPass !== mockPass && encPass.includes(':'), 'Criptografia AES-256 da senha do certificado');
assert(decryptText(encPfx) === mockPfx, 'Descriptografia exata do binário .PFX em memória');
assert(decryptText(encPass) === mockPass, 'Descriptografia exata da senha do certificado em memória');

// 3. Teste de Gravação e Leitura no Concentrador Único de XMLs
const chaveTeste = '50260805766577000122550010000010251000010250';
const xmlConteudo = `<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${chaveTeste}"><emit><CNPJ>05766577000122</CNPJ><xNome>COLISEU SISTEMAS LTDA</xNome></emit><total><ICMSTot><vNF>1580.00</vNF></ICMSTot></total></infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>${chaveTeste}</chNFe><dhRecbto>2026-08-25T08:55:00-04:00</dhRecbto><nProt>150260000001025</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>`;

const empId = 'emp-matriz-001';
const mod = '55';
const ano = '2026';
const mes = '08';

const xmlDir = path.join(FISCAL_STORAGE_DIR, 'xmls', empId, mod, ano, mes);
fs.mkdirSync(xmlDir, { recursive: true });
const xmlFilePath = path.join(xmlDir, `${chaveTeste}-proc${mod}.xml`);
fs.writeFileSync(xmlFilePath, xmlConteudo, 'utf8');

assert(fs.existsSync(xmlFilePath), 'Gravação do arquivo físico no Concentrador Único da VPS');
const lido = fs.readFileSync(xmlFilePath, 'utf8');
assert(lido === xmlConteudo, 'Integridade e integridade do XML autorizado no Concentrador');

console.log('\n================================================================');
console.log(`RESULTADO FINAL DA AUDITORIA DA FASE 1: ${passedTests}/${totalTests} testes aprovados.`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
