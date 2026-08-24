// Motor Universal de Promoções Avançadas, Ofertas Dinâmicas e Cupons de Desconto

export type MecanicaPromocao =
  | 'DESCONTO_ITEM'             // Desconto por produto individual (SKUs selecionados via código de barras)
  | 'DESCONTO_MARCA'            // Desconto para todos os produtos de uma Marca específica
  | 'DESCONTO_CATEGORIA'        // Desconto para todos os produtos de uma Categoria
  | 'LEVE_X_PAGUE_Y'            // Compre X unidades e pague apenas Y
  | 'DESCONTO_PROGRESSIVO_QTD'  // Tabela escalonada de atacado por volume
  | 'COMBO_PRODUTOS'            // Compre produto A e ganhe % no produto B
  | 'CUPOM_DESCONTO'            // Código promocional digitado no checkout
  | 'DESCONTO_FORMA_PAGTO';     // Desconto no PIX / Dinheiro

export type StatusCampanha = 'ATIVA' | 'AGENDADA' | 'ENCERRADA' | 'PAUSADA';

export interface ItemPromocionalRegra {
  produtoId: string;
  codigoSku: string;
  codigoBarras: string;
  descricao: string;
  precoDeTabela: number;
  precoPromocional: number;
  percentualDesconto: number;
}

export interface FaixaProgressivaVolume {
  quantidadeMinima: number;
  quantidadeMaxima?: number;
  precoUnitarioOuDescontoPercent: number;
}

export interface RegraComboCrossSell {
  produtoPrincipalId: string;
  produtoSecundarioId: string;
  descontoPercentNoSecundario: number;
}

export interface CondicoesAtivacao {
  dataInicio: string; // DD/MM/AAAA
  dataFim: string;    // DD/MM/AAAA
  horaInicio?: string; // Ex: 08:00
  horaFim?: string;    // Ex: 22:00
  diasSemanaHabilitados: number[]; // [0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sab]
  valorMinimoPedido?: number;
  limiteUsosPorCliente?: number;
  acumulativaComOutras: boolean;
}

export interface CampanhaPromocional {
  id: string;
  codigo: string;
  titulo: string;
  descricao?: string;
  mecanica: MecanicaPromocao;
  status: StatusCampanha;
  
  // Alvos da Promoção
  marcaAlvo?: string;
  categoriaAlvo?: string;
  itensPromocionais: ItemPromocionalRegra[];
  
  // Parâmetros de Mecânicas Específicas
  percentualDescontoGeral?: number; // Para Marca e Categoria
  leveQuantidade?: number;           // Ex: 3
  pagueQuantidade?: number;          // Ex: 2
  faixasProgressivas?: FaixaProgressivaVolume[];
  comboCrossSell?: RegraComboCrossSell;
  codigoCupom?: string;              // Ex: 'COLISEU10'
  
  // Vigência e Condições
  condicoes: CondicoesAtivacao;

  // Estatísticas de Desempenho
  totalVendasImpactadas: number;
  totalDescontoConcedido: number;
  qtdUsosNoCaixa: number;
}

const STORAGE_KEY_PROMOCOES_AVANCADAS = 'coliseu_promocoes_avancadas';

const DEFAULT_CAMPANHAS: CampanhaPromocional[] = [
  {
    id: 'PROMO-001',
    codigo: 'OFERTA-001',
    titulo: 'SUPER OFERTA: VERNIZ POLIURETANO 5L COM 25% OFF',
    descricao: 'Preço especial direto na gôndola para queima de estoque de Vernizes PU',
    mecanica: 'DESCONTO_ITEM',
    status: 'ATIVA',
    itensPromocionais: [
      {
        produtoId: 'prod-001',
        codigoSku: 'VERNIZ-PU-8100',
        codigoBarras: '7891991000803',
        descricao: 'Verniz Poliuretano Alto Sólidos 5L',
        precoDeTabela: 200.00,
        precoPromocional: 149.90,
        percentualDesconto: 25.05,
      },
    ],
    condicoes: {
      dataInicio: '01/08/2026',
      dataFim: '31/08/2026',
      horaInicio: '07:00',
      horaFim: '19:00',
      diasSemanaHabilitados: [1, 2, 3, 4, 5, 6],
      acumulativaComOutras: false,
    },
    totalVendasImpactadas: 18450.00,
    totalDescontoConcedido: 4620.00,
    qtdUsosNoCaixa: 37,
  },
  {
    id: 'PROMO-002',
    codigo: 'OFERTA-002',
    titulo: 'SEMANA DA LINHA AUTOMOTIVA - 15% OFF EM TODA A MARCA CORAL',
    descricao: 'Desconto linear em todos os itens da marca Coral cadastrados no catálogo',
    mecanica: 'DESCONTO_MARCA',
    status: 'ATIVA',
    marcaAlvo: 'CORAL',
    percentualDescontoGeral: 15.0,
    itensPromocionais: [],
    condicoes: {
      dataInicio: '10/08/2026',
      dataFim: '25/08/2026',
      diasSemanaHabilitados: [0, 1, 2, 3, 4, 5, 6],
      valorMinimoPedido: 100.00,
      acumulativaComOutras: true,
    },
    totalVendasImpactadas: 32000.00,
    totalDescontoConcedido: 4800.00,
    qtdUsosNoCaixa: 52,
  },
  {
    id: 'PROMO-003',
    codigo: 'OFERTA-003',
    titulo: 'FESTIVAL DA LIXA: LEVE 3 PAGUE 2',
    descricao: 'Na compra de 3 lixas d água automotivas, a 3ª unidade sai 100% grátis',
    mecanica: 'LEVE_X_PAGUE_Y',
    status: 'ATIVA',
    leveQuantidade: 3,
    pagueQuantidade: 2,
    itensPromocionais: [
      {
        produtoId: 'prod-006',
        codigoSku: 'LIXA-AGUA-600',
        codigoBarras: '7896006700100',
        descricao: 'Lixa d Água Grão 600 Folha',
        precoDeTabela: 5.50,
        precoPromocional: 3.67,
        percentualDesconto: 33.33,
      },
    ],
    condicoes: {
      dataInicio: '01/08/2026',
      dataFim: '31/08/2026',
      diasSemanaHabilitados: [1, 2, 3, 4, 5, 6],
      acumulativaComOutras: false,
    },
    totalVendasImpactadas: 1450.00,
    totalDescontoConcedido: 480.00,
    qtdUsosNoCaixa: 88,
  },
  {
    id: 'PROMO-004',
    codigo: 'CUPOM-VIP',
    titulo: 'CUPOM EXCLUSIVO: COLISEU10 (10% OFF NO CHECKOUT)',
    descricao: 'Cupom de fidelidade para clientes cadastrados válido acima de R$ 250,00',
    mecanica: 'CUPOM_DESCONTO',
    status: 'ATIVA',
    codigoCupom: 'COLISEU10',
    percentualDescontoGeral: 10.0,
    itensPromocionais: [],
    condicoes: {
      dataInicio: '01/08/2026',
      dataFim: '30/09/2026',
      valorMinimoPedido: 250.00,
      diasSemanaHabilitados: [0, 1, 2, 3, 4, 5, 6],
      acumulativaComOutras: false,
    },
    totalVendasImpactadas: 24500.00,
    totalDescontoConcedido: 2450.00,
    qtdUsosNoCaixa: 41,
  },
];

export function getCampanhasPromocionais(): CampanhaPromocional[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROMOCOES_AVANCADAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROMOCOES_AVANCADAS, JSON.stringify(DEFAULT_CAMPANHAS));
      return DEFAULT_CAMPANHAS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CAMPANHAS;
  } catch {
    return DEFAULT_CAMPANHAS;
  }
}

export function salvarCampanhaPromocional(campanha: CampanhaPromocional): CampanhaPromocional[] {
  const lista = getCampanhasPromocionais();
  const index = lista.findIndex((item) => item.id === campanha.id);
  let atualizada: CampanhaPromocional[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = campanha;
  } else {
    atualizada = [campanha, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_PROMOCOES_AVANCADAS, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_promocoes_updated'));
  return atualizada;
}

export function alternarStatusCampanha(campanhaId: string): CampanhaPromocional | null {
  const lista = getCampanhasPromocionais();
  const index = lista.findIndex((item) => item.id === campanhaId);
  if (index < 0) return null;

  const c = lista[index];
  c.status = c.status === 'ATIVA' ? 'PAUSADA' : 'ATIVA';

  salvarCampanhaPromocional(c);
  return c;
}

export function excluirCampanhaPromocional(campanhaId: string): CampanhaPromocional[] {
  const lista = getCampanhasPromocionais();
  const atualizada = lista.filter((item) => item.id !== campanhaId);
  localStorage.setItem(STORAGE_KEY_PROMOCOES_AVANCADAS, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_promocoes_updated'));
  return atualizada;
}

// Simulador de Carrinho para o PDV & Pré-Venda
export interface ItemSimuladoCarrinho {
  produtoId: string;
  codigoBarras: string;
  descricao: string;
  marca?: string;
  categoria?: string;
  quantidade: number;
  precoUnitarioTabela: number;
}

export interface ResultadoItemSimulado {
  produtoId: string;
  descricao: string;
  quantidade: number;
  precoUnitarioOriginal: number;
  precoUnitarioFinal: number;
  subtotalBruto: number;
  descontoAplicado: number;
  totalLiquido: number;
  nomePromocaoAplicada?: string;
}

export interface ResultadoSimulacaoCarrinho {
  itens: ResultadoItemSimulado[];
  subtotalBruto: number;
  totalDesconto: number;
  totalLiquido: number;
  promocoesAtivadas: string[];
}

export function simularPromocoesNoCarrinho(
  itensCarrinho: ItemSimuladoCarrinho[],
  cupomDigitado?: string
): ResultadoSimulacaoCarrinho {
  const campanhasAtivas = getCampanhasPromocionais().filter((c) => c.status === 'ATIVA');
  let subtotalBruto = 0;
  let totalDesconto = 0;
  const promocoesAtivadas = new Set<string>();

  const itensCalculados: ResultadoItemSimulado[] = itensCarrinho.map((item) => {
    const itemSubtotal = item.quantidade * item.precoUnitarioTabela;
    subtotalBruto += itemSubtotal;

    let melhorPrecoUnitario = item.precoUnitarioTabela;
    let nomePromo: string | undefined = undefined;

    // 1. Verificar se há promoção específica de Item (por SKU ou Código de Barras)
    for (const c of campanhasAtivas) {
      if (c.mecanica === 'DESCONTO_ITEM') {
        const match = c.itensPromocionais.find(
          (p) => p.produtoId === item.produtoId || p.codigoBarras === item.codigoBarras
        );
        if (match && match.precoPromocional < melhorPrecoUnitario) {
          melhorPrecoUnitario = match.precoPromocional;
          nomePromo = c.titulo;
          promocoesAtivadas.add(c.titulo);
        }
      }

      // 2. Verificar se há promoção de Marca
      if (c.mecanica === 'DESCONTO_MARCA' && c.marcaAlvo && item.marca) {
        if (c.marcaAlvo.toUpperCase() === item.marca.toUpperCase() && c.percentualDescontoGeral) {
          const precoComDesconto = item.precoUnitarioTabela * (1 - c.percentualDescontoGeral / 100);
          if (precoComDesconto < melhorPrecoUnitario) {
            melhorPrecoUnitario = precoComDesconto;
            nomePromo = `${c.titulo} (${c.percentualDescontoGeral}% OFF)`;
            promocoesAtivadas.add(c.titulo);
          }
        }
      }

      // 3. Verificar se há promoção de Categoria
      if (c.mecanica === 'DESCONTO_CATEGORIA' && c.categoriaAlvo && item.categoria) {
        if (c.categoriaAlvo.toUpperCase() === item.categoria.toUpperCase() && c.percentualDescontoGeral) {
          const precoComDesconto = item.precoUnitarioTabela * (1 - c.percentualDescontoGeral / 100);
          if (precoComDesconto < melhorPrecoUnitario) {
            melhorPrecoUnitario = precoComDesconto;
            nomePromo = `${c.titulo} (${c.percentualDescontoGeral}% OFF)`;
            promocoesAtivadas.add(c.titulo);
          }
        }
      }

      // 4. Mecânica Leve X Pague Y
      if (c.mecanica === 'LEVE_X_PAGUE_Y' && c.leveQuantidade && c.pagueQuantidade) {
        const match = c.itensPromocionais.find((p) => p.produtoId === item.produtoId);
        if (match && item.quantidade >= c.leveQuantidade) {
          const grupos = Math.floor(item.quantidade / c.leveQuantidade);
          const resto = item.quantidade % c.leveQuantidade;
          const qtdCobrada = grupos * c.pagueQuantidade + resto;
          const precoMedioUnitario = (qtdCobrada * item.precoUnitarioTabela) / item.quantidade;
          if (precoMedioUnitario < melhorPrecoUnitario) {
            melhorPrecoUnitario = precoMedioUnitario;
            nomePromo = `Leve ${c.leveQuantidade} Pague ${c.pagueQuantidade}`;
            promocoesAtivadas.add(c.titulo);
          }
        }
      }
    }

    const itemTotalLiquido = Math.round(item.quantidade * melhorPrecoUnitario * 100) / 100;
    const itemDesconto = Math.max(0, Math.round((itemSubtotal - itemTotalLiquido) * 100) / 100);
    totalDesconto += itemDesconto;

    return {
      produtoId: item.produtoId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      precoUnitarioOriginal: item.precoUnitarioTabela,
      precoUnitarioFinal: melhorPrecoUnitario,
      subtotalBruto: itemSubtotal,
      descontoAplicado: itemDesconto,
      totalLiquido: itemTotalLiquido,
      nomePromocaoAplicada: nomePromo,
    };
  });

  // 5. Aplicação de Cupom de Desconto Global
  if (cupomDigitado) {
    const cupomMatch = campanhasAtivas.find(
      (c) => c.mecanica === 'CUPOM_DESCONTO' && c.codigoCupom?.toUpperCase() === cupomDigitado.toUpperCase()
    );
    if (cupomMatch && cupomMatch.percentualDescontoGeral) {
      const minVal = cupomMatch.condicoes.valorMinimoPedido || 0;
      if (subtotalBruto >= minVal) {
        const descontoCupom = Math.round((subtotalBruto * (cupomMatch.percentualDescontoGeral / 100)) * 100) / 100;
        totalDesconto += descontoCupom;
        promocoesAtivadas.add(`Cupom: ${cupomMatch.codigoCupom} (-${cupomMatch.percentualDescontoGeral}%)`);
      }
    }
  }

  const totalLiquido = Math.max(0, subtotalBruto - totalDesconto);

  return {
    itens: itensCalculados,
    subtotalBruto,
    totalDesconto,
    totalLiquido,
    promocoesAtivadas: Array.from(promocoesAtivadas),
  };
}
