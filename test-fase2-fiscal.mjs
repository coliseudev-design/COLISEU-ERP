import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('TESTE AUTOMATIZADO - FASE 2: INTERFACE DO CONCENTRADOR & COFRE');
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

// 1. Validar existência dos componentes criados
const compPath1 = path.join(process.cwd(), 'src', 'components', 'fiscal', 'ModalUploadCertificadoVps.tsx');
const compPath2 = path.join(process.cwd(), 'src', 'components', 'fiscal', 'CardCertificadoVpsStatus.tsx');
const compPath3 = path.join(process.cwd(), 'src', 'components', 'fiscal', 'ConcentradorXmlsTab.tsx');
const compPath4 = path.join(process.cwd(), 'src', 'lib', 'fiscalCloudService.ts');

assert(fs.existsSync(compPath1), 'ModalUploadCertificadoVps.tsx criado com sucesso');
assert(fs.existsSync(compPath2), 'CardCertificadoVpsStatus.tsx criado com sucesso');
assert(fs.existsSync(compPath3), 'ConcentradorXmlsTab.tsx criado com sucesso');
assert(fs.existsSync(compPath4), 'fiscalCloudService.ts criado com sucesso');

// 2. Validar integração das 4 telas de gerenciamento
const pageNfe = fs.readFileSync(path.join(process.cwd(), 'src', 'pages', 'GerenciamentoNFePage.tsx'), 'utf8');
const pageNfce = fs.readFileSync(path.join(process.cwd(), 'src', 'pages', 'GerenciamentoNFCePage.tsx'), 'utf8');
const pageCte = fs.readFileSync(path.join(process.cwd(), 'src', 'pages', 'CteGerenciamentoPage.tsx'), 'utf8');
const pageMdfe = fs.readFileSync(path.join(process.cwd(), 'src', 'pages', 'GerenciamentoMDFePage.tsx'), 'utf8');

assert(pageNfe.includes('ConcentradorXmlsTab') && pageNfe.includes('CardCertificadoVpsStatus'), 'GerenciamentoNFePage integrado com Concentrador & Cofre A1');
assert(pageNfce.includes('ConcentradorXmlsTab') && pageNfce.includes('CardCertificadoVpsStatus'), 'GerenciamentoNFCePage integrado com Concentrador & Cofre A1');
assert(pageCte.includes('ConcentradorXmlsTab') && pageCte.includes('CardCertificadoVpsStatus'), 'CteGerenciamentoPage integrado com Concentrador & Cofre A1');
assert(pageMdfe.includes('ConcentradorXmlsTab') && pageMdfe.includes('CardCertificadoVpsStatus'), 'GerenciamentoMDFePage integrado com Concentrador & Cofre A1');

console.log('\n================================================================');
console.log(`RESULTADO FINAL DA AUDITORIA DA FASE 2: ${passedTests}/${totalTests} testes aprovados.`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
