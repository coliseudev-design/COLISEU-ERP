import { safeInvoke as invoke } from "./ipc";

export interface ProdutoGradeEixo {
  id: string;
  grade_id: string;
  tipo_eixo: number;
  valor: string;
  ordem: number;
}

export interface ProdutoGrade {
  id: string;
  empresa_id: string;
  nome: string;
  eixo1_nome: string;
  eixo2_nome?: string;
  eixos: ProdutoGradeEixo[];
}

export interface ProdutoVariante {
  id: string;
  produto_pai_id: string;
  codigo_sku: string;
  codigo_barras?: string;
  tamanho?: string;
  cor?: string;
  preco_venda?: number;
  ativo: number;
}

export const gradeService = {
  async criarGrade(
    empresaId: string,
    nome: string,
    eixo1Nome: string,
    eixo2Nome: string | undefined,
    eixosTamanho: string[],
    eixosCor: string[]
  ): Promise<string> {
    return await invoke<string>("criar_grade", {
      empresaId,
      nome,
      eixo1Nome,
      eixo2Nome,
      eixosTamanho,
      eixosCor,
    });
  },

  async listarGrades(empresaId: string): Promise<ProdutoGrade[]> {
    return await invoke<ProdutoGrade[]>("listar_grades", { empresaId });
  },

  async gerarVariantesProduto(produtoPaiId: string, gradeId: string): Promise<ProdutoVariante[]> {
    return await invoke<ProdutoVariante[]>("gerar_variantes_produto", { produtoPaiId, gradeId });
  },

  async listarVariantesProduto(produtoPaiId: string): Promise<ProdutoVariante[]> {
    return await invoke<ProdutoVariante[]>("listar_variantes_produto", { produtoPaiId });
  },
};
